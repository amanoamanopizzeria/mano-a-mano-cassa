# REA · 8. L'app «A Mano A Mano Pugliese» e come un ordine entra nel sistema

*Scritto il 23–24/10/2026. Fonti: schede pubbliche Google Play e App Store, l'app web
(`service.web-app.it/pluto_3.0/…/webapp.php?area_clienti=amanoamanopugliese&visione_web=1`)
percorsa nel browser con le chiamate lette mentre partono, il JavaScript pubblico dell'app
(~2 MB, letto cercando ogni chiamata al server), la specifica OpenAPI della Public API
(`admin.velocissimo.app/api-docs/spec`, letta per intero) e il back-office in sola lettura.
Nessun ordine confermato, nessun pagamento, nessuna utenza creata. Qui ci sono forme dei
dati, mai dati di clienti.*

## 8.1 Cos'è l'app, davvero

| | Google Play | App Store | Sito |
|---|---|---|---|
| Identità | `it.webapp.amanoamanopugliese` | id6453763774 | amanoamano.it → «Ordina» = `url.velocissimo.app/so/?928` |
| Chi la pubblica | sviluppatore **«Velocissimo»** | venditore **Vi.Ru s.r.l.s.** (la società di Edoardo) | — |
| Versione | 1.0.5, aggiornata 15/06/2026, uscita 27/07/2023, Android 6+, 20 MB, 500+ download, 4,9 (18) | 26,3 MB, iOS 11+, IT/EN, 4,7 (15) | web-app 5.9 |
| Permessi / privacy | posizione approssimativa ed esatta, archivio, fotocamera, Bluetooth, flash, rete, vibrazione, impedire stand-by; dati: nome, email, id utente, indirizzo, telefono, id dispositivo, posizione; «dati non criptati in transito» (dichiarazione dello sviluppatore) | tracciamento: dati di utilizzo; collegati: posizione, contatti, identificativi | — |

**È la stessa app in tre vesti.** L'app nativa è un guscio **Cordova** che carica la web-app
di Velocissimo (`smartphonecard2015.9`, jQuery 1.11.1, `cordova.js` caricato anche dal web,
che dichiara sempre `appPlatform=iOS`). Il sito e l'app parlano allo stesso server con le
stesse chiamate; cambiano solo i plugin nativi (push, posizione, Ingenico/Viva per il totem).

**Il dettaglio che pesa per il futuro**: su iOS l'app è pubblicata **a nome di Vi.Ru**, su
Android **a nome di Velocissimo**. Vedi §8.6 e `11_PUSH_E_AVVISI_AL_CLIENTE.md`.

## 8.2 Le macchine dietro l'app

```
App iOS/Android (Cordova)  ─┐
Sito «Ordina»               ├─► service.web-app.it/pluto-server/public/api/out/*   (ordini, carrello, catalogo)
Totem in negozio           ─┘    service.web-app.it/pluto_3.0/…/webservice/*.php    (login, push, notifiche, posizione rider)
                                         │
                                         ▼  il cloud tiene l'ordine
                         Velocissimo POS (PC/tablet in cassa) ── stampa la comanda
                         App Velocissimo RIDER ── prende la consegna, manda la posizione
                         admin.velocissimo.app ── back-office (configura tutto)
                         api.velocissimo.app/v1 ── Public API (OAuth2, per sistemi esterni)
```

Ogni chiamata a `pluto-server` porta in query: `appName=smartphonecard2015`, `appLanguage`,
`appUuid`, `isTotem`, `isWindowsTotem`, `appV=2`, `isApp`, `appPlatform`, `deviceUuid`,
`currentCartUuid`, `currentStoreId`; in header `Content-Type`, `Accept`, `Token` (sessione
cliente) e `X-HTTP-Method-Override`. Le risposte sono `{status, message, data}`.

All'avvio la web-app chiama: `env.js`, `templates.html`, `webservice/dati_gruppo.php`
(configurazione del gruppo: colori, testi, opzioni `GRUPPO.opzioni`), `selforder/cart?isInitialGet=1`
(400 se non c'è carrello), lingua `it.lang.json`, `app_tema.css.php`, `validita_app.php`,
`chat_messaggi.php`, `cms_1.1.php`, `numero_notifiche.php`, Google Maps JS (places), SDK
Facebook (Pixel + Conversion API) e Firebase Analytics nell'app nativa.

## 8.3 Il percorso di un ordine, chiamata per chiamata

Provato fino al riepilogo con la fascia scelta (domicilio, due pizze, un menu). Da «Ordina» in
poi le chiamate sono lette **dal codice**, non eseguite.

| # | Passo del cliente | Chiamata | Cosa va / cosa torna (forma) |
|---|---|---|---|
| 1 | apre «Ordina subito» | `GET out/selforder/settings` | `enableDelivery, enableTakeAway, enablePreorders, enableTableOrders, enableWishlistOrders, enablePickupPoints, hideDeliveryEvenIfEnabled, overridePlutoServerUrl` |
| 2 | scrive l'indirizzo | Google Places nel browser, poi `GET out/geocode?placeId=` | `houseNumber, road, city, province, postalCode, formattedAddress, lat, lon, deliveryZoneId` |
| 3 | il server cerca il negozio | `GET out/stores/delivery?(campi del geocode)` | `list[]`: negozio + `distance`, `matchedZone`, `matchedZoneObject{shippingPrice, maximumShippingPrice, freeShippingThreshold, minimumOrderAmount, minimumNotice, averageDeliveryTime, productionTimeAddition, priority, groupId, …}`, `isOpenForSelforder`, `showAsBlackedOut`, `unavailableUntil`, `selforderAction{catalogId}` |
| 4 | conferma scala/piano/citofono | `POST out/selforder/cart` | indirizzo geocodificato + `apartment, floor, doorbell, deliveryZone, storeId, type` (2 = domicilio) → nasce il carrello sul server (`cartUuid`) |
| 5 | vede il catalogo | `GET out/selforder/showcases/6` (catalogo CENA) | pagine, prodotti, prezzi L1, disponibilità |
| 6 | apre una pizza | `GET out/selforder/products/{id}?composition` | `plu` (reparto), `variations.addable[]` (della categoria), `variations.ingredients[]` (togliibili), `prices[]` per formato, `aliquotaIva`, `productStoreConfigurations[{disabled, stock, unavailableUntil}]` |
| 7 | aggiunge | `POST out/selforder/cart/items` | `{productId, description, quantity, price, departementId, vatPercentage, categoryId, productCode, format:-1, composition:-1, oneTimeOfferId, details:[{productId, portion, price, variations:[{variationId, operator (1 = CON, 2 = SENZA), quantity (+1/−1), freeQuantity, description, price, byWeight, unitOfMeasure}]}]}` — **il prezzo lo manda il client** |
| 8 | aggiunge un menu | `POST out/selforder/cart/menu-items` | `{menuId, quantity, price:0, groups:[{id, item:{…come sopra}}]}` → il server mette il prezzo fisso (13,00) |
| 9 | apre il carrello | `GET out/selforder/checkout?getTimeslots=1&deliveryTime=` | `timeslots[]`, `parsedTimeslots[{label "19:00-19:30", timeslot, date, message, soldOut, discount}]`, `soldOutTimeslots[]`, `availableDays[7]`, `deliveryPrice`, `payments[{id, name, askForCashInfo, disableForTotem, payment{isPaid, externalPlatformId}}]`, `options{minimumOrderAmount 10, requireTimeslots, pickFirstTimeslot false, maxNotesCharacters 150, quickRegisterUnloggedCustomer, allowUnloggedOrders false, needsToQuickRegister, allowUnloggedCoupons, askForCashToPay, confirmOrderText, placeholderText}` |
| 10 | scrive un coupon | `POST out/selforder/cart/coupons/code {getTimeslots, deliveryTime, code}` | 400 «Il codice inserito non corrisponde a nessun coupon» |
| 11 | sceglie fascia e pagamento | — | **resta nel telefono** (localStorage) fino a «Ordina» |
| 12 | non è registrato | `webservice/quick_register.php?formOutput=<JSON>` poi `PUT out/selforder/checkout/cart {cartPaymentId, sessionData{quickRegisterCustomerId}}` | ⚠️ i dati personali viaggiano **nella query string di una GET** |
| 13 | «Ordina» → «Sicuro di voler completare l'ordine?» | contanti: `POST out/selforder/cart/validate-checkout {notes, deliveryTime, cartPaymentId, placeholder}` → finestra «Paga con» → la nota diventa «PAGO CON xx …» | |
| 14 | conferma | `POST out/selforder/checkout {notes, deliveryTime, cartPaymentId, placeholder}` | se `paymentUrl`: Nexi nel browser (o `ingenico://`/`vivapos://` dal totem); poi `nextAction: ShowSimpleConfirmingOrderDetailModal` o il messaggio `mess_ordine_completato` |
| 15 | segue l'ordine | `GET out/selforder/orders` e `GET out/selforder/orders/{id}` **ogni 30 s**; mappa del rider ogni 10 s (`webservice/ordine_recupera_posizione.php?ordine=`) | `order.status`, `noteHistory`, `cart.lat/lon`, `negozio.coordinateGps` — vedi `11_…` |

Pagamenti offerti oggi (dal checkout): **1 «Contanti alla consegna»** (`askForCashInfo`) e
**12 «Pagamento online»** (Nexi, `isPaid 1`); tutti e due `disableForTotem`.

Tutti gli endpoint `out/` che il codice conosce (anche quelli non usati da noi):
`booking`, `booking/rules`, `coupons/redeem`, `customer/bring-a-friend(/referral)`, `geocode`,
`menu-products/`, `menu-showcases/`, `one-time-offers/`, `selforder/cart` (+ `bulk-items`,
`composed-menu-items`, `coupons`, `coupons/code`, `items`, `menu-items`, `prepaid-discount`,
`table-service-choice`, `validate-checkout`), `selforder/carts/`, `categories-menu-map`,
`categories/`, `checkout`, `checkout/cart`, `checkout/cart/items/`, `checkout/order-number`,
`destinations`, `menus/`, `orders`, `products/`, `showcases/`, `totem-settings`,
`web-categories/`, `stores/delivery`, `stores/takeaway`, `totem/register`.
I `webservice/*.php` della vecchia piattaforma: `dati_gruppo`, `quick_register`,
`push_register`, `numero_notifiche`, `notifica_visualizzata`, `chat_messaggi`, `cms_1.1`,
`validita_app`, `ordine_recupera_posizione`.

**Lettura**: l'ordine nasce **nel cloud di Velocissimo**, non sul PC della cassa. La cassa
(e oggi il «Velocissimo POS» nuovo) lo riceve dal cloud. Il carrello vive sul server dal
primo prodotto: per questo Velocissimo ha il «recupero carrello abbandonato».

## 8.4 Le strade per far entrare gli ordini dell'app nella cassa nuova

Domanda: finché i clienti usano **l'app di oggi**, come arrivano i loro ordini nella nostra
cassa? Le ho messe tutte, anche quelle che non vanno.

| Strada | Come funzionerebbe | Cosa serve | Cosa manca / rischi | Giudizio |
|---|---|---|---|---|
| **A. Fingersi la cassa 2Bit** (porta 9000) | Il vecchio POS si registrava col `ping-executer` (`pluto-server/public/api/negozi/ip-address?port=9000`) e il cloud gli spingeva gli ordini sul Web API locale `DueBit.WebApiOWINServer.exe`. Un nostro servizio sulla 9000 riceverebbe quelle chiamate. | un PC in negozio sempre acceso, porta aperta, il formato delle chiamate OWIN | Il formato non è documentato (andrebbe intercettato su un ordine vero); il **Velocissimo POS nuovo non lavora più così** (dal video: «il PC si può spegnere», gli ordini restano in cloud), quindi è una strada che il fornitore sta chiudendo; contratto e licenza; si rompe a ogni loro aggiornamento. | **No.** |
| **B. Leggere da Velocissimo con la Public API** | `GET /vendite` (una giornata, solo ordini **confermati** e non annullati) o `GET /orders` | modulo API attivo, credenziali OAuth (le ha Edoardo) | **Non esiste un elenco ordini del negozio in tempo reale**: `/orders` vuole un telefono o un id cliente; `/vendite` dà la riga quando l'ordine è già confermato in cassa, cioè dopo. **Nessun webhook.** Va bene per la contabilità (lo fa già `mano-a-mano-os`), non per far cucinare. | **Solo per i conti.** |
| **C. Leggere il back-office** (`/weborder`) | robot che legge la tabella ordini col login | una sessione di Edoardo | fragile, contro i termini d'uso, e serve un login salvato: no. | **No.** |
| **D. Tenere Velocissimo POS acceso accanto** nella transizione | Gli ordini dell'app continuano a uscire da Velocissimo (anche su tablet, PC spento); la cassa nuova fa sala, banco, telefono, totem, Deliverect. Il conto della serata somma le due fonti (`/vendite` + `v_vendite_giornata`). | niente di nuovo | due schermi in cassa per qualche settimana; la capacità delle fasce non è condivisa (gli ordini app occupano il forno senza che la nostra cassa lo sappia) → **si blocca a mano la fascia** sull'uno e sull'altro, o si danno all'app quote fisse. | **Sì, come ponte breve.** |
| **E. L'app e il sito parlano con noi** | «Ordina» del sito punta alla nostra pagina d'ordine; l'app nativa diventa nostra (vedi §8.6) e chiama il nostro `/api/ordini` (contratto = Ordering API: anteprima col totale del server, fascia confermata, `external_ref` idempotente, errori a codice). | pagina d'ordine nostra (c'è già il totem: stessi componenti), conto Apple di Vi.Ru, trasferimento dell'app Android o app nuova, push nostre | è il lavoro grosso: la tabella di `10_COSA_MANCA` | **Sì: è la strada vera.** |
| **F. Deliverect** | come Glovo/Deliveroo/Just Eat | credenziali Deliverect (Edoardo) | l'app Velocissimo **non** passa da Deliverect (l'API dice `origin` «mai deliverect»): serve solo per le piattaforme. | **Sì, per le piattaforme.** |

**Raccomandazione**: **E** come strada, **D** come ponte, **F** in parallelo, **B** per i conti.
In ordine: (1) il sito — è nostro, si cambia un link e i clienti del sito arrivano subito
nella nostra cassa; (2) Deliverect; (3) l'app nativa nostra, consegnata **come aggiornamento
della stessa app** dove si può (iOS è già di Vi.Ru), così chi l'ha installata la tiene e non
deve rifare nulla; (4) quando l'ultima fonte è passata, si spegne Velocissimo.

## 8.5 La Public API v1, letta per intero (cosa serve a noi)

Base `https://api.velocissimo.app/v1`, OAuth2 *client credentials*, risposte
`{status, message, data}`. 15 percorsi, 32 schemi. **Nessun webhook, nessuna notifica,
nessun cambio di stato.**

- Lettura: `/whoami`, catalogo (prodotti, categorie, variazioni), clienti, `/coverage`
  (indirizzo → coperto o `out_of_zone`/`address_unclear`/`geocode_failed`/`no_house_number`,
  con zona, costo, minimo), `/timeslots` (indicativi, carrello vuoto), `/vendite`,
  `/borsello-rider`.
- Ordering API (modulo premium): `POST /orders/preview` + `POST /orders` (due passi con
  `tmp_cart_uuid` valido 7200 s, o un passo con `expected_total`); errori stabili
  `timeslot_unavailable`, `total_mismatch`, `invalid_payment_method`, `below_minimum`,
  `date_not_available`, `order_in_progress` (409), `confirmation_failed`; `external_ref`
  idempotente per 24 h; **nessun pagamento online**. `PUT /orders/{id}` riscrive l'ordine
  e la cassa **ristampa la comanda** («è una ristampa»); `POST /orders/{id}/cancel`. Tutte e
  due **solo sugli ordini creati via API** (gli altri: 409 `order_not_managed_by_api`).
- `GET /orders` vuole `phone` o `customer_id`: è «i miei ordini» di un cliente, non la lista
  della cucina.

È un buon contratto da **copiare** per il nostro `/api/ordini` (lo diceva già `05_API` §5.8),
non una porta per ricevere gli ordini dell'app.

## 8.6 Perché conta chi ha pubblicato l'app

Edoardo: «chi ha installato l'app ha già le autorizzazioni». È vero **solo se l'app nuova
arriva come aggiornamento della stessa app**: il permesso delle notifiche, la posizione e
l'app sulla schermata del telefono appartengono all'identità dell'app (bundle iOS / pacchetto
Android), non al nome sull'icona. Un'app nuova con un altro identificativo riparte da zero:
nuovo download, nuovo «Consenti notifiche».

- **iOS**: l'app è in vendita a nome **Vi.Ru s.r.l.s.** → è nel conto sviluppatore di
  Edoardo (o in uno che Velocissimo usa per lui: **da verificare** su App Store Connect con
  le credenziali di Edoardo, non da me). Se è suo, un'app nostra può uscire come **versione
  nuova di id6453763774** e chi ce l'ha la riceve con l'aggiornamento automatico.
- **Android**: il pacchetto `it.webapp.amanoamanopugliese` è nel conto **di Velocissimo**.
  Per aggiornarlo serve un **trasferimento dell'app** da Play Console (lo avvia il
  proprietario, Velocissimo; la firma resta a Google con Play App Signing). Senza
  trasferimento: app nuova, e si porta la gente a scaricarla (coupon «Benvenuto da APP»
  esiste già: è la leva).
- I token push di oggi stanno sul server di Velocissimo e sono legati alle **loro** chiavi
  Firebase/Apple: non si portano via. Con l'aggiornamento della stessa app, l'app nuova
  chiede un token nuovo **senza** richiedere di nuovo il permesso (iOS e Android lo
  conservano per l'app). Dettagli in `11_PUSH_E_AVVISI_AL_CLIENTE.md`.

## 8.7 Cosa ne esce per la cassa nuova

1. **Il sito è la vittoria facile**: amanoamano.it è nostro; «Ordina» può puntare a una
   pagina d'ordine nostra appena c'è (stessi pezzi del totem, più indirizzo e fascia).
2. **Il contratto d'ordine è quello di Velocissimo, migliorato**: carrello col prezzo
   calcolato dal server (non dal client, §8.3 n. 7), fascia confermata o alternative,
   minimo 10 €, «paga con», nota max 150 caratteri, `external_ref`.
3. **Le stesse regole del cliente**: indirizzo prima del menù; fascia e pagamento scelti nel
   carrello; conferma «Sicuro…?»; registrazione veloce senza password (ma col corpo in POST,
   non in query string).
4. **Il ponte**: per qualche settimana Velocissimo resta acceso per l'app, la capacità si
   divide a mano; la serata somma `/vendite` e la nostra vista.
5. **Le domande da fare a Edoardo** (una volta): il conto Apple dove sta l'app; se chiedere
   a Velocissimo il trasferimento del pacchetto Android; quando cambiare il link «Ordina».
