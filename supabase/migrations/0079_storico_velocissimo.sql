-- Lo storico degli ordini di Velocissimo (Edoardo, 27/10/2026 00:05Z: «importa tutti i dati di
-- Velocissimo»; 00:19Z: «sì, leggi gli ordini dal back-office, scarica CSV nei download»).
-- Una riga per ordine, dalla lista /weborder del back-office (55.593 ordini dal 18/09/2023 al 26/10/2026,
-- file velocissimo_ordini_storico.csv). Tabella a parte: non tocca ordine, clienti, punti né l'export
-- per l'OS. I prodotti dei singoli ordini non ci sono (stanno nella scheda di ogni ordine).
-- Il numero non è unico: in Velocissimo 6 numeri C- compaiono due volte (C-29880, C-30032, C-34139,
-- C-39315, C-39697, C-41763), per questo la chiave è un id nostro.
create table if not exists public.velocissimo_ordine (
  id bigint generated always as identity primary key,
  numero text not null,               -- «C-57359», «APP-10008»
  comanda text,
  stato text,
  tipo text,
  origine text,
  pagamento text,
  cliente text,
  cellulare text,
  telefono text,
  indirizzo text,                     -- la via come la scrive Velocissimo
  civico text,
  citta text,
  provincia text,
  zona text,
  gruppo_zone text,
  rider text,
  tavolo text,
  sala text,
  creato_il timestamptz,              -- «Data creazione»
  ora_ordine timestamptz,             -- «Data ed ora ordine»: l'ora per cui è l'ordine
  giornata date,                      -- la serata (taglio alle 06:00 di Roma) di ora_ordine
  orario_ritiro text,
  orario_richiesto text,
  ora_associazione_rider text,
  ora_partenza text,
  ora_consegna text,
  distanza text,
  ritardo_secondi int,
  totale numeric(10,2),
  costo_consegna numeric(10,2),
  sconto numeric(10,2),
  coperti_asporto int,
  note text,
  importato_il timestamptz not null default now()
);
create index if not exists velocissimo_ordine_numero on public.velocissimo_ordine (numero);
create index if not exists velocissimo_ordine_giornata on public.velocissimo_ordine (giornata);
create index if not exists velocissimo_ordine_cellulare on public.velocissimo_ordine (cellulare);

alter table public.velocissimo_ordine enable row level security;
create policy velocissimo_ordine_leggi on public.velocissimo_ordine for select to authenticated
  using (exists (select 1 from public.profilo p where p.id = auth.uid() and p.ruolo in ('admin', 'cassa')));
-- nessuna policy di scrittura: la riempie solo l'import
