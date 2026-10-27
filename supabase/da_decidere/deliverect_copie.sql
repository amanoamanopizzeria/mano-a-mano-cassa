-- DA DECIDERE (Edoardo) — NON APPLICATA. Prende il numero il giorno in cui si applica.
-- Le copie degli ordini Deliverect per il mese in parallelo (REA 26 §26.3 strada R, REA 28).
--
-- Se Deliverect attiva le «Reporting Webhooks», ci manda una COPIA di ogni ordine nuovo e di ogni cambio
-- di stato, mentre Velocissimo resta il POS. La copia NON è un ordine della cassa:
--  - non va in `ordine`, quindi non stampa, non occupa i quarti d'ora, non entra in /api/vendite né
--    nell'export verso l'OS (che conta già le piattaforme da Velocissimo: niente doppioni);
--  - serve a confrontare, sera per sera, cosa è arrivato a Velocissimo e cosa avremmo ricevuto noi,
--    e a misurare il ritardo.
-- Una riga per messaggio ricevuto, così com'è (append-only). Tabella nuova: non tocca chiusure, cassa o
-- export. La scrive solo /api/deliverect/copia col service role; la legge admin e cassa.
create table if not exists public.deliverect_copia (
  id bigint generated always as identity primary key,
  ricevuto_il timestamptz not null default now(),
  evento text,                 -- es. «order.created», «order.status_update»: il nome lo dice Deliverect
  id_deliverect text,          -- _id dell'ordine in Deliverect
  id_piattaforma text,         -- channelOrderId (quello che vede Glovo)
  numero_visibile text,        -- channelOrderDisplayId (quello stampato sullo scontrino della piattaforma)
  canale int,                  -- codice canale Deliverect
  stato int,                   -- stato Deliverect (10 nuovo … 90 finito, 100/110 annullato)
  totale numeric(10,2),        -- payment.amount in euro
  giornata date,               -- la serata (taglio alle 06:00 di Roma), la scrive il server
  corpo jsonb not null         -- il messaggio intero, così com'è arrivato
);
create index if not exists deliverect_copia_giornata on public.deliverect_copia (giornata);
create index if not exists deliverect_copia_id on public.deliverect_copia (id_deliverect);

alter table public.deliverect_copia enable row level security;
create policy deliverect_copia_leggi on public.deliverect_copia for select to authenticated
  using (exists (select 1 from public.profilo p where p.id = auth.uid() and p.ruolo in ('admin', 'cassa')));
-- nessuna policy di scrittura: la scrive solo il server
