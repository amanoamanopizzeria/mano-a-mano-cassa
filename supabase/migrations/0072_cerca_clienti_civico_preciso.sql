-- Critico giro 30 (26/10/2026) sulla ricerca dei clienti (0071):
-- 1. «via novara 9» metteva il cliente giusto al 22° posto su 30: il «9» si cercava come pezzo di
--    testo e trovava anche il CAP 00198 e i civici 19, 29… Un numero corto (fino a 4 cifre, anche con
--    la lettera: 9, 12b) adesso vale solo come numero intero: un civico, non un pezzo del CAP. Un
--    numero lungo (5 cifre e più) resta un pezzo di telefono.
-- 2. «damuri» non trovava «D'Amuri»: il nome si confronta anche senza spazi e apostrofi.
-- 3. Chi ha il civico scritto proprio così, e chi ha il telefono che comincia con le cifre scritte,
--    va in cima.
-- Solo lettura, solo staff, come prima.

create or replace function cerca_clienti(p_testo text) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_parole text[];
begin
  if not e_staff() then raise exception 'solo lo staff' using errcode = '42501'; end if;
  v_parole := array_remove(regexp_split_to_array(testo_semplice(trim(p_testo)), '\s+'), '');
  if coalesce(array_length(v_parole, 1), 0) = 0 or length(trim(p_testo)) < 2 then
    return '[]'::jsonb;
  end if;

  return coalesce((
    with ind as (
      select i.id_cliente,
             string_agg(concat_ws(' ', testo_semplice(i.via), testo_semplice(i.civico), i.cap, testo_semplice(i.note)), ' | ') as t,
             array_agg(testo_semplice(i.civico)) as civici
        from indirizzo i group by 1
    ), base as (
      select c.id, c.nome, c.telefono, c.black_list, ind.civici,
             concat_ws(' ', testo_semplice(c.nome), testo_semplice(c.note), testo_semplice(c.card), ind.t) as t,
             replace(testo_semplice(c.nome), ' ', '') as compatto,
             regexp_replace(coalesce(c.telefono, ''), '\D', '', 'g') as cifre
        from cliente c left join ind on ind.id_cliente = c.id
    ), trovati as (
      select b.* from base b
       where not exists (
         select 1 from unnest(v_parole) w
          where not (
            case
              -- civico: il numero intero, mai un pezzo di CAP o di un altro civico
              -- (3–4 cifre possono essere anche un pezzo di telefono: «347»)
              when w ~ '^[0-9]{1,4}[a-z]?$' then b.t ~ ('(^|[^0-9a-z])' || w || '($|[^0-9a-z])')
                                               or (w ~ '^[0-9]{3,4}$' and b.cifre like '%' || w || '%')
              -- telefono: un pezzo delle cifre (o del testo, per card e note)
              when w ~ '^\+?[0-9]{5,}$' then b.cifre like '%' || regexp_replace(w, '\D', '', 'g') || '%' or b.t like '%' || w || '%'
              else b.t like '%' || w || '%' or b.compatto like '%' || w || '%'
            end))
    ), ord as (
      select o.id_cliente, max(o.creato_il) as ultimo, count(*) as ordini
        from ordine o join trovati t on t.id = o.id_cliente
       where o.stato <> 'annullato' group by 1
    )
    select jsonb_agg(to_jsonb(r) - 'punteggio' order by r.punteggio desc, r.ultimo desc nulls last, r.nome)
    from (
      select t.id, t.nome, t.telefono, t.black_list,
             (select jsonb_build_object('via', i.via, 'civico', i.civico, 'cap', i.cap, 'citta', i.citta, 'note', i.note)
                from indirizzo i where i.id_cliente = t.id
               order by (select count(*) from unnest(v_parole) w
                          where testo_semplice(i.via) like '%' || w || '%' or testo_semplice(i.civico) = w) desc, i.id
               limit 1) as indirizzo,
             (select count(*) from indirizzo i where i.id_cliente = t.id) as indirizzi,
             o.ultimo, coalesce(o.ordini, 0) as ordini,
             testo_semplice(t.nome) like v_parole[1] || '%' as primo,
             -- in cima: il nome che comincia così, il civico esatto, il telefono che comincia con quelle cifre
             (case when testo_semplice(t.nome) like v_parole[1] || '%' or t.compatto like v_parole[1] || '%' then 2 else 0 end)
             + (select count(*) from unnest(v_parole) w where w = any(coalesce(t.civici, '{}')))::int * 3
             + (case when v_parole[1] ~ '^[0-9]{3,}$' and (t.cifre like v_parole[1] || '%' or t.cifre like '39' || v_parole[1] || '%') then 2 else 0 end) as punteggio
        from trovati t left join ord o on o.id_cliente = t.id
       order by punteggio desc, o.ultimo desc nulls last
       limit 30
    ) r
  ), '[]'::jsonb);
end $$;
revoke all on function cerca_clienti(text) from public, anon;
grant execute on function cerca_clienti(text) to authenticated;
