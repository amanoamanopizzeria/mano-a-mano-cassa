-- DA DECIDERE (Edoardo): fondo e conteggio di cassa, REA 21 D7.
-- Non applicata. Tabella nuova, append-only: non tocca ordini, punti, export.
-- A inizio sera chi apre scrive il fondo; a fine sera i contanti contati (e il totale POS letto sul
-- terminale). Il riepilogo mette accanto quanto doveva esserci (fondo + contanti in cassa di
-- vendite_giornata_totali) e la differenza. Un conteggio sbagliato non si corregge: se ne scrive un
-- altro, vale l'ultimo, e restano tutti e due.

create table if not exists public.cassa_conteggio (
  id bigint generated always as identity primary key,
  giornata date not null,
  momento text not null check (momento in ('fondo', 'chiusura')),
  contanti numeric(10,2) not null check (contanti >= 0),
  pos numeric(10,2) check (pos >= 0),
  nota text,
  chi uuid not null default auth.uid(),
  creato_il timestamptz not null default now()
);
create index if not exists cassa_conteggio_giornata on public.cassa_conteggio (giornata, momento, creato_il desc);

alter table public.cassa_conteggio enable row level security;
create policy cassa_conteggio_leggi on public.cassa_conteggio for select to authenticated
  using (exists (select 1 from public.profilo p where p.id = auth.uid() and p.ruolo in ('admin', 'cassa')));
create policy cassa_conteggio_scrivi on public.cassa_conteggio for insert to authenticated
  with check (chi = auth.uid() and exists (select 1 from public.profilo p where p.id = auth.uid() and p.ruolo in ('admin', 'cassa')));
-- nessuna policy di update: append-only
