-- Mano a Mano Cassa — 0073: gli ordini delle piattaforme entrano sempre (26/10/2026).
-- Decisione di Edoardo (26/10, 18:56Z, «Sì, entrano sempre»): un ordine di Glovo, Deliveroo o Just Eat
-- arriva già pagato. Se il quarto d'ora è pieno, o fuori dai quarti, la cassa lo prende lo stesso e la
-- nota dice «ENTRATO A QUARTO PIENO» (o «FUORI DAI QUARTI»): quando siamo pieni sono le piattaforme a
-- mettersi in pausa. Prima veniva rifiutato, e Deliverect lo segnava «fallito» in un pannello che la sera
-- non guarda nessuno (critico giro 37). Per web, app, totem, telefono e cassa non cambia niente.
-- Base: la versione in produzione (0038 + il controllo degli esauriti della 0070).
create or replace function accetta_ordine_esterno(
  p_negozio uuid, p_canale canale_ordine, p_tipo tipo_ordine, p_id_esterno text,
  p_ora timestamptz, p_note text, p_righe jsonb
) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_ordine ordine;
  v_slot timestamptz;
  v_giorno date;
  v_cap record;
  v_pizze numeric; v_esauriti text;
  v_piattaforma boolean := p_canale in ('glovo', 'deliveroo', 'justeat');
  v_avviso text;
  r jsonb; f jsonb; v_id_riga uuid;
begin
  if p_id_esterno is not null then
    select * into v_ordine from ordine
    where id_negozio = p_negozio and canale = p_canale and id_esterno = p_id_esterno;
    if found then
      return jsonb_build_object('esito', 'duplicato', 'id', v_ordine.id, 'numero', v_ordine.numero);
    end if;
  end if;

  if p_righe is null or jsonb_typeof(p_righe) <> 'array' or jsonb_array_length(p_righe) = 0 then
    return jsonb_build_object('esito', 'errore', 'motivo', 'nessuna riga');
  end if;

  if p_canale in ('web', 'app', 'totem') then
    select string_agg(distinct p.nome, ', ') into v_esauriti
      from jsonb_array_elements(p_righe) x(riga)
      join prodotto p on p.id = nullif(x.riga->>'id_prodotto', '')::uuid
     where p.esaurito_fino > now();
    if v_esauriti is not null then
      return jsonb_build_object('esito', 'esaurito', 'prodotti', v_esauriti);
    end if;
  end if;

  with tutte as (
    select x.riga from jsonb_array_elements(p_righe) x(riga)
    union all
    select y.riga from jsonb_array_elements(p_righe) x(riga), jsonb_array_elements(coalesce(x.riga->'figlie', '[]'::jsonb)) y(riga)
  )
  select coalesce(sum(coalesce((t.riga->>'quantita')::numeric, 1)), 0) into v_pizze
  from tutte t
  left join prodotto p on p.id = nullif(t.riga->>'id_prodotto', '')::uuid
  left join categoria c on c.id = p.id_categoria
  where coalesce(c.impegna_forno, coalesce(t.riga->>'destinazione', 'cucina') = 'cucina');

  v_slot := to_timestamp(floor(extract(epoch from coalesce(p_ora, now())) / 900) * 900);
  v_giorno := (v_slot at time zone 'Europe/Rome')::date;

  select * into v_cap from capacita_giorno(p_negozio, v_giorno) where inizio = v_slot;
  if v_cap is null and p_tipo in ('banco', 'tavolo') then
    v_pizze := 0;
  elsif v_cap is null then
    if not v_piattaforma then return jsonb_build_object('esito', 'fuori_orario', 'slot', v_slot); end if;
    v_avviso := 'FUORI DAI QUARTI';
  end if;
  if v_cap is not null and v_cap.bloccata_produzione and v_pizze > 0 then
    if not v_piattaforma then return jsonb_build_object('esito', 'pieno', 'motivo', 'produzione bloccata', 'slot', v_slot); end if;
    v_avviso := 'ENTRATO A PRODUZIONE BLOCCATA';
  end if;
  if v_cap is not null and v_pizze > 0 and v_cap.pizze_occupate + v_pizze > v_cap.pizze_max then
    if not v_piattaforma then
      return jsonb_build_object('esito', 'pieno', 'motivo', 'pizze', 'slot', v_slot,
        'libere', greatest(v_cap.pizze_max - v_cap.pizze_occupate, 0), 'massimo', v_cap.pizze_max, 'giorno', v_giorno);
    end if;
    v_avviso := coalesce(v_avviso, 'ENTRATO A QUARTO PIENO');
  end if;
  if v_cap is not null and p_tipo = 'domicilio' and (v_cap.bloccata_consegne or v_cap.consegne_occupate + 1 > v_cap.consegne_max) then
    if not v_piattaforma then
      return jsonb_build_object('esito', 'pieno', 'motivo', 'consegne', 'slot', v_slot, 'massimo', v_cap.consegne_max, 'giorno', v_giorno);
    end if;
    v_avviso := coalesce(v_avviso, 'ENTRATO A QUARTO PIENO');
  end if;

  insert into ordine (id_negozio, canale, tipo, ora_consegna, note, id_esterno)
  values (p_negozio, p_canale, p_tipo, p_ora, nullif(concat_ws(' · ', v_avviso, p_note), ''), p_id_esterno)
  returning * into v_ordine;

  for r in select * from jsonb_array_elements(p_righe) loop
    insert into ordine_riga (id_ordine, id_prodotto, descrizione, quantita, prezzo_unit, variazioni, note, destinazione)
    values (v_ordine.id, nullif(r->>'id_prodotto', '')::uuid, r->>'descrizione', coalesce((r->>'quantita')::numeric, 1),
            coalesce((r->>'prezzo_unit')::numeric, 0), coalesce(r->'variazioni', '[]'::jsonb), r->>'note',
            coalesce(r->>'destinazione', 'cucina'))
    returning id into v_id_riga;
    for f in select * from jsonb_array_elements(coalesce(r->'figlie', '[]'::jsonb)) loop
      insert into ordine_riga (id_ordine, id_prodotto, descrizione, quantita, prezzo_unit, variazioni, note, destinazione, id_riga_padre)
      values (v_ordine.id, nullif(f->>'id_prodotto', '')::uuid, f->>'descrizione',
              coalesce((f->>'quantita')::numeric, 1) * coalesce((r->>'quantita')::numeric, 1),
              coalesce((f->>'prezzo_unit')::numeric, 0), coalesce(f->'variazioni', '[]'::jsonb), f->>'note',
              coalesce(f->>'destinazione', 'cucina'), v_id_riga);
    end loop;
  end loop;

  update ordine
     set totale = (
       select coalesce(sum((prezzo_unit + coalesce((
         select sum((v->>'prezzo')::numeric) from jsonb_array_elements(variazioni) v), 0)) * quantita), 0)
       from ordine_riga where id_ordine = v_ordine.id)
   where id = v_ordine.id
   returning * into v_ordine;

  return jsonb_build_object('esito', 'accettato', 'id', v_ordine.id, 'numero', v_ordine.numero, 'totale', v_ordine.totale,
                            'avviso', v_avviso);
end $$;
