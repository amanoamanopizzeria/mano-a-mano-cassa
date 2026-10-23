# REA · 2. L'app cliente «A Mano A Mano Pugliese» (iOS / Android / sito): inventario schermata per schermata

*Letto il 23/10/2026 dal critico, usando la web-app Velocissimo ver. 5.9 (`service.web-app.it/pluto_3.0/…/webapp.php?area_clienti=amanoamanopugliese&visione_web=1`, la stessa che apre «Ordina» su amanoamano.it e che gira dentro l'app iOS/Android), la prenotazione X-Reserve (`url.velocissimo.app/pr/928-17/`), la scheda sull'App Store (id6453763774) e le risposte dell'API `pluto-server` che la web-app chiama (lette dal browser, in sola lettura). Nessun ordine confermato, nessun pagamento, nessun account creato, nessuna prenotazione confermata. Le schermate sono descritte a 640 px di larghezza.*

> «L'unico dubbio è che non sia stata fatta bene la prima parte del REA, cioè analizzare tutto il sistema. Va fatta bene.» — Edoardo, 23/10/2026

Come leggere: ogni schermata ha **nome · come ci si arriva · cosa mostra · cosa chiede · cosa succede dopo · regole che si vedono · foto descritta**. In fondo le due tabelle chieste: le regole che la cassa nuova deve rispettare e cosa oggi fa male o manca.

Dove viene ogni informazione: «(UI)» l'ho vista a schermo; «(API)» l'ho letta nella risposta del server che la web-app riceve (es. `selforder/checkout`, `stores/delivery`, `selforder/products/{id}`); «(config)» sta nelle opzioni dell'app (`GRUPPO.opzioni`) ma non ha una schermata nella versione web; «(store)» dalla scheda App Store.

---

## 0. L'architettura che si vede dal cliente

- **Una sola web-app per tre canali**: il sito («Ordina» → `url.velocissimo.app/so/?928` → `webapp.php?...&visione_web=1`), l'app iOS e l'app Android caricano le stesse pagine HTML (`selforder_select_order_type.html`, `selforder_catalog.html`, `checkout`…) dentro un contenitore. Differenze fra sito e app (config): nel **sito** si può ordinare senza account (`allow_unlogged_orders` web=1) e usare i coupon senza login; nell'**app** no (`app=0`): serve registrarsi. La scheda App Store lo dice chiaro: «Registrati ed effettua il tuo ordine da app».
- **Il server** è `service.web-app.it/pluto-server/public/api/out/...` (chiamate con header `Token`, un carrello identificato da `cartUuid` e un `deviceUuid`). Le chiamate viste in ordine: `selforder/showcases/6` (il catalogo «CENA», id 6), `selforder/products/{id}` (scheda prodotto con varianti e prezzi), `geocode`, `stores/delivery` e `stores/takeaway` (negozio, orari, zona trovata), `selforder/cart` (crea carrello), `cart/items` e `cart/menu-items` (aggiunta), `selforder/menus/{id}` (menu combinati), `selforder/checkout` e `checkout/cart` (carrello con giorni e fasce), `cart/coupons/code` (codice sconto), `selforder/orders` (i miei ordini), `app/webservice/numero_notifiche.php`.
- **Il negozio** (API `stores/*`): id 1 «A MANO A MANO PUGLIESE», Via Novara 5, 00198 Roma, tel. 0689873554, GPS 41.9137759, 12.5074057, consegna sì, ritiro sì. Un solo negozio: «scelta negozio» è automatica.
- **Formati e composizioni** (API checkout): un solo formato «Normale» e una sola composizione «1 gusto». Niente metà/metà, niente maxi, niente baby.
- **IVA** sulle righe del carrello (API): 10 %.
- **Lingue**: italiano e inglese (store); default `it`.
- **Versione**: la web-app scrive «ver. 5.9» nella pagina INFO; sullo store l'app è di Vi.Ru s.r.l.s., 26,3 MB, iOS 11+, 15 valutazioni 4,7, aggiornamento localizzazioni 12/10/2026 (config).

---

## 1. Home / vetrina

### 1.1 Home (sito, `visione_web=1`)

- **Come ci si arriva**: amanoamano.it → «Ordina», oppure l'URL della web-app.
- **Cosa mostra (UI)**: barra alta sabbia con il logo lineare «A MANO A MANO» al centro e un bottone tondo **(i)** a destra; sotto, il bollino rotondo «Pizza italiana · A Mano a Mano Pugliese · Forno a legna», il titolo «A MANO A MANO PUGLIESE», due bottoni: **«Ordina subito»** (sabbia) e **«I miei ordini»** (grigio). Se c'è già un carrello, in fondo compare la **barra fissa** «[n] · Vai a carrello · 24,10 €» che resta su tutte le schermate.
- **Cosa chiede**: niente.
- **Cosa succede dopo**: «Ordina subito» → scelta del servizio (§4.1). «I miei ordini» → §5.4.
- **Regole**: nessun login richiesto per entrare.
- **Foto**: schermata quasi vuota, logo grande, due bottoni larghi al centro, molto bianco sotto.

### 1.2 Home (app nativa iOS/Android — dallo store e dalla config)

- **Cosa mostra (store + config `collegamenti_home`, `collegamenti_centrali`, `slider_home` = 13, `stile_home` = metro, 3 colonne)**: in alto uno **slider** di immagini (foto delle pizze/del locale), poi due **bottoni centrali** grandi «ORDINA SUBITO» e «PRENOTA UN TAVOLO», poi una griglia a 3 colonne di sei voci con icona: **I MIEI ORDINI · REGISTRATI · NOTIFICHE · COUPON · PORTA UN AMICO · CHI SIAMO**. Da loggato «REGISTRATI» diventa **FIDELITY CARD**.
- **Dove portano**: I miei ordini → `ordini.html`; Registrati → `login.html`; Notifiche → `notifiche.html`; Coupon → `coupon_new_redirect.html`; Porta un amico → `bring_a_friend.html`; Chi siamo → `articoli.html` (articoli del negozio); Prenota un tavolo → un articolo con il link a X-Reserve (§6).
- **Regole**: `login_obbligatorio` = 0 per aprire l'app, ma per ordinare dall'app serve l'account (`allow_unlogged_orders` app = 0).
- **Nota**: nella versione web queste sei voci **non esistono**: ho provato a caricarle (`login.html`, `bring_a_friend.html`, `notifiche.html`) e la web-app cambia solo il titolo in alto senza caricare la pagina.

### 1.3 INFO (bottone «i»)

- **Cosa mostra (UI)**: titolo «INFO», logo tondo, «A MANO A MANO PUGLIESE», bottone **«Privacy Policy»**, in fondo il logo «Velocissimo» e «ver. 5.9». Nel template esistono anche un bottone «Il tuo profilo» e un «condividi», nascosti nel web.
- **Cosa manca**: indirizzo, telefono, orari, mappa, social (config: `contatti_email` e `contatti_telefono` vuoti; `neg_fb/instagram` vuoti). Il cliente dal sito non trova il numero di telefono dentro l'ordine online.

### 1.4 Catalogo (la vetrina dei prodotti)

- **Come ci si arriva**: Ordina subito → servizio (→ indirizzo se domicilio) → avviso «Preordina» → **Ordina**.
- **Cosa mostra (UI)**: titolo «Ordina»; sotto, una **riga di schede orizzontali** con le categorie in maiuscolo (si scorre a destra; la categoria aperta ha la sottolineatura); poi la lista verticale di tutti i prodotti di tutte le categorie, con il titolo della categoria centrato. Ogni riga: **NOME in maiuscolo**, descrizione (tagliata a circa 110 caratteri con «…»), **prezzo** grande, eventuale **bollino** colorato («! Novità» rosa, «★ Eccellenza» arancione, «Più venduto») e **foto quadrata** a destra; se il prodotto è già nel carrello, un **badge con la quantità** sull'angolo. In basso a destra la **lente** rotonda: apre un campo «Cerca..» che filtra la lista su nome **e** descrizione (ho cercato «bufala»: 9 risultati fra speciali, classiche e Vetrina Napoli). Layout «classic», stile 1, `goBackOnProductAdd` = 1 (dopo l'aggiunta si torna alla lista), `inlineCart` = 0.
- **Ordine delle categorie (API, catalogo 6 «CENA», 11 categorie, tutte con `posizione` 0, quindi l'ordine è quello del server)**:

| # | id | Categoria | Prodotti |
|---|---|---|---|
| 1 | 80 | NOVITA' | 5 |
| 2 | 72 | PIZZE SPECIALI | 20 |
| 3 | 73 | PIZZE CLASSICHE | 19 |
| 4 | 78 | VETRINA NAPOLI | 6 |
| 5 | 71 | PUCCE PUGLIESI | 15 |
| 6 | 77 | MENU | 6 |
| 7 | 70 | FRITTI | 16 |
| 8 | 69 | DOLCI | 1 |
| 9 | 81 | LA NOSTRA CANTINA | 5 |
| 10 | 67 | BIRRE | 6 |
| 11 | 68 | BEVANDE | 6 |

  Totale **105 prodotti** visibili (il back-office ne ha 177: gli altri sono nascosti o fuori catalogo).

- **I prodotti, con prezzo online (L1), bollino e reparto di produzione (`plu_nome`) — API `showcases/6`**. `id` è l'id prodotto del cloud, `ext` l'id esterno (quello della cassa 2Bit, = `id_velocissimo` della nostra mig. 0013), `cod` il codice:

**NOVITA'** (reparto NOVITA)

| id | ext | cod | Nome | € | Bollino |
|---|---|---|---|---|---|
| 261 | 165 | 143 | AGLIO OLIO E BACCALA' | 12,90 | Novità |
| 264 | 164 | 142 | L'ARRABBIATA | 9,90 | Novità |
| 245 | 149 | 116 | CACIO E CICORIA | 10,70 | Novità |
| 246 | 150 | 117 | LA LARDO | 11,90 | Novità |
| 262 | 166 | 144 | VARIAZIONE DI ZUCCHINE | 11,70 | Novità |

**PIZZE SPECIALI** (reparto PIZZE SPECIALI)

| id | ext | cod | Nome | € | Bollino |
|---|---|---|---|---|---|
| 117 | 39 | C034 | A MANO A MANO | 11,40 | Eccellenza |
| 127 | 45 | C040 | CARBONARA | 10,50 | |
| 131 | 47 | C042 | CIAUSCOLO | 10,90 | |
| 126 | 44 | C039 | COTTO AFFUMICATO | 10,90 | |
| 134 | 49 | C044 | GRICIA ALLE PERE | 10,40 | |
| 227 | 113 | 10 | IL CRUDO DI PARMA | 11,90 | |
| 104 | 31 | C026 | L'AMATRICIANA | 9,40 | |
| 108 | 34 | C029 | L'ANNIVERSARIO | 10,90 | |
| 112 | 36 | C031 | LA BRESAOLA | 10,90 | |
| 118 | 40 | C035 | LA CACIO E PEPE | 9,70 | |
| 106 | 32 | C027 | LA DAR CONTADINO | 9,90 | |
| 122 | 41 | C036 | LA GRICIA | 9,40 | |
| 114 | 37 | C032 | LA MORTADELLA RIVISITATA | 11,40 | |
| 132 | 48 | C043 | LA PORCINI | 11,90 | |
| 110 | 35 | C030 | LA PORCINI E TARTUFO | 11,90 | |
| 107 | 33 | C028 | LA RADICCHIO E GORGONZOLA | 9,40 | |
| 115 | 38 | C033 | LA SALMONE | 11,90 | |
| 103 | 30 | C025 | LA TONNO E CIPOLLA | 9,40 | |
| 124 | 43 | C038 | MADE IN SUD | 10,90 | |
| 129 | 46 | C041 | SAPORI | 10,90 | Eccellenza |

**PIZZE CLASSICHE** (reparto PIZZE CLASSICHE)

| id | ext | cod | Nome | € | Bollino |
|---|---|---|---|---|---|
| 90 | 19 | C014 | L'ORTOLANA | 8,40 | |
| 100 | 27 | C022 | LA 5 FORMAGGI | 9,40 | Eccellenza |
| 94 | 22 | C017 | LA BOSCAIOLA | 8,90 | |
| 101 | 28 | C023 | LA BUFALA E PACHINO | 9,90 | |
| 97 | 25 | C020 | LA CAPRICCIOSA | 9,40 | |
| 93 | 21 | C016 | LA CROSTINO | 9,40 | |
| 86 | 15 | C010 | LA DIAVOLA | 8,40 | |
| 92 | 20 | C015 | LA FIORI E ALICI | 9,40 | |
| 84 | 13 | C008 | LA FUNGHI | 8,20 | |
| 82 | 12 | C007 | LA MARGHERITA | 7,20 | |
| 99 | 26 | C021 | LA MARGHERITA CON BUFALA | 9,20 | Più venduto |
| 88 | 17 | C012 | LA MARGHERITA CON CRUDO | 9,40 | |
| 81 | 11 | C006 | LA MARINARA | 6,40 | |
| 85 | 14 | C009 | LA NAPOLI | 8,40 | |
| 95 | 23 | C018 | LA PATATE CON SALSICCIA | 8,90 | |
| 96 | 24 | C019 | LA PATATE CON WURSTEL | 8,90 | |
| 102 | 29 | C024 | LA PROVOLA E SPECK | 9,20 | |
| 89 | 18 | C013 | LA SALSICCIA | 8,40 | |
| 87 | 16 | C011 | LA WURSTEL | 8,40 | |

**VETRINA NAPOLI** (reparto: le prime due e la Margherita ricca stanno in PIZZE CLASSICHE, le altre in PIZZE SPECIALI)

| id | ext | cod | Nome | € |
|---|---|---|---|---|
| 223 | 134 | 31 | LA CROSTINO PUGLIESE | 11,00 |
| 224 | 135 | 32 | LA FURIOSA | 10,00 |
| 225 | 136 | 33 | LA GATEAU | 11,00 |
| 222 | 133 | 30 | LA MARGHERITA RICCA | 10,80 |
| 123 | 42 | C037 | LA PARMIGIANA | 10,50 |
| 226 | 137 | 34 | LA PROVOLONA | 11,00 |

**PUCCE PUGLIESI** (reparto PUCCE PUGLIESI)

| id | ext | cod | Nome | € |
|---|---|---|---|---|
| 148 | 60 | C055 | PUCCIA BRIE E SPECK | 7,50 |
| 144 | 57 | C052 | PUCCIA CARCIOFI E GUANCIALE | 7,50 |
| 153 | 97 | PP002 | PUCCIA CIAUSCOLO | 8,00 |
| 151 | 96 | PP001 | PUCCIA CIME DI RAPA | 7,50 |
| 146 | 59 | C054 | PUCCIA COTTO E PESTO | 8,00 |
| 138 | 51 | C046 | PUCCIA CRUDO DI PARMA | 8,00 |
| 154 | 98 | PP003 | PUCCIA CRUDO E STRACCIATELLA | 8,50 |
| 142 | 55 | C050 | PUCCIA FIORI DI ALICI | 8,50 |
| 141 | 54 | C049 | PUCCIA LA PUGLIESE | 8,00 |
| 150 | 62 | C057 | PUCCIA LA SALMONE | 8,50 |
| 139 | 52 | C047 | PUCCIA MORTADELLA STRACCIATELLA | 8,00 |
| 143 | 56 | C051 | PUCCIA PANCETTA E PECORINO | 8,00 |
| 149 | 61 | C056 | PUCCIA RADICCHIO GORGONZOLA E SPECK | 7,50 |
| 140 | 53 | C048 | PUCCIA STRACCIACOTTO | 7,50 |
| 136 | 50 | C045 | PUCCIA VEGETARIANA | 7,00 |

**MENU** (reparto MENU; sono «attivatori di menu»: `isMenuActivator` = 1, `menuId` 2…7; tutti e sei condividono ext 127 / cod 24)

| id | menuId | Nome | € | Testo in app |
|---|---|---|---|---|
| 216 | 2 | Menù Classico X1 | 13,00 | scegli 1 Pizza Classica / Puccia e 1 bibita e avrai in omaggio 1 supplì, 1 crocchetta e 3 mozzarelline |
| 217 | 3 | Menù Classico X2 | 24,00 | 2 Pizze Classiche / Pucce e 1 bibita grande; omaggio 2 supplì, 2 crocchette, 3 mozzarelline |
| 218 | 4 | Menù Classico X3 | 33,00 | 3 Pizze Classiche / Pucce e 1 bibita grande; omaggio 3 supplì, 3 crocchette, 6 mozzarelline |
| 219 | 5 | Menù Speciale X1 | 15,00 | 1 Pizza Speciale e 1 bibita; omaggio 1 supplì, 1 crocchetta, 3 mozzarelline |
| 220 | 6 | Menù Speciale X2 | 28,00 | 2 Pizze Speciali e 1 bibita grande; omaggio 2 supplì, 2 crocchette, 3 mozzarelline |
| 221 | 7 | Menù Speciale X3 | 39,00 | 3 Pizze Speciali e 1 bibita grande; omaggio 3 supplì, 3 crocchette, 6 mozzarelline |

**FRITTI** (reparto FRITTI)

| id | ext | cod | Nome | € | Bollino |
|---|---|---|---|---|---|
| 161 | 68 | C063 | ARANCINO ALLA CARBONARA | 3,50 | |
| 268 | 109 | 6 | FRITTURA DI VERDURE | 5,00 | |
| 257 | 162 | 137 | OLIVE ASCOLANE | 5,00 | |
| 157 | 64 | C059 | CROCCHETTA DI PATATE | 2,20 | |
| 156 | 63 | C058 | SUPPLÌ DI RISO | 2,20 | Più venduto |
| 160 | 67 | C062 | ARANCINO ALLA GRICIA | 3,50 | |
| 166 | 73 | C068 | CHIPS DI PATATE | 3,50 | |
| 159 | 66 | C061 | CROCCHETTA AL GORGONZOLA | 3,00 | |
| 158 | 65 | C060 | CROCCHETTA ALLA 'NDUJA | 3,00 | |
| 168 | 75 | C070 | CROCCHETTA CACIO E PEPE | 3,00 | |
| 165 | 72 | C067 | FILETTO DI BACCALÀ PASTELLATO | 4,50 | |
| 164 | 71 | C066 | FIORE ALL' NDUJA | 3,50 | |
| 162 | 69 | C064 | FIORE DI ZUCCA | 3,00 | |
| 163 | 70 | C065 | FIORE SARDO | 3,50 | |
| 167 | 74 | C069 | MOZZARELLINE | 4,50 | Più venduto |
| 263 | 167 | 145 | PEPITE DI BACCALA' | 4,50 | Novità |

**DOLCI**: 169 / 76 / C071 PUCCIA CON NUTELLA 5,50 €.

**LA NOSTRA CANTINA** (tutti ext 168 / cod 146, cioè in cassa sono **un solo articolo**): ARMABIANCA (Vermentino) 16,00 · ARPIONE (Negramaro rosso) 17,00 · BALESTRONE (Primitivo) 18,00 · BATTIFREDDO (Negramaro rosato) 16,00 · TORRIERO (Chardonnay) 16,00.

**BIRRE**: Heineken 33cl 3,00 (184/91/C086) · Heineken 66cl 4,00 (186/93/C088) · Menabrea 33cl 3,50 (183/90/C085) · Menabrea 66cl 4,50 (187/94/C089) · Peroni 33cl 2,50 (182/89/C084) · Peroni 66cl 3,00 (185/92/C087).

**BEVANDE**: Chinotto neri 2,00 (176/83/C078) · Coca 1,5lt 4,00 (180/87/C082) · Coca 1,5lt zero 4,00 (181/88/C083) · Coca cola 0,33cl 2,50 (177/84/C079) · Coca cola 0,33cl zero 2,50 (178/85/C080) · Fanta 0,33cl 2,50 (179/86/C081). L'acqua (naturale e frizzante 0,5, ext 116…) **non è nel catalogo**: esiste solo come scelta dentro i Menu.

- **Etichette (bollini)** usate: «Novità» (9 prodotti), «Eccellenza» (4: A Mano a Mano, Sapori, 5 formaggi… con stella), «Più venduto» (3: Margherita con bufala, Supplì, Mozzarelline). Ogni etichetta ha nome, icona FontAwesome e colore (API `labels`).
- **Allergeni**: il filtro allergeni è acceso nella config (`enableAllergensFilter`) ma **nessun prodotto ha allergeni caricati** (`allergens` e `allergenList` sempre `null`, `filters.allergens` = null): il cliente non vede nessun allergene da nessuna parte.
- **Descrizioni sporche viste a schermo**: «OLIVE ASCOLANE» → «Chips di patate prodotto surgelato»; «CIAUSCOLO» → «ciascuno»; «PUCCIA CIAUSCOLO» con le virgolette nella descrizione; «Speck alto adige igb».
- **Foto**: tutte le righe hanno la foto (CDN WebApp), eccetto le acque nei menu.
- **Foto descritta**: lista bianca a righe alte ~175 px, nome nero bold, descrizione grigia su due righe, prezzo bold a sinistra in basso con il bollino accanto, foto quadrata 100×100 a destra; le schede delle categorie in alto in grigio chiaro con quella attiva sottolineata; la lente bordeaux in basso a destra.

---

## 2. Scheda prodotto («Dettagli»)

- **Come ci si arriva**: tocco su una riga del catalogo (chiama `selforder/products/{id}?composition=-1`).
- **Cosa mostra (UI)**: titolo «Dettagli»; **NOME**, foto grande, descrizione, poi tre blocchi con titolo centrato e riga sotto:
  1. **Quantità**: «− 1 +».
  2. **Modifica ingredienti** (solo se il prodotto ha ingredienti di ricetta rimovibili): una riga per ingrediente con **«−»** e **«+»**. Il «−» barra il nome (= **SENZA**, prezzo invariato, `removePrice` 0); il «+» lo rimette. Diavola: «Spianata calabrese piccante». Capricciosa: Funghi, Olive taggiasche, Prosciutto crudo di Parma, Uovo (manca il carciofo: la ricetta in cloud è incompleta). Puccia brie e speck: Brie, Rughetta, Speck. Crostino pugliese: Olive, Cotto di Praga, Stracciatella.
  3. **Aggiungi ingredienti** (`addLabel` = «extra»): i gruppi in maiuscolo **IMPASTO, LATTICINI, SALUMI E PESCE, SPEZIE E ALTRO, VERDURE**, ogni voce con un **«+»** tondo a destra e **senza prezzo**. Toccando il «+» la riga diventa grigia con la spunta e **solo allora compare il prezzo** sotto il nome («1,00 €», «2,50 €»). È un interruttore: un secondo tocco toglie l'extra; **non si può mettere doppio** lo stesso extra. Gli ingredienti già nella ricetta sono tolti dalla lista degli extra.
  4. In fondo, fisso: **«Aggiungi N al carrello · prezzo»** che si aggiorna a ogni tocco (prezzo = (base + extra) × quantità).
- **Cosa chiede**: quantità, eventuali SENZA e CON. **Nessuna nota sul singolo prodotto** (`disableNotes` = true).
- **Cosa succede dopo**: «Aggiungi» → `cart/items` → torna al catalogo, badge con la quantità sulla riga, barra in fondo «[n] · Vai a carrello · totale» (a domicilio il totale **include già 1,00 € di consegna**: 2 Diavole da 11,90 = 23,80 → barra 24,80).
- **Regole viste**: le varianti valgono **su tutta la quantità** della riga (2 Diavole CON bufala = tutte e due); per averne una sola diversa si fanno due righe. `showPricesOnAddition` = false (per questo il prezzo non si vede prima della spunta). Nessun limite al numero di extra (`maximumNumber` 0, `maximumFreeNumber` 0, `minimumNumber` 0 su tutti i gruppi). `minimumNotice` nullo su tutti i prodotti (niente «da ordinare almeno X prima»). Nessun upsell (`crossSellingProducts` sempre vuoto). Stock mai usato.
- **Quali prodotti hanno le varianti**: tutte le **pizze** (Novità, Speciali, Classiche, Vetrina Napoli) hanno i 5 gruppi; le **Pucce** hanno 4 gruppi (**senza IMPASTO**); Fritti, Dolci, Cantina, Birre, Bevande e i Menu **non hanno nessuna variante**: la scheda ha solo la quantità. Le pizze di Vetrina Napoli, già «impasto alto», offrono lo stesso «Impasto Alto +1,00».
- **Foto descritta**: titolo in maiuscolo nero, foto 190×190 su fondo sabbia, descrizione, «Quantità» con i due bottoni grigi tondi e il numero in mezzo, poi le righe degli ingredienti bianche con il «+» nero in un cerchio grigio; l'extra scelto diventa una riga grigia con la spunta e il prezzo color sabbia; la barra in fondo sabbia con «Aggiungi 1 al carrello» e il prezzo a destra.

### 2.1 Listino completo degli ingredienti extra (API `selforder/products/86`, uguale su tutte le pizze; «CON» = `addPrice`, «SENZA» = `removePrice`, sempre 0)

**IMPASTO** (gruppo id 1)

| Extra | CON € |
|---|---|
| Impasto Alto | 1,00 |
| Impasto Normale | 0,00 |

**LATTICINI** (gruppo id 2)

| Extra | CON € |
|---|---|
| Brie de meaux | 2,50 |
| Cheddar | 2,00 |
| Crema Cacio e Pepe | 2,50 |
| Doppia Mozzarella | 2,00 |
| Gorgonzola piccante | 2,00 |
| Grana padano dop | 1,50 |
| Mozzarella di Bufala DOP | 2,50 |
| Mozzarella di Bufala DOP a strappi | 3,00 |
| Pecorino Romano dop | 2,00 |
| Provola Affumicata | 1,50 |
| Stracciatella artigianale | 3,00 |
| Stracciatella artigianale al tartufo | 3,50 |
| Taleggio | 2,50 |

**SALUMI E PESCE** (gruppo id 3)

| Extra | CON € |
|---|---|
| Alici | 2,00 |
| Bottarga | 2,00 |
| Bresaola | 3,00 |
| Ciauscolo | 2,00 |
| Guanciale | 2,00 |
| Mortadella bolognese igp | 2,00 |
| Nduja calabrese piccante | 1,50 |
| Pancetta arrotolata Piacentina | 2,50 |
| Prosciutto cotto affumicato di praga | 2,00 |
| Prosciutto crudo di Parma 18 mesi | 2,50 |
| Salmone affumicato norvegese | 4,00 |
| Salsiccia di norcia | 1,50 |
| Speck alto adige igp | 2,50 |
| Spianata calabrese piccante | 2,00 |
| Tonno | 2,00 |
| Uovo | 1,00 |
| Wurstel | 1,50 |

**SPEZIE E ALTRO** (gruppo id 4)

| Extra | CON € |
|---|---|
| Colatura di Alici | 1,50 |
| Noci | 1,50 |
| Olio all'Aglio | 0,50 |
| Origano | 0,00 |
| Peperoncino | 0,50 |
| Polvere di Cappero essiccato | 1,00 |
| Prezzemolo | 0,00 |
| Salsa tartufata | 2,50 |

**VERDURE** (gruppo id 5)

| Extra | CON € |
|---|---|
| Broccoletti | 1,50 |
| Carciofi | 2,00 |
| Chips di patate | 2,00 |
| Cipolla Caramellata | 1,00 |
| Crema di patate | 2,00 |
| Emulsione al basilico | 1,50 |
| Fiori di zucca | 1,50 |
| Funghi | 1,50 |
| Insalata | 0,00 |
| Melanzane | 1,00 |
| Olive taggiasche | 2,00 |
| Pachino appassito al forno | 2,00 |
| Patate al Forno | 1,00 |
| Pomodorini Semi Secchi | 2,50 |
| Pomodoro Burger | 0,00 |
| Pomodoro Pachino | 1,50 |
| Porcini | 3,00 |
| Radicchio | 1,00 |
| Rughetta | 1,00 |
| Salsa di pomodoro | 0,00 |
| Topping al pachino caramellato | 1,50 |
| Zucchine | 1,00 |

In tutto **62 extra** (2 + 13 + 17 + 8 + 22). Nel carrello ogni extra compare come «CON Nome (prezzo)» e ogni rimozione come «SENZA Nome»; nell'API l'extra ha `operator` 1 e quantità +1, il SENZA `operator` 2 e quantità −1, con `att_prezzo` (CON) e `att_prezzo_meno` (SENZA, 0).

### 2.2 Scheda di un Menu combinato (`selforder/menus/{id}`)

- **Cosa mostra (UI)**: «Componi il tuo menu e continua», poi un riquadro tratteggiato per ogni gruppo obbligatorio: **«La tua Pizza/Puccia»** e **«La tua bevanda»**, la quantità «− 1 +», e in fondo «Aggiungi 1 al carrello» **grigio e senza prezzo** finché non si è scelto tutto.
- **Gruppo 1 «La tua Pizza/Puccia»** (max 1, obbligatorio, 34 scelte): le 19 classiche + le 15 pucce (per il Menù Classico; il Menù Speciale pesca dalle Speciali). Lista uguale al catalogo ma **senza prezzi** (`showPricesInApp` 0). Toccando una pizza si apre la **sua scheda con Modifica/Aggiungi ingredienti** (gli extra si pagano: `useAddVariationPrices` 1) e il bottone «Scegli La tua Pizza/Puccia». Scelta fatta, il riquadro mostra «La tua Pizza/Puccia · L'ORTOLANA».
- **Gruppo 2 «La tua bevanda»** (max 1, obbligatorio, 7 scelte): Acqua frizzante 0,5 · Acqua naturale 0,5 · Chinotto neri · Coca cola 0,33cl · Coca cola 0,33cl zero · Fanta 0,33cl · Peroni 33cl. Per i menu X2/X3 la «bibita grande» (non aperta).
- **Nel carrello**: «1x MENU CLASSICO X1 · L'ORTOLANA · Coca cola 0,33cl · 13,00 €». **I fritti in omaggio non compaiono** né nella scheda né nel carrello: sono solo nel testo della descrizione. Nell'API la riga ha `productId` 210 (il contenitore «MENU CLASSICO X1»).
- **Foto descritta**: due rettangoli tratteggiati grigi con il testo centrato, i bottoni della quantità, bottone in fondo grigio spento.

---

## 3. Carrello (è anche il checkout: una sola schermata)

- **Come ci si arriva**: barra in fondo «Vai a carrello» (chiama `selforder/checkout`).
- **Cosa mostra (UI), dall'alto**:
  1. **Indirizzo di consegna** (solo domicilio): «Via Nomentana 120, Roma (RM), 00161» + «✎ Modifica» (riapre §4.2).
  2. **Giorno**: 7 bottoni «Ven 23 · Sab 24 · Dom 25 · Lun 26 · Mar 27 · Mer 28 · Gio 29» (oggi + 6; `showDaysPicker` true; tutti `available` true).
  3. **Orario**: bottoni che scorrono in orizzontale. **Domicilio**: 15 **finestre da 30 minuti ogni quarto d'ora**, «19:00-19:30, 19:15-19:45, … 22:30-23:00». **Ritiro**: 16 **orari puntuali** «19:00, 19:15, … 22:45». Nessuno è preselezionato (`pickFirstTimeslot` false), scegliere è obbligatorio (`requireTimeslots` true); ogni fascia nell'API ha `soldOut`, `message` e `discount` (oggi tutti false/null): una fascia piena si mostra come **«SOLD OUT»** (stringa in lingua), non sparisce. Non esiste «prima possibile».
  4. **Il tuo ordine** + link «Aggiungi prodotti» (torna al catalogo). Righe: «2x LA DIAVOLA», sotto in piccolo «SENZA Spianata calabrese piccante» (barrato), «CON Impasto Alto (1,00 €)», «CON Mozzarella di Bufala DOP (2,50 €)», prezzo riga a destra «23,80 €», link «Rimuovi» → finestra «Conferma · Sei sicuro di voler rimuovere il prodotto dal carrello? · Si / No». **Non si cambia la quantità dal carrello**: solo rimuovere (e rientrare).
  5. **Consegna 1,00 €** (solo domicilio; etichetta `deliveryPriceDescription`).
  6. **«✎ Aggiungi una nota»** → pagina «Modifica note»: «Inserisci una nota per il tuo ordine», un riquadro di testo, bottone «✓ Conferma». Una nota sola per tutto l'ordine.
  7. **«Hai un codice sconto? Inseriscilo»** con campo «Inserisci il codice..» e bottone **«Applica»** (`cart/coupons/code`; con un codice inventato: finestra «Attenzione · Il codice inserito non corrisponde a nessun coupon · OK»).
  8. **«Seleziona un coupon da utilizzare»** (riquadro tratteggiato) → pagina «Riscatta coupon»: «Inserisci il codice del coupon», campo, bottone «Riscatta». Nessuna lista di coupon disponibili (`availableCoupons` vuoto da non loggati); da loggato qui compaiono i coupon ottenuti (stringhe: «Ecco a te tutti i tuoi coupon», «Selezionato - lo trovi al checkout», «Non usare nessun coupon»).
  9. **Pagamento** (caselle): **domicilio** → «Contanti alla consegna» · «Pagamento online»; **ritiro** → «Contanti alla cassa» · «Bancomat alla cassa» · «Pagamento online». Nessuno preselezionato nella UI (nell'API `defaultPayment` 1 = contanti). «Pagamento online» = **Nexi** (API `payment.description` Nexi, `isPaid` 1, piattaforma 4); PayPal è attivo nella config (`pagamento_paypal` 1, conto l'email della pizzeria) ma non compare. Per i contanti a domicilio `askForCashInfo` = 1 e `askForCashToPay` true: dopo «Ordina» chiede **con che banconota paghi** (resto). **Manca il POS alla consegna**: il «Bancomat» (id 14) esiste ma è spento per app e web (`disableForApp` 1, `disableInWebapp` 1).
  10. In fondo, fissa: **«[n] · Ordina · totale»** (con consegna inclusa).
- **Cosa chiede**: giorno, orario, pagamento (e indirizzo a domicilio); nota e coupon facoltativi.
- **Cosa succede dopo «Ordina»** — **non toccato**. Dalla config: nel sito, se non si è loggati, si apre la **registrazione veloce** (`quickRegisterUnloggedCustomer` true, `allowUnloggedOrders` false nel checkout): Nome, Cognome, Email, Cellulare, consenso privacy obbligatorio, newsletter facoltativa (`customerForm.fields` con `isForQuickRegistration` 1; stringa «Per completare il tuo ordine abbiamo bisogno di qualche informazione»); poi conferma e, se online, il pagamento Nexi; alla fine «Ordine completato» con i dettagli (`apriDettagliOrdineCreato`). Ordine minimo: **10,00 €** a domicilio (API `options.minimumOrderAmount` 10 e `zona.minimumOrderAmount` 10; **nessun minimo al ritiro**, `null`). Il blocco arriva **solo dopo «Ordina»** con «Per completare l'ordine bisogna raggiungere la spesa minima di 10 €»: con 1 supplì (2,20 + 1,00 = 3,20 €) il carrello non avvisa e il bottone «Ordina» è attivo. (Nella config generale c'è anche `spesa_minima` 12,50, ma vince la zona: 10.)
- **Sconti/promo**: `usePromosInCheckout` false; nessuna promozione automatica (es. lun–gio) visibile. Esistono nel sistema i coupon con regole: solo domicilio / solo ritiro, fascia oraria, validità, «esaurito», prodotto omaggio da scegliere («Scegli un prodotto omaggio tra questi»), importo minimo per usarlo, «Codice riconosciuto, verrà verificato alla conferma». Esistono anche le **offerte una tantum** (`oneTimeOfferId`, `isFirstOneTimeOffer`) e i **punti doppi per fascia** («PUNTI X2 · Ordinando per quest'orario riceverai punti doppi», `enableSameZoneDiscount` 0 oggi).
- **Foto descritta**: tutto su una pagina lunga ~2,5 schermate: titoli neri centrati con riga, bottoni dei giorni grigi con quello scelto bordeaux, le fasce come bottoni grigi larghi, le righe dell'ordine con i prezzi a destra e «Rimuovi» color sabbia, i due blocchi coupon (campo grigio + bottone sabbia; riquadro tratteggiato), le caselle del pagamento quadrate grigie con la spunta nera, barra «Ordina» sabbia in fondo con il totale.

---

## 4. Checkout: il percorso di chi ordina

### 4.1 «ORDINA SUBITO»: scelta del servizio

- **Cosa mostra (UI)**: due bottoni larghi sabbia con icona: **«Consegna a domicilio»** (motorino con cloche) e **«Ritiro al locale»** (scatola). Nel template ci sono, nascosti: «Ordine al locale», «Punto di ritiro», **«Ordina al tavolo»**, «Wishlist» (`enableMultiServicesSelect` false; `consegna_default` corriere).
- **Se c'è già un carrello**: finestra **«Carrello aperto · Hai già dei prodotti a carrello. Vuoi proseguire l'ordine aperto o ricominciare? · Si, continua / No, ricomincia»**. Con «Si, continua» a domicilio **non richiede l'indirizzo** (è la differenza che avevo visto nel giro 1); con «No, ricomincia» il carrello si svuota e l'indirizzo viene chiesto.
- **Foto descritta**: fondo bianco, titolo «ORDINA SUBITO» su barra bordeaux, due rettangoli sabbia alti ~90 px distanziati.

### 4.2 «Inserisci un indirizzo» (solo domicilio)

- **Cosa mostra (UI)**: campo «Inserisci l'indirizzo» con l'icona **freccia GPS** a destra (posizione del telefono), sotto «🗺 Oppure definisci la posizione sulla mappa» (`enablePickCoordinatesFromMap`); bottone fisso in fondo «Conferma» (grigio finché non c'è l'indirizzo).
- **Cosa chiede**: scrivendo «Via Nomentana 120» compaiono **5 suggerimenti Google** («Via Nomentana, 120, Roma, RM, Italia», poi Monterotondo, Corato, Gela, Giavera del Montello: non filtra per città). Scelto uno, compaiono due campi facoltativi **«Piano/Riferimento»** e **«Campanello/Citofono»** (`askForFloor`, `askForDoorbell`; non obbligatori; `askForApartment` false; `skipHouseNumberCheck` false → senza civico chiederà il numero).
- **Cosa succede dopo «Conferma»**: `geocode` → `stores/delivery`: il server calcola la **distanza** (1.105 m) e la **zona** (`matchedZone` 15 «BOLOGNA SPALLANZANI», `shippingPrice` 1,00, `minimumOrderAmount` 10, `freeShippingThreshold` null, `averageDeliveryTime` null) → crea il carrello (`selforder/cart`, con `road`, `houseNumber`, `postalCode` 00161, `lat/lon`, `deliveryZone` 15) → avviso **«Preordina»** → catalogo. Se l'indirizzo è fuori dai poligoni il negozio non viene restituito (zona «generica» = non serviamo): messaggio di non copertura (non riprodotto).
- **Regole viste**: il costo di consegna e il minimo sono **per zona**, decisi dal poligono in cui cade il punto geocodificato (le 16 zone con 1,00 / 1,50 / 2,00 € sono le stesse della nostra mig. 0019). Il costo compare nel carrello **solo come riga «Consegna»** e nella barra; il cliente non viene mai informato prima di «quanto costa la consegna a casa tua» né «minimo 10 €».
- **Foto descritta**: barra «Inserisci un indirizzo», campo bianco grande con l'icona GPS, il link con l'icona mappa, lista dei suggerimenti bianca sotto il campo; dopo la scelta, riquadro con i due campi Piano e Campanello; bottone «Conferma» sabbia in fondo.

### 4.3 L'avviso «Preordina»

- **Quando**: ogni volta che si entra nel catalogo fuori orario (oggi alle 02:00, ma anche di giorno).
- **Testo domicilio** (API `stores/delivery.errorMessage`, status 2): «Al momento non effettuiamo consegne, ma puoi comunque effettuare un preordine. Ecco i nostri orari di consegna: Lun 19:00-22:30 … Dom 19:00-22:30». **Testo ritiro**: «Al momento non accettiamo ritiri, ma puoi comunque effettuare un preordine. Ecco i nostri orari di ritiro: Lun 19:00-22:45 … Dom 19:00-22:45». Bottone «OK».
- **Regola**: l'ordine online è **sempre accettato come preordine** (`orario_disponibile_ordini` 00:00–23:59, `isOpenForSelforder` true); l'orario conta solo per le fasce.

### 4.4 Ritiro al locale

Stesso catalogo e stessa scheda; carrello senza indirizzo, 16 orari puntuali 19:00–22:45, tre pagamenti (contanti, bancomat alla cassa, online), nessuna consegna, nessun minimo (`minimumOrderAmount` null). `hasTakeAwayDistanceLimit` false. Il cliente non viene chiamato per nome in nessuna schermata (il nome arriva con la registrazione).

### 4.5 Ordine al tavolo

Previsto dal prodotto (`Ordina al tavolo`, `TABLE_CART_SERVICE_DATA`, `tableServiceDialog`) ma **spento**: il QR in sala porta a un menù, non a un ordine.

### 4.6 Fattura, termini

**Nessun campo fattura/P.IVA** nel checkout. Termini: solo i consensi della registrazione (privacy obbligatorio, marketing e cessione a terzi facoltativi). Privacy policy nella pagina INFO.

---

## 5. Area cliente (app nativa; nel web solo «I miei ordini»)

### 5.1 Registrazione / Login (config `customerForm`, stringhe LINGUA, store)

- **Registrazione completa** (pagina «Benvenuto su A Mano A Mano Pugliese, crea subito un nuovo profilo»): **Nome\***, **Cognome\***, **Email\*** (validata), **Cellulare\*** (validato), Data di nascita, **Password\*** e **Conferma password\*** (min 6 caratteri), casella obbligatoria «Dichiaro di aver letto e compreso l'informativa sul trattamento dei dati personali…» (errore: «Accettare i termini e le condizioni…»), casella «Accetto la ricezione via mail, telefono, sms di comunicazioni commerciali» (facoltativa), casella «Accetto il trattamento dei dati ed il trasferimento a società terze» (facoltativa). Dopo l'invio: «Per completare la registrazione cliccare sul link inviato alla sua email» (attivazione via email, `attiva_card_tipo` email; esiste anche la via SMS).
- **Registrazione veloce** (dentro l'ordine): Nome, Cognome, Email, Cellulare, privacy, newsletter («Registrazione completata con successo!»).
- **Login** («Bentornato su …»): email + password (`login_email` 1), **«Login con Google»** (`enableGoogleSignIn` true), «Password dimenticata? Clicca qui» (recupero via email o SMS: «Abbiamo inviato SMS … contenente la tua nuova password»); Facebook e Apple spenti; login con card spento. Se il cellulare è su più account: «accedi con la tua email».
- **Profilo** («Il mio profilo», `dati_modificabili` 1): i dati sopra, «Modifica Password» (vecchia, nuova, ripeti), «Completa il profilo». Logout: `logout_abilitato` false (!).
- **Indirizzi**: l'indirizzo vive nel carrello; l'app ricorda l'ultimo (nessuna rubrica indirizzi vista).

### 5.2 Fidelity card, punti e premi (config + stringhe; **le schermate non si aprono nel web**)

- `mostra_punti` 1, `mostra_credito` 0, `ordinapremi` sì, `richiedi_card_tipo` automatico (la card nasce con la registrazione), `showTransactionPoints` 1 (nello storico ordini si vedono i punti), `handlePrizesAsCoupons` false, catalogo premi con intestazione propria.
- Schermate (dalle stringhe): «Ciao %1%, ecco la tua card» con **QR da mostrare alla cassa** («Mostra questo codice alla cassa»), «Punti Accumulati / Punti Maturati», **«Premi»** con «Ottieni premio», «Ti mancano %1% punti», «Punti insufficienti per riscattare il premio», «Il premio da te selezionato è esaurito», «Scegli un negozio per riscattare il premio», «Premio riscattato!». Esistono anche «Card prepagata» (credito) e i bollini («Non rientri nel perimetro»), spenti.
- **Quanto vale un punto, quanti ne dà un euro e quanti ne costano «PREMIO PIZZA SPECIALE», «PREMIO FRITTI», «PREMIO BIRRA DA 66» non si vede dal lato cliente**: stanno nel back-office (premi e regole punti) e vanno letti da lì (§ `01_BACKOFFICE`). Da non loggati l'app non mostra né punti né premi.
- **Punti doppi per fascia** («PUNTI X2 … per quest'orario») e «+N PT» sono funzioni della fascia/zona, oggi spente.

### 5.3 Coupon (area «COUPON» dell'app)

- Lista dei coupon **da ottenere** («OTTIENI» / «ottenuto») e **da usare** («USA» / «usato», «Usati», «I tuoi coupon usati», «Nessun coupon usato»); un coupon può richiedere un **codice operatore** (spento, `coupon_codice_operatore` 0), essere solo donne/uomini, avere data di inizio («sarà disponibile il … alle …») e fine, essere «esaurito», valere solo domicilio o solo ritiro, in una fascia oraria, con una spesa minima, o dare un **prodotto omaggio** da scegliere. Nel web: «Per utilizzare un codice sconto devi prima effettuare la registrazione su app» (stringa) — ma dal sito i coupon da codice sono permessi (`allow_unlogged_coupons` web 1).

### 5.4 I miei ordini

- **Web, non loggato (UI)**: «Non hai ancora effettuato nessun ordine» (il titolo in alto resta «ORDINA SUBITO»: svista). Chiama `selforder/orders`.
- **App (config/stringhe)**: lista degli ordini con stato, punti della transazione, note; **«Ordina di nuovo»** (`enableOrderAgain` true, `reorderable`); tracciamento del rider («abilita_tracciatura_fattorini» true: mappa con l'icona del negozio, del rider e del cliente; stima tempo consegna spenta, `mostraStimaTempoConsegna` false; `tempo_obiettivo_ordine` 30 min).

### 5.5 Notifiche, Porta un amico, Chi siamo

- **Notifiche**: lista delle push («Sembra che tu non abbia ancora notifiche»); il contatore arriva da `numero_notifiche.php`.
- **Porta un amico** (`invita_amico_modalita` sms): invito via SMS con codice, card amico («elenco CARD amici»).
- **Chi siamo**: articoli del negozio (testo + foto); è lo stesso contenitore che ospita «Prenota un tavolo».
- **Condividi**: bottone nascosto nell'header (`mess_sharing`).

---

## 6. Prenotazione tavolo (X-Reserve, `url.velocissimo.app/pr/928-17/`)

Tre passi con la barra «1 — 2 — 3» in alto e il logo lineare. **Il titolo della pagina è «GOOGLE»** (svista). Footer: «Powered by X-Reserve | Privacy Policy | Cookie Policy | Accessibility Declaration».

1. **«Dati prenotazione»**: **Nome\*, Cognome\*, Telefono\*** (campo numerico), **Email\***, Note; bottone «Avanti». Chiede chi sei **prima** di quando e in quanti.
2. **«Prenota un tavolo»**: **DATA** su un calendario mensile (ottobre 2026, i giorni passati in grigio, oggi evidenziato, freccia per il mese dopo), **NUMERO DI PERSONE** con bottoni **2 · 3 · 4 · 5 · 6 · 7 · 8** (niente 1, niente più di 8), poi «Seleziona il numero di coperti per vedere gli orari disponibili» → **SELEZIONA UN ORARIO: 19:00 · 20:00 · 21:00 · 22:00** (quattro orari a ora piena); «Avanti» si accende solo con tutti e tre; «Torna indietro». Attenzione: scegliendo le persone la pagina scorre e il calendario si sposta (ho toccato «24» e mi ha preso il 31).
3. **«Riepilogo e conferma»**: Data selezionata, Numero di persone, Orario selezionato, Nome, Cognome, Telefono, Email, Note; testo «**La prenotazione verrà confermata da un nostro operatore il prima possibile, controlla le email**»; bottone «Conferma» (non toccato) e «Torna indietro».

Regole: nessuna disponibilità reale mostrata (gli orari sono sempre gli stessi quattro), nessun limite di coperti per fascia visibile, conferma manuale via email.

---

## 7. Orari e chiusure

- **Consegna**: Lun–Dom 19:00–22:30 (fasce 19:00-19:30 … 22:30-23:00). **Ritiro**: Lun–Dom 19:00–22:45 (19:00 … 22:45). Sette giorni su sette, **nessun giorno di chiusura** configurato (tutti i 7 giorni `available` true), nessuna chiusura per ferie vista (`unavailableUntil` null, `showAsBlackedOut` false).
- **Fuori orario**: non si chiude niente; compare l'avviso «Preordina» con la tabella degli orari e si va avanti scegliendo giorno e fascia. L'app accetta ordini **24 ore su 24** per le fasce future.
- **Fascia piena**: «SOLD OUT» sulla fascia (`soldOutTimeslots`), la fascia resta visibile ma non si sceglie; «Il prodotto è sold out al momento» per un prodotto esaurito (stock non usato oggi).
- **Il sito** dice «Stasera si apre alle 19. Ordini fino alle 22:30», coerente.

---

## 8. Il resto

- **Contatti e mappa**: nessuna schermata nel web; nel negozio in API ci sono telefono e GPS; sull'app «Chi siamo» e la mappa del tracciamento rider. Nessun social collegato (`fb_show` 2, `id_facebook` vuoto).
- **Lingua**: it/en; i prodotti hanno `json_vec_nome` per le traduzioni (non riempite).
- **Totem**: la stessa piattaforma ha la modalità totem (`TOTEM_CONFIG`, «Inserisci il codice offerta che trovi sotto al QR Code», «Hai una fidelity card? Usa il lettore in basso per scansionarla», stampa scontrino, POS Ingenico/Vivawallet): il totem in negozio è questa web-app in modalità `isTotem`.
- **Privacy (store)**: raccoglie posizione, contatti, identificativi collegati all'identità; dati d'uso per il tracciamento pubblicitario (`facebookPixelId` null, `enableAdvertisingIdCollection` false).
- **Sicurezza vista dal cliente**: la pagina espone nel JavaScript il token di sessione e una chiave Google Maps del fornitore (non riportata qui).

---

## 9. Regole del sistema che la cassa nuova deve rispettare

| # | Regola | Dove l'ho vista |
|---|---|---|
| 1 | Listino online L1 = i 105 prezzi della tabella §1.4 (Margherita 7,20, Marinara 6,40, Supplì 2,20, Coca 0,33 2,50…); l'id esterno (`ext`) è quello della cassa 2Bit e della nostra `id_velocissimo` | API `showcases/6`; catalogo UI |
| 2 | **Ogni ingrediente extra ha un prezzo** (62 voci, da 0,00 a 4,00 €: §2.1); bufala 2,50, impasto alto 1,00, stracciatella 3,00, salmone 4,00 | API `products/{id}`; UI dopo la spunta |
| 3 | **SENZA è gratis** e si applica solo agli ingredienti della ricetta del prodotto (`removePrice` 0) | API; UI «Modifica ingredienti» |
| 4 | Gli extra sono **a scelta multipla senza limiti** ma lo stesso extra **una volta sola** per riga (niente «doppia bufala»: esiste «Doppia Mozzarella» come voce) | UI (interruttore) e config gruppi max 0 |
| 5 | Le varianti valgono sull'intera riga (2 pizze CON = tutte e due); per una diversa serve un'altra riga | UI «Aggiungi 2 al carrello · 23,80» |
| 6 | Gruppi di varianti: pizze → IMPASTO, LATTICINI, SALUMI E PESCE, SPEZIE E ALTRO, VERDURE; pucce → gli stessi **senza IMPASTO**; fritti, dolci, cantina, birre, bevande, menu → **nessuna variante** | API `products/148,156,177,216,223` |
| 7 | **Menu combinati**: 6 menu a prezzo fisso (13/24/33/15/28/39 €), ogni menu = N pizze/pucce dal gruppo giusto + 1 bevanda da 7 scelte (acque comprese), scelte obbligatorie, extra sulle pizze a pagamento, fritti in omaggio impliciti | API `menus/2`; UI §2.2 |
| 8 | **Un solo formato e un solo gusto** per pizza (niente metà/metà) | API `formats`/`compositions` |
| 9 | Servizi: **Consegna a domicilio** e **Ritiro al locale**; niente tavolo online | UI §4.1 |
| 10 | A domicilio **l'indirizzo si chiede prima del menù**, con Google autocomplete, GPS, mappa, Piano/Riferimento e Campanello/Citofono facoltativi | UI §4.2 |
| 11 | La **zona** si decide dal punto geocodificato (poligono): 16 zone, consegna **1,00 / 1,50 / 2,00 €**, **minimo 10 €** su tutte, nessuna soglia di consegna gratis; fuori poligono non si consegna | API `stores/delivery` (zona 15, 1,00 €, min 10) |
| 12 | Il **costo di consegna va in riga «Consegna»** e nel totale; il minimo è sul subtotale **senza** consegna (`amountWithoutShipping`) | UI carrello; API checkout |
| 13 | Ritiro: **nessun minimo**, nessuna consegna | API checkout ritiro (`minimumOrderAmount` null) |
| 14 | **Giorno**: oggi + 6 (7 giorni) | UI carrello |
| 15 | **Fasce domicilio**: finestre di 30 min ogni 15 min, 19:00-19:30 → 22:30-23:00 (15). **Fasce ritiro**: orari puntuali ogni 15 min, 19:00 → 22:45 (16). Scelta obbligatoria, nessun «prima possibile», nessuna preselezione | UI carrello; API `parsedTimeslots` |
| 16 | Una fascia piena si mostra **SOLD OUT**, non sparisce | stringhe; API `soldOut` per fascia |
| 17 | Fuori orario si **preordina sempre** (avviso con gli orari, poi si va avanti); orari consegna 19:00–22:30, ritiro 19:00–22:45, 7/7 | UI §4.3; API `stores/*` |
| 18 | **Pagamenti domicilio**: Contanti alla consegna (con «con quanto paghi?») e Pagamento online (Nexi). **Ritiro**: Contanti alla cassa, Bancomat alla cassa, Pagamento online | UI carrello; API `payments` |
| 19 | **Una nota per ordine**, nessuna nota per prodotto | UI; config `disableNotes` |
| 20 | **Codice sconto** in checkout + **coupon** scelto dalla lista di quelli ottenuti; regole coupon: solo domicilio/ritiro, fascia, validità, esaurito, spesa minima, prodotto omaggio | UI §3; stringhe |
| 21 | Dal sito si ordina con **registrazione veloce** (Nome, Cognome, Email, Cellulare, privacy); dall'app serve l'account (email+password o Google, attivazione via email) | config `appAreas`, `customerForm` |
| 22 | Ogni ordine porta **punti fidelity** (card automatica alla registrazione, QR alla cassa, premi a punti, storico con i punti) — i valori stanno nel back-office | config; stringhe |
| 23 | **IVA 10 %** sulle righe | API `vatPercentage` |
| 24 | Riordina («Ordina di nuovo») dallo storico; tracciamento del rider sulla mappa | config `enableOrderAgain`, `abilita_tracciatura_fattorini` |
| 25 | Carrello persistente per dispositivo: rientrando chiede «continui o ricominci?»; svuotandolo si torna al catalogo | UI |
| 26 | Rimozione riga con conferma «Sei sicuro…?»; la quantità non si cambia dal carrello | UI |
| 27 | Prenotazione tavolo: 2–8 persone, 19/20/21/22, conferma manuale via email | X-Reserve §6 |
| 28 | Etichette prodotto: Novità, Eccellenza, Più venduto (colore + icona) | API `labels` |
| 29 | Ricerca sul catalogo per nome **e** descrizione | UI lente |

## 10. Cosa fa male o manca oggi (per fare meglio)

| # | Cosa | Dove | Perché fa male |
|---|---|---|---|
| 1 | **Il prezzo dell'extra non si vede prima di toccarlo** (62 voci senza prezzo) | scheda prodotto | il cliente scopre 2,50 € a sorpresa; la cassa nuova deve stampare il prezzo sul bottone |
| 2 | **Consegna e minimo non si dicono prima**: né nella scelta del servizio, né dopo l'indirizzo («Zona Bologna · consegna 1 € · minimo 10 €»), né nel carrello sotto il minimo (il bottone «Ordina» è acceso a 3,20 €) | §4.2, §3 | il cliente arriva in fondo e si vede respinto |
| 3 | **Manca il POS alla consegna** (solo contanti o online); il «Bancomat» esiste ma è spento per app e web | §3 pagamento | i rider hanno il POS: è un pagamento che il cliente non può scegliere |
| 4 | **Nessun «prima possibile»** e nessuna fascia preselezionata; 15–16 bottoni da scorrere in orizzontale | §3 orario | chi vuole «adesso» deve indovinare la fascia giusta |
| 5 | L'avviso **«Preordina» a ogni ingresso**, anche di giorno e anche per chi vuole ordinare per domani | §4.3 | un tocco in più ogni volta |
| 6 | **Due porte per i coupon** (campo codice + «Seleziona un coupon» che è un altro campo codice); **nessuna lista di promozioni visibili**; coupon, punti e premi **invisibili dal sito** e da non loggati | §3, §5.2–5.3 | chi non conosce già il codice non lo scoprirà mai |
| 7 | **Nessun allergene** su nessun prodotto, col filtro allergeni acceso | §1.4 | obbligo di legge e domanda frequente al telefono |
| 8 | **Dati sporchi**: Olive ascolane = «Chips di patate», «ciascuno», «igb», virgolette nella puccia ciauscolo, Capricciosa senza carciofo fra gli ingredienti rimovibili, cinque vini con lo stesso codice cassa, acqua assente dal catalogo (solo nei menu) | §1.4, §2 | ricette e cassa non tornano |
| 9 | **Impasto Alto +1,00 offerto anche alle pizze già alte** (Vetrina Napoli) | §2 | si paga due volte |
| 10 | **I fritti in omaggio dei Menu non compaiono** né nella scheda né nel carrello né (quindi) in comanda | §2.2 | la cucina li dimentica, il cliente li reclama |
| 11 | **Nessuna nota per prodotto** («ben cotta», «senza basilico» non è fra i rimovibili) | §2 | finisce tutto nella nota unica dell'ordine |
| 12 | **Quantità non modificabile dal carrello** (solo Rimuovi + rientra) | §3 | tre tocchi per un errore |
| 13 | **Titoli sbagliati**: «ORDINA SUBITO» sopra «I miei ordini», «Carrello» sopra il catalogo dopo lo svuotamento, «GOOGLE» come titolo della prenotazione | §5.4, §3, §6 | sciatteria che si nota |
| 14 | **INFO senza telefono, indirizzo, orari, mappa** | §1.3 | dal sito il cliente non trova come chiamare |
| 15 | **Suggerimenti indirizzo fuori Roma** (Monterotondo, Corato, Gela…) | §4.2 | rumore, errore facile |
| 16 | **Prenotazione**: chiede i dati prima di «quando e in quanti», 4 orari fissi senza disponibilità, conferma manuale via email, calendario che scappa | §6 | si prenota alla cieca |
| 17 | **Niente ordine al tavolo** col QR (funzione presente ma spenta) | §4.5 | il QR in sala è solo un menù |
| 18 | **Niente fattura/P.IVA** nel checkout | §4.6 | chi la vuole deve chiamare |
| 19 | **Logout disattivato** e registrazione con attivazione via email | §5.1 | attrito alla prima registrazione |
| 20 | **Sessione e chiavi del fornitore nel JavaScript della pagina** | §8 | la cassa nuova tiene le chiavi solo su Vercel (già così) |
| 21 | **Il sito dice 8 zone, il sistema ne ha 16**; nessuna delle due dice il costo | sito vs API | chi è in Via Nomentana non sa se e quanto |
| 22 | **Descrizioni tagliate a 110 caratteri** in lista, senza modo di leggerle intere se non aprendo la scheda | §1.4 | ingredienti nascosti dietro «…» |

### Da verificare al prossimo giro (non visto)

- Il percorso **dopo «Ordina»** (registrazione veloce, «con quanto paghi?», pagina Nexi, «Ordine completato», stato ordine, push) — solo con il permesso di Edoardo e un ordine di prova.
- Le schermate **native** dell'app (fidelity, premi con i punti necessari, coupon ottenibili, notifiche, porta un amico, chi siamo): servono il telefono di Edoardo o il simulatore; i **valori dei premi** («PREMIO PIZZA SPECIALE», «PREMIO FRITTI», «PREMIO BIRRA DA 66») e i punti per euro vanno letti nel back-office.
- Il messaggio di **indirizzo fuori zona** e quello di **fascia SOLD OUT** con dati veri.
- Un Menù X2/X3 (bibita «grande») e il Menù Speciale.
