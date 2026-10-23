# REA · 11. Le notifiche push dell'app: chi le manda, come, e cosa possiamo fare noi

*Scritto il 24/10/2026. Edoardo: niente WhatsApp per avvisare il cliente, «deve essere
all'interno dell'app, chi ha installato l'app ha già le autorizzazioni». Fonti: il
JavaScript pubblico della web-app (le funzioni `push_register`, `check_push_permission`,
`push_notification_handler`, `SelforderPonyTrackerMapController`, `FacebookEventsService`),
il back-office in sola lettura (`/weborderstatus/{1..10}/edit`, `/pushnotification`,
`/marketingpushnotification`), la Public API (nessun endpoint di notifica), le schede degli
store. Nessuna notifica mandata, nessuna impostazione toccata.*

## 11.1 Il servizio: Firebase (Android) e Apple (iOS), attraverso il server di Velocissimo

Dal codice dell'app:

- plugin **PhoneGap Push** (`PushNotification.init`): su **Android** si registra su
  **Firebase Cloud Messaging** col `senderID` = progetto Google di Velocissimo
  (`GOOGLE_PROJECT_ID`, `___ANDROID_PUSH_SENDER_ID___`), icona «push» col colore
  `GRUPPO.opzioni.PushNotificationIconColor`; su **iOS** chiede alert, badge, suono (APNs);
- ramo **Huawei** (`HmsPush.getToken`, `&huawei=1`) e un ramo vecchio «TELERIK PLUGIN»;
- **niente OneSignal, Expo, WebSocket, EventSource, MQTT** (cercati: zero occorrenze);
- Firebase c'è anche come **Analytics** (`cordova.plugins.firebase.analytics`), insieme al
  Pixel Facebook e alla Conversion API: eventi AddToCart, ViewContent, InitiateCheckout,
  AddPaymentInfo, Purchase.

**Registrazione del telefono**: appena l'app ha il token chiama
`service.web-app.it/pluto_3.0/…/webservice/push_register.php?push_token=<token>&android_push_sender_id=<id>&consenso=<1|0>[&huawei=1]`
(più i parametri comuni `appUuid`, `deviceUuid`). `consenso=0` se il permesso è negato: il
server sa chi ha le notifiche spente. Insieme parte `sendCurrentPosition` (la posizione,
su iOS). Dopo un ordine andato a buon fine, `remindPushNotificationIfNeeded()` mostra
«notifiche push non attive» a chi le ha spente.

**Quindi il token sta sul server di Velocissimo, e le chiavi per usarlo (Firebase server key
/ certificato Apple) sono di Velocissimo.** Noi non vediamo né l'uno né le altre.

## 11.2 Cosa arriva al telefono (il formato)

`push_notification_handler(e)` legge `e.title`, `e.message` e `e.additionalData`:

| `additionalData.tipo` | Cos'è | Cosa fa l'app |
|---|---|---|
| `chat` | messaggio della chat col locale | apre la chat |
| `generico` | **avviso su un ordine** (stato) | torna alla home ed esegue `azione` (`azione_descrizione`, `apriRemoto`); `showMessage` / `hideForeground` decidono se mostrarlo ad app aperta; **`refreshCart`** ricarica il checkout dopo 3 s |
| (altro) | campagna «massiva» dal back-office | +1 al badge, alert, `notifica_visualizzata(id_notifica)`; `test` per le prove |

Il badge si legge da `numero_notifiche.php`; le letture tornano con
`notifica_visualizzata.php` ogni 10 s.

## 11.3 Chi le manda e quando

Tre sorgenti, tutte nel cloud di Velocissimo:

1. **Per stato dell'ordine** (`/weborderstatus/{id}/edit`, sezione «Notifiche Push al
   cliente»: Invia notifica, Titolo, Testo con `[nome] [cognome] [orario_ordine]
   [nome_negozio] [nome_rider] [cognome_rider]`, Ritardo in minuti/ore/giorni, Azione da
   aprire: premi, articolo, link, categoria CMS, coupon, ORDINA SUBITO, PRENOTA UN TAVOLO,
   I miei ordini, notifiche, Porta un amico, registrati, fidelity card). Oggi:

   | Stato | Push | Email | Testo |
   |---|---|---|---|
   | 1 Ricevuto | sì | sì | «Ordine Ricevuto» · «Abbiamo ricevuto il tuo ordine, lo lavoreremo al più presto!» |
   | 2 Confermato | sì | sì | «Ordine Confermato» · «Il tuo ordine è stato confermato» |
   | 3 In Lavorazione | sì | no | «Stiamo lavorando il tuo ordine.» |
   | 4 Da ritirare | sì | no | «il tuo ordine è pronto per il ritiro» |
   | 5 In consegna | sì | no | «Il tuo ordine è in consegna, a tra poco! Il fattorino è in arrivo a casa tua» |
   | 6 Consegnato | sì | no | «Ordine Consegnato, buon appetito!» |
   | 7 Annullato | sì | sì | «Il tuo ordine è stato annullato.» |
   | 10 Ritirato dal cliente | no | no | — |

   Nessun ritardo, nessuna azione, nessun avviso ai rider impostato. **Parte quando lo stato
   cambia dentro Velocissimo**: in cassa (Velocissimo POS) o dall'app RIDER (presa in
   carico → In consegna; consegnato).
2. **Automatiche a evento** (`/marketingpushnotification`, 12 interruttori): punti e credito
   caricati/scaricati, provvigione autore, nuova nota ordine, coupon assegnato, ordine
   programmato, **rider arrivato**, ordine in anticipo, **ordine in ritardo**, **carrello
   abbandonato**.
3. **Campagne** (`/pushnotification`): titolo, testo con `[nome]`, data; 7 mandate, la più
   grande a ~800 telefoni (15/06/2024).

## 11.4 La nostra cassa può far partire quelle push? No.

- La Public API **non ha** un endpoint per mandare notifiche, né per **cambiare lo stato**
  di un ordine (letta per intero: `PUT /orders/{id}` cambia il contenuto, `cancel` annulla,
  e tutte e due valgono solo per gli ordini creati via API).
- Non ci sono webhook in nessuna direzione.
- `push_register.php` è la porta per **registrare** un telefono, non per mandare; e mandare a
  nome di Velocissimo dal loro server non è nostro.
- L'unica via indiretta: un ordine che **vive in Velocissimo** e cambia stato **in
  Velocissimo** fa partire la loro push. Cioè: finché un ordine dell'app è gestito dal
  Velocissimo POS (strada D di `08` §8.4), il cliente riceve i loro avvisi; un ordine gestito
  dalla nostra cassa no.

**Oggi possibile**: solo le campagne a mano dal back-office (Edoardo) e gli avvisi automatici
sugli ordini rimasti in Velocissimo. **Serve un'app nostra** per mandare un avviso dalla
nostra cassa.

## 11.5 «Chi ha installato l'app ha già le autorizzazioni»: quando è vero

Il permesso di notifica appartiene all'**identità dell'app** sul telefono, non al marchio:

| Caso | Il cliente deve riscaricare? | Deve ridare il permesso? | Cosa serve a noi |
|---|---|---|---|
| **Aggiornamento della stessa app iOS** (id6453763774, venditore Vi.Ru) | no, arriva da solo | **no**: iOS lo tiene per il bundle | il conto Apple dove sta l'app (Vi.Ru: **da verificare** che sia davvero di Edoardo), una chiave APNs di quel conto, un nostro servizio di invio |
| **Aggiornamento della stessa app Android** (`it.webapp.amanoamanopugliese`) | no | **no**: il permesso resta al pacchetto | il **trasferimento dell'app** dal conto Play di Velocissimo a quello di Edoardo (lo avvia Velocissimo) e un nostro progetto Firebase |
| App nuova (altro identificativo) | sì | sì | — ripartono tutti da zero |
| Web push dal sito (PWA) | no (si «installa» dal browser) | sì | su iPhone funziona solo se il sito è aggiunto alla schermata Home (iOS 16.4+) |

I **token** di oggi non si recuperano (sono sul server di Velocissimo e legati alle loro
chiavi), ma con l'aggiornamento della stessa app non servono: l'app nuova, al primo avvio,
chiede un token nuovo al telefono — senza richiesta a video, perché il permesso c'è già — e
lo manda al nostro server.

## 11.6 Come lo faremmo noi (proposta, non sviluppata)

1. Tabella `dispositivo_cliente` (cliente, piattaforma, token, consenso, ultimo uso) e
   l'endpoint che la riempie dall'app — in POST, non in query string.
2. La coda c'è già: `notifica_cliente` (mig. 0032) nasce quando la consegna parte. Si
   estende a **ogni cambio di stato** con la stessa tabella di §11.3 (testo per stato,
   segnaposto, ritardo, on/off), modificabile da Edoardo.
3. Un invio dal server (Vercel) verso FCM v1 e APNs, con le chiavi su Vercel; dentro la
   notifica il **link `/segui/[token]`** che c'è già (rider sulla mappa).
4. Gli eventi automatici che valgono: «rider arrivato», «in ritardo», «carrello
   abbandonato»; le campagne dopo.

Senza app nostra la stessa coda può andare in **web push** a chi ha ordinato dal sito e ha
detto sì: è il primo passo che non dipende da nessuno.
