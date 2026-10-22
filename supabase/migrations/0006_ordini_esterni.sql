-- Mano a Mano Cassa — Fase 6: ordini da app, sito e aggregatori entrano in cassa.
-- Una sola funzione, atomica: controlla la capacità dello slot, poi inserisce.
-- Chiamata solo dal server (ruolo service_role), mai dal browser.

create or replace function accetta_ordine_esterno(
  p_negozio     uuid,
  p_canale      canale_ordine,
  p_tipo        tipo_ordine,
  p_id_esterno  text,
  p_ora         timestamptz,
  p_note        text,
  p_righe       jsonb
) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_slot      timestamptz;
  v_giorno    date;
  v_pizze     numeric;
  v_esistente uuid;
  v_ordine    ordine;
  v_cap       record;
begin
  -- idempotenza: stesso ordine dall'aggregatore o dall'app non entra due volte
  if p_id_esterno is not null then
    select id into v_esistente from ordine
     where id_negozio = p_negozio and canale = p_canale and id_esterno = p_id_esterno;
    if v_esistente is not null then
      return jsonb_build_object('esito', 'duplicato', 'id', v_esistente);
    end if;
  end if;

  if p_righe is null or jsonb_typeof(p_righe) <> 'array' or jsonb_array_length(p_righe) = 0 then
    return jsonb_build_object('esito', 'errore', 'motivo', 'nessuna riga');
  end if;

  -- pizze = unità mandate in cucina (quantità delle righe con destinazione cucina)
  select coalesce(sum((r->>'quantita')::numeric), 0) into v_pizze
  from jsonb_array_elements(p_righe) r
  where coalesce(r->>'destinazione', 'cucina') = 'cucina';

  -- slot da 15 minuti dell'orario richiesto (o di adesso), ora locale
  v_slot := to_timestamp(floor(extract(epoch from coalesce(p_ora, now())) / 900) * 900);
  v_giorno := (v_slot at time zone 'Europe/Rome')::date;

  select * into v_cap
  from capacita_giorno(p_negozio, v_giorno)
  where inizio = v_slot;

  if v_cap is null then
    return jsonb_build_object('esito', 'fuori_orario', 'slot', v_slot);
  end if;

  if v_cap.bloccata_produzione and v_pizze > 0 then
    return jsonb_build_object('esito', 'pieno', 'motivo', 'produzione bloccata', 'slot', v_slot);
  end if;
  if v_pizze > 0 and v_cap.pizze_occupate + v_pizze > v_cap.pizze_max then
    return jsonb_build_object('esito', 'pieno', 'motivo', 'pizze', 'slot', v_slot,
      'libere', greatest(v_cap.pizze_max - v_cap.pizze_occupate, 0));
  end if;
  if p_tipo = 'domicilio' and (v_cap.bloccata_consegne or v_cap.consegne_occupate + 1 > v_cap.consegne_max) then
    return jsonb_build_object('esito', 'pieno', 'motivo', 'consegne', 'slot', v_slot);
  end if;

  insert into ordine (id_negozio, canale, tipo, ora_consegna, note, id_esterno)
  values (p_negozio, p_canale, p_tipo, p_ora, p_note, p_id_esterno)
  returning * into v_ordine;

  insert into ordine_riga (id_ordine, descrizione, quantita, prezzo_unit, variazioni, note, destinazione)
  select v_ordine.id,
         r->>'descrizione',
         coalesce((r->>'quantita')::numeric, 1),
         coalesce((r->>'prezzo_unit')::numeric, 0),
         coalesce(r->'variazioni', '[]'::jsonb),
         r->>'note',
         coalesce(r->>'destinazione', 'cucina')
  from jsonb_array_elements(p_righe) r;

  update ordine
     set totale = (select coalesce(sum(prezzo_unit * quantita), 0) from ordine_riga where id_ordine = v_ordine.id)
   where id = v_ordine.id
   returning * into v_ordine;

  return jsonb_build_object('esito', 'accettato', 'id', v_ordine.id, 'numero', v_ordine.numero, 'totale', v_ordine.totale);
end $$;

revoke all on function accetta_ordine_esterno(uuid, canale_ordine, tipo_ordine, text, timestamptz, text, jsonb) from public;
grant execute on function accetta_ordine_esterno(uuid, canale_ordine, tipo_ordine, text, timestamptz, text, jsonb) to service_role;
