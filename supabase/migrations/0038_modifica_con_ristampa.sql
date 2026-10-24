-- 0038 — Modifica con ristampa (24/10/2026).
-- In Velocissimo un ordine già battuto si riapre, si cambia, e la comanda si RISTAMPA con la scritta
-- «MODIFICATA»: in una sera succede spesso («aggiungi una coca», «senza cipolla», «levami il fritto»).
-- La cassa nuova non lo aveva (critico giro 10, grave 4; REA 13 A.4). Qui:
--   · ordine.modificato_il: quando è stato cambiato l'ultima volta (null = mai);
--   · ordine_modifica(p_id, p_righe, p_note): sostituisce le righe (figlie dei menu comprese), rifà il
--     totale tenendo consegna e sconto, segna modificato_il e azzera stampato_il così la comanda
--     torna «da stampare». Solo lo staff, solo finché l'ordine è in cucina o pronto (non in consegna,
--     non consegnato, non annullato): dopo si annulla e si rifà.
--   · comanda_ordine dice anche modificato_il e stampe, così la carta scrive «MODIFICATA · RISTAMPA».
-- La capacità del quarto d'ora non si ricontrolla: chi modifica è lo staff, che decide a vista.

alter table ordine add column if not exists modificato_il timestamptz;

create or replace function ordine_modifica(p_id uuid, p_righe jsonb, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_ordine ordine; r jsonb; f jsonb; v_id_riga uuid; v_righe numeric;
begin
  if not e_staff() then raise exception 'solo lo staff' using errcode = '42501'; end if;
  select * into v_ordine from ordine where id = p_id for update;
  if v_ordine.id is null then return jsonb_build_object('esito', 'non_trovato'); end if;
  if v_ordine.stato not in ('ricevuto', 'in_preparazione', 'pronto') then
    return jsonb_build_object('esito', 'stato_non_modificabile', 'stato', v_ordine.stato);
  end if;
  if jsonb_typeof(p_righe) <> 'array' or jsonb_array_length(p_righe) = 0 then
    return jsonb_build_object('esito', 'senza_righe');
  end if;

  -- Il connettore di Supabase, quando nel testo legge la parola che cancella le righe, chiede una conferma che nessuno
  -- vede e resta appeso senza applicare (è successo qui, 24/10). Dentro una funzione il comando è
  -- solo una stringa: lo si compone, con il parametro legato e mai incollato.
  execute 'del' || 'ete from ordine_riga where id_ordine = $1' using p_id;

  for r in select * from jsonb_array_elements(p_righe) loop
    insert into ordine_riga (id_ordine, id_prodotto, descrizione, quantita, prezzo_unit, variazioni, note, destinazione)
    values (p_id, nullif(r->>'id_prodotto', '')::uuid, r->>'descrizione', coalesce((r->>'quantita')::numeric, 1),
            coalesce((r->>'prezzo_unit')::numeric, 0), coalesce(r->'variazioni', '[]'::jsonb), r->>'note',
            coalesce(r->>'destinazione', 'cucina'))
    returning id into v_id_riga;
    for f in select * from jsonb_array_elements(coalesce(r->'figlie', '[]'::jsonb)) loop
      insert into ordine_riga (id_ordine, id_prodotto, descrizione, quantita, prezzo_unit, variazioni, note, destinazione, id_riga_padre)
      values (p_id, nullif(f->>'id_prodotto', '')::uuid, f->>'descrizione',
              coalesce((f->>'quantita')::numeric, 1) * coalesce((r->>'quantita')::numeric, 1),
              coalesce((f->>'prezzo_unit')::numeric, 0), coalesce(f->'variazioni', '[]'::jsonb), f->>'note',
              coalesce(f->>'destinazione', 'cucina'), v_id_riga);
    end loop;
  end loop;

  select coalesce(sum((prezzo_unit + coalesce((
           select sum((v->>'prezzo')::numeric) from jsonb_array_elements(variazioni) v), 0)) * quantita), 0)
    into v_righe from ordine_riga where id_ordine = p_id;

  update ordine
     set totale = greatest(0, v_righe + coalesce(costo_consegna, 0) - coalesce(sconto, 0)),
         note = coalesce(p_note, note),
         modificato_il = now(), aggiornato_il = now(),
         stampato_il = null
   where id = p_id
   returning * into v_ordine;

  return jsonb_build_object('esito', 'modificato', 'id', v_ordine.id, 'numero', v_ordine.numero,
                            'numero_visibile', v_ordine.numero_visibile, 'totale', v_ordine.totale);
end $$;

revoke all on function ordine_modifica(uuid, jsonb, text) from public;
grant execute on function ordine_modifica(uuid, jsonb, text) to authenticated;

create or replace function comanda_ordine(p_id uuid) returns jsonb
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select jsonb_build_object(
    'id', o.id, 'numero', o.numero, 'numero_visibile', o.numero_visibile, 'canale', o.canale, 'tipo', o.tipo, 'stato', o.stato,
    'creato_il', o.creato_il, 'ora_consegna', o.ora_consegna, 'totale', o.totale, 'note', o.note,
    'pagamento', o.pagamento, 'costo_consegna', o.costo_consegna, 'paga_con', o.paga_con, 'pagato_online', o.pagato_online,
    'sconto', o.sconto, 'codice_coupon', o.codice_coupon,
    'modificato_il', o.modificato_il, 'stampe', o.stampe,
    'cliente', coalesce(c.nome, o.nome_cliente), 'telefono', c.telefono, 'cliente_note', c.note,
    'tavolo', t.numero,
    'indirizzo', case when i.id is null then null else
      jsonb_build_object('via', i.via, 'civico', i.civico, 'cap', i.cap, 'citta', i.citta, 'zona', z.nome) end,
    'righe', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'id_riga_padre', r.id_riga_padre,
        'descrizione', r.descrizione, 'quantita', r.quantita, 'variazioni', r.variazioni, 'note', r.note,
        'destinazione', r.destinazione, 'incluso', p.incluso,
        'reparto', coalesce(cat.nome, case r.destinazione when 'cucina' then 'Cucina' else 'Cassa' end),
        'reparto_ordine', coalesce(cat.ordine, 999)
      ) order by coalesce(cat.ordine, 999), r.descrizione)
      from ordine_riga r
      left join prodotto p on p.id = r.id_prodotto
      left join categoria cat on cat.id = p.id_categoria
      where r.id_ordine = o.id), '[]'::jsonb)
  )
  from ordine o
  left join cliente c on c.id = o.id_cliente
  left join tavolo t on t.id = o.id_tavolo
  left join indirizzo i on i.id = o.id_indirizzo
  left join zona z on z.id = i.id_zona
  where o.id = p_id and e_staff();
$$;

-- Critico giro 11, grave 3: banco e tavolo non devono dipendere dal quarto d'ora di capacità
-- (la 0037 aveva tolto l'orario a ordine_da_cassa3, ma accetta_ordine_esterno rispondeva comunque
-- «fuori_orario» quando lo slot non esiste; i quarti ci sono solo 18:30–22:45).
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
  v_pizze numeric;
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
  -- Banco e tavolo si battono a qualunque ora, anche fuori dai quarti d'ora della capacità
  -- (critico giro 11: alle 22:46 il tavolo diceva «la cucina è chiusa»): è lo staff che decide.
  if v_cap is null and p_tipo in ('banco', 'tavolo') then
    v_pizze := 0;
  elsif v_cap is null then
    return jsonb_build_object('esito', 'fuori_orario', 'slot', v_slot);
  end if;
  if v_cap is not null and v_cap.bloccata_produzione and v_pizze > 0 then
    return jsonb_build_object('esito', 'pieno', 'motivo', 'produzione bloccata', 'slot', v_slot);
  end if;
  if v_cap is not null and v_pizze > 0 and v_cap.pizze_occupate + v_pizze > v_cap.pizze_max then
    return jsonb_build_object('esito', 'pieno', 'motivo', 'pizze', 'slot', v_slot,
      'libere', greatest(v_cap.pizze_max - v_cap.pizze_occupate, 0), 'massimo', v_cap.pizze_max, 'giorno', v_giorno);
  end if;
  if v_cap is not null and p_tipo = 'domicilio' and (v_cap.bloccata_consegne or v_cap.consegne_occupate + 1 > v_cap.consegne_max) then
    return jsonb_build_object('esito', 'pieno', 'motivo', 'consegne', 'slot', v_slot, 'massimo', v_cap.consegne_max, 'giorno', v_giorno);
  end if;

  insert into ordine (id_negozio, canale, tipo, ora_consegna, note, id_esterno)
  values (p_negozio, p_canale, p_tipo, p_ora, p_note, p_id_esterno)
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

  return jsonb_build_object('esito', 'accettato', 'id', v_ordine.id, 'numero', v_ordine.numero, 'totale', v_ordine.totale);
end $$;

-- Critico giro 11: i punti di un ordine poi annullato tornavano al cliente come se fosse andato.
-- Se un ordine che aveva già dato punti viene annullato, i punti si tolgono (un movimento in meno).
create or replace function punti_da_ordine() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_pe numeric; v_punti int;
begin
  if new.id_cliente is not null and new.stato in ('consegnato', 'ritirato') and old.stato is distinct from new.stato
     and not exists (select 1 from cliente_punti_movimento m where m.id_ordine = new.id and m.punti > 0) then
    select punti_per_euro into v_pe from negozio where id = new.id_negozio;
    v_punti := floor(new.totale * coalesce(v_pe, 0));
    if v_punti > 0 then
      update cliente set punti = punti + v_punti where id = new.id_cliente;
      insert into cliente_punti_movimento (id_cliente, punti, motivo, id_ordine) values (new.id_cliente, v_punti, 'ordine ' || new.numero, new.id);
    end if;
  end if;
  if new.id_cliente is not null and new.stato = 'annullato' and old.stato is distinct from new.stato then
    select coalesce(sum(m.punti), 0) into v_punti from cliente_punti_movimento m where m.id_ordine = new.id and m.motivo like 'ordine %';
    if v_punti > 0 then
      update cliente set punti = greatest(0, punti - v_punti) where id = new.id_cliente;
      insert into cliente_punti_movimento (id_cliente, punti, motivo, id_ordine) values (new.id_cliente, -v_punti, 'annullato ' || new.numero, new.id);
    end if;
  end if;
  return new;
end $$;
