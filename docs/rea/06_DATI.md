# REA · 6. Il modello dei dati: Velocissimo → cassa nuova

*Scritto il 23/10/2026. A sinistra l'entità così com'è in Velocissimo (back-office, API, app), a destra la tabella nostra (progetto Supabase `tnuyeyqwoqhmgpskqtuq`, migrazioni 0001–0020) e cosa manca.*

## 6.1 Le tassonomie da tenere uguali

| Velocissimo | Valori | Nostro | Stato |
|---|---|---|---|
| `venditaTipo` (tipo di comanda) | banco · domicilio · consumazione · ritiro | `tipo_ordine`: banco · domicilio · tavolo · ritiro | uguale (tavolo = consumazione) |
| `venditaOrigine` (canale) | app · manuale · xmenu · sito · instore · centralino · webapp · deliverect · totem · ai | `canale_ordine`: app · totem · web · telefono · cassa · glovo · deliveroo · justeat | **manca** `centralino` (oggi «telefono»), `webapp` (= web), `ai`; le piattaforme da noi sono tre canali invece di `deliverect` + nota: va bene, è più preciso |
| stato ordine (fase POS) | Ricevuto (Creazione) · Confermato (Vendita, Stampa) · In lavorazione · Da ritirare (Preparata) · In consegna · Consegnato · Annullato · Ritirato dal cliente | `stato_ordine`: ricevuto · in_preparazione · pronto · in_consegna · consegnato · ritirato · annullato | manca **confermato** (= stampato): oggi stampiamo senza stato; serve `stampato_il` o lo stato |
| pagamento | Contanti alla consegna · Pagamento online (Nexi) · Contanti alla cassa · Bancomat alla cassa · POS alla consegna (spento) · piattaforma | `ordine.pagamento` text + `pagamento` (metodo, importo, online) | va tipizzato con questi cinque valori |
| listino | L1 app/sito/negozio · L2 piattaforme · L3 (Just Eat?) | `prodotto.prezzo` (L1), `prezzo_piattaforme` (L2), `prezzo_tavolo` (oggi = L1) | manca L3 come colonna propria |

## 6.2 Catalogo

| Velocissimo | Nostro | Manca |
|---|---|---|
| **Categoria prodotto** (24): nome, forno sì/no e moltiplicatore, reparto, coperti, IVA, **gruppi di variazioni con min/max/max gratis/ordine**, formati/composizioni | `categoria` (14): nome, gruppo, ordine, visibilità per canale, colore, destinazione (cucina/cassa) | `impegna_forno`, `coperti`, la tabella **`categoria_gruppo_variazione`** (id_categoria, gruppo, min_app, max_app, min_pos, max_pos, max_gratis, ordine) |
| **Gruppo di prodotti** (26) = riga della comanda | `gruppo_categoria` | c'è |
| **Prodotto** (177): codice, nome, descrizione, categoria, pagine catalogo, allergeni, L1/L2/L3, food cost, coperti asporto, IVA somministrazione/asporto, disponibile (sempre / per oggi / mai), visibile, flag rider, immagine totem, ricetta (ingredienti) | `prodotto` (204 righe, 147 attive con `id_velocissimo`): codice, nome, descrizione, categoria, prezzo, prezzi_formato, aliquota_iva, visibile per canale, foto, attivo, ordine, prezzo_tavolo, prezzo_piattaforme | `prezzo_l3`, `food_cost`, `non_disponibile_oggi` (si azzera a mezzanotte), `allergeni` (vuoti anche da loro), **`ricetta`** (gli ingredienti, per il «senza»), `mostra_rider`; **pulizia**: 57 righe senza id Velocissimo (seed vecchio: «Margherita 6.50», «Marinara 5.50»), 34 a prezzo 0, 45 nomi doppi |
| **Pagina catalogo** (17) e **catalogo** (4: PRANZO, CENA, SOLO DELIVERECT, TOTEM) | visibilità per canale sul prodotto e sulla categoria | basta così: un catalogo per canale è `visibile_app/totem/web` + `prezzo_piattaforme` |
| **Variazione** (141 in 14 gruppi, con prezzo) | `variazione` (30 righe, 29 a prezzo 0, 5 gruppi) | **tutte le 141 con i prezzi veri** (§6.3), i gruppi SALSE e GESTIONALE, i gruppi di scelta dei menu |
| **Menu combo** (7, con gruppi obbligatori e prezzi) | mig. 0008 «pacchetti» | i 7 menu con i loro gruppi di scelta (SCEGLI LA PIZZA n–n, BIBITA 1–1, FRITTI 1–1) e il prezzo fisso; le pizze dentro accettano extra a pagamento |
| **Formati** (solo Normale) e **composizioni** (solo 1 gusto) | `prezzi_formato` jsonb | nulla da fare finché restano spenti |
| **Ingredienti** (91, nome e basta) | — | tabella `ingrediente` + `prodotto_ingrediente` (rimovibile sì/no): serve al «senza» e alla descrizione |

## 6.3 Le variazioni vere (prezzi del 23/10/2026)

**IMPASTO** (solo pizze): Impasto Normale 0 · Impasto Alto 1,00.
**LATTICINI**: Crema Cacio e Pepe 2,50 · Doppia Mozzarella 2,00 · Gorgonzola piccante 2,00 · Mozzarella di Bufala DOP 2,50 · Bufala a strappi 3,00 · Grana padano dop 1,50 · Pecorino Romano dop 2,00 · Provola Affumicata 1,50 · Stracciatella artigianale 3,00 · Stracciatella al tartufo 3,50 · Taleggio 2,50 · Brie de meaux 2,50 · Cheddar 2,00.
**SALUMI E PESCE**: Alici 2,00 · Guanciale 2,00 · Mortadella bolognese igp 2,00 · Pancetta arrotolata Piacentina 2,50 · Prosciutto cotto affumicato di Praga 2,00 · Prosciutto crudo di Parma 18 mesi 2,50 · Spianata calabrese piccante 2,00 · Salsiccia di Norcia 1,50 · Speck Alto Adige igp 2,50 · Wurstel 1,50 · Bottarga 2,00 · Bresaola 3,00 · Nduja calabrese piccante 1,50 · Salmone affumicato norvegese 4,00 · Tonno 2,00 · Uovo 1,00 · Ciauscolo 2,00.
**SPEZIE E ALTRO**: Colatura di Alici 1,50 · Noci 1,50 · Olio all'Aglio 0,50 · Polvere di Cappero essiccato 1,00 · Origano 0 · Peperoncino 0,50 · Prezzemolo 0 · Salsa tartufata 2,50.
**VERDURE**: Broccoletti 1,50 · Carciofi 2,00 · Cipolla Caramellata 1,00 · Emulsione al basilico 1,50 · Crema di patate 2,00 · Funghi 1,50 · Melanzane 1,00 · Olive taggiasche 2,00 · Patate al Forno 1,00 · Chips di patate 2,00 · Pomodorini Semi Secchi 2,50 · Pomodoro Pachino 1,50 · Radicchio 1,00 · Rughetta 1,00 · Zucchine 1,00 · Salsa di pomodoro 0 · Fiori di zucca 1,50 · Topping al pachino caramellato 1,50 · Pachino appassito al forno 2,00 · Porcini 3,00 · Insalata 0 · Pomodoro Burger 0.
**SALSE** (solo burger): Mayo 0,50 · Ketchup 0,50 · BBQ 0,50 · Senape 0,50 · Mayo tartufo 1,00 · Boscaiola 0,50 · Mayo nduja 1,00.
**GESTIONALE**: No, grazie 0 · Nota libera 0.
**Gruppi di scelta dei menu** (tutti 0): SCEGLI LA PIZZA/PUCCIA (19 classiche + 16 pucce), SCEGLI LA BIBITA (acqua 0,5 frizzante/naturale, Chinotto Neri, Coca Cola 0,33, Coca Zero 0,33, Fanta 0,33, Peroni 0,33), SCEGLI LA BIBITA GRANDE (acqua 1 l naturale/frizzante, Coca 1,5 l, Coca Zero 1,5 l, Peroni 66), SCEGLI LA PIZZA SPECIALE (20 speciali), FRITTI MENU X1 (1 supplì 1 crocchetta 3 mozzarelline), X2 (2 2 3), X3 (3 3 6).

Regole: un extra una volta sola per riga; vale su tutta la quantità; il «senza» non è una variazione ma la rimozione di un ingrediente della ricetta, gratis; i gruppi sono liberi (0–0) tranne quelli dei menu.

## 6.4 Negozio, orari, zone

| Velocissimo | Nostro | Manca |
|---|---|---|
| Negozio: GPS, indirizzo, attesa minima domicilio 15 / ritiro 15, ampiezza fascia domicilio +30, preordini sì, max 50 piatti | `negozio` (codice, nome, indirizzo) | `lat/lng`, `attesa_min_domicilio`, `attesa_min_ritiro`, `ampiezza_fascia_domicilio`, `max_piatti_ordine`, `preordini_giorni` (7) |
| Orari per tipo di carrello: apertura 18:30–22:45, consegna 19:00–22:30, ritiro 19:00–22:45, banco vuoto, 7/7 | `/cassa/fasce` e `regola_capacita` (pizzaioli → pizze per 15 min), `fascia_bloccata` | tabella **`orario`** (giorno settimana, tipo, dalle, alle): oggi le fasce partono da un'ora scritta nel codice |
| Periodi di chiusura con messaggio in app | — | `chiusura` (dal, al, titolo, messaggio) |
| 16 zone a poligono, costo 1–2 €, minimo 10 €, gruppo LIMITAZIONE (10 consegne per rider) | `zona` (18 righe, poligono, costo, minimo, `zona_per_punto`) | c'è; manca solo il motivo del rifiuto (`out_of_zone` / `address_unclear` / `no_house_number`) |
| Sale e tavoli (5 configurati; veri ~20 + ~15) | `tavolo` (mig. 0009) | c'è |
| Reparti di produzione (PIZZE) | `categoria.destinazione` (cucina/cassa) + comanda per reparto (0018) | c'è |

## 6.5 Cliente, fidelity, coupon

| Velocissimo | Nostro | Manca |
|---|---|---|
| Cliente: nome, azienda, cellulare, telefono, email, card (numero, scadenza, tipo, amico), **punti**, **credito**, n. ordini, zona, RFM, tag, dati aggiuntivi, ultimo accesso app | `cliente` (nome, telefono, email, note) + `indirizzo` (via, civico, cap, città, lat/lng, place_id, zona, etichetta) | `punti`, `credito`, `card`, `tag[]`, `black_list`, `consenso_marketing`, `nato_il`; ordini e totale venduto si calcolano |
| Coupon: nome, categoria (COUPON / CODICI SCONTO / PREMI / ACTIVE CAMPAIGN / WHATSAPP), validità, solo domicilio/ritiro, fascia oraria, minimo, percentuale o importo o prodotto omaggio, quantità, «escludi da coupon» sulla categoria, tag al cliente all'uso | — | **`coupon`**, **`coupon_emesso`** (barcode, cliente, ottenuto il, usato il, ordine, sconto, validità), `ordine.id_coupon`, `ordine.sconto` |
| Premi: 3, riscattati coi punti (valore in punti non ancora letto) | — | `premio` = coupon di categoria PREMI con `costo_punti`; movimento punti sul cliente |
| Carrello abbandonato + push di recupero | — | solo per l'app cliente futura |

## 6.6 Ordine

| Velocissimo | Nostro | Manca |
|---|---|---|
| numero con prefisso per origine (C-57109, APP-57095), sequenza unica | `ordine.numero` bigint | prefisso per canale alla stampa |
| orario richiesto, data creazione, data ordine, giornata lavorativa (dopo mezzanotte resta la sera prima) | `ora_consegna`, `creato_il` | **`giornata`** (date) calcolata: è la chiave di `/vendite` e della Chiusura dell'OS |
| cliente, indirizzo, zona, rider, tipo, origine, pagamento, note, costo consegna, coperti asporto, ritardo | `ordine` + `consegna` | `coperti`, ritardo (si calcola) |
| righe: prodotto, formato, quantità, prezzo, **variazioni «CON … (prezzo)»**, rimozioni, note di riga, righe del menu con `parent_uuid` | `ordine_riga` (descrizione, quantità, prezzo_unit, variazioni jsonb, note, destinazione) | `id_riga_padre` per le righe del menu; `operatore add/remove` nel jsonb |
| storia degli stati con orario | `aggiornato_il` | `ordine_stato_log` (stato, quando, chi) |
| pagamenti per scontrino, anche più metodi | `pagamento` | c'è |
| `external_ref` idempotente 24 h | `id_esterno` + `accetta_ordine_esterno` | c'è |

## 6.7 Vendite verso mano-a-mano-os

L'OS oggi legge il CSV Velocissimo (una riga per articolo, con tipo, origine, pagamento, IVA, rider). La stessa forma è `RigaVendita` dell'API. La cassa nuova deve esporre **una vista `v_vendite_giornata`** con quelle colonne (vedi `05_API_E_INTEGRAZIONI.md` §5.2), così la Chiusura dell'OS non cambia quando il POS cambia.
