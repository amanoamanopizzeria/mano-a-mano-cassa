# REA · 12. Il totem Velocissimo in pizzeria

*Scritto il 24/10/2026. Fonti: il codice totem dentro la web-app (`set_totem`,
`TOTEM_CONFIG`, la pagina d'avvio con `selectStoreOrder`/`selectTakeAway`,
`handleTotemSuccess`, `handleVelocissimoUpsertOrder`, `handleVivawalletPosPayment`,
`TotemPrintHelper`), il back-office in sola lettura (negozio → Selforder, catalogo 8
«TOTEM», scheda prodotto → Totem, ordini con origine «da totem»), la scheda App Store di
Velocissimo POS. Il totem non è stato registrato né usato (registrarlo è una scrittura).*

## 12.1 Cos'è

**È la stessa web-app del cliente** (`smartphonecard2015.9`) in «modalità totem»: lo stesso
codice, gli stessi `out/selforder/*`, con `isTotem=1` nelle chiamate. Gira in un guscio
nativo o in un browser a schermo intero (c'è anche `isWindowsTotem`, e
`executeUserInitToRestartExplorer` per riavviare Explorer su Windows: è il ponte con
`restart-explorer.bat` del pacchetto 2Bit). Negli ultimi 100 ordini del 21–22/10, **3 sono
«da totem»** (`01_BACKOFFICE` §1.7): è acceso e usato poco.

## 12.2 Come si accende

1. Sul dispositivo si apre la web-app e si lancia `set_totem()`: chiede **«Inserisci nome
   dispositivo»** → `POST out/totem/register {name, clientUuid}` → da lì `localStorage.totem
   = 1` (oppure il guscio passa `installedTotem`).
2. Il server risponde con `TOTEM_CONFIG.settings`, che **non sta nel back-office** (non c'è
   una pagina «totem»: lo imposta Velocissimo o il POS):
   `slider` (le immagini di attesa), `enableEatHere`, `enableTakeAway`,
   `showTimeslotToCustomer`, `counterShowcaseId` e `takeawayShowcaseId` (il catalogo per
   «mangio qui» e per «porto via»: da noi il catalogo **8 TOTEM**), `localizations` (le
   lingue), `askOnlyNumbersInTotemTablePlaceholder`, `hideNextButtonOnPlaceholderKeyboard`,
   `getTotemBannerColorsFromButton`, `scanBannerLeftMargin`, `password` (per uscire).
   Opzioni del gruppo: `showTotemProductDescription`, `useBackgroundTextureForTotem`.
3. Nel back-office: «Attesa minima per il prossimo ordine da totem» (oggi **vuota**), e per
   ogni prodotto la scheda **Totem** (immagine e descrizione apposta).

## 12.3 Cosa vede e fa il cliente

| Passo | Cosa succede | Chiamata |
|---|---|---|
| Attesa | lo slider a tutto schermo, scelta lingua | — |
| Tocco | **«Mangia qui» / «Porta via»** (se ne è acceso uno solo, salta) | — |
| (opz.) attesa stimata | «primo orario libero» | `GET out/selforder/totem-settings` → `firstAvailableSlot` |
| Menu | carrello nuovo, catalogo del tipo scelto, disponibilità di magazzino | `requestNewCart(storeId, normale, sessionData{requestedCartType})`, `GET out/selforder/showcases/{id}` |
| Prodotto | composizione con le variazioni (`TotemDishComposer`) | `POST out/selforder/cart/items` come l'app |
| Checkout a passi | (se al tavolo) scelta del servizio al tavolo; poi **il «segnaposto»**: nome o numero (solo numeri se `askOnlyNumbers…`) su una **tastiera a video** | `cart/table-service-choice`; il valore va in `placeholder` |
| Paga | **POS sul totem**: `paymentUrl` `ingenico://` (Ingenico) o `vivapos://` (Viva Wallet, con ambiente demo); i metodi del web (contanti alla consegna, online) hanno `disableForTotem` | `POST out/selforder/checkout {notes, deliveryTime, cartPaymentId, placeholder}` |
| Fine | messaggio a tutto schermo, poi torna all'inizio dopo un tempo di inattività (`postponeTotemUsageTimeout`) | — |

## 12.4 Come arriva alla cassa (e alla stampante)

Due modi, decisi dalla risposta del checkout:

- **Velocissimo POS in rete locale** (`upsertOrderSettings`, opzione negozio
  `totemGenerateOrderNumberOnCreation`): il totem manda l'ordine **direttamente al POS sulla
  stessa Wi-Fi** — `POST http://<ip del POS>:37150/upsert-order {order, stockChanges:[],
  generateOrderNumber:true}` — si fa dare il **numero comanda**, e lo rimanda al cloud con
  `POST out/selforder/checkout/order-number {cartUuid, orderNumber}`.
- **Stampa del tagliando** (`tallonSettings`): se `printType 2`, la stampa la fa il
  Velocissimo POS (`POST <POS>/order` e attesa finché non risponde); altrimenti il totem
  stampa da solo sulla sua stampante (`TotemPrintHelper.printDocument`), con la ricevuta del
  POS Viva in coda.

Questo spiega «il totem è sulla stessa Wi-Fi della cassa»: non è solo comodità, il numero
comanda e la stampa passano dalla rete locale.

## 12.5 Contro il nostro `/totem`

| Velocissimo | Nostro `/totem` (`src/app/totem/page.tsx`) |
|---|---|
| attivazione col nome del dispositivo | ✅ codice di attivazione una volta, resta nel browser |
| slider d'attesa | ✅ «Ordina qui» sulla foto |
| Mangia qui / Porta via, due cataloghi | 🟡 solo asporto (righe col listino asporto) |
| lingue | ❌ solo italiano |
| attesa stimata | ❌ (la capacità c'è: si può dire «pronto alle 20:15») |
| nome con tastiera a video | ✅ «Ti chiamiamo con questo nome» |
| paga col POS sul totem (Ingenico/Viva) | ❌ «vai alla cassa e paga» (contanti o POS in cassa) |
| numero comanda e stampa in negozio | 🟡 numero sì (`T-`), stampa automatica no |
| ritorno all'inizio per inattività | ✅ |
| riepilogo con «Conferma» | 🟡 critico giro 1 n. 6 |

**Da fare, in ordine**: stampa automatica dell'ordine del totem (la stessa che serve per
app e sito), «mangia qui / porta via» con il listino giusto, attesa stimata dalla capacità,
pagamento col POS sul totem (dipende dal terminale: Edoardo ha Nexi/Ingenico? da chiedere).
