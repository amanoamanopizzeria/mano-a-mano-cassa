-- Edoardo, 24/10/2026: il rider di prova «mettilo, usalo»: assegnazione → avviso al cliente che la
-- consegna è partita → tracciata sulla mappa in tempo reale → consegnata.
--
-- 1) È rider chi ha un rider collegato al profilo (profilo.id_rider), non solo il ruolo 'rider':
--    così l'utenza della cassa fa anche da «Rider di prova» (mig. 0031) e il giro si prova davvero.
-- 2) Ogni consegna ha un link pubblico per il cliente (token) e segui_consegna(token) per anon:
--    stato, rider (solo il nome), dov'è adesso mentre è in viaggio, la destinazione.
-- 3) Quando il rider la ritira (parte), nasce l'avviso al cliente in notifica_cliente: il testo
--    col link. Si manda dal telefono (WhatsApp) finché non c'è un fornitore collegato.

create or replace function e_rider() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select rider_corrente() is not null
$$;
grant execute on function e_rider() to authenticated;

create or replace function prendi_consegna(p_id uuid)
returns consegna language plpgsql security definer set search_path = public as $$
declare c consegna;
begin
  if not e_rider() then raise exception 'Solo un rider può prendere una consegna'; end if;
  update consegna set id_rider = rider_corrente(), stato = 'assegnata', assegnata_il = now()
  where id = p_id and stato = 'da_assegnare'
  returning * into c;
  if c.id is null then raise exception 'Consegna già presa da un altro rider'; end if;
  update ordine set stato = 'in_consegna', aggiornato_il = now()
  where id = c.id_ordine and stato in ('ricevuto','in_preparazione','pronto');
  return c;
end $$;

create or replace function aggiorna_consegna(p_id uuid, p_stato stato_consegna)
returns consegna language plpgsql security definer set search_path = public as $$
declare c consegna;
begin
  if not e_rider() then raise exception 'Solo un rider'; end if;
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

create or replace function segnala_posizione(p_lat double precision, p_lng double precision)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not e_rider() then raise exception 'Solo un rider'; end if;
  insert into rider_posizione (id_rider, lat, lng) values (rider_corrente(), p_lat, p_lng);
  update rider set ultima_lat = p_lat, ultima_lng = p_lng, ultima_pos_il = now() where id = rider_corrente();
end $$;

create or replace function consegne_rider2()
returns table (
  id uuid, id_ordine uuid, stato stato_consegna, id_rider uuid,
  numero bigint, tipo tipo_ordine, canale canale_ordine, totale numeric,
  ora_consegna timestamptz, note text, contanti_da_incassare numeric,
  cliente_nome text, cliente_telefono text, cliente_note text,
  via text, civico text, cap text, citta text, lat double precision, lng double precision,
  zona text, righe jsonb, pagamento text, pagato_online boolean, paga_con numeric, consegnata_il timestamptz
)
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select c.id, c.id_ordine, c.stato, c.id_rider,
         o.numero, o.tipo, o.canale, o.totale, o.ora_consegna, o.note, c.contanti_da_incassare,
         coalesce(cl.nome, o.nome_cliente), cl.telefono, cl.note,
         i.via, i.civico, i.cap, i.citta, i.lat, i.lng,
         z.nome,
         coalesce((select jsonb_agg(jsonb_build_object('descrizione', r.descrizione, 'quantita', r.quantita, 'variazioni', r.variazioni) order by r.id_riga_padre nulls first)
                   from ordine_riga r where r.id_ordine = o.id), '[]'::jsonb),
         o.pagamento, o.pagato_online, o.paga_con, c.consegnata_il
  from consegna c
  join ordine o on o.id = c.id_ordine
  left join cliente cl on cl.id = o.id_cliente
  left join indirizzo i on i.id = o.id_indirizzo
  left join zona z on z.id = o.id_zona
  where e_rider()
    and (c.stato = 'da_assegnare'
         or (c.id_rider = rider_corrente() and (c.stato in ('assegnata', 'ritirata') or (c.stato = 'consegnata' and c.saldata_il is null))))
  order by c.stato = 'consegnata', o.ora_consegna nulls last, o.creato_il
$$;

-- 2) il link per il cliente
alter table consegna add column if not exists token text;
update consegna set token = encode(extensions.gen_random_bytes(12), 'hex') where token is null;
alter table consegna alter column token set default encode(extensions.gen_random_bytes(12), 'hex');
create unique index if not exists consegna_token_idx on consegna(token);

create or replace function segui_consegna(p_token text) returns jsonb
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select jsonb_build_object(
    'numero', o.numero_visibile, 'stato', c.stato, 'stato_ordine', o.stato,
    'ora_consegna', o.ora_consegna, 'assegnata_il', c.assegnata_il, 'partita_il', c.ritirata_il, 'consegnata_il', c.consegnata_il,
    'rider', split_part(r.nome, ' ', 1),
    'rider_pos', case when c.stato = 'ritirata' and r.ultima_lat is not null
                      then jsonb_build_object('lat', r.ultima_lat, 'lng', r.ultima_lng, 'il', r.ultima_pos_il) end,
    'destinazione', case when i.lat is not null then jsonb_build_object('lat', i.lat, 'lng', i.lng) end
  )
  from consegna c
  join ordine o on o.id = c.id_ordine
  left join rider r on r.id = c.id_rider
  left join indirizzo i on i.id = o.id_indirizzo
  where length(coalesce(p_token, '')) >= 16 and c.token = p_token
$$;
grant execute on function segui_consegna(text) to anon, authenticated;

-- 3) l'avviso al cliente
create table if not exists notifica_cliente (
  id          uuid primary key default gen_random_uuid(),
  id_ordine   uuid not null references ordine(id) on delete cascade,
  tipo        text not null,                      -- 'partita' | 'consegnata'
  telefono    text,
  testo       text not null,
  stato       text not null default 'da_inviare', -- 'da_inviare' | 'inviata' | 'senza_numero'
  creata_il   timestamptz not null default now(),
  inviata_il  timestamptz,
  unique (id_ordine, tipo)
);
alter table notifica_cliente enable row level security;
create policy notifica_staff on notifica_cliente for all using (e_staff() or e_rider()) with check (e_staff() or e_rider());

create or replace function avviso_consegna() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_tel text; v_num text; v_rider text;
begin
  if new.stato = 'ritirata' and old.stato is distinct from 'ritirata' then
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
create trigger consegna_avviso after update of stato on consegna
for each row execute function avviso_consegna();

-- l'avviso «da mandare» per la consegna, letto dal telefono del rider
create or replace function avviso_da_mandare(p_id_consegna uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object('id', n.id, 'telefono', n.telefono, 'testo', n.testo, 'stato', n.stato)
  from consegna c join notifica_cliente n on n.id_ordine = c.id_ordine and n.tipo = 'partita'
  where c.id = p_id_consegna and (e_staff() or c.id_rider = rider_corrente())
$$;
grant execute on function avviso_da_mandare(uuid) to authenticated;

create or replace function avviso_inviato(p_id uuid) returns void
language sql security definer set search_path = public, pg_temp as $$
  update notifica_cliente set stato = 'inviata', inviata_il = now() where id = p_id and (e_staff() or e_rider())
$$;
grant execute on function avviso_inviato(uuid) to authenticated;

-- il link anche alla cassa (per mandarlo se il cliente chiama «dov'è?»)
create or replace function link_consegna(p_id_ordine uuid) returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select 'https://mano-a-mano-cassa.vercel.app/segui/' || token from consegna where id_ordine = p_id_ordine and e_staff()
$$;
grant execute on function link_consegna(uuid) to authenticated;

-- la mappa del cliente si muove da sola: posizione del rider e consegna in realtime per lo staff;
-- il cliente (anon) rilegge segui_consegna ogni pochi secondi.
