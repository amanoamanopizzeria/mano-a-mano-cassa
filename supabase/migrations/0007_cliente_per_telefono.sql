-- Mano a Mano Cassa — Fase 7: il cliente si riconosce dal numero di telefono.
-- Il telefono si normalizza a sole cifre; si confrontano le ultime 9 cifre.
-- (Applicata sul progetto con apply_migration, nome cliente_per_telefono.)

create index if not exists cliente_telefono_norm_idx
  on cliente ((right(regexp_replace(coalesce(telefono, ''), '\D', '', 'g'), 9)));

create or replace function cerca_cliente(p_telefono text)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_chiave text := right(regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g'), 9);
  v_cliente cliente;
begin
  if not e_staff() then
    raise exception 'solo lo staff' using errcode = '42501';
  end if;
  if length(v_chiave) < 6 then
    return jsonb_build_object('esito', 'numero_corto');
  end if;
  select * into v_cliente from cliente
   where right(regexp_replace(coalesce(telefono, ''), '\D', '', 'g'), 9) = v_chiave
   order by creato_il limit 1;
  if v_cliente.id is null then
    return jsonb_build_object('esito', 'nuovo', 'telefono', p_telefono);
  end if;
  return jsonb_build_object(
    'esito', 'trovato',
    'cliente', to_jsonb(v_cliente),
    'indirizzi', coalesce((select jsonb_agg(to_jsonb(i) order by i.id) from indirizzo i where i.id_cliente = v_cliente.id), '[]'::jsonb),
    'ultimi_ordini', coalesce((
      select jsonb_agg(x) from (
        select jsonb_build_object('numero', o.numero, 'creato_il', o.creato_il, 'totale', o.totale, 'tipo', o.tipo, 'canale', o.canale) as x
        from ordine o
        where o.id_cliente = v_cliente.id
        order by o.creato_il desc limit 5
      ) s), '[]'::jsonb)
  );
end $$;

revoke all on function cerca_cliente(text) from public;
grant execute on function cerca_cliente(text) to authenticated;

create or replace function salva_cliente(
  p_telefono text, p_nome text, p_note text, p_via text, p_civico text, p_cap text, p_citta text
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_chiave text := right(regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g'), 9);
  v_id uuid;
begin
  if not e_staff() then
    raise exception 'solo lo staff' using errcode = '42501';
  end if;
  if length(v_chiave) < 6 then
    raise exception 'telefono non valido';
  end if;
  select id into v_id from cliente
   where right(regexp_replace(coalesce(telefono, ''), '\D', '', 'g'), 9) = v_chiave
   order by creato_il limit 1;
  if v_id is null then
    insert into cliente (telefono, nome, note) values (p_telefono, p_nome, p_note) returning id into v_id;
  else
    update cliente set nome = coalesce(p_nome, nome), note = coalesce(p_note, note) where id = v_id;
  end if;
  if p_via is not null and p_via <> '' then
    insert into indirizzo (id_cliente, via, civico, cap, citta)
    select v_id, p_via, p_civico, p_cap, p_citta
    where not exists (select 1 from indirizzo where id_cliente = v_id and via = p_via and coalesce(civico, '') = coalesce(p_civico, ''));
  end if;
  return jsonb_build_object('esito', 'salvato', 'id', v_id);
end $$;

revoke all on function salva_cliente(text, text, text, text, text, text, text) from public;
grant execute on function salva_cliente(text, text, text, text, text, text, text) to authenticated;
