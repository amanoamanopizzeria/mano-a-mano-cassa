# REA · 13. Il back-office voce per voce: cosa fa, com'è impostato, cosa copre la cassa nuova

*Terzo passaggio del REA, 24/10/2026, chiesto da Edoardo («il sistema nostro funziona, prende un
sacco di ordini: fai un REA ancora più approfondito, non ti far prendere dalla fretta, fatti le
domande»). Ogni voce del menu di `admin.velocissimo.app` aperta in **sola lettura** con l'utenza di
Edoardo: liste lette con la ricerca della tabella, moduli di modifica aperti e **mai salvati**,
nessun secret letto, nessun dato personale copiato (solo struttura, impostazioni e aggregati).
Completa `01_BACKOFFICE.md` (che resta la mappa) con i valori che lì mancavano e con il giudizio
«la cassa nuova lo copre?» per ogni voce. Cassa nuova = repo `mano-a-mano-cassa` al 24/10/2026,
migrazioni 0001–0037, pagine `/cassa/*`, `/totem`, `/rider`, `/ordina`, `/segui`.*

Legenda copertura: **sì** = c'è e fa la stessa cosa · **in parte** = c'è il pezzo di dati o di
pagina, manca un comportamento · **no** = non c'è · **non serve** = Velocissimo l'ha ma A Mano A
Mano non lo usa (valore vuoto o zero), si decide dopo.

## 13.0 La cosa da sapere prima di tutto: l'abbonamento (`/subscription`)

Il piano è «**Plus**», 3 moduli attivi su 19. È la pagina che spiega perché molte funzioni del
video «NUOVO VELOCISSIMO RISTO» (`09`) **non sono quelle che usa Edoardo**.

| Modulo | Stato | Cosa vuol dire per noi |
|---|---|---|
| **App personalizzata** | attivo | l'app «A Mano A Mano Pugliese» negli store (`08`) |
| **Totem** | attivo (incluso) | `/totem` (`12`) |
| **X-Reserve** | attivo (incluso) | prenotazioni dal sito e da Google (§13.5) |
| **Enterprise** — «gestisci anche ordini telefonici e offline direttamente da Velocissimo POS» | **non attivo** | **la cassa in negozio è il vecchio PC 2Bit**, non il Velocissimo POS del video. Gli ordini presi al telefono nascono sul PC (origine «Da PC») e salgono al cloud dopo; il cloud non li crea |
| Tavoli | non attivo | i 5 tavoli del back-office sono una finzione: la sala la gestisce il 2Bit in locale |
| Scontrino digitale (senza RT, con AdE) | non attivo | lo scontrino è della stampante fiscale fisica |
| Centralissimo AI, Boost CRM, One Time Offer, Revenue Management, Rider Document, Chiusura guidata, Cash Machine, Stampa etichette, Dati fattura da P.IVA, Monitor cliente, Trasferimento comande, LED Wall, Attivazione card da form | non attivi | niente da replicare |

Numeri del piano: scadenza **23/06/2027**; fidelity card virtuali 10.000 in abbonamento, **8.430
residue** (1.570 emesse); SMS residui 0; spazio web 20,6 / 100 MB; **licenze rider 8**;
**postazioni POS 10**. Help desk lun–ven 8:30–12:30 e 13:30–17:30, emergenze fino alle 23:30.

## 13.1 Dashboard (`/dashboard`)

| Voce | Cosa fa | Valori di A Mano A Mano | Cassa nuova |
|---|---|---|---|
| Riepilogo giornata | totale venduto, ordini, scontrino medio, persone servite, spesa media a persona, consegne puntuali; grafici «come sono distribuiti gli ordini», «incasso per fascia oraria», «tipologia ordini», «ordini per stato»; filtro Origini/Tipi; periodi G/S/M/T/Q/A con confronto al periodo o anno prima | ieri 23/10: **1.558,41 €, 67 ordini, scontrino medio 23,26 €, 130 persone, 11,69 €/persona** | **in parte**: `/cassa/riepilogo` dà ordini, pizze, consegne, totale e stato; mancano persone, €/persona, per fascia oraria, per pagamento, il confronto (critico giro 10, n. 6) |
| Vendite · Marketing e Clienti · Andamento · KPI · Tavoli · Negozi · Clienti | sette viste dello stesso cruscotto | origini App / Cassa / Backoffice / Sito web / Deliverect / Totem / AI; tipi Banco / Consegna / Tavoli / Ritiro / Consumazione | **no** — è il lavoro di mano-a-mano-os, non della cassa: la cassa deve solo **dargli i dati** (`15`) |
| Esporta / importa / personalizza | | | non serve |

## 13.2 Clienti

| Voce | Cosa fa | Valori | Cassa nuova |
|---|---|---|---|
| Clienti `/customer` | anagrafica con **50 colonne**: nome, azienda, cellulare, telefono, email, card (numero, tipologia, scadenza, ultimo utilizzo, card amico), **saldo punti**, **saldo credito**, n. ordini e transazioni, indirizzo/zona/città/CAP/prov., ultimo negozio, professione, consensi (dati personali, comunicazioni, trasferimento), sesso, CF, età, nascita, compleanno, registrazione, codice referral, ultimo accesso app, sync con la cassa (da inviare, data ultima sync), ultimo ordine (data, tipo), coperti acquistati, coperto asporto medio, totale venduto, **RFM** ×4. Filtri: cliente di prova, utente app, contatto verificato, con card. Bottoni: Aggiungi, Elimina, Crea notifica | **19.500 clienti** (molti sono i finti di Deliverect, uno per ordine) | **in parte**: `cliente` (0026) ha nome, telefoni, email, indirizzi, note fisse, punti, credito, consensi, `id_velocissimo`; mancano card, referral, RFM, «ultimo accesso app», e **l'import** dei 19.500 |
| Lista clienti `/customerlist` | liste statiche per le push | 10 liste, quasi tutte da 1–11 clienti (prove del 2024 e 2025) | non serve |
| Dati aggiuntivi `/customercustomfield` | campi liberi sul cliente | 2 («data revisone» data, «prova» testo) | non serve |
| Tag `/tag` | etichette sul cliente | 12: undici «coupon usato: …» messi dai coupon + «Black List» a mano | **in parte**: le note fisse fanno da black list; manca il tag automatico all'uso del coupon |
| Matrici RFM `/rfm-matrix` | segmenti recenza/frequenza/margine/venduto | una matrice (12 mesi, ordini): recenza 1 = 120–999 gg, 2 = 61–120, 3 = 31–60…; frequenza 1 = 0–4, 2 = 5–14, 3 = 15+; margine 1 = 0–40 €, 2 = 49–99, 3 = 100+; venduto 1 = 0–100, 2 = 101–200, 3 = 201+ | **no** — marketing, dopo (mano-a-mano-os ha già i suoi segmenti WhatsApp) |
| Report clienti `/customer-sales-report` | per cliente: n. ordini, importo, margine, giorni dall'ultimo ordine; filtri negozio, città, tipo, data, fascia, registrazione, origine | | **no** — OS |
| Boost CRM | modulo esterno | non attivo | non serve |

## 13.3 Marketing

| Voce | Cosa fa | Valori | Cassa nuova |
|---|---|---|---|
| Notifiche push `/pushnotification` | campagne push: data pianificazione, invio, titolo, messaggio, destinatari, stato, raggiunti; segnaposto `[nome]`; Report / Invia nuovamente / Modifica | **7 inviate** in tutto: «Tifa Italia con Noi» 15/06/2024 a 800; una prova a 12 nel feb 2024; una prova nel set 2025 | **no** — `11`: le push le manda il cloud di Velocissimo; da noi dopo l'app nostra |
| Salvate `/draftpushnotification` | bozze | | non serve |
| Coupon `/coupon` | modulo a **5 schede** (Generali, Disponibilità, Codice, Limiti, Promo). Campi: nome, categoria, stato (Pubblicato / In costruzione / Sospeso / In arrivo), descrizione, **spesa minima** (include consegna? escludi promo dal minimo?), **sconto** valore + tipo % / €, aggiungi automaticamente al carrello, mostra in app rider, condizioni, **push e email all'ottenimento**, tag all'ottenimento / alla bruciatura, webhook WhatsApp API, **pubblicazione** (per sempre / periodo), **validità** (per sempre / periodo / **tempo limitato dopo l'assegnazione**, arrotonda a 23:59), **codice** Barcode/QR, **statico** (fisso) o **dinamico** (prefisso + lunghezza + random + progressivo), quantità, **limite di ottenimento** (n per cliente per ora/giorno/settimana/mese/anno/sempre, giorni fra due), **orari di ricezione** e **orari in cui si ordina**, negozi, **tipi d'ordine** (Banco/Ritiro/Domicilio/Consumazione), **solo clienti con N ordini da–a**, solo via codice, solo loggati; **promo**: 0 sconto · 2 **prodotto omaggio** (auto-add) · N×M (acquista/paghi) | **54 coupon** in 5 categorie (COUPON, CODICI SCONTO, PREMI, COUPON ACTIVE CAMPAIGN, COUPON WHATSAPP). Le regole vere, una per tipo: **NON CUCINO** (WhatsApp) 30 % su min 15 €, codice statico, 1 per cliente per sempre, loggato · **GIOVEDÌ SONO FRITTO** prodotto omaggio auto-add, min 15 €, **vale 3 ore** dall'ottenimento, codice dinamico, solo il giovedì, push all'ottenimento · **LUNEDÌ 10 %** min 25 €, 3 ore, solo il lunedì (20 % e 15 % uguali) · **Benvenuto da APP** 5 € min 15 €, statico, **solo clienti con 0 ordini**, 1 per cliente · **Benvenuto da volantino** 10 % min 15 €, 0 ordini · **Benvenuto 2025** 5 € · **PORTA UN AMICO** 5 € al presentatore al primo ordine dell'amico (referral). Uso: Benvenuto da volantino 112 usati su 132 ottenuti, GIOVEDÌ SONO FRITTO 108/200, Benvenuto da APP 92/108, NON CUCINO 58/61; ~10 buoni personali one-shot «Buono <cliente>» da 1 uso. **Emessi in tutto 2.224**, **errori 1.208** | **in parte**: `coupon` (0026) con % / €, minimo, periodo e 3 «Lunedì» caricati. Mancano: **prodotto omaggio**, **validità a ore dall'ottenimento**, codice dinamico, limiti per giorno della settimana e per n. ordini del cliente, tipo d'ordine, auto-add, il tag, la push |
| Premi `/prize` | premio a punti = coupon «prodotto omaggio» associato; «punti per ottenere il premio», validità, quantità | **BIRRA 66 = 10 punti · FRITTI = 20 · PIZZA SPECIALE = 30**; validi 19/09/2023–30/09/2027, infiniti. Riscattati: PIZZA SPECIALE 302 usati / 322 ottenuti (7.370 € di ordini), FRITTI 115/126, BIRRA 126/140 | **in parte**: `punti` sul cliente (0026); manca la tabella premi, il riscatto e **quanti punti per euro** (domanda n. 9 in `16`) |
| Form `/cms-form` | moduli pubblici | 3: Lavora con noi (4), DICCI LA TUA (200), Customer Satisfaction (15) | **no** — il sito nostro ha già «Lavora con noi» (OS mig. 585) |
| Categorie di coupon `/couponcategory` | | 5 | **in parte** (campo libero) |
| Notifiche automatiche `/marketingpushnotification` | 12 eventi con toggle e testo | **Rider arrivato ON** («Il fattorino è a 200 metri, tra pochi secondi sarà da te», geofence dall'app rider) · **Ordine in ritardo ON** («⌛ Il tuo ordine è stato posticipato! … alle [orario_ordine]») · **Carrello abbandonato** dopo 10 min («Ci sei quasi! 😍») · Coupon assegnato OFF · gli altri OFF | **no** — dopo il n. 9 di `10` |
| Coupon emessi `/issuedcoupon` | barcode, coupon, cliente, card, codice, ottenuto il, usato il, n. ordine, sconto, importo ordine, negozio, **usato da** (cassiere), validità; filtro Bruciati / Ottenuti | ~10 al giorno, quasi tutti NON CUCINO e GIOVEDÌ SONO FRITTO | **in parte**: `ordine.coupon` c'è; manca l'emissione (ottenuto ≠ usato) |
| Report errori coupon `/coupon-attempt` | cliente, coupon, card, **messaggio d'errore**, data | 1.208 tentativi falliti | **no** — utile: dice perché i clienti sbagliano (minimo non raggiunto, giorno sbagliato, già usato) |

## 13.4 Ordini

| Voce | Cosa fa | Valori | Cassa nuova |
|---|---|---|---|
| Ordini `/weborder` | lista a **53 colonne** (le 40 del CSV + indirizzo, sala, telefono, nazione…): #, **# Comanda** (progressivo del giorno della cassa: 1..67 il 23/10; i tavoli hanno 0 e ora 00:00), orario richiesto, stato, cliente, indirizzo, rider, tipo, tavolo, sala, cellulare, data creazione, data e ora ordine, totale, **costo consegna (sempre 0,00)**, origine, pagamento, note, orario associazione rider (sempre vuoto), **orario di partenza**, **orario di consegna effettivo**, distanza (vuota), **ritardo consegna in secondi** (negativo = in anticipo; da −22 a +46 min nella settimana, uno +158), coperti asporto, sconto, zona, gruppo zone. Viste: In corso / In consegna / Annullati / Consegnati / In attesa / Tutti. Bottoni: **Aggiungi ordine** (origine «Da backoffice», modulo con tipo, numero, cliente, stato, indirizzo e indirizzi salvati, negozio, zona, data e ora, carrello, note, pagato, pagamento), Crea notifica, **Cambia stato** in blocco. Filtri: origine, pagamento, rider, zona, prodotti. Scheda ordine: testata, righe (quantità, descrizione, prezzo), **storia degli stati** con l'ora | **55.422 ordini**. Settimana 17–24/10 (389): tipo Ritiro 203 / Domicilio 132 / Banco 40 / Tavolo 14; origine **Deliverect 216** / app 95 / PC 70 / totem 7 / sito 1; pagamento online 264 / contanti alla consegna 61 / bancomat alla cassa 49 / contanti alla cassa 14 / bancomat alla consegna 1; rider «Rider 1..11» (il 5: 41 consegne, il 3: 36, il 2: 24, il 4: 17); partenza e consegna effettiva su 131 domicili su 132; coperti asporto 1: 138, 2: 158, 3: 42, 4: 29, 5–8: 13; tavoli usati 1, 3, 4, 5, 7, 8, 10, 12; sconto 0 su 287, **−1,00 / −1,50 / −2,00 su 28** (è la consegna registrata come sconto negativo: il costo consegna è sempre 0) | **in parte**: `ordine` + `ordine_stato_log` (0027) + numero col prefisso; `/cassa` filtra per stato. Mancano: **storico per data**, filtri (origine, pagamento, rider, zona, prodotto), cambio stato in blocco, «ritardo» calcolato, orario di partenza / consegna effettiva come colonne (sono in `consegna`), il **# Comanda** del giorno |
| Report giornata `/day-report` | chiusure X/Z mandate dal POS: data chiusura, tipo Parziale/Totale, importo, n. documenti, negozio, cassa | **0 righe, da sempre**: il 2Bit non manda le chiusure al cloud | **no** — ma è il punto giusto per la nostra chiusura (`14` §14.5, `15` §15.4) |
| Stati ordini `/weborderstatus` | 8 stati con colore, fase POS, flag preordine, email e push per stato, avviso ai rider | `01` §1.4 e `11` §11.3 | **in parte**: stati fissi; manca l'area preordini e le notifiche per stato |

Convenzioni delle **Note** (le legge anche mano-a-mano-os per il canale, `15` §15.2): dalle piattaforme
«PAGATA CON PAYPAL» + «RITIRO 22:39 GLOVO 609 Order ID: … / Pickup code: …», «CONSEGNA 22:15
JUST_EAT …», «RITIRO 19:23 DELIVEROO … Pays with Cash», «Allergy info: …»; dall'app «Cit: <citofono>/
PAGATA CON NEXI[47 ORD.] - <nota del cliente>»; dalla cassa «[17 ORD.] - PAGO CON 50», «DA PAGARE CON
BANCOMAT[19 ORD.]». **«[N ORD.]» è il contatore degli ordini del cliente**, stampato in comanda.

## 13.5 Prenotazioni (X-Reserve)

| Voce | Cosa fa | Valori | Cassa nuova |
|---|---|---|---|
| Prenotazioni `/booking` | cliente, stato, n. prenotazioni non annullate, telefono, coperti, data/ora, sconto, garanzia, codice sconto, sala, tavolo, note, form, origine, creazione; bottoni Addebita penale, Stampa lista | **89** totali; set–ott 2026: **25** (Google 18, sito 7), 18 «Confermato»; **mai un tavolo assegnato** | **no** — n. 15 di `10` |
| Form `/booking-form` | 10 schede (Generali, Campi, Contenuto, Messaggio di successo, Orari, Sconti, Conferma automatica, Promemoria, Widget, Garanzia con carta) | **PRENOTAZIONI** (sito): preavviso 15 min, fino a 30 giorni, coperti **2–6**, permanenza **90 min**, stato predefinito **Confermato** (quindi la «conferma dell'operatore» del messaggio è finta), tipo Semplice, dati cliente al primo step, niente tavoli né sale, messaggio sopra i 6 coperti «chiama», sold out «Siamo pieniiii!…», promemoria no, garanzia con carta no. **GOOGLE** (Reserve with Google): uguale ma coperti **2–8** | **no** |
| Template grafici | 1 Predefinito | | non serve |
| Turni di lavoro `/work-shift` | turni prenotabili | uno: **Cena 19:00–22:30** | **no** (sarebbe una riga) |
| Stati `/booking-status` | 9: Da confermare, Confermato (notifica OFF, coupon -), Eliminata, Cliente in, Cliente out, Lista d'attesa, No show, Black list, Rifiutato | | **no** |
| Report coperti per fascia | origini Walk-In / Telefono / Sito Web / Facebook / Google / WhatsApp / TheFork | | **no** |

## 13.6 Catalogo

| Voce | Cosa fa | Valori | Cassa nuova |
|---|---|---|---|
| Prodotti `/product` | `01` §1.5, `dati/` | **177** prodotti | **sì** (0013, 147 prodotti veri: i 30 mancanti sono «SOLO DELIVERECT» e disattivi) |
| Ingredienti `/ingredient` | ricette | **91** | **sì** |
| Variazioni `/variation` · Categorie di variazioni | | **141** in 14 categorie, prezzi in `06` §6.3 | **sì** |
| Menu combo `/productmenu` | | **7** (es. Menu Puccia 7,90: non mostra i prezzi dei prodotti, applica i prezzi delle variazioni in aggiunta e in rimozione) | **sì** (0023) |
| Upsell variazioni `/variationgroup` | | 0 gruppi | non serve |
| Etichette `/product-label` | icone (es. Vegano, foglia verde) | 9 | **no** (una colonna) |
| Stili `/product-style` | | 1 «semplice», prezzo alla fine | non serve |
| Categorie di prodotti `/productcategory` | | 24, coi gruppi di variazioni | **sì** |
| Gruppi di prodotti `/productgroup` | raggruppano in comanda e nei report | **26** | **in parte**: `destinazione` di stampa; i gruppi dei report li fa l'OS |
| Cataloghi `/showcase` | menù per canale | 8: CENA (app), **TOTEM** (stile «singola pagina», torna indietro dopo l'aggiunta), SOLO DELIVERECT, … | **sì** (`visibile_app/web/totem/piattaforme`) |
| Pagine catalogo `/ecommercecategory` | sezioni del menù (es. INSALATE: tipo App, colore POS bianco, schede Generali/Prodotti/Totem) | **17** | **sì** |
| Formati `/format` | mezze porzioni, moltiplicatore occupazione forno | «Personalizzato1» **disabilitato** | non serve |
| Composizioni `/composition` | pizza a 2 gusti | **disabilitata** | non serve |
| Allergeni `/allergen` | | 14 | **no** (una colonna; l'allergene arriva già nelle note di Deliverect) |
| Report prodotti / composti / variazioni / categorie / matrice / upsell / cross-sell | | ott 1–24 per categoria (qtà / € / margine): PIZZE CLASSICHE 1.653 / 14.037 / 9.762 · SPECIALI 430 / 4.437 / 3.358 · FRITTI 1.106 / 3.450 / 2.713 · MENU 118 / 2.562 · BEVANDE 295 / 636 · BIRRE 165 / 494 · DOLCI 42 / 248 · PUCCE 68 / 526 · **\*GESTIONALE\* 816 righe per −1.601 €** (le righe di sconto e servizio del 2Bit) | **no** — OS; ma il **margine** lo calcola col food cost dei prodotti (`dati/prodotti_listini.md`): la nostra riga di vendita deve portare `id_prodotto` |

## 13.7 Negozio

| Voce | Cosa fa | Valori | Cassa nuova |
|---|---|---|---|
| Negozi `/store/1/edit` — Generali | nome, ragione sociale, GPS, indirizzo, contatti, **«descrizione attività per affinare le risposte (AI)»** | GPS 41.9137, 12.5074; Via Novara 5, 00198 Roma; descrizione AI = «è un ristorante» | **sì** (`negozio`) |
| — Selforder | domicilio/ritiro/preordini ON, **attesa minima** domicilio 15 / ritiro 15 / totem vuota, **ampiezza fascia** domicilio +30 «in aggiunta», ritiro 0; credito prepagato OFF; multiordine no; limiti d'orario nessuno; zone collegate 16 con valori null (valgono quelli della zona); cataloghi vuoti | `01` §1.1 | **sì** (0022 `orario`) |
| — Orari | per tipo di carrello: **apertura 18:30–22:45** (max 50 piatti), **consegna 19:00–22:30**, **ritiro 19:00–22:45**, banco vuoto; 7/7 | | **sì** (0022); il «max 50 piatti» **no** |
| — Prenotazioni | form Google = GOOGLE; garanzia carta -; webhook TheFork predisposto, importa no; promemoria no; durata per coperti [] | | **no** |
| Zone di consegna `/deliveryzone` | 3 schede (Generali, Mappa zona, Orari); costo, costo massimo, soglia gratis, soglia gratis POS, minimo, priorità, colore | **16 zone** attive + «Zona generica» spenta: BARBERINI VIA VENETO, BOLOGNA SAPIENZA, BOLOGNA SPALLANZANI, BOLOGNA STAZIONE TIBURTINA, CONCA D'ORO PRATI FISCALI, LIBIA ERITREA NOM, LIBIA ERITREA SALARIA, NOMENTANA SANT'ANGELA MERICI, PARIOLI ALTA, PARIOLI MOSCHEA, PARIOLI ZOOPARCO-AUDITORIUM, PORTA PIA PIAZZA FIUME, PORTA PIA TERMINI, SAN GIOVANNI COLOSSEO, VALLI NOMENTANA, VERBANO; consegna 1,00 / 1,50 / 2,00 €, minimo 10 €. Ordini per zona nella settimana: VERBANO 32, PORTA PIA P. FIUME 18, SAPIENZA 13, SPALLANZANI 11, SAN GIOVANNI 9, PARIOLI ALTA 8, TIBURTINA 8… | **sì** (0019, poligoni veri, `zona_per_punto`) |
| Mappa zone (KML) | | | **sì** |
| Gruppi di zone `/deliveryzonegroup` | | **LIMITAZIONE**: limitazione ON, **10 consegne contemporanee per fattorino**, **step tariffa chilometrica 200 m**, mezzo «**A piedi**» (!): i tempi stimati di Velocissimo sono calcolati per un pedone | **in parte**: la nostra capacità è «1 consegna a quarto d'ora per rider» (`/cassa/capacita`), più stretta e più vera; il 10 è il tetto di Velocissimo, non la regola di casa |
| Mappa rider `/riders-map` | posizioni in tempo reale | | **sì** (`/cassa/mappa`) |
| Periodi di chiusura `/closing-period` | titolo, titolo in app, messaggio, dal, al | **10**: Problemi tecnici 2/9/2026; Ferie 8–23/8/2026; Pasqua 5/4/2026; Capodanno 31/12/2025 08:00 → 1/1 00:00; Natale 24–25/12/2025; Ferie 6–25/8/2024; Chiusura settimanale 17/9/2024; SPECIAL SUMMER 29–30/7/2024; Pasqua 2024; Capodanno 2023 | **no** — manca la tabella (dal, al, messaggio) letta da `/ordina`, `/totem` e dalla cassa; oggi si chiude solo a mano con `fascia_bloccata` |
| Report negozio | ordini accettati, totale, margine, già pagati, da pagare, costo consegna, rifiutati, sconti, scontrino medio | **1–24/10/2026: 1.149 ordini, 28.264,45 €, margine 20.334,78, già pagati 18.856,82, da pagare 9.407,63, 7 rifiutati, sconti −1.595,33, scontrino medio 24,60** | **no** — OS |
| Report rider | consegnati, totale, già pagati, contanti, **contante versato**, costo consegna, annullati, scontrino medio, in ritardo, tempo medio, sotto il minuto, distanza | ottobre: 6 rider attivi (135, 100, 66, 63, 17, 10 consegne); **contante versato sempre 0, distanza 0, tempo medio 0**: borsello e tracciamento **non usati** | **in parte**: `rider_borsello`, `rider_salda`, `/cassa/rider` (0024, 0033) fanno di più di quanto oggi si usi |
| Report zone | ordini, €, distanza, tempo per zona | 17 zone, VERBANO 94 ordini / 2.631 € a ottobre | **no** — OS (ha già Zona nel CSV) |
| Richieste in zone non servite `/delivery-request` | indirizzi fuori zona chiesti dall'app | **809** | **in parte**: `/ordina` dice «qui non consegniamo» ma non lo registra |
| Report sconti | per coupon/sconto: volte e importo | ottobre: **SCONTO manuale 190 volte −1.050 €**, NON CUCINO 57 −504 €, SCONTO 5 −8,30, LUNEDÌ 20 % 2, LUNEDÌ 10 % 1, Benvenuto 2025 3 | **no**: lo **sconto manuale** in cassa (190 volte al mese!) non c'è; il coupon sì |
| Reparti di produzione `/production-department` | stampanti, layout comanda per tipo, copie per tipo, tempo di produzione per tipo, KPI, overbooking, **limiti di capacità** | **PIZZE**: gestisce asporto sì; stampanti nessuna nel cloud (sono sul PC); layout/copie/tempi vuoti; overbooking OFF; **capacità per quarto d'ora per giorno della settimana: dom 22 · lun 10 · mar 10 · mer 10 · gio 18 · ven 18 · sab 22 pizze** (00:00–23:59, step 15) | **in parte**: `/cassa/capacita` la deriva dai pizzaioli del giorno (3 → 35) e `fascia_capacita` fa le eccezioni; manca **la tabella per giorno della settimana** come valore di partenza quando nessuno imposta i turni |
| Sale `/room` · Tavoli `/room-table` | sala, listino, coperti min/max, disponibile online, forma, disegno | Sala 1 (0 coperti); tavoli 1–5, coperti 2–6, rettangolo | **sì** e meglio (0009, 0031: 10 dentro + 5 fuori, listino L2) |

## 13.8 Pos, App, Impostazioni, Statistiche

| Voce | Cosa fa | Valori | Cassa nuova |
|---|---|---|---|
| Pos → Stampe → Reparti di produzione | (sopra) | | |
| Pos → Tavoli → Sale, Tavoli | (sopra) | | |
| App → Slider | immagini in testa all'app | 95 slider, **2 pubblicati** («Pugliese») | **no** (grafica dell'app nostra, dopo) |
| App → Gallerie | | 1 «Totem» (Digital Signage: le immagini dello screensaver del totem) | **in parte**: il totem ha la schermata d'attesa, le immagini sono fisse |
| App → Link utili `/app-links` | link con QR («Link ordina veloce») | | non serve |
| App → Privacy policy | ragione sociale, indirizzo, CAP, città, email → pagina pubblicata | | **no** (il sito nostro ha la sua) |
| Impostazioni → Integrazioni → Credenziali API `/oauth-clients` | client OAuth della Public API (**non letto**, non rigenerato) | | — |
| Documentazione API `/api-docs` | spec Scalar | `05`, `08` §8.5 | — |
| Account | nome, cognome, email, **numero WhatsApp per Remy** (assistente AI di Velocissimo), cambio password | | non serve |
| Statistiche `/statistics-hub` | cruscotti | | **no** — OS |
| Carrelli abbandonati `/abandoned-cart-report` | stato, data notifica, importo, cliente; risvegli tentati / risvegliati / venduto da risvegli | **4.107** carrelli | **no** — serve l'app nostra (il carrello vive nel browser del cliente) |
| Agenti (Centralissimo) | centralino esterno | non attivo | **sì** per la parte che serve: `/api/telefono/chiamata` apre la scheda |

## 13.9 I conti della copertura

Su **61 voci** lette: **sì 17 · in parte 16 · no 20 · non serve 8**. Dei 20 «no», **12 sono
report e cruscotti** che appartengono a mano-a-mano-os e si risolvono con l'export giusto (`15`),
non con pagine nuove nella cassa. Restano otto «no» veri, in ordine di peso per una serata:

1. **periodi di chiusura** con messaggio (ferie, Natale, «problemi tecnici»);
2. **sconto manuale** in cassa (190 al mese);
3. **storico ordini per data** con filtri;
4. **coupon a prodotto omaggio con validità a ore** (GIOVEDÌ SONO FRITTO è il coupon più usato) e il
   **riscatto dei premi a punti**;
5. **prenotazioni** (una al giorno, da Google);
6. notifiche automatiche al cliente (dopo l'app nostra);
7. etichette e allergeni sul prodotto (una colonna ciascuna);
8. la registrazione delle richieste fuori zona.

## 13.10 Le scoperte di questo passaggio che non stavano in `01`

- **Enterprise non attivo**: la cassa è il PC 2Bit. Tutto il video (`09`) va letto come «cosa fa il
  POS nuovo», non «cosa usa oggi A Mano A Mano». Le funzioni della serata vera stanno in `14`.
- **La capacità per quarto d'ora cambia col giorno della settimana** (10 lun–mer, 18 gio–ven, 22
  sab–dom): è la regola che oggi decide le fasce «SOLD OUT» nell'app. La nostra la deriva dal
  personale: va bene, ma senza turni inseriti deve partire da questa tabella.
- **Le chiusure X/Z non salgono mai al cloud** (`/day-report` vuoto da sempre): il totale della sera
  che Edoardo legge in `/chiusura` dell'OS viene dall'API `/vendite`, non dalla chiusura fiscale.
- **Borsello e tracciamento rider non si usano** (versato 0, km 0): i rider si assegnano e si
  segnano partenza e consegna (131 su 132), nient'altro.
- **La consegna è registrata come sconto negativo** (−1,00 / −1,50 / −2,00) e il «costo consegna»
  è sempre 0: nel CSV l'OS non la vede come consegna.
- **Il mezzo dei rider è «A piedi»** e le consegne contemporanee per fattorino 10: i tempi stimati
  di Velocissimo non li guarda nessuno.
- **Lo sconto manuale** della cassa (190 volte, −1.050 € in ottobre) è la terza voce di sconto
  dopo i coupon: la cassa nuova non ce l'ha.
- **Le prenotazioni si confermano da sole** (stato predefinito Confermato) e nessuno assegna il
  tavolo: 25 in due mesi, 18 da Google.
