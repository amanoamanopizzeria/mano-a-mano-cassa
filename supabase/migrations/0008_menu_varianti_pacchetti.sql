-- Mano a Mano Cassa — Fase 8: varianti per categoria e pacchetti guidati.
-- Varianti: ogni variazione vale per una categoria e appartiene a un gruppo
--   (es. "Ingredienti", "Cottura"). Le aggiunte hanno un prezzo.
-- Pacchetto: un prodotto con prezzo fisso e componenti da scegliere
--   (es. "Pizza + bibita": una pizza dalla categoria Pizze, una bibita dalla categoria Bibite).

alter table variazione add column if not exists id_categoria uuid references categoria(id) on delete cascade;
alter table variazione add column if not exists gruppo text not null default 'Varianti';

create table if not exists pacchetto_componente (
  id             uuid primary key default gen_random_uuid(),
  id_pacchetto   uuid not null references prodotto(id) on delete cascade,
  etichetta      text not null,                 -- es. "Pizza", "Bibita"
  id_categoria   uuid not null references categoria(id) on delete cascade,
  quantita       int  not null default 1 check (quantita > 0),
  ordine         int  not null default 0
);
alter table pacchetto_componente enable row level security;

-- Il menù si legge da chi è dentro (staff e rider); lo modifica solo lo staff.
create policy pacchetto_componente_leggi on pacchetto_componente for select using (e_staff() or ruolo_corrente() = 'rider');
create policy pacchetto_componente_scrivi on pacchetto_componente for all using (e_staff()) with check (e_staff());
