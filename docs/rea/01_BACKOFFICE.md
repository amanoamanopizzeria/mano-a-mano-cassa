# REA · 1. Il back-office Velocissimo (admin.velocissimo.app), sezione per sezione

*Letto il 23/10/2026 con l'utenza di Edoardo, in sola lettura: nessun «Salva» premuto, nessun secret letto, nessun dato personale di cliente copiato qui (solo struttura e aggregati). Il back-office è un Laravel Backpack; le liste sono DataTables, le schede di modifica hanno componenti Vue per prezzi e orari.*

Un solo negozio: **A MANO A MANO PUGLIESE**, Via Novara 5, 00198 Roma, tel. 0689873554, licenza fino al 23/06/2027.

## 1.0 La mappa del menu laterale (93 voci)

| Area | Voci |
|---|---|
| Dashboard | `/dashboard` (grafica, Remy AI) |
| CLIENTI | Clienti `/customer` · Lista clienti `/customerlist` · Dati aggiuntivi `/customercustomfield` · Tag `/tag` · Matrici RFM `/rfm-matrix` · Report clienti `/customer-sales-report` · Boost CRM (esterno) |
| MARKETING | Notifiche push `/pushnotification` · Salvate `/draftpushnotification` · Coupon `/coupon` · Premi `/prize` · Form `/cms-form` · Categorie di coupon `/couponcategory` · Notifiche automatiche `/marketingpushnotification` · Coupon emessi `/issuedcoupon` · Report errori coupon `/coupon-attempt` |
| ORDINI | Ordini `/weborder` · Report giornata `/day-report` · Stati ordini `/weborderstatus` |
| PRENOTAZIONI | Prenotazioni `/booking` · Form `/booking-form` · Template grafici · Turni di lavoro `/work-shift` · Stati `/booking-status` · report coperti per fascia e giorno |
| CATALOGO | Prodotti `/product` · Ingredienti `/ingredient` · Variazioni `/variation` · Menu combo `/productmenu` · Upsell variazioni `/variationgroup` · Etichette `/product-label` · Stili `/product-style` · Categorie di prodotti `/productcategory` · Categorie di variazioni `/variationcategory` · Gruppi di prodotti `/productgroup` · Cataloghi `/showcase` · Pagine catalogo `/ecommercecategory` · Formati `/format` · Composizioni `/composition` · Allergeni `/allergen` · report prodotti / composti / variazioni / categorie / matrice / upsell / cross sell |
| NEGOZIO | Negozi `/store` · Zone di consegna `/deliveryzone` · Mappa zone (KML) · Gruppi di zone `/deliveryzonegroup` · Mappa rider `/riders-map` · Periodi di chiusura `/closing-period` · Report negozio · Report rider · Report zone · Richieste in zone non servite `/delivery-request` · Report sconti · Reparti di produzione `/production-department` · Sale `/room` · Tavoli `/room-table` |
| APP | Slider · Gallerie · Link utili app `/app-links` · Privacy policy |
| Altro | Agenti (centralissimo.cloud, esterno) · Statistiche `/statistics-hub` · Carrelli abbandonati `/abandoned-cart-report` |
| API | Credenziali API `/oauth-clients` · Documentazione API `/api-docs` (Scalar su `/api-docs/spec`, vedi `05_API_E_INTEGRAZIONI.md`) |

Non accessibili: `/catalog` (403), `/timeslot` (404: le fasce vivono dentro il negozio).

## 1.1 Negozio (`/store/1/edit`) — quattro schede

**Generali**: nome; GPS `41.913775873752904, 12.507405671531403`; Via Novara 5, 00198 Roma RM; telefono; email; sito e social vuoti.

**Selforder** (è la configurazione dell'ordine online):
- domicilio ON, ritiro ON, preordini ON;
- stato locale: Disponibile / Non disponibile definitivamente / Non disponibile per un periodo (+ «indisponibile fino a»);
- **attesa minima** prossima consegna a domicilio **15 min**, prossimo ritiro **15 min**, totem vuota;
- **ampiezza della fascia** mostrata in app per il domicilio: **+30 min** «in aggiunta» (per questo in app il domicilio ha finestre 19:00–19:30 e il ritiro orari puntuali); takeaway 0;
- credito prepagato OFF; multiordine no;
- limiti per orario in cui si ordina: nessuno;
- zone di consegna collegate: tutte le 16 (id 2–17) con costo, soglia, minimo, preavviso e tempo medio **null** → valgono i valori della zona;
- cataloghi collegati: vuoto (il catalogo lo decide l'app: CENA è quello che si vede).

**Orari** (quattro editor `timeslots-editor`, uno per tipo di carrello):

| Editor | Tipo carrello | Orario (tutti i giorni) | Note |
|---|---|---|---|
| Apertura (`opening_timeslots`) | — | 18:30–22:45 | max 50 piatti per ordine |
| Consegna (`delivery_timeslots`) | 2 | 19:00–22:30 | `max_dishes_number` per step null |
| Ritiro (`takeaway_timeslots`) | 4 | 19:00–22:45 | |
| Banco (`counter_timeslots`) | 1 | vuoto | |

Sette giorni su sette, nessun giorno di chiusura fisso (il martedì chiuso del 2024 era un periodo di chiusura).

**Prenotazioni**: stato Disponibile; form Reserve with Google = «GOOGLE»; garanzia con carta no (VivaWallet possibile); TheFork non attivo; email di nuova prenotazione a Edoardo; promemoria non inviato; WhatsApp vuoto.

## 1.2 Zone di consegna (`/deliveryzone`, 17 righe)

Colonne: nome, gruppo, costo consegna, costo consegna massimo, soglia consegna gratuita, soglia gratuita POS, ordine minimo, priorità, colore. Le 16 zone vere stanno nel gruppo **LIMITAZIONE**, con costo = costo massimo (**1,00 / 1,50 / 2,00 €**), soglie 0, **minimo 10,00 €**, priorità 0. La «Zona generica» (id 1) è senza gruppo e tutto a 0. I poligoni (KML) sono già copiati nel nostro DB (migrazione 0019, `zona_per_punto`).

Gruppo di zone LIMITAZIONE: «abilita limitazione consegne» = sì, **consegne contemporanee per fattorino = 10**.

**Richieste in zone non servite** (`/delivery-request`): ≥ 500 richieste da gennaio 2025 a ottobre 2026 (≈ 25 al mese). Per CAP: 00168 (42), 00166 (41), 00167 (37) = Aurelio/Boccea/Primavalle; 00141 (36) e 00139 (24) = Montesacro/Talenti/Nuovo Salario; 00165 (26); 00159 (21) Tiburtino/Pietralata; 00186 (18) centro storico. È un dato di marketing: dove aprire zone nuove (Montesacro/Talenti è a 2 km dalle zone attuali).

## 1.3 Periodi di chiusura (`/closing-period`, 10)

Campi: titolo, titolo in app, messaggio, inizio, fine. Esempi: Problemi tecnici 2/9/2026; Ferie 8–23 ago 2026; Pasqua 5/4/2026; Capodanno 31/12 08:00 → 1/1 00:00; Natale 24–25 dic; Ferie 6–25 ago 2024; Chiusura settimanale martedì (set 2024); SPECIAL SUMMER (martedì chiuso, codice SPECIALSUMMER 30 % il mercoledì, lug 2024). I messaggi sono lunghi, con emoji: li scrive Edoardo e l'app li mostra al posto del menù.

## 1.4 Reparti, sale, tavoli, stati

- **Reparti di produzione**: uno solo, «PIZZE (A MANO A MANO PUGLIESE)», gestisce asporto = sì; collegato solo a pizze classiche, speciali, pucce, novità estive. I fritti, i dolci e le bevande non hanno reparto: la comanda cartacea li raggruppa per **gruppo di prodotti**.
- **Sale**: «Sala 1». **Tavoli**: 1–5 in Sala 1, coperti «-». I tavoli veri sono ~20 dentro e ~15 fuori: nel back-office ne esistono 5, quindi il tavolo in Velocissimo è usato poco.
- **Stati ordine** (`/weborderstatus`, 8), ognuno con colore e «predefinito» = la fase del POS:

| id | Stato | Fase POS |
|---|---|---|
| 1 | Ricevuto | Creazione |
| 2 | Confermato | Vendita, Stampa |
| 3 | In Lavorazione | In preparazione |
| 4 | Da ritirare | Preparata |
| 5 | In consegna | |
| 6 | Consegnato | |
| 7 | Annullato | |
| 10 | Ritirato dal cliente | Ritirato, Banco |

Storia vista su un ordine Deliveroo da ritirare: Ricevuto 22:18:47 → Ritirato dal cliente 22:35:54 (lo stato intermedio non viene usato per i ritiri delle piattaforme).

## 1.5 Catalogo

### Prodotti (`/product`, 177 righe, tabella completa in `dati/prodotti_nomi_ricette.md` e `dati/prodotti_listini.md`)
Scheda di modifica, otto schede: **Generali** (immagine; nome; codice es. C007; descrizione; applica tag al cliente; escludi da sconti percentuali; stile; etichette; categoria; gruppo; pagine catalogo app (multi); allergeni; mostra in app rider; **prezzo in tre listini L1/L2/L3**; food cost imponibile; coperti asporto; IVA somministrazione 10; IVA asporto 10; disponibile = Disponibile / Non disponibile definitivamente / Non disponibile per oggi; visibile) · **Upsell variazioni** · **Cross sell** · **Limiti e orari** (preavviso minimo + unità; fasce) · **Menu** (pietanza menu analitica; attivatrice; menu) · **Composizione** (attivatrice; formato; numero gusti; categoria da comporre) · **Ricetta** (tipo Composto; ingredienti) · **Totem** (immagine e descrizione totem).

I tre listini: **L1 = app, sito, banco, asporto** (verificato: Margherita 7,20 in app = L1), **L2 = sala/tavoli** (8,50: Edoardo l'ha controllato sul menù del QR in sala il 22/10, migrazione 0013), **L3 = piattaforme/Deliverect** (7,90). Nella cassa nuova: `prezzo`, `prezzo_tavolo`, `prezzo_piattaforme`.

### Categorie di prodotti (`/productcategory`, 24) e gruppi di variazioni collegati
Campi: nome; usa per calcolo costo consegna; usa per impegno forno; moltiplicatore forno; categoria ecommerce; reparti; attiva scelta formato; supporto composizioni; categorie concorrenti; applica tag; coperti; IVA (10/4/22); escludi da coupon; preavviso minimo; fasce di disponibilità; scheda **Categorie di variazioni** (per gruppo: min/max in app, min/max in POS, max gratis, titolo in app, ordine); scheda Formati e composizioni.

| id | Categoria | Gruppi di variazioni (min–max) |
|---|---|---|
| 8 | PIZZE CLASSICHE | IMPASTO, LATTICINI, SALUMI E PESCE, SPEZIE E ALTRO, VERDURE (0–0 = liberi) |
| 9 | PIZZE SPECIALI | gli stessi cinque |
| 25 | NOVITA | gli stessi cinque |
| 10 | PUCCE PUGLIESI | LATTICINI, SALUMI E PESCE, SPEZIE E ALTRO, VERDURE (niente impasto) |
| 26 | BURGERIA | come le pucce + SALSE |
| 19 | MENU CLASSICO X1 | SCEGLI LA PIZZA/PUCCIA 1–1 · SCEGLI LA BIBITA 1–1 · FRITTI MENU X1 1–1 |
| 20 | MENU CLASSICO X2 | SCEGLI LA PIZZA/PUCCIA 2–2 · SCEGLI LA BIBITA GRANDE 1–1 · FRITTI MENU X2 1–1 |
| 21 | MENU CLASSICO X3 | SCEGLI LA PIZZA/PUCCIA 3–3 · SCEGLI LA BIBITA GRANDE 1–1 · FRITTI MENU X3 1–1 |
| 22 | MENU SPECIALE X1 | SCEGLI LA PIZZA SPECIALE 1–1 · SCEGLI LA BIBITA 1–1 · FRITTI MENU X1 1–1 |
| 23 | MENU SPECIALE X2 | SCEGLI LA PIZZA SPECIALE 2–2 · SCEGLI LA BIBITA GRANDE 1–1 · FRITTI MENU X2 1–1 |
| 24 | MENU SPECIALE X3 | SCEGLI LA PIZZA SPECIALE **1–1** (errore di configurazione: dovrebbe essere 3–3), BIBITA GRANDE 0–0, FRITTI X3 0–0 |
| 11, 12, 13, 14, 15, 16, 17, 18, 27, 7 | FRITTI, DOLCI, BEVANDE, BIRRE, FRISELLE, INSALATE, MENU, CAFFE E AMARI, LA NOSTRA CANTINA, LE NOVITA ESTIVE | nessuna variazione |
| 3, 5, 6 | GESTIONALE, COPERTO (coperti 1), *GESTIONALE* | nessuna |

Nessuna categoria ha preavviso, fasce o IVA propria. Coperti 1 su pizze, friselle, insalate e menu X1; 2 e 3 sui menu X2 e X3.

### Variazioni (`/variation`, 141) e categorie di variazioni (14)
L'elenco completo, con i prezzi, è in `06_DATI.md` §6.3. In sintesi: IMPASTO (normale 0 / alto 1,00); LATTICINI (1,50–3,50); SALUMI E PESCE (1,00–4,00); SPEZIE E ALTRO (0–2,50); VERDURE (0–3,00); SALSE (0,50–1,00); GESTIONALE («No, grazie», «Nota libera»); poi i gruppi di scelta dei menu (SCEGLI LA PIZZA/PUCCIA 35 voci, SCEGLI LA BIBITA 7, BIBITA GRANDE 5, PIZZA SPECIALE 20, FRITTI MENU X1/X2/X3 1 l'uno), tutti a 0,00. Il «senza» non è una variazione: è la rimozione di un ingrediente della ricetta, sempre gratis.

### Il resto del catalogo
- **Gruppi di prodotti** (26): uguali alle categorie più PRODOTTI e SERVIZI; «ordine di stampa» vuoto. Il gruppo è la riga della comanda.
- **Pagine catalogo** (`/ecommercecategory`, 17, tipo App): 65 INSALATE · 66 FRISELLE · 67 BIRRE · 68 BEVANDE · 69 DOLCI · 70 FRITTI · 71 PUCCE PUGLIESI · 72 PIZZE SPECIALI · 73 PIZZE CLASSICHE · 74 FRITTI (doppione) · 75 LE NOVITA ESTIVE · 76 MENÙ · 77 MENU · 78 VETRINA NAPOLI · 79 MENU DELIVERECT · 80 NOVITA' · 81 LA NOSTRA CANTINA.
- **Cataloghi** (`/showcase`, 4): 5 PRANZO · 6 CENA · 7 SOLO DELIVERECT · 8 TOTEM. Un catalogo è l'insieme di pagine mostrato in un momento o canale; i listini L1/L2/L3 sono un'altra cosa.
- **Formati**: Normale (id −1) attivo, Personalizzato 1–4 spenti. **Composizioni**: 1 gusto attivo, 2/3/4 gusti spenti (i prezzi per gusto esistono nel listino ma non si usano).
- **Menu combo** (`/productmenu`, 7, scelta singola): Menu Puccia 7,90 · Classico X1 13,00 · X2 24,00 · X3 33,00 · Speciale X1 15,00 · X2 28,00 · X3 39,00.
- **Upsell variazioni**: nessuno. **Etichette** (9): Vegano, Eccellenza, A tempo limitato, Più venduto, Novità, Vegetariano, SOLD OUT, In esaurimento 2+ («Ultimi {{quantita}}»), Ultimo pezzo. **Stili**: semplice, specialità.
- **Allergeni**: i 14 di legge, **nessun prodotto li ha compilati**.
- **Ingredienti** (91): solo nome, costo 0, senza magazzino. Servono alla ricetta (descrizione in app e «senza»).

## 1.6 Clienti e marketing

- **Cliente** (`/customer`), campi: nome, azienda, cellulare, telefono, email, numero card e scadenza, tipologia card, card amico, **saldo punti**, **saldo credito**, n. ordini, zona di consegna, città/CAP/provincia, ultimo negozio, ultimo accesso app, data ultimo ordine e tipo, coperti acquistati, coperto asporto medio, totale venduto, **RFM** (Recenza, Frequenza, Margine, Totale, 1–5), sincronizzazione con la cassa (da inviare, data ultima sync). I clienti Deliverect arrivano con telefono fittizio e email `@deliverect.com`, uno per ordine.
- **Dati aggiuntivi**: «data revisone» (data), «prova» (testo). **Tag** (12): quasi tutti messi dai coupon («coupon usato: Benvenuto da APP», ANNIVERSARIO, BUONANNO2025…) più «Black List» a mano. **Matrice RFM**: «RFM 1 - OSSERVA ORDINI IN UN ANNO».
- **Coupon** (`/coupon`, 54; colonne: nome, categoria, disponibilità, n. ordini, totale venduto, totale scontato, ottenuti, usati). I più usati: Benvenuto da volantino 112 ordini / 2.660 € / 293 € scontati · GIOVEDÌ SONO FRITTO 108 / 2.999 / 325 · Benvenuto da APP 92 / 1.633 / 460 · Benvenuto 2025 90 · LUNEDÌ DI RIENTRO 10 % 69 · ANNIVERSARIO 58 · BUONANNO2025 51 · NON CUCINO (WhatsApp) 50 / 1.093 / 444 · Benvenuto da sito 43 · da jmenu 43 · SORRISO 42 · FESTADONNA20 39 · BENVENUTO AMICO! 39 · FESTEGGIAMO 38 · da centralino 34 · UN DOLCE MARTEDÌ 31 · PORTA UN AMICO 29 · LUNEDÌ 15 % 24 · LUNEDÌ 20 % 16 · PIÙ SIAMO MEGLIO È! IL MERCOLEDÌ 17 · DOLCETTO 18 · da whatsapp 12 · da instagram 11 · da facebook 10. Lettura: i «Benvenuto da …» sono coupon di primo ordine per **canale di acquisizione**; i settimanali lun–gio sono il motore della settimana.
- **Categorie di coupon**: COUPON · CODICI SCONTO · PREMI · COUPON ACTIVE CAMPAIGN · COUPON WHATSAPP.
- **Premi** (`/prize`, 3, validi fino al 30/9/2027, quantità infinita): PREMIO PIZZA SPECIALE A SCELTA (ordinato 321 volte; 299 ordini / 7.327 € venduti / 2.943 € scontati) · PREMIO FRITTI (125; 114 / 3.064 / 878) · PREMIO BIRRA DA 66 A SCELTA (139; 125 / 3.471 / 443). I premi sono coupon di categoria PREMI riscattati coi punti.
- **Coupon emessi** (`/issuedcoupon`): barcode, coupon, cliente, numero card, codice, data ottenimento, data utilizzo, numero ordine, importo sconto, importo ordine, negozio, usato da (cassiere), inizio/fine validità (GIOVEDÌ SONO FRITTO vale 3 ore dall'ottenimento). Ritmo ~10 al giorno, quasi tutti NON CUCINO e GIOVEDÌ SONO FRITTO.
- **Notifiche push** (7 inviate, es. «Tifa Italia con Noi!» 15/6/2024 a 800 destinatari): data pianificazione, invio, titolo, messaggio, destinatari, stato, raggiunti; segnaposto `[nome]`.
- **Notifiche automatiche** (12 eventi con toggle): carico/scarico credito, carico/scarico punti, provvigione autore, nuova nota ordine, coupon assegnato, ordine programmato, rider arrivato, ordine in anticipo, ordine in ritardo, **recupero carrello abbandonato** (funziona: 1 risvegliato il 21/10).
- **Form CMS**: «Lavora con noi» (4), «DICCI LA TUA» (200), «Customer Satisfaction Form» (15). **Slider**: 2 attivi di 95. **Link utili app**: «Link ordina veloce» con QR.

## 1.7 Ordini (`/weborder`)

Colonne: numero, orario richiesto, negozio, stato, cliente, indirizzo, rider, tipo, data creazione, data e ora ordine, data ordine, totale, costo consegna, origine, pagamento, note, ritardo consegna (secondi, anche negativo), coperti asporto, zona.

- **Numerazione**: una sequenza unica con prefisso per origine (C-57109 cassa, APP-57095 app); ~57.110 ordini dal 2023.
- **Ultime 100 righe (21–22/10/2026)**: tipo Ritiro 60 / Domicilio 23 / Banco 10 / Tavolo 7; origine Da Deliverect 61 / Da PC 19 / Da app 17 / da totem 3; pagamento online 68 / Bancomat alla cassa 19 / Contanti alla consegna 10 / Contanti alla cassa 3. I rider delle piattaforme sono «Ritiro»; il Just Eat consegnato da noi è «Domicilio».
- **Costo consegna 0,00 su tutte le righe** anche con zone da 1–2 €: il dettaglio dell'ordine mostra una riga prodotto «CONSEGNA PIATTAFORMA (0,00 €)» per le piattaforme; per i domicili nostri il costo va letto sul dettaglio (vedi app: la consegna si somma al totale).
- **Dettaglio ordine**: righe «1 LA TONNO E CIPOLLA (10,40 €) CON Brie de meaux (2,50 €) 12,90 €» (le variazioni si stampano come «CON …»), storia degli stati con orario, note. Note tipiche: «Cit: …» (citofono), «PAGATA CON NEXI[22 ORD.]» (pagata online, 22° ordine del cliente), «DA PAGARE CON BANCOMAT[11 ORD.]», Deliverect: «PAGATA CON PAYPAL RITIRO 22:35 DELIVEROO Order ID …», «GLOVO 378», «JUST_EAT … Pays with cash».
- **Report giornata**: vuoto (le chiusure di cassa non vengono sincronizzate). **Matrice prodotti**: prodotto, sezione, categoria, quantità, margine unitario, importo, margine. **Carrelli abbandonati**: stato, data notifica, importo, cliente.

## 1.8 Prenotazioni

133 prenotazioni totali (~1 a settimana). Campi: cliente, stato, telefono, coperti, data/ora, sconto, garanzia, codice sconto, sala, tavolo, note, form di origine (PRENOTAZIONI / GOOGLE), origine (Sito Web / Google), data creazione. Turno unico «Cena» 19:00–22:30. Stati: Da confermare · Confermato · Cancellato · Cliente in · Cliente out · Lista d'attesa · No show · Black list · Rifiutata.

## 1.9 Cosa ne esce per la cassa nuova

1. Gli orari sono **per tipo di carrello** (apertura, consegna, ritiro, banco) con attesa minima e ampiezza della fascia: la nostra tabella delle fasce deve nascere da qui, non da costanti nel codice.
2. Le variazioni si attaccano **alla categoria**, non al prodotto, con min/max/max gratis e ordine: cinque gruppi sulle pizze, quattro sulle pucce, cinque + salse sui burger, i gruppi di scelta sui menu.
3. Tre listini per prodotto, e il listino lo decide il **canale**.
4. Lo stato dell'ordine ha una fase di cassa (Creazione, Vendita/Stampa, In preparazione, Preparata, Ritirato/Banco) che è la nostra macchina degli stati.
5. Coupon, premi e punti sono una parte vera del mestiere (≈ 10 coupon al giorno, 3 premi riscattati centinaia di volte): vanno ricostruiti, con il tag automatico sul cliente e il canale di acquisizione.
6. I tavoli in Velocissimo sono una finzione (5 su 35): il tavolo va pensato da noi.
