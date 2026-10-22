-- Mano a Mano Cassa — Fase 11: il ragazzo in cassa inserisce un ordine (banco, tavolo, asporto, domicilio).
-- Passa dalla stessa capacità di app, sito e totem. Se c'è un tavolo, lo mette in occupato.
-- (Applicata sul progetto con apply_migration, nome ordine_da_cassa.)

create or replace function ordine_da_cassa(p_tipo tipo_ordine, p_righe jsonb, p_id_tavolo uuid default null, p_id_cliente uuid default null, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_negozio uuid;
  v_res jsonb;
  v_id uuid;
begin
  if not e_staff() then
    raise exception 'solo lo staff' using errcode = '42501';
  end if;
  select id_negozio into v_negozio from profilo where id = auth.uid();
  if v_negozio is null then
    raise exception 'profilo senza negozio';
  end if;
  v_res := accetta_ordine_esterno(v_negozio, 'cassa', p_tipo, null, null, p_note, p_righe);
  if v_res->>'esito' = 'accettato' then
    v_id := (v_res->>'id')::uuid;
    update ordine set id_tavolo = p_id_tavolo, id_cliente = p_id_cliente where id = v_id;
    if p_id_tavolo is not null then
      update tavolo set stato = 'occupato', aperto_il = coalesce(aperto_il, now()) where id = p_id_tavolo;
    end if;
  end if;
  return v_res;
end $$;

revoke all on function ordine_da_cassa(tipo_ordine, jsonb, uuid, uuid, text) from public;
grant execute on function ordine_da_cassa(tipo_ordine, jsonb, uuid, uuid, text) to authenticated;
