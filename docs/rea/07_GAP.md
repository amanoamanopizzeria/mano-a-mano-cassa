# REA · 7. Il divario: cosa fa Velocissimo che la cassa nuova non fa ancora, e in che ordine si colma

*Scritto il 23/10/2026 alla fine del REA. È la lista dei lavori che parte da qui: «poi iniziamo a sviluppare e chiediamo al critico cosa non va» (Edoardo).*

## 7.1 Lo stato della cassa nuova (migrazioni 0001–0020, pagine `/cassa/*`, `/totem`, `/rider`)

C'è: ordini con righe e variazioni, tavoli, capacità per fasce di 15 min (pizzaioli → pizze), scadenzario, fasce bloccate, riconoscimento del chiamante e scheda cliente, indirizzi con Google e zona vera a poligono, minimo 10 € e costo di consegna congelato sull'ordine, comanda per reparto, totem senza utente, ordini esterni idempotenti, rider con posizione e mappa, listino L1 e L2 letto da Velocissimo (147 prodotti con `id_velocissimo`).

## 7.2 Il divario, per importanza

| # | Cosa manca | Dove sta in Velocissimo | Lavoro | Mig. |
|---|---|---|---|---|
| 1 | **Variazioni con i prezzi veri** (141 in 14 gruppi) e **gruppi per categoria** (pizze 5, pucce 4, burger 4 + salse, menu con scelte obbligatorie); il prezzo sul bottone e nella riga («CON Bufala 2,50») | `01_BACKOFFICE` §1.5, `06_DATI` §6.3 | tabella `categoria_gruppo_variazione`, le 141 righe, prezzo nel jsonb della riga e nel totale; totem e cassa mostrano i gruppi della categoria e basta | **0021** |
| 2 | **Pulizia del catalogo**: 57 prodotti senza `id_velocissimo` (seed), 34 a prezzo 0, 45 nomi doppi; categorie allineate a quelle online (NOVITA', SPECIALI, CLASSICHE, VETRINA NAPOLI, PUCCE, MENU, FRITTI, DOLCI, CANTINA, BIRRE, BEVANDE) | `dati/prodotti_nomi_ricette.md`, critico giro 1 n. 7 | cancellare il seed, `food_cost`, ricetta per il «senza» | 0021 |
| 3 | **Orari per tipo di carrello e attese minime** (apertura 18:30–22:45, consegna 19:00–22:30, ritiro 19:00–22:45, 15 min di attesa, +30 di ampiezza), periodi di chiusura con messaggio; fasce che partono dall'apertura (critico n. 10) | §1.1 | tabella `orario` + `chiusura`; `ordini_per_fascia` e il planner leggono da lì; preordini fino a 7 giorni (critico n. 3) | 0022 |
| 4 | **Domicilio in cassa come online**: cliente obbligatorio, civico che ri-geocodifica, «Zona X · consegna 1 € · minimo 10 €» detto prima, giorno + quarto d'ora, errori in italiano vicino al bottone (critico n. 2, 3, 4) | `02_APP_CLIENTE` §4.2, §9.10–13; `05_API` `/coverage` | motivi del rifiuto (`fuori_zona`, `manca_civico`, `indirizzo_incerto`), ricerca via + civico, messaggi | — |
| 5 | **Menu combo** (7: Puccia 7,90; Classico 13/24/33; Speciale 15/28/39) con gruppi obbligatori, fritti in omaggio **stampati in comanda** (il difetto n. 10 dell'app) | §1.5, `02_APP_CLIENTE` §2.2 | righe figlie con `id_riga_padre`, scelte per gruppo, prezzo fisso | 0021/0023 — **fatto 23/10** (mig. 0023, scelte in cassa e totem, comanda a figlie, `impegna_forno`) |
| 6 | **Stati e stampa**: stato «confermato/stampato» con orario, storia degli stati (`ordine_stato_log`), numero con prefisso per canale (C-, APP-, T-) | §1.4 | | 0022 |
| 7 | **Pagamenti tipizzati**: contanti alla consegna (con quanto paghi → resto), online, contanti alla cassa, bancomat alla cassa, POS alla consegna (il n. 3 dell'app: da accendere, i rider hanno il POS), piattaforma | §1.7, `05_API` §5.6 | | 0024 — in parte: contanti con «paga con» → resto, POS, già pagato online (`ordine_pagamento`); le altre voci dopo |
| 8 | **Rider**: «la prendo io» dalla PWA, CHIAMA/NAVIGA, **borsello** (prelievi, depositi, fondo) e dare-avere di fine serata nella forma dell'API, storico da saldare, note fisse del cliente sulla comanda rider (critico n. 11) | `04_RIDER` | `rider_movimento`, pagine `/rider` | 0024 — **fatto 23/10** (trigger `ordine_consegna`: prima nessuno creava la consegna; `rider_movimento`, `rider_borsello`, `rider_salda`, `consegne_rider2`, `/cassa/rider`) |
| 9 | **Cliente completo**: punti, credito, card, tag, black list, consenso, compleanno; dati di Velocissimo da importare (nome, telefono, indirizzi, punti) quando si passa | §1.6 | | 0025 |
| 10 | **Coupon e premi**: 54 coupon (benvenuto per canale, settimanali lun–gio, WhatsApp «NON CUCINO»), 3 premi a punti, coupon emessi con validità e tag automatico sul cliente; regole: solo domicilio/ritiro, fascia, minimo, prodotto omaggio, «escludi da coupon» | §1.6, `02_APP_CLIENTE` §9.20–22 | `coupon`, `coupon_emesso`, `ordine.sconto`; in cassa il codice si batte a mano, il barcode dopo | 0025 |
| 11 | **Vendite per l'OS**: vista `v_vendite_giornata` con le colonne di `RigaVendita` (tipo, origine, pagamento, IVA, rider, variazioni come righe, giornata lavorativa che resta la sera prima dopo mezzanotte) | `05_API` §5.2, `06_DATI` §6.7 | così mano-a-mano-os legge dalla cassa nuova come leggerebbe dall'API | 0025 — **fatto 23/10** (`v_vendite_giornata`, `vendite_giornata(date)`, `vendite_giornata_totali`, `GET /api/vendite?giornata=`; coupon e cliente passano a 0026) |
| 12 | **Totem**: riepilogo con «Conferma» prima di inviare (critico n. 6), varianti solo per le categorie giuste (n. 5), euro ovunque (n. 8 del grafico) | critico giro 1 | | — |
| 13 | **Cassa a 640/768/1024 px**: barra categorie raggiungibile, tavoli ordinati per numero (critico n. 8, 9) | | | — |
| 14 | **Deliverect** (Glovo, Deliveroo, Just Eat): webhook → `accetta_ordine_esterno` con listino L3, cliente «piattaforma», nota con id e orario di ritiro, riga «CONSEGNA PIATTAFORMA 0» | `05_API` §5.3 | servono le credenziali Deliverect in Vercel (Edoardo) | — |
| 15 | **Centralino**: chi manda il numero quando squilla (foto del modemino in arrivo) | `05_API` §5.4 | | — |
| 16 | **Stampa**: agente di stampa ESC/POS per cucina e cassa; scontrino Epson RT scegliendo POS/contanti | `03_CASSA_2BIT` | passo successivo | — |
| 17 | **App cliente nostra** (poi): tutto il §9 di `02_APP_CLIENTE` più le 22 cose che fanno male (prezzo extra visibile, consegna e minimo detti prima, «prima possibile», allergeni, nota per prodotto, quantità dal carrello, fattura, ordine al tavolo col QR) | `02_APP_CLIENTE` §10 | Ordering API come contratto del nostro `/api/ordini` | — |
| 18 | **Prenotazioni**: form nostro (quando e in quanti prima dei dati), Reserve with Google dopo | §1.8 | | — |

## 7.3 Cosa resta fuori apposta

- Formati e composizioni (metà/metà, maxi): in Velocissimo sono spenti; non si costruiscono finché Edoardo non li chiede.
- Magazzino, distinta base, ordini a fornitore della suite Velocissimo: mano-a-mano-os li fa già (fornitori, lista spesa, tracciabilità).
- Le 10 consegne contemporanee per rider: tetto mai raggiunto.
- Dashboard e statistiche del back-office: l'OS è quello.

## 7.4 Cosa si chiede a Edoardo (una volta sola, quando serve)

1. Il listino **L3** (7,90) vale per tutte le piattaforme, anche Just Eat? (serve prima di Deliverect).
2. I **punti per euro** e il **costo in punti** dei tre premi (si leggono nell'app nativa o nel back-office: li cerco io, lo chiedo solo se non li trovo).
3. Credenziali **Deliverect** e `SUPABASE_SERVICE_ROLE_KEY` su Vercel.
4. Le foto del **centralino**.
