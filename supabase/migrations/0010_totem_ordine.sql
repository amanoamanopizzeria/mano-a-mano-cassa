-- Mano a Mano Cassa — Fase 10: il totem (stessa Wi-Fi) manda ordini in cassa.
-- Il totem è un profilo con ruolo 'totem' e un negozio. Usa la stessa funzione di capacità
-- degli ordini da app e sito: se lo slot è pieno, il totem riceve 'pieno' e lo mostra al cliente.
-- (Applicata sul progetto con apply_migration, nome totem_ordine.)

create or replace function ordine_da_totem(p_righe jsonb, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_negozio uuid;
begin
  if ruolo_corrente() <> 'totem' then
    raise exception 'solo il totem' using errcode = '42501';
  end if;
  select id_negozio into v_negozio from profilo where id = auth.uid();
  if v_negozio is null then
    raise exception 'totem senza negozio';
  end if;
  return accetta_ordine_esterno(v_negozio, 'totem', 'banco', null, null, p_note, p_righe);
end $$;

revoke all on function ordine_da_totem(jsonb, text) from public;
grant execute on function ordine_da_totem(jsonb, text) to authenticated;
