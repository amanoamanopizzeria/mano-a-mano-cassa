-- Edoardo, 26/10/2026: «tu dai la possibilità di cercare il cliente solo per numero di telefono…
-- dobbiamo poterlo cercare per qualsiasi campo: nome, telefono, via», perché al telefono non sempre
-- si capisce bene. cerca_clienti prende quello che si scrive, lo spezza in parole, e ogni parola deve
-- trovarsi in almeno un campo: nome, telefono (anche un pezzo), via, civico, CAP, note, card.
-- «rossi novara» trova il Rossi di Via Novara; «347 12» chi ha 347 e 12 nel numero.
-- Solo lettura, solo staff. Le lettere accentate valgono come quelle senza accento.

create or replace function testo_semplice(p text) returns text
language sql immutable parallel safe set search_path = public, pg_temp as $$
  select translate(lower(coalesce(p, '')), 'àáâäèéêëìíîïòóôöùúûüç''’', 'aaaaeeeeiiiioooouuuuc  ')
$$;

create or replace function cerca_clienti(p_testo text) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_parole text[];
begin
  if not e_staff() then raise exception 'solo lo staff' using errcode = '42501'; end if;
  v_parole := array_remove(regexp_split_to_array(testo_semplice(trim(p_testo)), '\s+'), '');
  if coalesce(array_length(v_parole, 1), 0) = 0 or length(trim(p_testo)) < 2 then
    return '[]'::jsonb;
  end if;

  -- un testo unico per cliente (nome, note, card e tutti i suoi indirizzi) e le cifre del telefono:
  -- ogni parola si cerca lì una volta sola (la prima versione, campo per campo, ci metteva 1,5 s)
  return coalesce((
    with ind as (
      select i.id_cliente,
             string_agg(concat_ws(' ', testo_semplice(i.via), testo_semplice(i.civico), i.cap, testo_semplice(i.note)), ' | ') as t
        from indirizzo i group by 1
    ), base as (
      select c.id, c.nome, c.telefono, c.black_list,
             concat_ws(' ', testo_semplice(c.nome), testo_semplice(c.note), testo_semplice(c.card), ind.t) as t,
             regexp_replace(coalesce(c.telefono, ''), '\D', '', 'g') as cifre
        from cliente c left join ind on ind.id_cliente = c.id
    ), trovati as (
      select b.* from base b
       where not exists (
         select 1 from unnest(v_parole) w
          where not (b.t like '%' || w || '%'
                     or (w ~ '^\+?[0-9]{2,}$' and b.cifre like '%' || regexp_replace(w, '\D', '', 'g') || '%')))
    ), ord as (
      select o.id_cliente, max(o.creato_il) as ultimo, count(*) as ordini
        from ordine o join trovati t on t.id = o.id_cliente
       where o.stato <> 'annullato' group by 1
    )
    select jsonb_agg(r order by r.primo desc, r.ultimo desc nulls last, r.nome)
    from (
      select t.id, t.nome, t.telefono, t.black_list,
             -- l'indirizzo che ha fatto trovare il cliente, se c'è; se no il primo
             (select jsonb_build_object('via', i.via, 'civico', i.civico, 'cap', i.cap, 'citta', i.citta, 'note', i.note)
                from indirizzo i where i.id_cliente = t.id
               order by (select count(*) from unnest(v_parole) w
                          where testo_semplice(i.via) like '%' || w || '%' or testo_semplice(i.civico) = w) desc, i.id
               limit 1) as indirizzo,
             (select count(*) from indirizzo i where i.id_cliente = t.id) as indirizzi,
             o.ultimo, coalesce(o.ordini, 0) as ordini,
             testo_semplice(t.nome) like v_parole[1] || '%' as primo
        from trovati t left join ord o on o.id_cliente = t.id
       order by primo desc, o.ultimo desc nulls last
       limit 30
    ) r
  ), '[]'::jsonb);
end $$;
revoke all on function cerca_clienti(text) from public, anon;
grant execute on function cerca_clienti(text) to authenticated;
