# REA · 26. Deliverect e noi: come riceve Velocissimo, come riceviamo noi nel parallelo e dopo

*27/10/2026, domanda di Edoardo: «Velocissimo riceve gli ordini da Deliverect (Glovo, Deliveroo, Just
Eat): controlla come li riceve e come ti potresti collegare tu». Lo scopo: per un mese di prova gli
ordini delle piattaforme arrivano **anche** nella cassa nuova senza toglierli a Velocissimo; al taglio
arrivano **solo** a noi. Analisi in sola lettura: nessun account, nessun accesso a Deliverect né al
back-office di Velocissimo, nessuna modifica a codice o database. Riprende `05` §5.3, `10` n. 17,
`14` ore 19:15, `21` n. 13 e D12, `23` §23.3–23.4 e `25` (strada 1), senza ripeterli.*

## 26.0 La raccomandazione

1. **Nel parallelo Deliverect non si tocca: Velocissimo resta il solo POS della location.** Una
   location Deliverect ha **un solo** «Orders webhook URL» (§26.2): se lo puntiamo a noi, Velocissimo
   smette di ricevere. Non esiste, nella documentazione pubblica, un «secondo POS» per la stessa location.
2. **La copia per la cassa nuova la prendiamo da due parti, e nessuna delle due manda stati a Deliverect:**
   - **a. l'agente lettore sul PC 2Bit (`25` strada 1) prende anche le piattaforme.** Gli ordini
     Deliverect arrivano al PC per la stessa via degli ordini dell'app (cloud → porta 9000 → SQL Server,
     `14` ore 19:15). Lo stesso agente, a costo zero e senza chiedere niente a nessuno, li copia in cassa.
     È la strada di base, da verificare nella stessa sera di ricognizione (D25-2).
   - **b. le «Reporting Webhooks» di Deliverect** (§26.3, strada R): Deliverect manda a un nostro URL
     una **copia** di ogni ordine nuovo e di ogni cambio di stato, accanto al POS, senza toccarlo. È la
     fonte migliore (dati originali: PLU, piattaforma, codice di ritiro, annulli), ma **è a pagamento**,
     va chiesta da Edoardo a `integrations-support@deliverect.com` e serve un accordo firmato. Da
     chiedere subito per sapere prezzo e se la danno a un ristorante (non verificato).
   - La **doppia battitura** resta la rete della prima sera.
3. **Per il taglio diventiamo noi il POS: Edoardo compila oggi il modulo partner** (Vi.Ru). Staging
   con le chiavi → sviluppo → certificazione («in media due chiamate») → chiavi di produzione → la
   notte del taglio la location passa da Velocissimo a noi. È un **interruttore**, non un parallelo.
   I tempi sono loro: il modulo va mandato adesso perché non diventi il collo di bottiglia.
4. **Il menù al taglio: teniamo i PLU di Velocissimo**, così Glovo, Deliveroo e Just Eat non vanno
   rifatti. Prima però si tolgono i doppioni (`142`, `C072`, `23` §23.1 n. 3).

## 26.1 Come arrivano oggi gli ordini Deliverect a Velocissimo

| Fatto | Fonte | Verificato |
|---|---|---|
| Velocissimo è un **POS integrato** in Deliverect, integrazione «a due vie»: ordini da Deliverect a Velocissimo, menù dal POS a Deliverect; servono i due abbonamenti | deliverect.com/en-gb/integrations/velocissimo («Orders made on a variety of delivery platforms are then aggregated directly to your Velocissimo POS system»; «requires a subscription to Velocissimo and Deliverect») | sì, 27/10 |
| Deliverect chiama **un server HTTP di Velocissimo** (il cloud, non il PC): l'errore tipico è «Invalid HTTP result from POS VELOCISSIMO: 500», e «Velocissimo reachable but takes too long to respond» | help.deliverect.com/en/articles/15857585-velocissimo-solve-issues | sì |
| Il webhook d'ordine parte **subito** dopo l'ordine sulla piattaforma; il POS deve rispondere 200/201 **entro 30 secondi**; se non si connette in 3 s o riceve 502/503/504 ritenta 5 volte (10, 20, 40, 80, 160 s), poi l'ordine è **FAILED** | developers.deliverect.com/reference/post-orders-webhook · v1.1-restaurants/docs/pos-orders · page/pos-order-webhook-failover-flow | sì (doc generica, non specifica di Velocissimo) |
| Velocissimo non ritenta da sé: la guida dice di **riprovare a mano** gli ordini in errore | velocissimo-solve-issues | sì |
| Nel cloud di Velocissimo l'ordine entra come **Ritiro** con origine `deliverect`, nota «RITIRO 19:45 GLOVO 609 Order ID … / Pickup code …», «PAGATA CON PAYPAL», riga «CONSEGNA PIATTAFORMA 0,00 €», cliente con telefono finto ed email `@deliverect.com` | `05` §5.3, `14` ore 19:15 | letto nel back-office il 23–25/10 |
| Dal cloud **al PC 2Bit** per la stessa via dell'app (porta 9000 → SQL Server locale), **stampa automatica**; stati Ricevuto → Ritirato dal cliente | `14` ore 19:15, `03` §3.2 | dedotto dal back-office; sul PC non visto |
| Nel back-office di Velocissimo **non c'è nessuna pagina Deliverect**: il collegamento sta dalla parte di Deliverect | `23` §23.3 | sì, 26/10 |
| Volumi: 216 ordini Deliverect su 389 in una settimana; 17.142 € a settembre (più di metà del venduto) | `13` §13.4, `24` §24.3 | sì |

**Il ritardo**: piattaforma → Deliverect → cloud Velocissimo è «immediato» secondo Deliverect; cloud →
PC è di secondi (`25` §25.1). In tutto **secondi**, ma non l'ho misurato.

**Gli stati che tornano a Deliverect**: gli stati POS possibili sono 20 Accepted, 40 Printed, 50
Preparing, 60 Prepared, 70 Pickup Ready, 90 Finalized, 95 Auto_Finalized, 110 Canceled, 120 Failed
(developers.deliverect.com/page/order-status). **Quali manda Velocissimo non l'ho potuto vedere**: è
scritto solo nel pannello Deliverect di Edoardo (Orders → la storia di un ordine). Se manda solo
«ricevuto» o un 95 automatico, la piattaforma vede l'ordine accettato appena entra (D26-2).

**Non verificato**: se l'accettazione in Velocissimo è automatica o la fa la cassa; se il 2Bit manda
indietro qualcosa (pronto, annullato) o se gli stati li manda solo il cloud; come arriva un annullo di
Glovo al 2Bit (stato 100 → ristampa?).

## 26.2 Una location può mandare gli stessi ordini a due sistemi?

| Strada | Cosa dice Deliverect | Serve per il parallelo? |
|---|---|---|
| **Due POS sulla stessa location** | Nella location c'è **un solo campo** «Orders webhook URL» nelle «Generic POS Settings» (developers.deliverect.com/docs/how-do-i-receive-orders: «Complete the Orders webhook URL field in the Generic POS Settings section»). Le «Multiple POS Registration URLs» sono per un partner con più server/regioni, che sceglie **uno** degli URL quando registra la location (v1.1-restaurants/changelog/multiple-register-url). Nessuna pagina pubblica parla di due POS insieme | **No.** Cambiare l'URL = togliere gli ordini a Velocissimo |
| **POS + KDS** | Esiste una KDS API con «Register KDS» e «Order Notification» propri (v1.1-restaurants/reference/kds-api-overview): il KDS **riceve gli ordini** e manda gli stati di preparazione. Che conviva con un POS sulla stessa location non è scritto; serve comunque la partnership (è un'integrazione) | Forse, ma con gli stessi tempi del partner POS e col rischio di stati doppi (§26.5). Da chiedere (D26-4) |
| **POS + Dispatch** | Un partner di consegna «Generic» si aggiunge dal cliente (Dispatch → Configuration → Add partner → Generic, con gli URL validate/create/cancel: docs/dispatch-webhooks-configuration), ma riceve **solo** gli ordini con consegna a cura del ristorante («Only orders where the delivery is specified as being managed by the restaurant», docs/how-do-i-receive-orders-for-delivery) e gli chiede un fattorino | **No.** Gli ordini col fattorino della piattaforma non passano; e chi risponde «consegno io» cambia come si consegna |
| **POS + Reporting Webhooks** ⭐ | «route all incoming order data to a specified endpoint»: nuovo ordine completo, ogni cambio di stato, aggiornamenti del corriere; firma HMAC-SHA256 se si chiede; si attiva scrivendo a `integrations-support@deliverect.com` con l'URL e gli account; **costa** e va firmato un accordo sugli addebiti (v1.1-restaurants/docs/reporting-endpoint-overview, reference/store-api_webhooks) | **Sì**: è una copia in sola lettura, il POS non cambia |
| **Leggere gli ordini con l'API** (`GET /my-orders`) | Restituisce gli ordini con articoli, ma col token del **partner** e «frequent polling of orders is not allowed» (v1.1-restaurants/reference/orders) | No: serve essere partner e il polling è vietato |
| **App/tablet Deliverect (DMA) accanto al POS** | La DMA ha l'accettazione automatica e la stampa, ma per chi ha un POS la guida rimanda al fornitore del POS (help.deliverect.com/en/articles/8596419-orders-faqs) | Non serve a noi: mostra gli ordini su un tablet, non li porta in cassa |

**Cosa serve da Edoardo in ogni caso**: l'account Deliverect è suo (o di Velocissimo? `16` n. 17, `21`
D12: ancora senza risposta). Per le Reporting Webhooks scrive lui, come titolare dell'account, e firma
l'accordo. Per il partner POS il modulo lo compila Vi.Ru. **Il piano Deliverect e i prezzi non sono
pubblici** («Deliverect uses custom pricing», «Book a 1-on-1 with our team to discuss pricing»,
deliverect.com/en-ca/pricing): non so se il suo piano include le Reporting Webhooks.

## 26.3 Le strade per il parallelo

### Strada A — L'agente sul PC 2Bit prende anche le piattaforme ⭐ (la base)

- **Come**: è l'agente della `25` strada 1 (sola lettura su `DD_DATABASE`, giro ogni 5–10 s). Gli
  ordini Deliverect sono già lì, con l'origine `deliverect` e la nota con piattaforma, Order ID e
  codice di ritiro. Si copiano con `canale` glovo/deliveroo/justeat (dalla nota) e `id_esterno` = Order ID
  della piattaforma.
- **Pro**: zero costi, niente da chiedere a Deliverect né a Velocissimo, un agente solo per app, sito,
  totem e piattaforme. Nessuno stato va a Deliverect: non si può sbagliare l'accettazione.
- **Contro**: lo schema del 2Bit è da scoprire; il PLU di Deliverect probabilmente non c'è più (c'è il
  prodotto del 2Bit, che è meglio: `id_velocissimo`); se l'ordine fallisce verso Velocissimo
  (errore 500) non arriva neanche a noi. **Ritardo**: 10–20 s.

### Strada R — Reporting Webhooks di Deliverect (la fonte pulita, a pagamento)

- **Come**: Edoardo scrive a `integrations-support@deliverect.com`: «vorrei le reporting webhooks
  New Order e Status Update della location A Mano A Mano verso `https://mano-a-mano-cassa.vercel.app/…`,
  con HMAC». Firma l'accordo sugli addebiti. Noi facciamo un endpoint **nuovo** (non quello del POS) che
  scrive solo copie.
- **Pro**: i dati sono quelli di Deliverect (PLU, canale, `channelOrderId`, codice di ritiro, totale
  pagato, annulli col 100 e il 110), arrivano anche se il PC è spento o Velocissimo dà 500; serve anche a
  misurare dopo il taglio. Ritardo: secondi (non misurato).
- **Contro**: costo sconosciuto; non so se la danno a un ristorante e non solo a piattaforme di report
  (D26-3); lo schema esatto del payload e il nome dell'intestazione HMAC non sono nella pagina pubblica.
- **Il nostro ricevitore di oggi non va bene così com'è** per le copie: è scritto per fare il POS.
  `src/app/api/deliverect/ordine/route.ts` rifiuta tutto finché la mappa canali è vuota (righe 14,
  67–69), ignora gli annulli (riga 65), risponde 409 se la cassa non prende l'ordine (riga 114) e l'ordine
  nasce con `stampato_il` vuoto, quindi la coda di stampa lo stamperebbe (`0058_stampa_a_blocchi.sql:9`).
  Nel parallelo serve la funzione «copia» della `25` §25.5: entra sempre, nasce già stampata, segno
  «copia da Velocissimo», **fuori** da `/api/vendite` e dall'export verso l'OS (se no l'OS conta due volte:
  la `0025` mette già le piattaforme come origine `deliverect`), annullo riportato.

### Strada K — Un KDS nostro registrato su Deliverect

Tecnicamente riceverebbe gli ordini accanto al POS, ma è un'integrazione certificata come il POS, con gli
stessi tempi, e un KDS **manda stati** di preparazione: col POS che manda i suoi, la piattaforma vede due
voci. Solo se Deliverect la propone (D26-4).

### Strada D — Doppia battitura

Circa 30 ordini piattaforma a sera in media (216 a settimana), di più nelle sere piene: troppi per ribatterli tutti
bene di sera. Rete di sicurezza per le prime sere, non la strada del mese.

### Strada X — Puntare subito il webhook della location a noi e inoltrare a Velocissimo (scartata)

Diventare noi il POS e girare l'ordine a Velocissimo: non abbiamo l'URL né le chiavi di Velocissimo,
mettersi in mezzo al loro POS è contro l'integrazione ufficiale, e se il nostro server cade **la cucina non
riceve**. No.

| Strada | Ritardo | Costo | Serve da | Tocca Velocissimo | Giudizio |
|---|---|---|---|---|---|
| A agente 2Bit | 10–20 s | 0 | Edoardo (PC) | no | **base** |
| R reporting webhooks | secondi | da chiedere | Edoardo + Deliverect | no | **da chiedere subito**, la migliore se il prezzo regge |
| D doppia battitura | minuti | ore di lavoro | staff | no | rete |
| K KDS | secondi | partnership | Deliverect | no, ma stati doppi | solo se lo propongono |
| X ponte | — | — | — | sì | no |

## 26.4 Al taglio: diventiamo il POS

**I passi Deliverect** (developers.deliverect.com/page/faq-1 e page/web-faq):
1. modulo partner sul sito Deliverect (deliverect.com/become-a-partner) → chiamata col team Partnerships;
2. email di benvenuto con **account di staging e chiavi API**;
3. sviluppo contro lo staging: Register POS webhook, Sync products (`POST productAndCategories`),
   Get Channel Links (per riempire `CANALI_DELIVERECT`), Orders webhook, Update Order Status, Busy mode,
   Snooze by PLU (developers.deliverect.com/docs/building-a-pos-integration, llms.txt);
4. certificazione: si spuntano tutte le voci del «Certification document», poi le chiamate («On average
   it takes two certification calls»);
5. «Production credentials are sent immediately after the certification process is complete»;
6. la notte del taglio la location passa dal POS Velocissimo al nostro (chi lo fa, Edoardo dal pannello o
   il supporto Deliverect: **non verificato**, help.deliverect.com/en/articles/8495594-connect-your-pos
   dice che per le connessioni manuali «Someone from our team will reach out», anche «a few weeks»).

**Costi e tempi**: **non pubblici**. Sul forum degli sviluppatori la domanda «are there any costs
associated with API access, technical onboarding, certification, or joining the partner program?» è senza
risposta (developers.deliverect.com/discuss/69b02ab5ffc8d35285e0913f); anche quella di un ristorante di
Amsterdam che vuole collegare un'app sua («what specific Deliverect plan or add-on is required?»,
discuss/694580ed3a090894d8c3e929). Che accettino come partner un ristorante che si fa il POS da sé non è
scritto da nessuna parte (D26-1).

**Cosa abbiamo già**: il ricevitore con HMAC e traduzione PLU (`route.ts`, `src/lib/deliverect/ordine.ts`
coi codici di Velocissimo in `codici-velocissimo.ts`), l'anteprima del menù nella forma
`productAndCategories` (`src/lib/deliverect/menu.ts`, `/cassa/menu/deliverect`). Mancano: OAuth e invio
stati (20 accettato, 70 pronto, 90 chiuso, 110 annullato), annulli (100 → 110 con lo stesso `_id`,
v1.1-restaurants/docs/how-to-handle-cancellations), busy mode legato alle fasce piene, snooze
dall'«esaurito stasera», la mappa canali.

**I menù**: oggi i prodotti in Deliverect sono quelli sincronizzati da Velocissimo, coi **codici di
Velocissimo come PLU** (142 = L'arrabbiata, Edoardo 26/10, citato in `ordine.ts`). Quando il POS cambia,
il nostro sync deve mandare **gli stessi PLU**: se cambiano, Deliverect vede prodotti nuovi e i menù di
Glovo, Deliveroo e Just Eat vanno rifatti e ripubblicati. Prima del taglio: togliere i doppioni (`142`
La finocchiona/L'arrabbiata, `C072` Barattolo nutella/Cheesecake pistacchio), mettere il PLU in
`prodotto.codice`, rifare in staging i menu combo (che Velocissimo non sincronizza: «Velocissimo does
not support syncing meal deals»). Attenzione alla guida Velocissimo: un prodotto disattivo al momento del
sync «may disappear from the Deliverect menu» (velocissimo-solve-issues): il primo sync nostro va fatto
col menù tutto acceso.

## 26.5 I rischi

1. **Due che accettano.** Nel parallelo **solo Velocissimo** manda stati a Deliverect. Il nostro
   endpoint delle copie non chiama mai Update Order Status; il ricevitore POS (`route.ts`) resta spento
   (nessun URL configurato in Deliverect) fino al taglio. Un KDS o un secondo POS manderebbero stati a
   loro volta: la piattaforma vedrebbe «pronto» quando la cucina vera non lo è.
2. **Ordini rifiutati o falliti.** Se Velocissimo dà 500 dopo 5 tentativi l'ordine è FAILED e va
   riprovato a mano in Deliverect: nella strada A non arriva neanche a noi, nella R sì (e lo vediamo
   come copia senza originale: utile per accorgersene). Dopo il taglio vale per noi: risposta entro 30 s,
   **mai un 4xx per un ordine pagato** (oggi `route.ts` risponde 422 e 409: va cambiato prima del taglio,
   come la 0073 ha già fatto per le fasce piene).
3. **Copie che contano doppio.** Le copie fuori da `/api/vendite` e dall'export verso l'OS finché l'OS
   legge Velocissimo (`25` §25.5).
4. **Copie che stampano.** Una copia con `stampato_il` vuoto esce dalla nostra stampante: in cucina due
   comande dello stesso Glovo.
5. **Menù che si scollega al taglio.** PLU diversi = prodotti nuovi = menù delle piattaforme da rifare,
   con le piattaforme che rifiutano ordini su PLU sconosciuti («Invalid PLU»). Prova completa in staging,
   e la notte del taglio un ordine di prova vero per piattaforma.
6. **Annulli.** Arrivano con `status: 100` sullo stesso URL degli ordini; oggi `route.ts:65` li ignora.
   Nel parallelo la copia va annullata (strada R: dal 100/110; strada A: dallo stato del 2Bit).
7. **Il contratto con Velocissimo** e l'abbonamento Deliverect: il passaggio di POS non deve far
   decadere l'abbonamento Deliverect se è stato fatto tramite Velocissimo (D26-5).
8. **Tempi di Deliverect.** Certificazione e passaggio dipendono da loro: se il modulo parte tardi, il
   taglio aspetta Deliverect anche con la cassa pronta.

## 26.6 Cosa non ho potuto verificare

- Il pannello Deliverect di Edoardo (non ho accessi): quale POS è configurato, il piano, gli stati che
  manda Velocissimo, i numeri dei canali, i PLU di tutti i prodotti.
- Il prezzo delle Reporting Webhooks e se le attivano per un ristorante.
- Se un cliente può avere due integrazioni che ricevono ordini (POS + KDS) sulla stessa location.
- Se Deliverect accetta come partner POS un ristorante che sviluppa per sé, e quanto costa.
- Come il 2Bit tiene gli ordini Deliverect nel SQL Server (stessa tabella dell'app? `online=1`?).
- Il payload esatto e l'intestazione HMAC delle Reporting Webhooks (la pagina parla di HMAC-SHA256 a
  richiesta, senza nome dell'intestazione).
- Non ho trovato documentazione pubblica di Velocissimo/2Bit sull'integrazione Deliverect: solo le
  pagine Deliverect citate.

## 26.7 Domande per Edoardo

- **D26-1. Il modulo partner Deliverect**: lo compili tu a nome Vi.Ru, adesso (deliverect.com/become-a-partner),
  scrivendo che è il POS di un solo ristorante? *Cosa cambia:* senza, al taglio Glovo, Deliveroo e Just
  Eat non arrivano alla cassa nuova.
- **D26-2. Uno sguardo al pannello Deliverect** (anche una foto): Locations → la tua location (quale POS,
  cosa c'è nelle «Generic POS Settings»), un ordine Glovo di ieri con la storia degli stati, e la colonna
  PLU di La finocchiona, L'arrabbiata e Menu classico X1. *Cosa cambia:* sappiamo chi accetta, con che
  ritardo, e se i PLU sono già confusi.
- **D26-3. Le Reporting Webhooks**: scrivi tu a `integrations-support@deliverect.com` per sapere se le
  danno alla tua location e quanto costano (testo pronto in §26.3 R)? *Cosa cambia:* se il prezzo regge,
  nel parallelo abbiamo gli ordini puliti anche senza il PC.
- **D26-4. Il referente Deliverect**: chi è? Gli si può chiedere se una location può avere un secondo
  sistema che riceve gli ordini (KDS o simile) senza mandare stati? *Cosa cambia:* una strada in più, o
  la conferma che non c'è.
- **D26-5. L'abbonamento Deliverect** è tuo o passa da Velocissimo, e quanto paghi? *Cosa cambia:* se
  passa da loro, al taglio va rifatto a nome Vi.Ru prima di cambiare POS.
- **D26-6. L'agente sul PC prende anche le piattaforme** (strada A, insieme alla D25-1): va bene? *Cosa
  cambia:* un agente solo per app, totem e piattaforme invece di due strade diverse.
- **D26-7. I doppioni dei codici** `142` e `C072`: li correggiamo **su Velocissimo** prima del taglio (tu,
  nel back-office) o scegliamo PLU nuovi solo per quei due e rifacciamo quei due prodotti in Deliverect?
  *Cosa cambia:* senza, al taglio un Glovo di finocchiona può arrivare come arrabbiata.

## Fonti

- Repo `cassa-dev`: `docs/rea/03`, `05` §5.3, `10` n. 17, `13`, `14` (ore 19:15), `16` n. 17, `21` n. 13 e
  D12, `23`, `24`, `25`; `src/app/api/deliverect/ordine/route.ts` (righe 4, 14, 53, 65, 67–69, 104, 114,
  117); `src/lib/deliverect/ordine.ts`, `codici-velocissimo.ts`, `menu.ts`; migrazioni 0025, 0040, 0058
  (riga 9), 0073.
- Deliverect, letto il 27/10/2026:
  deliverect.com/en-gb/integrations/velocissimo ·
  help.deliverect.com/en/articles/15857585-velocissimo-solve-issues ·
  help.deliverect.com/en/articles/15551147-velocissimo-dispatch-configure-for-a-location ·
  help.deliverect.com/en/articles/8495594-connect-your-pos ·
  help.deliverect.com/en/articles/8596419-orders-faqs ·
  help.deliverect.com/en/articles/9527403-deliverect-kds-introduction ·
  developers.deliverect.com/reference/pos_webhooks · reference/post-orders-webhook ·
  docs/building-a-pos-integration · docs/how-do-i-receive-orders · docs/how-do-i-receive-orders-for-delivery ·
  docs/dispatch-webhooks-configuration · page/order-status · page/pos-order-webhook-failover-flow ·
  page/faq-1 · page/web-faq · v1.1-restaurants/docs/pos-orders ·
  v1.1-restaurants/docs/how-to-handle-cancellations · v1.1-restaurants/docs/reporting-endpoint-overview ·
  v1.1-restaurants/docs/order-status · v1.1-restaurants/reference/store-api_webhooks ·
  v1.1-restaurants/reference/orders · v1.1-restaurants/reference/kds-api-overview ·
  v1.1-restaurants/changelog/multiple-register-url · v1.1-restaurants/llms.txt ·
  resources.developers.deliverect.com/en/articles/13628895-pos-integration-overview ·
  discuss/69b02ab5ffc8d35285e0913f · discuss/694580ed3a090894d8c3e929 ·
  deliverect.com/en-ca/pricing.
