-- Mano a Mano Cassa — Fase 1: cloud ordini
-- Schema base del dominio ordini/cassa/consegne.
-- Postgres / Supabase. I nomi sono in italiano, coerenti col mondo pizzeria.
--
-- Principio: la cassa e il totem sono CLIENT del cloud (non server da raggiungere).
-- Ogni evento (ordine, cambio stato, posizione rider) passa di qui ed è realtime.

-- ========== Anagrafiche ==========

create table negozio (
  id            uuid primary key default gen_random_uuid(),
  codice        text unique not null,
  nome          text not null,
  indirizzo     text,
  attivo        boolean not null default true,
  creato_il     timestamptz not null default now()
);

create table gruppo_categoria (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  ordine     int  not null default 0
);

create table categoria (
  id                 uuid primary key default gen_random_uuid(),
  id_gruppo          uuid references gruppo_categoria(id) on delete set null,
  nome               text not null,
  ordine             int  not null default 0,
  -- visibilità per canale (come nel listino Velocissimo)
  visibile_app       boolean not null default true,
  visibile_totem     boolean not null default true,
  visibile_web       boolean not null default true
);

create table prodotto (
  id              uuid primary key default gen_random_uuid(),
  id_categoria    uuid references categoria(id) on delete set null,
  codice          text,
  nome            text not null,
  descrizione     text,
  prezzo          numeric(10,2) not null default 0,       -- prezzo base
  prezzi_formato  jsonb not null default '{}'::jsonb,     -- {"formato1": 7.50, ...}
  aliquota_iva    numeric(5,2) not null default 10,
  -- canali (flag come in Prodotti.csv di Velocissimo)
  visibile_app    boolean not null default true,
  visibile_totem  boolean not null default true,
  visibile_web    boolean not null default true,
  foto_url        text,
  attivo          boolean not null default true,
  ordine          int not null default 0
);

-- variazioni possibili (aggiunte/rimozioni/ingredienti)
create table variazione (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  prezzo      numeric(10,2) not null default 0,
  tipo        text not null default 'aggiunta'  -- aggiunta | rimozione | nota
    check (tipo in ('aggiunta','rimozione','nota'))
);

create table cliente (
  id          uuid primary key default gen_random_uuid(),
  nome        text,
  telefono    text,
  email       text,
  note        text,
  creato_il   timestamptz not null default now()
);

create table zona (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  costo_consegna numeric(10,2) not null default 0
);

create table indirizzo (
  id          uuid primary key default gen_random_uuid(),
  id_cliente  uuid references cliente(id) on delete cascade,
  id_zona     uuid references zona(id) on delete set null,
  via         text not null,
  civico      text,
  cap         text,
  citta       text,
  lat         double precision,
  lng         double precision
);

-- ========== Stampanti ==========
-- Due comanda (cucina, cassa) + una fiscale Epson (RT, Agenzia Entrate).
create table stampante (
  id          uuid primary key default gen_random_uuid(),
  id_negozio  uuid references negozio(id) on delete cascade,
  nome        text not null,
  ruolo       text not null check (ruolo in ('cucina','cassa','fiscale')),
  protocollo  text not null default 'escpos' check (protocollo in ('escpos','epos')),
  indirizzo_ip text,
  porta       int,
  attiva      boolean not null default true
);

-- ========== Rider ==========
create table rider (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  telefono    text,
  attivo      boolean not null default true,
  -- ultima posizione nota (aggiornata in realtime dal telefono)
  ultima_lat  double precision,
  ultima_lng  double precision,
  ultima_pos_il timestamptz
);

-- ========== Ordini ==========

-- stato dell'ordine lungo il ciclo di vita
create type stato_ordine as enum (
  'ricevuto','in_preparazione','pronto','in_consegna','consegnato','ritirato','annullato'
);

-- canale/origine: come la vista TestateDocumentiConOrigine_Webapp di Velocissimo
create type canale_ordine as enum (
  'app','totem','web','telefono','cassa','glovo','deliveroo','justeat'
);

-- tipo di evasione
create type tipo_ordine as enum ('domicilio','ritiro','tavolo','banco');

create table ordine (
  id             uuid primary key default gen_random_uuid(),
  id_negozio     uuid not null references negozio(id),
  numero         bigint generated always as identity,   -- progressivo leggibile
  canale         canale_ordine not null default 'cassa',
  tipo           tipo_ordine   not null default 'banco',
  stato          stato_ordine  not null default 'ricevuto',
  id_cliente     uuid references cliente(id) on delete set null,
  id_indirizzo   uuid references indirizzo(id) on delete set null,
  id_zona        uuid references zona(id) on delete set null,
  ora_consegna   timestamptz,                 -- orario richiesto
  totale         numeric(10,2) not null default 0,
  note           text,
  -- integrazione aggregatori (Deliveract/Glovo/Deliveroo/JustEat)
  id_esterno     text,                         -- ExtIdOrdine nel mondo Velocissimo
  origine_meta   jsonb not null default '{}'::jsonb,
  creato_il      timestamptz not null default now(),
  aggiornato_il  timestamptz not null default now()
);
create index ordine_negozio_stato_idx on ordine(id_negozio, stato);
create index ordine_creato_idx on ordine(creato_il);

create table ordine_riga (
  id            uuid primary key default gen_random_uuid(),
  id_ordine     uuid not null references ordine(id) on delete cascade,
  id_prodotto   uuid references prodotto(id) on delete set null,
  descrizione   text not null,               -- congelata al momento dell'ordine
  quantita      numeric(10,3) not null default 1,
  prezzo_unit   numeric(10,2) not null default 0,
  variazioni    jsonb not null default '[]'::jsonb,  -- [{nome,prezzo,tipo}]
  note          text,
  -- dove si stampa la comanda di questa riga
  destinazione  text not null default 'cucina' check (destinazione in ('cucina','cassa','nessuna'))
);

create table pagamento (
  id            uuid primary key default gen_random_uuid(),
  id_ordine     uuid not null references ordine(id) on delete cascade,
  metodo        text not null,               -- contanti | carta | online | buono ...
  importo       numeric(10,2) not null default 0,
  online        boolean not null default false,
  incassato_il  timestamptz
);

-- ========== Consegne (rider) ==========
create type stato_consegna as enum ('da_assegnare','assegnata','ritirata','consegnata','annullata');

create table consegna (
  id            uuid primary key default gen_random_uuid(),
  id_ordine     uuid not null references ordine(id) on delete cascade,
  id_rider      uuid references rider(id) on delete set null,
  stato         stato_consegna not null default 'da_assegnare',
  assegnata_il  timestamptz,
  ritirata_il   timestamptz,
  consegnata_il timestamptz,
  contanti_da_incassare numeric(10,2) not null default 0,
  note          text
);
create index consegna_rider_stato_idx on consegna(id_rider, stato);

-- traccia posizione rider nel tempo (per mappa live e storico)
create table rider_posizione (
  id          bigint generated always as identity primary key,
  id_rider    uuid not null references rider(id) on delete cascade,
  lat         double precision not null,
  lng         double precision not null,
  rilevata_il timestamptz not null default now()
);
create index rider_posizione_rider_idx on rider_posizione(id_rider, rilevata_il);

-- ========== Realtime ==========
-- Le pubblicazioni per Supabase Realtime (ordini, consegne, posizione rider)
-- vengono abilitate in una migrazione successiva insieme alle policy RLS,
-- dopo aver definito auth/ruoli (cassa, rider, cliente, totem).
