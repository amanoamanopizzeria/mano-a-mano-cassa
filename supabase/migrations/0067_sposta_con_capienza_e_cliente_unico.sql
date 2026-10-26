-- Controllo ECC del 26/10/2026, punti 7 e 9.
-- 7) Spostare un ordine (l'orologio in cassa) ignorava la capienza: si poteva mettere in un quarto
--    d'ora già pieno (22/22) mentre gli ordini esterni lì venivano rifiutati. Ora ordine_sposta
--    risponde «pieno» con i numeri, e la cassa sposta lo stesso solo con un secondo tocco
--    (ordine_sposta_forzato): la decisione resta allo staff, ma non succede per sbaglio.
-- 9) Due postazioni che salvano lo stesso numero insieme creavano due clienti. Ora il telefono
--    normalizzato (le ultime 9 cifre) è unico, e salva_cliente3 riprende quello appena nato.

create or replace function ordine_sposta(p_id uuid, p_ora timestamptz)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare o ordine; v_slot timestamptz; v_cap record; v_pizze numeric; v_mio_slot timestamptz;
begin
  if not e_staff() then raise exception 'Solo lo staff'; end if;
  select * into o from ordine where id = p_id;
  if o.id is null then raise exception 'Ordine non trovato'; end if;
  if o.stato in ('consegnato', 'ritirato', 'annullato') then raise exception 'Ordine già chiuso: non si sposta'; end if;

  v_slot := to_timestamp(floor(extract(epoch from p_ora) / 900) * 900);
  v_mio_slot := to_timestamp(floor(extract(epoch from coalesce(o.ora_consegna, o.creato_il)) / 900) * 900);
  select * into v_cap from capacita_giorno(o.id_negozio, (v_slot at time zone 'Europe/Rome')::date) where inizio = v_slot;
  if v_cap is not null and v_slot <> v_mio_slot then
    select coalesce(sum(r.quantita), 0) into v_pizze
      from ordine_riga r left join prodotto p on p.id = r.id_prodotto left join categoria c on c.id = p.id_categoria
     where r.id_ordine = o.id and coalesce(c.impegna_forno, r.destinazione = 'cucina');
    if v_pizze > 0 and (v_cap.bloccata_produzione or v_cap.pizze_occupate + v_pizze > v_cap.pizze_max) then
      return jsonb_build_object('esito', 'pieno', 'motivo', 'pizze', 'occupate', v_cap.pizze_occupate,
                                'massimo', v_cap.pizze_max, 'pizze', v_pizze);
    end if;
    if o.tipo = 'domicilio' and (v_cap.bloccata_consegne or v_cap.consegne_occupate + 1 > v_cap.consegne_max) then
      return jsonb_build_object('esito', 'pieno', 'motivo', 'consegne', 'occupate', v_cap.consegne_occupate,
                                'massimo', v_cap.consegne_max);
    end if;
  end if;

  update ordine set ora_consegna = p_ora, aggiornato_il = now() where id = p_id;
  return jsonb_build_object('esito', 'spostato', 'ora', p_ora);
end $$;

-- lo staff sposta lo stesso, sapendo che il quarto è pieno
create or replace function ordine_sposta_forzato(p_id uuid, p_ora timestamptz)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare o ordine;
begin
  if not e_staff() then raise exception 'Solo lo staff'; end if;
  select * into o from ordine where id = p_id;
  if o.id is null then raise exception 'Ordine non trovato'; end if;
  if o.stato in ('consegnato', 'ritirato', 'annullato') then raise exception 'Ordine già chiuso: non si sposta'; end if;
  update ordine set ora_consegna = p_ora, aggiornato_il = now() where id = p_id;
  return jsonb_build_object('esito', 'spostato', 'ora', p_ora, 'forzato', true);
end $$;
revoke all on function ordine_sposta_forzato(uuid, timestamptz) from public, anon;
grant execute on function ordine_sposta_forzato(uuid, timestamptz) to authenticated;

create unique index if not exists cliente_telefono_unico
  on cliente (right(regexp_replace(coalesce(telefono, ''), '\D', '', 'g'), 9))
  where length(right(regexp_replace(coalesce(telefono, ''), '\D', '', 'g'), 9)) >= 6;

create or replace function salva_cliente3(p_telefono text, p_nome text, p_note text, p_via text, p_civico text,
  p_cap text, p_citta text, p_lat double precision, p_lng double precision, p_place_id text, p_note_consegna text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_chiave text := right(regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g'), 9);
  v_id uuid; v_ind uuid;
begin
  if not e_staff() then raise exception 'solo lo staff' using errcode = '42501'; end if;
  if length(v_chiave) < 6 then raise exception 'Telefono non valido: servono almeno 6 cifre'; end if;
  select id into v_id from cliente
   where right(regexp_replace(coalesce(telefono, ''), '\D', '', 'g'), 9) = v_chiave
   order by creato_il limit 1;
  if v_id is null then
    begin
      insert into cliente (telefono, nome, note) values (p_telefono, nullif(p_nome, ''), nullif(p_note, '')) returning id into v_id;
    exception when unique_violation then
      -- l'ha appena salvato un'altra postazione: si aggiorna quello
      select id into v_id from cliente
       where right(regexp_replace(coalesce(telefono, ''), '\D', '', 'g'), 9) = v_chiave limit 1;
      update cliente set nome = coalesce(nullif(p_nome, ''), nome), note = coalesce(p_note, note) where id = v_id;
    end;
  else
    update cliente set nome = coalesce(nullif(p_nome, ''), nome), note = coalesce(p_note, note) where id = v_id;
  end if;
  if p_via is not null and p_via <> '' then
    select id into v_ind from indirizzo
     where id_cliente = v_id and lower(via) = lower(p_via) and coalesce(civico, '') = coalesce(p_civico, '') limit 1;
    if v_ind is null then
      insert into indirizzo (id_cliente, via, civico, cap, citta, lat, lng, place_id, note)
      values (v_id, p_via, nullif(p_civico, ''), p_cap, coalesce(p_citta, 'Roma'), p_lat, p_lng, p_place_id, nullif(p_note_consegna, ''))
      returning id into v_ind;
    else
      update indirizzo set note = coalesce(nullif(p_note_consegna, ''), note),
             lat = coalesce(p_lat, lat), lng = coalesce(p_lng, lng), place_id = coalesce(p_place_id, place_id)
       where id = v_ind;
    end if;
  end if;
  return jsonb_build_object('esito', 'salvato', 'id', v_id, 'id_indirizzo', v_ind);
end $$;
