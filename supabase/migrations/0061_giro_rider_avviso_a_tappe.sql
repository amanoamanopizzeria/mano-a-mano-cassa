-- Il giro del rider a tappe (Edoardo, 25/10/2026: «prende due consegne, parte con la più vicina e prosegue.
-- L'importante è notificare al cliente solo dopo che ha già consegnato la prima»).
-- consegna.tappa = posizione nel giro (1, 2, …) decisa dall'app quando il rider parte;
-- consegna.in_viaggio_il = quando il rider è davvero diretto da QUEL cliente. L'avviso «è partito, seguilo»
-- nasce da qui e non più dal ritiro: alla prima tappa subito, alla seconda quando la prima è consegnata.
alter table consegna add column if not exists tappa smallint;
alter table consegna add column if not exists in_viaggio_il timestamptz;
update consegna set in_viaggio_il = ritirata_il where in_viaggio_il is null and ritirata_il is not null;

-- L'avviso al cliente: quando la sua consegna diventa «in viaggio»
create or replace function avviso_consegna() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_tel text; v_num text; v_rider text;
begin
  if new.in_viaggio_il is not null and old.in_viaggio_il is null then
    select cl.telefono, o.numero_visibile into v_tel, v_num
      from ordine o left join cliente cl on cl.id = o.id_cliente where o.id = new.id_ordine;
    select split_part(nome, ' ', 1) into v_rider from rider where id = new.id_rider;
    insert into notifica_cliente (id_ordine, tipo, telefono, testo, stato)
    values (new.id_ordine, 'partita', v_tel,
            'A Mano a Mano: il tuo ordine ' || coalesce(v_num, '') || ' è partito' ||
            coalesce(' con ' || v_rider, '') || '. Seguilo qui: https://mano-a-mano-cassa.vercel.app/segui/' || new.token,
            case when v_tel is null then 'senza_numero' else 'da_inviare' end)
    on conflict (id_ordine, tipo) do nothing;
  end if;
  return new;
end $$;

-- La prossima tappa del rider diventa «in viaggio» (se non ce n'è già una)
create or replace function prossima_tappa(p_rider uuid) returns void
language sql security definer set search_path = public, pg_temp as $$
  update consegna set in_viaggio_il = now()
  where id = (select id from consegna
              where id_rider = p_rider and stato = 'ritirata' and in_viaggio_il is null
              order by tappa nulls last, ritirata_il limit 1)
    and not exists (select 1 from consegna where id_rider = p_rider and stato = 'ritirata' and in_viaggio_il is not null)
$$;
revoke all on function prossima_tappa(uuid) from public, anon, authenticated;

-- Un ritiro o una consegna singola: dopo, se il rider non sta già andando da qualcuno, parte la prossima tappa
create or replace function aggiorna_consegna(p_id uuid, p_stato stato_consegna) returns consegna
language plpgsql security definer set search_path = public as $$
declare c consegna;
begin
  if not e_rider() then raise exception 'Solo un rider'; end if;
  if p_stato not in ('ritirata','consegnata') then raise exception 'Stato non ammesso'; end if;
  update consegna
  set stato = p_stato,
      ritirata_il   = case when p_stato = 'ritirata'   then coalesce(ritirata_il, now()) else ritirata_il end,
      consegnata_il = case when p_stato = 'consegnata' then now() else consegnata_il end,
      in_viaggio_il = case when p_stato = 'consegnata' then coalesce(in_viaggio_il, now()) else in_viaggio_il end
  where id = p_id and id_rider = rider_corrente()
  returning * into c;
  if c.id is null then raise exception 'Consegna non tua'; end if;
  if p_stato = 'consegnata' then
    update ordine set stato = 'consegnato', aggiornato_il = now() where id = c.id_ordine;
  end if;
  perform prossima_tappa(c.id_rider);
  return c;
end $$;

-- «Parto»: tutte le consegne prese, nell'ordine del giro deciso dall'app (la più vicina per prima)
create or replace function parto_giro(p_ids uuid[]) returns int
language plpgsql security definer set search_path = public as $$
declare v_rider uuid := rider_corrente(); n int;
begin
  if not e_rider() or v_rider is null then raise exception 'Solo un rider'; end if;
  update consegna c
  set stato = 'ritirata', ritirata_il = coalesce(c.ritirata_il, now()), tappa = t.ord
  from unnest(p_ids) with ordinality as t(id, ord)
  where c.id = t.id and c.id_rider = v_rider and c.stato in ('assegnata', 'ritirata');
  get diagnostics n = row_count;
  perform prossima_tappa(v_rider);
  return n;
end $$;
revoke all on function parto_giro(uuid[]) from public, anon;
grant execute on function parto_giro(uuid[]) to authenticated;

-- /segui: la posizione del rider si vede solo quando sta venendo da te; prima «sta finendo un'altra consegna»
create or replace function segui_consegna(p_token text) returns jsonb
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select jsonb_build_object(
    'numero', o.numero_visibile, 'stato', c.stato, 'stato_ordine', o.stato,
    'ora_consegna', o.ora_consegna, 'assegnata_il', c.assegnata_il, 'partita_il', c.in_viaggio_il, 'consegnata_il', c.consegnata_il,
    'prima_un_altra', c.stato = 'ritirata' and c.in_viaggio_il is null,
    'rider', split_part(r.nome, ' ', 1),
    'rider_pos', case when c.stato = 'ritirata' and c.in_viaggio_il is not null and r.ultima_lat is not null
                      then jsonb_build_object('lat', r.ultima_lat, 'lng', r.ultima_lng, 'il', r.ultima_pos_il) end,
    'destinazione', case when i.lat is not null then jsonb_build_object('lat', i.lat, 'lng', i.lng) end
  )
  from consegna c
  join ordine o on o.id = c.id_ordine
  left join rider r on r.id = c.id_rider
  left join indirizzo i on i.id = o.id_indirizzo
  where length(coalesce(p_token, '')) >= 16 and c.token = p_token
$$;

-- La lista del rider con la tappa e «in viaggio» (funzione nuova: la vecchia resta per chi la chiama)
create or replace function consegne_rider4()
returns table(id uuid, id_ordine uuid, stato stato_consegna, id_rider uuid, numero bigint, numero_visibile text, stato_ordine text,
  tipo tipo_ordine, canale canale_ordine, totale numeric, ora_consegna timestamptz, note text, contanti_da_incassare numeric,
  cliente_nome text, cliente_telefono text, cliente_note text, via text, civico text, cap text, citta text,
  lat double precision, lng double precision, zona text, righe jsonb, pagamento text, pagato_online boolean, paga_con numeric,
  consegnata_il timestamptz, tappa smallint, in_viaggio_il timestamptz)
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select r.*, c.tappa, c.in_viaggio_il
  from consegne_rider3() r join consegna c on c.id = r.id
  order by r.stato = 'consegnata', c.tappa nulls last, r.ora_consegna nulls last
$$;
revoke all on function consegne_rider4() from public, anon;
grant execute on function consegne_rider4() to authenticated;

-- Il trigger deve guardare «in viaggio», non più lo stato: «AFTER UPDATE OF stato» non vede il nuovo passaggio
create or replace trigger consegna_avviso after update of in_viaggio_il on consegna
  for each row execute function avviso_consegna();
