# REA · 31. La documentazione per sviluppatori di Deliverect, letta a fondo

*28/10/2026. Edoardo ha mandato il link https://developers.deliverect.com/. Letta la documentazione
pubblica per chi fa un POS (sezione Restaurants v1.1, riferimenti API, glossario degli ordini, changelog),
e confrontata con la `23`, la `26`, la `28` e col codice della cassa (`src/lib/deliverect/*`,
`src/app/api/deliverect/*`). Solo lettura: nessun account Deliverect, nessuna chiave letta, nessun
cambio a codice o database. Qui c'è **solo quello che è nuovo o corregge** le REA precedenti.*

## 31.0 In breve

1. **Il quadro della `26` regge.** Una location ha un solo POS; per diventarlo serve il modulo partner,
   lo staging, la certificazione (lista non pubblica) e poi le chiavi di produzione. Costi: in nessuna
   pagina. Che un ristorante solo possa fare il partner: non scritto.
2. **Cinque cose nuove che cambiano il lavoro** (dettagli in §31.2):
   - **Just Eat vuole lo stato 40 «stampato»**: senza, l'ordine non viene ritirato dal canale. Oggi
     mandiamo solo il 20.
   - **Un errore nostro deve rispondere 503, non 500**: Deliverect ritenta solo su 502/503/504 o
     senza connessione. Col 500 l'ordine è **fallito** subito e va riprovato a mano.
   - **In staging la firma cambia per canale**: prima della certificazione Deliverect firma con il
     `channelLink` (o il `locationId`), non con un segreto fisso. Il nostro ricevitore oggi ne conosce uno.
   - **Il «quarto pieno» si può dire senza chiudere**: da ottobre 2026 l'occupato accetta
     `preparationTimeDelay` (minuti in più) invece di spegnere la location. È il gemello delle fasce.
   - **Il menù si può provare senza toccare niente**: `productAndCategories?previewSync=true` dice cosa
     creerebbe, cambierebbe o cancellerebbe. E con un **PLU doppio Deliverect crea uno solo dei due**:
     `142` e `C072` vanno sistemati prima del primo sync.
3. **Manca ancora in codice** (spento, per il taglio): il webhook **Register POS**, il webhook **Sync
   Products**, gli stati 40 e 90, la stampa dell'annullo, l'occupato legato alle fasce. Elenco in §31.4.
4. **Il numero di Glovo** resta fuori dalla documentazione pubblica: si legge in staging da «Get
   Integrated Channels». Uber Eats è `7` (dall'esempio del menù), Deliveroo `2`, Just Eat `9` (`26`).

## 31.1 Le pagine che contano

| Cosa | Dove |
|---|---|
| Indice di tutto | developers.deliverect.com/llms.txt · /v1.1-restaurants/llms.txt |
| Guida POS | v1.1-restaurants/docs/pos-integration-overview · pos-faq |
| Webhook verso il POS | v1.1-restaurants/reference/pos_webhooks (Register POS, Order Notification, Sync Products, Product Update Callback, Order Validation, Tax Calculation, Sync Tables/Floors) |
| Chiamate del POS | v1.1-restaurants/reference/pos_endpoints (Insert Products, Update Order Status, Update Order Preparation Time, Update Bill, POS Health check) |
| Store API | update-store-status (occupato), snooze-by-plu, channel-links, get-locations, channel-integrators |
| Modello dell'ordine | page/glossary-pos-orders |
| Stati | page/order-status |
| Firma | reference/hmac-authentication |
| Accesso | reference/access-token · docs/staging-and-production-environment |
| Partner | docs/become-an-integration-partner · page/faq-1 · page/web-faq |
| Novità | changelog (multiple-register-url, store-status-prep-time-delay, 10/10/2026) |

Non letta (errore della pagina): `page/pos-payments-taxes-discount-other-charges` (i codici di
`payment.type`). Non lette: rate limiting, IP whitelisting, Order Validation, Sync Tables.

## 31.2 Cosa è nuovo rispetto alla 26

### Accesso (OAuth)

- `POST https://api.staging.deliverect.com/oauth/token`, corpo `client_id`, `client_secret`,
  `audience` (= la base), `grant_type: client_credentials`. Il gettone si riusa fino alla scadenza
  (`expires_at`) e va in `Authorization: Bearer`.
- Produzione: `https://api.deliverect.com` (pagina del menù). L'URL del gettone di produzione non è
  scritto: da chiedere con le chiavi.
- Ambiti: `genericPOS` copre tutte le chiamate POS e Store.
- **Nel nostro `api.ts`** la scadenza si legge da `expires_in` (con 3600 s di riserva): se Deliverect
  manda solo `expires_at` il gettone dura un'ora da noi, che è prudente. Da verificare in staging.

### Register POS (manca da noi)

Quando una location viene collegata, Deliverect chiama l'**URL di registrazione** del partner (uno per
tutte le installazioni) con `accountId`, `locationId`, `externalLocationId`, `locationName`, firmato.
Il POS risponde 200 con gli indirizzi:

| Campo | Serve | Per noi |
|---|---|---|
| `ordersWebhookURL` | sì | `/api/deliverect/ordine` |
| `syncProductsURL` | sì | da fare: riceve «mandami il menù» e chiama Insert Products |
| `operationsWebhookURL`, `storeStatusWebhookURL` | solo su richiesta del cliente | non servono |
| `syncTablesURL`, `syncFloorsURL`, `taxCalculationWebhookURL` | facoltativi | stringa vuota |

È anche il momento in cui salviamo `accountId` e `locationId` (servono a snooze, occupato e menù).

### La firma

- Intestazione `X-Server-Authorization-HMAC-SHA256`, esadecimale, sul corpo **esatto** ricevuto (per
  un GET: stringa vuota). Il nostro `firmaValida` fa già così.
- **Staging**: il segreto è il **`channelLink`** dell'ordine (o il `locationId` per Get Products e
  Dispatch). Ogni canale ha il suo: col nostro unico `DELIVERECT_WEBHOOK_SECRET` passerebbe un canale
  solo. In staging il ricevitore deve provare il `channelLink` letto dal corpo (solo in staging).
- **Produzione**: il segreto lo genera il partner certificato nelle «Integration settings», uno per
  ambiente.

### L'ordine (glossario)

- Soldi in **centesimi interi** (`decimalDigits: 2`): `payment.amount`, `items.price`, `deliveryCost`,
  `serviceCharge`, `tip`, `driverTip`, `bagFee`, `smallOrderFee`, `fixedCost`; `discountTotal` è
  **negativo**. Il nostro conto del totale ne sottrae una parte: mancano `driverTip`,
  `smallOrderFee`, `fixedCost` (se una piattaforma li manda, la cassa scrive «TOTALE DIVERSO»).
- `orderType`: 1 ritiro, 2 consegna, 3 al tavolo, 4 curbside. Uguale al nostro `TIPI`.
- `orderIsAlreadyPaid` (sempre presente): non lo leggiamo. Per le piattaforme è sempre pagato, ma va
  scritto sulla comanda e nel conto (niente incasso alla cassa).
- `channelOrderDisplayId`: il codice corto che dice il rider (4–12 caratteri, **non unico**). Oggi non
  lo mettiamo né in nota né sulla carta: in cucina serve quello, non l'`_id`.
- `preparationTime`, `deliveryIsAsap`, `courier` (nome e telefono del rider della piattaforma),
  `packaging.includeCutlery` (posate sì/no), `customer.note`: da portare sulla comanda.
- `testOrder: true` solo in staging, dagli ordini di prova del menù.
- Gli articoli: `subItems` annidati (anche due livelli), con `modifierAction` `NO`/`ADD`; la quantità
  dei sotto-articoli **si moltiplica** per quella dell'articolo. `isCombo` sui menu. Esiste anche
  `removedItems`.
- **Un ordine non si modifica**: un cambio arriva come annullo + ordine nuovo.

### Stati (correzioni)

- Il `status: 1` dell'esempio è «Parsed» (di sistema), non «nuovo»; il nuovo è 10.
- Il POS manda: 20 accettato, 40 stampato, 50 in preparazione, 60 preparato, 70 pronto al ritiro,
  90 finito, 110 annullato, 120 fallito. **Il 95 auto-finito è sconsigliato.** Mai mandare il 100.
- Chiamata: `POST /orderStatus/{orderId}` con `orderId` (il `_id`), `receiptId` (obbligatorio: il
  nostro numero), `status`, `reason`, `timeStamp`. Il nostro `aggiornaStato` è già così.
- «Non c'è un ordine obbligato», ma **Deliverect deve sapere quando è finito (90)**, e
  **Takeaway.com/Just Eat non ritira l'ordine se non è almeno 40**.
- Proposta per noi: **20** quando entra, **40** quando la coda di stampa la segna fatta
  (`/api/stampa/fatta`), **70** quando la cucina chiude il pronto, **90** quando il rider della
  piattaforma ritira (o alla chiusura della serata per quelli rimasti), **110** sull'annullo.

### Annulli

Come nella `26`: stesso URL, `status: 100`, stesso `_id`; si risponde 110 con l'`_id` originale. La
guida dice che il modo giusto è **stampare in cucina un biglietto di annullo**. Se il POS non accetta
l'annullo Deliverect segna 126 «Cancel Failed».

### Risposte, tentativi, doppioni

- 200/201 entro **30 s**; connessione entro 3 s.
- Ritenta **solo** se non si connette o riceve **502/503/504**: dopo 10 s, poi raddoppiando, cinque
  volte; poi l'ordine è fallito. **Un 500 non si ritenta.**
- Il nostro ricevitore risponde 500 quando il database dà errore o manca `DELIVERECT_ID_NEGOZIO`: va
  cambiato in **503** per gli errori passeggeri, così un intoppo di Supabase non perde un Glovo.
- I tentativi possono far arrivare lo stesso ordine due volte: `accetta_ordine_esterno` lo segna già
  «duplicato» (per `id_esterno`). Bene.

### Menù (Insert Products)

- `POST /productAndCategories` con `accountId`, `locationId`, `products`, `categories`.
- Ogni chiamata **crea, cambia e cancella**: un prodotto che manca viene tolto. Se si cancella più del
  30 % arriva un avviso. `?previewSync=true` mostra cosa farebbe senza farlo.
- **PLU doppio: il sync va avanti e ne crea uno solo.** Conferma il rischio di `142` e `C072`.
- Tipi: 1 prodotto, 2 variante, 3 gruppo di varianti, **4 bundle** (menu combo: i prodotti dentro
  valgono zero, il prezzo è del bundle; si può usare `overloads.bundlePrice`).
- Prezzi in centesimi; IVA con **tre** decimali (10 % = `10000`). Il nostro `menu.ts` fa già così.
- Le nostre combo oggi escono come prodotto + gruppo di varianti a prezzo zero (`menu.ts` righe
  99–106), non come tipo 4. Funziona per la struttura, ma Velocissimo le combo non le sincronizza e in
  Deliverect sono fatte a mano: al taglio decidere se mandarle noi (tipo 4 o `isCombo`) o lasciarle
  come sono in Deliverect (D31-3).
- `visible: false` toglie un prodotto dalla location; `channelOverrides` per un canale solo (es.
  nascosto su Uber Eats `"7"`). I menù veri si fanno **in Deliverect**, non nel POS.

### Esaurito, occupato, tempo

- **Snooze**: `POST /products/snoozeByPlus` con `account`, `location`, `plus`, `snoozeEnd`. Per
  riaccendere: `snoozeEnd` = adesso. Il formato dell'ora nella pagina è incoerente: usare
  `yyyy-MM-ddTHH:mm:ssZ` (senza millesimi). Il nostro `esaurito()` manda i millesimi: da togliere.
- **Occupato**: `POST /updateStoreStatus/{locationId}` con `isActive`, `channelLinks` (facoltativo),
  `disableAt`. **Nuovo**: `preparationTimeDelay` in minuti, senza chiudere; dove il canale non lo
  regge, Deliverect lo aggiunge agli ordini ASAP.
- **Tempo per ordine**: «Update Order Preparation Time» (non letta nel dettaglio).
- Per noi: quarto quasi pieno → `preparationTimeDelay` 15–30; serata piena → `isActive: false` fino
  al primo quarto libero (`disableAt`). Il nostro `occupato()` non ha ancora il ritardo.

### Canali

- I numeri si leggono da **Get Integrated Channels** (`channel-integrators`) e i collegamenti della
  location da `GET /channelLinks?where={"location":"…"}` (stati 0 spento, 1 sospeso, 2 prova,
  3 attivo, 4 in avvio).
- Uber Eats = `7` (esempio del menù). Glovo: ancora nessun numero pubblico.

### Partner e certificazione

- Modulo → chiamata → email con **staging** (un account partner e un account cliente con due location
  di prova), **chiavi**, **documento di certificazione**. Si passa soddisfacendo tutto il documento,
  in media due chiamate; le chiavi di produzione arrivano subito dopo. Deliverect aiuta col primo
  cliente vero.
- Dal 10/10/2026 un partner può avere **più URL di registrazione** con un'etichetta (scelta per
  location): non cambia niente per noi.
- Costi e «un ristorante può essere partner di sé stesso»: **non scritti**. Restano la domanda 2 della `28`.

## 31.3 Cosa resta confermato della 26

- Una sola «Orders webhook URL» per location: nessun secondo POS nel parallelo.
- Le Reporting Webhooks sono l'unica copia pulita: stessa intestazione HMAC, un solo tentativo.
- Il polling degli ordini non è previsto («Polling is not supported»).
- `GET /my-orders` non serve a noi.

## 31.4 Cosa fare nel codice (spento, prima della certificazione)

In ordine. Niente di questo si accende nel parallelo; nessun cambio al database è necessario per i
primi sei.

1. `ordine/route.ts`: errori passeggeri → **503** invece di 500.
2. `ordine/route.ts`: in **staging** verificare la firma col `channelLink` del corpo.
3. `ordine/route.ts`: in nota `channelOrderDisplayId`, `orderIsAlreadyPaid`, posate, rider della
   piattaforma; nel conto del totale anche `driverTip`, `smallOrderFee`, `fixedCost`.
4. Stati: **40** dalla coda di stampa, **70** dal pronto, **90** al ritiro o a fine serata.
5. `api.ts`: snooze senza millesimi; `occupato()` con `preparationTimeDelay`.
6. Nuovi: `/api/deliverect/registra` (Register POS) e `/api/deliverect/menu` (Sync Products →
   `productAndCategories`, prima con `previewSync=true`).
7. Stampa dell'annullo in cucina (tocca la coda di stampa: con l'ok di Edoardo).
8. Occupato legato alle fasce (`accetta_ordine_esterno`/capacità → `occupato()`).

## 31.5 Domande nuove per Edoardo (si aggiungono alla 28)

- **D31-1. Just Eat e lo stato 40.** Oggi, con Velocissimo, gli ordini Just Eat arrivano e vengono
  segnati «stampati»? Lo dice la storia di un ordine Just Eat nel pannello Deliverect. *Cosa cambia:*
  conferma che Velocissimo manda il 40, e che noi dovremo farlo uguale.
- **D31-2. Ritardo invece di chiudere.** Quando il forno è pieno preferisci che le piattaforme
  mostrino «+20 minuti» o che il locale risulti chiuso? *Cosa cambia:* con il ritardo si vende di più
  ma i tempi di Glovo si allungano.
- **D31-3. Le combo (Menu classico/speciale X1–X3)**: al taglio le mandiamo noi dal menù della cassa
  o restano fatte a mano in Deliverect come oggi? *Cosa cambia:* se le mandiamo noi, un cambio di
  prezzo in cassa arriva da solo anche alle piattaforme.

## Fonti (lette il 28/10/2026)

developers.deliverect.com: `/` · `llms.txt` · `v1.1-restaurants/llms.txt` · `reference/access-token` ·
`reference/hmac-authentication` · `v1.1-restaurants/reference/pos_register` · `reference/post-orders-webhook` ·
`page/glossary-pos-orders` · `page/order-status` · `page/pos-orders-failover-flow` · `page/pos-integration-flow` ·
`reference/update-order-status` · `v1.1-restaurants/docs/how-to-handle-cancellations` ·
`v1.1-restaurants/reference/pos_endpoints` · `v1.1-restaurants/reference/insert-update-products-and-categories` ·
`page/glossary-product-insert-with-supplement-nutrition-info` · `v1.1-restaurants/docs/product-configurations` ·
`v1.1-restaurants/reference/snooze-by-plu` · `v1.1-restaurants/reference/update-store-status` ·
`v1.1-restaurants/reference/channel-links` · `docs/become-an-integration-partner` ·
`docs/staging-and-production-environment` · `docs/how-do-i-receive-orders` · `docs/building-a-pos-integration` ·
`page/faq-1` · `page/web-faq` · `changelog` · `changelog/multiple-register-url` ·
`changelog/store-status-prep-time-delay`. Codice: `src/lib/deliverect/api.ts`, `menu.ts`,
`src/app/api/deliverect/ordine/route.ts`, `copia/route.ts`.
