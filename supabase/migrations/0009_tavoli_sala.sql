-- Mano a Mano Cassa — Fase 9: sala con tavoli dentro e fuori.
-- 20 tavoli dentro (D1–D20) e 15 fuori (F1–F15), come da indicazioni di Edoardo.
-- Un tavolo ha stati libero / occupato / conto; dopo un tempo impostato il colore cambia (alert).
-- (Applicata sul progetto con apply_migration, nome tavoli_sala.)

create table if not exists tavolo (
  id uuid primary key default gen_random_uuid(),
  id_negozio uuid not null references negozio(id) on delete cascade,
  numero text not null,
  zona text not null default 'dentro' check (zona in ('dentro','fuori')),
  posti int not null default 4 check (posti > 0),
  stato text not null default 'libero' check (stato in ('libero','occupato','conto')),
  aperto_il timestamptz,
  coperti int not null default 0,
  unique (id_negozio, numero)
);
alter table tavolo enable row level security;
create policy tavolo_staff on tavolo for all using (e_staff()) with check (e_staff());
alter table ordine add column if not exists id_tavolo uuid references tavolo(id) on delete set null;

insert into tavolo (id_negozio, numero, zona, posti)
select n.id, 'D' || g, 'dentro', 4 from negozio n cross join generate_series(1, 20) g on conflict do nothing;
insert into tavolo (id_negozio, numero, zona, posti)
select n.id, 'F' || g, 'fuori', 4 from negozio n cross join generate_series(1, 15) g on conflict do nothing;

alter publication supabase_realtime add table tavolo;
