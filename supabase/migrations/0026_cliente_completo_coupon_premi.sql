-- Mano a Mano Cassa — 0026: il cliente completo, i coupon e i premi (23/10/2026).
-- Dal REA (docs/rea/01_BACKOFFICE.md §1.6, 06_DATI.md §6.5, 02_APP_CLIENTE.md §9.20–22): il cliente di
-- Velocissimo ha punti, credito, card, tag (quasi tutti messi dai coupon), black list, consenso,
-- compleanno; i 54 coupon sono di cinque categorie (COUPON, CODICI SCONTO, PREMI, ACTIVE CAMPAIGN,
-- WHATSAPP) con regole: solo domicilio/ritiro, fascia oraria, minimo, percentuale o importo o prodotto
-- omaggio, quantità, validità, «escludi da coupon» sulla categoria, tag al cliente all'uso; i 3 premi
-- sono coupon riscattati coi punti. Qui le stesse tabelle; in cassa il codice si batte a mano
-- (il barcode dopo). I valori dei premi in punti e i punti per euro NON sono stati letti nel
-- back-office: si chiedono a Edoardo (docs/rea/07_GAP.md §7.4) e intanto i premi restano spenti.

-- 1) il cliente
alter table cliente add column if not exists azienda text;
alter table cliente add column if not exists punti int not null default 0;
alter table cliente add column if not exists credito numeric(10,2) not null default 0;
alter table cliente add column if not exists card text;
alter table cliente add column if not exists tag text[] not null default '{}';
alter table cliente add column if not exists black_list boolean not null default false;
alter table cliente add column if not exists consenso_marketing boolean not null default false;
alter table cliente add column if not exists nato_il date;
alter table cliente add column if not exists id_velocissimo int;          -- per l'import quando si passa

create table if not exists cliente_punti_movimento (
  id          uuid primary key default gen_random_uuid(),
  id_cliente  uuid not null references cliente(id) on delete cascade,
  punti       int not null,                                  -- + accredito, − riscatto
  motivo      text not null,                                 -- «ordine 123», «premio PIZZA SPECIALE», «a mano»
  id_ordine   uuid references ordine(id) on delete set null,
  creato_da   uuid default auth.uid(),
  creato_il   timestamptz not null default now()
);
alter table cliente_punti_movimento enable row level security;
create policy cliente_punti_staff on cliente_punti_movimento for all using (e_staff()) with check (e_staff());

alter table negozio add column if not exists punti_per_euro numeric(6,2) not null default 1;   -- da confermare con Edoardo
alter table categoria add column if not exists escludi_da_coupon boolean not null default false;

-- 2) i coupon
create table if not exists coupon (
  id                uuid primary key default gen_random_uuid(),
  codice            text not null unique,                       -- quello che si batte in cassa (maiuscolo)
  nome              text not null,
  categoria         text not null default 'coupon' check (categoria in ('coupon', 'codice_sconto', 'premio', 'active_campaign', 'whatsapp')),
  tipo_sconto       text not null check (tipo_sconto in ('percentuale', 'importo', 'prodotto')),
  valore            numeric(10,2) not null default 0,           -- % o €; 0 col prodotto omaggio
  id_prodotto_omaggio uuid references prodotto(id) on delete set null,
  minimo_ordine     numeric(10,2) not null default 0,
  solo_tipi         tipo_ordine[],                              -- null = tutti; es. {domicilio, ritiro}
  dalle             time, alle time,                            -- fascia oraria, null = sempre
  valido_dal        date, valido_al date,
  quantita          int,                                        -- null = infiniti
  usati             int not null default 0,
  costo_punti       int,                                        -- solo i premi
  tag_cliente       text,                                       -- il tag che mette al cliente quando lo usa
  solo_primo_ordine boolean not null default false,
  una_volta_per_cliente boolean not null default false,
  attivo            boolean not null default true,
  creato_il         timestamptz not null default now()
);
alter table coupon enable row level security;
create policy coupon_read  on coupon for select using (auth.role() = 'authenticated');
create policy coupon_write on coupon for all using (e_staff()) with check (e_staff());

-- i coupon emessi a un cliente (barcode), come /issuedcoupon: ottenuto, validità, usato su quale ordine
create table if not exists coupon_emesso (
  id            uuid primary key default gen_random_uuid(),
  id_coupon     uuid not null references coupon(id) on delete cascade,
  id_cliente    uuid references cliente(id) on delete set null,
  barcode       text unique,
  ottenuto_il   timestamptz not null default now(),
  valido_dal    timestamptz, valido_al timestamptz,
  usato_il      timestamptz,
  id_ordine     uuid references ordine(id) on delete set null,
  sconto        numeric(10,2),
  importo_ordine numeric(10,2),
  usato_da      uuid
);
create index if not exists coupon_emesso_cliente_idx on coupon_emesso(id_cliente, usato_il);
alter table coupon_emesso enable row level security;
create policy coupon_emesso_staff on coupon_emesso for all using (e_staff()) with check (e_staff());

alter table ordine add column if not exists id_coupon uuid references coupon(id) on delete set null;
alter table ordine add column if not exists codice_coupon text;
alter table ordine add column if not exists sconto numeric(10,2) not null default 0;

-- 3) lo sconto di un coupon su un carrello: le righe delle categorie «escludi da coupon» non contano
create or replace function coupon_sconto(p_coupon coupon, p_righe jsonb)
returns numeric language sql stable as $$
  with r as (
    select coalesce((x->>'prezzo_unit')::numeric, 0) + coalesce((select sum((v->>'prezzo')::numeric) from jsonb_array_elements(coalesce(x->'variazioni', '[]'::jsonb)) v), 0) as unit,
           coalesce((x->>'quantita')::numeric, 1) as q,
           nullif(x->>'id_prodotto', '')::uuid as id_prodotto
    from jsonb_array_elements(p_righe) x
  ),
  base as (
    select coalesce(sum(r.unit * r.q), 0) as scontabile
    from r left join prodotto p on p.id = r.id_prodotto left join categoria c on c.id = p.id_categoria
    where not coalesce(c.escludi_da_coupon, false)
  )
  select round(case p_coupon.tipo_sconto
    when 'percentuale' then (select scontabile from base) * p_coupon.valore / 100
    when 'importo' then least(p_coupon.valore, (select scontabile from base))
    else coalesce((select p.prezzo from prodotto p where p.id = p_coupon.id_prodotto_omaggio), 0)
  end, 2)
$$;

-- 4) verifica: si può usare questo codice, adesso, su questo carrello, per questo cliente?
create or replace function coupon_verifica(p_codice text, p_id_cliente uuid, p_tipo tipo_ordine, p_righe jsonb, p_ora timestamptz default null)
returns jsonb language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
declare c coupon; v_tot numeric; v_ora time; v_giorno date; v_cl cliente; v_sconto numeric; v_emesso coupon_emesso;
begin
  if not e_staff() then raise exception 'solo lo staff' using errcode = '42501'; end if;
  select * into c from coupon where codice = upper(trim(p_codice));
  if c.id is null then
    -- forse è il barcode di un coupon emesso
    select ce.* into v_emesso from coupon_emesso ce where ce.barcode = upper(trim(p_codice));
    if v_emesso.id is null then return jsonb_build_object('esito', 'non_trovato'); end if;
    if v_emesso.usato_il is not null then return jsonb_build_object('esito', 'gia_usato'); end if;
    if v_emesso.valido_al is not null and coalesce(p_ora, now()) > v_emesso.valido_al then return jsonb_build_object('esito', 'scaduto'); end if;
    if v_emesso.valido_dal is not null and coalesce(p_ora, now()) < v_emesso.valido_dal then return jsonb_build_object('esito', 'non_ancora_valido'); end if;
    select * into c from coupon where id = v_emesso.id_coupon;
  end if;
  if not c.attivo then return jsonb_build_object('esito', 'non_attivo'); end if;
  v_giorno := (coalesce(p_ora, now()) at time zone 'Europe/Rome')::date;
  v_ora := (coalesce(p_ora, now()) at time zone 'Europe/Rome')::time;
  if c.valido_dal is not null and v_giorno < c.valido_dal then return jsonb_build_object('esito', 'non_ancora_valido', 'dal', c.valido_dal); end if;
  if c.valido_al is not null and v_giorno > c.valido_al then return jsonb_build_object('esito', 'scaduto', 'al', c.valido_al); end if;
  if c.quantita is not null and c.usati >= c.quantita then return jsonb_build_object('esito', 'esaurito'); end if;
  if c.solo_tipi is not null and not (p_tipo = any (c.solo_tipi)) then return jsonb_build_object('esito', 'solo_tipi', 'tipi', c.solo_tipi); end if;
  if c.dalle is not null and c.alle is not null and (v_ora < c.dalle or v_ora > c.alle) then return jsonb_build_object('esito', 'fuori_fascia', 'dalle', c.dalle, 'alle', c.alle); end if;
  select coalesce(sum((coalesce((x->>'prezzo_unit')::numeric, 0) + coalesce((select sum((v->>'prezzo')::numeric) from jsonb_array_elements(coalesce(x->'variazioni', '[]'::jsonb)) v), 0)) * coalesce((x->>'quantita')::numeric, 1)), 0)
    into v_tot from jsonb_array_elements(p_righe) x;
  if v_tot < c.minimo_ordine then return jsonb_build_object('esito', 'minimo', 'minimo', c.minimo_ordine, 'subtotale', v_tot); end if;
  if p_id_cliente is not null then
    select * into v_cl from cliente where id = p_id_cliente;
    if v_cl.black_list then return jsonb_build_object('esito', 'black_list'); end if;
    if c.solo_primo_ordine and exists (select 1 from ordine o where o.id_cliente = p_id_cliente and o.stato <> 'annullato') then
      return jsonb_build_object('esito', 'solo_primo_ordine');
    end if;
    if c.una_volta_per_cliente and exists (select 1 from ordine o where o.id_cliente = p_id_cliente and o.id_coupon = c.id and o.stato <> 'annullato') then
      return jsonb_build_object('esito', 'gia_usato');
    end if;
    if c.categoria = 'premio' and c.costo_punti is not null and v_cl.punti < c.costo_punti then
      return jsonb_build_object('esito', 'punti', 'servono', c.costo_punti, 'hai', v_cl.punti);
    end if;
  elsif c.categoria = 'premio' or c.solo_primo_ordine or c.una_volta_per_cliente then
    return jsonb_build_object('esito', 'serve_cliente');
  end if;
  v_sconto := coupon_sconto(c, p_righe);
  return jsonb_build_object('esito', 'ok', 'id_coupon', c.id, 'codice', c.codice, 'nome', c.nome, 'sconto', v_sconto,
                            'tipo_sconto', c.tipo_sconto, 'valore', c.valore, 'costo_punti', c.costo_punti,
                            'omaggio', (select p.nome from prodotto p where p.id = c.id_prodotto_omaggio));
end $$;
grant execute on function coupon_verifica(text, uuid, tipo_ordine, jsonb, timestamptz) to authenticated;

-- 5) applica a un ordine già accettato: sconto sul totale, coupon emesso usato, tag al cliente, punti scalati sui premi
create or replace function coupon_applica(p_id_ordine uuid, p_codice text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare o ordine; c coupon; v jsonb; v_righe jsonb; v_sconto numeric; v_emesso uuid;
begin
  if not e_staff() then raise exception 'solo lo staff' using errcode = '42501'; end if;
  select * into o from ordine where id = p_id_ordine;
  if o.id is null then return jsonb_build_object('esito', 'ordine_non_trovato'); end if;
  if o.id_coupon is not null then return jsonb_build_object('esito', 'ordine_ha_gia_coupon'); end if;
  select coalesce(jsonb_agg(jsonb_build_object('id_prodotto', r.id_prodotto, 'quantita', r.quantita, 'prezzo_unit', r.prezzo_unit, 'variazioni', r.variazioni)), '[]'::jsonb)
    into v_righe from ordine_riga r where r.id_ordine = o.id;
  v := coupon_verifica(p_codice, o.id_cliente, o.tipo, v_righe, coalesce(o.ora_consegna, o.creato_il));
  if v->>'esito' <> 'ok' then return v; end if;
  select * into c from coupon where id = (v->>'id_coupon')::uuid;
  v_sconto := least((v->>'sconto')::numeric, o.totale);
  update ordine set id_coupon = c.id, codice_coupon = c.codice, sconto = v_sconto, totale = totale - v_sconto, aggiornato_il = now() where id = o.id;
  update coupon set usati = usati + 1 where id = c.id;
  -- il coupon emesso col barcode, se è quello; se no se ne scrive uno come traccia
  update coupon_emesso set usato_il = now(), id_ordine = o.id, sconto = v_sconto, importo_ordine = o.totale, usato_da = auth.uid()
   where barcode = upper(trim(p_codice)) and usato_il is null returning id into v_emesso;
  if v_emesso is null then
    insert into coupon_emesso (id_coupon, id_cliente, usato_il, id_ordine, sconto, importo_ordine, usato_da)
    values (c.id, o.id_cliente, now(), o.id, v_sconto, o.totale, auth.uid()) returning id into v_emesso;
  end if;
  if o.id_cliente is not null then
    if c.tag_cliente is not null then
      update cliente set tag = array_append(tag, c.tag_cliente) where id = o.id_cliente and not (c.tag_cliente = any (tag));
    end if;
    if c.categoria = 'premio' and coalesce(c.costo_punti, 0) > 0 then
      update cliente set punti = punti - c.costo_punti where id = o.id_cliente;
      insert into cliente_punti_movimento (id_cliente, punti, motivo, id_ordine) values (o.id_cliente, -c.costo_punti, 'premio ' || c.nome, o.id);
    end if;
  end if;
  return jsonb_build_object('esito', 'applicato', 'sconto', v_sconto, 'totale', (select totale from ordine where id = o.id), 'nome', c.nome);
end $$;
grant execute on function coupon_applica(uuid, text) to authenticated;

-- 6) i punti: a ordine consegnato o ritirato, punti_per_euro sul totale pagato (una volta sola per ordine)
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
  return new;
end $$;
create trigger ordine_punti after update of stato on ordine for each row execute function punti_da_ordine();

-- 7) i tre premi (spenti finché Edoardo non dice quanti punti valgono) e i tre «Lunedì» col numero nel nome;
--    gli altri 48 coupon di Velocissimo si caricano quando se ne leggono le regole una per una.
insert into coupon (codice, nome, categoria, tipo_sconto, valore, id_prodotto_omaggio, costo_punti, attivo, tag_cliente)
select 'PREMIOSPECIALE', 'PREMIO PIZZA SPECIALE A SCELTA', 'premio', 'prodotto', 0, null, null, false, 'premio usato: PIZZA SPECIALE'
where not exists (select 1 from coupon where codice = 'PREMIOSPECIALE');
insert into coupon (codice, nome, categoria, tipo_sconto, valore, costo_punti, attivo, tag_cliente)
select 'PREMIOFRITTI', 'PREMIO FRITTI', 'premio', 'importo', 0, null, false, 'premio usato: FRITTI'
where not exists (select 1 from coupon where codice = 'PREMIOFRITTI');
insert into coupon (codice, nome, categoria, tipo_sconto, valore, costo_punti, attivo, tag_cliente)
select 'PREMIOBIRRA', 'PREMIO BIRRA DA 66 A SCELTA', 'premio', 'importo', 0, null, false, 'premio usato: BIRRA 66'
where not exists (select 1 from coupon where codice = 'PREMIOBIRRA');
insert into coupon (codice, nome, categoria, tipo_sconto, valore, solo_tipi, attivo, tag_cliente)
select x.codice, x.nome, 'coupon', 'percentuale', x.valore, '{domicilio,ritiro}'::tipo_ordine[], false, 'coupon usato: ' || x.nome
from (values ('LUNEDI10', 'LUNEDÌ DI RIENTRO 10 %', 10), ('LUNEDI15', 'LUNEDÌ 15 %', 15), ('LUNEDI20', 'LUNEDÌ 20 %', 20)) as x(codice, nome, valore)
where not exists (select 1 from coupon where codice = x.codice);

-- 8) la comanda stampa lo sconto (eseguito con execute_sql subito dopo la migrazione)
create or replace function comanda_ordine(p_id uuid)
returns jsonb
language sql security definer set search_path = public, extensions, pg_temp stable as $$
  select jsonb_build_object(
    'id', o.id, 'numero', o.numero, 'canale', o.canale, 'tipo', o.tipo, 'stato', o.stato,
    'creato_il', o.creato_il, 'ora_consegna', o.ora_consegna, 'totale', o.totale, 'note', o.note,
    'pagamento', o.pagamento, 'costo_consegna', o.costo_consegna, 'paga_con', o.paga_con, 'pagato_online', o.pagato_online,
    'sconto', o.sconto, 'codice_coupon', o.codice_coupon,
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
