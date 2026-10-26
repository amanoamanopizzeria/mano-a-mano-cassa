-- DA DECIDERE (Edoardo) — NON APPLICATA. Prende il numero il giorno in cui si applica.
-- Menù per le piattaforme (REA 23 §23.4–23.5, 26/10/2026).
--
-- 1) Quali prodotti vanno su Deliverect. Oggi lo dice solo il prezzo L3 (prezzo_piattaforme non nullo):
--    un prodotto col prezzo L3 ma che non si vuole su Glovo (es. una bottiglia di vino) non si può
--    togliere senza cancellargli il prezzo. La colonna parte uguale a oggi, quindi non cambia niente.
alter table prodotto add column if not exists visibile_piattaforme boolean not null default false;
update prodotto set visibile_piattaforme = (prezzo_piattaforme is not null);

-- 2) Il PLU. Aspetta la risposta di Edoardo su quale PLU usa oggi Deliverect (Deliverect → Menu →
--    Products, colonna PLU). Se è l'id di Velocissimo:
--      update prodotto set codice = 'V' || id_velocissimo where codice is null and id_velocissimo is not null;
--    Se è il codice di Velocissimo (C001…, 142…): si carica da docs/rea/dati/codici_prodotti_velocissimo.csv,
--    dopo aver deciso cosa fare dei doppioni vivi (142: La finocchiona e L'arrabbiata; C072: Barattolo
--    variegato nutella e Cheesecake al pistacchio).
--    In tutti e due i casi, dopo: un indice univoco perché il doppione non torni.
--      create unique index if not exists prodotto_codice_unico on prodotto (codice) where codice is not null and attivo;
