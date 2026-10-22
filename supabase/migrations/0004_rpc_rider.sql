-- Mano a Mano Cassa — funzioni per l'app Rider
-- Il rider lavora tramite funzioni SECURITY DEFINER che controllano il ruolo:
-- vede le consegne libere e le proprie (con indirizzo e ordine), ne prende una
-- in modo atomico, aggiorna lo stato e segnala la posizione.

-- Lista: consegne libere (da_assegnare) + le mie non concluse.
create or replace function consegne_rider()
returns table (
  id uuid, id_ordine uuid, stato stato_consegna, id_rider uuid,
  numero bigint, tipo tipo_ordine, canale canale_ordine, totale numeric,
  ora_consegna timestamptz, note text, contanti_da_incassare numeric,
  cliente_nome text, cliente_telefono text,
  via text, civico text, cap text, citta text, lat double precision, lng double precision,
  zona text, righe jsonb
)
language sql stable security definer set search_path = public as $$
  select c.id, c.id_ordine, c.stato, c.id_rider,
         o.numero, o.tipo, o.canale, o.totale, o.ora_consegna, o.note, c.contanti_da_incassare,
         cl.nome, cl.telefono,
         i.via, i.civico, i.cap, i.citta, i.lat, i.lng,
         z.nome,
         coalesce((select jsonb_agg(jsonb_build_object('descrizione', r.descrizione, 'quantita', r.quantita, 'variazioni', r.variazioni))
                   from ordine_riga r where r.id_ordine = o.id), '[]'::jsonb)
  from consegna c
  join ordine o on o.id = c.id_ordine
  left join cliente cl on cl.id = o.id_cliente
  left join indirizzo i on i.id = o.id_indirizzo
  left join zona z on z.id = o.id_zona
  where ruolo_corrente() = 'rider'
    and (c.stato = 'da_assegnare' or (c.id_rider = rider_corrente() and c.stato in ('assegnata','ritirata')))
  order by o.ora_consegna nulls last, o.creato_il
$$;

-- Prende una consegna libera (atomico: solo se è ancora da_assegnare).
create or replace function prendi_consegna(p_id uuid)
returns consegna language plpgsql security definer set search_path = public as $$
declare c consegna;
begin
  if ruolo_corrente() <> 'rider' or rider_corrente() is null then
    raise exception 'Solo un rider può prendere una consegna';
  end if;
  update consegna set id_rider = rider_corrente(), stato = 'assegnata', assegnata_il = now()
  where id = p_id and stato = 'da_assegnare'
  returning * into c;
  if c.id is null then raise exception 'Consegna già presa da un altro rider'; end if;
  update ordine set stato = 'in_consegna', aggiornato_il = now()
  where id = c.id_ordine and stato in ('ricevuto','in_preparazione','pronto');
  return c;
end $$;

-- Aggiorna lo stato di una propria consegna: ritirata | consegnata.
create or replace function aggiorna_consegna(p_id uuid, p_stato stato_consegna)
returns consegna language plpgsql security definer set search_path = public as $$
declare c consegna;
begin
  if ruolo_corrente() <> 'rider' then raise exception 'Solo un rider'; end if;
  if p_stato not in ('ritirata','consegnata') then raise exception 'Stato non ammesso'; end if;
  update consegna
  set stato = p_stato,
      ritirata_il   = case when p_stato = 'ritirata'   then now() else ritirata_il end,
      consegnata_il = case when p_stato = 'consegnata' then now() else consegnata_il end
  where id = p_id and id_rider = rider_corrente()
  returning * into c;
  if c.id is null then raise exception 'Consegna non tua'; end if;
  if p_stato = 'consegnata' then
    update ordine set stato = 'consegnato', aggiornato_il = now() where id = c.id_ordine;
  end if;
  return c;
end $$;

-- Segnala la posizione: storico + ultima posizione sulla scheda rider.
create or replace function segnala_posizione(p_lat double precision, p_lng double precision)
returns void language plpgsql security definer set search_path = public as $$
begin
  if ruolo_corrente() <> 'rider' or rider_corrente() is null then raise exception 'Solo un rider'; end if;
  insert into rider_posizione (id_rider, lat, lng) values (rider_corrente(), p_lat, p_lng);
  update rider set ultima_lat = p_lat, ultima_lng = p_lng, ultima_pos_il = now() where id = rider_corrente();
end $$;

-- La cassa vede i rider attivi con l'ultima posizione (anche senza posizione).
create or replace function rider_in_mappa()
returns table (id uuid, nome text, lat double precision, lng double precision, aggiornata_il timestamptz, consegne_in_corso int)
language sql stable security definer set search_path = public as $$
  select r.id, r.nome, r.ultima_lat, r.ultima_lng, r.ultima_pos_il,
         (select count(*)::int from consegna c where c.id_rider = r.id and c.stato in ('assegnata','ritirata'))
  from rider r
  where e_staff() and r.attivo
  order by r.nome
$$;

alter publication supabase_realtime add table rider;
