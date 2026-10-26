# REA · 22. Le app iOS e Android «A Mano A Mano Pugliese»: cosa sono, di chi sono, come diventano nostre

*Scritto il 26/10/2026 su richiesta di Edoardo («l'app di iOS e di Android, studiale, perché sono
le nostre»). Riprende `02` (schermate), `08` (ingresso ordini) e `11` (push) e aggiunge quello che
mancava: le schede vere dei due store lette oggi, il registro pubblico di Apple, il codice
nativo che la web-app si aspetta di trovare nel telefono, e il «tasto di spegnimento» di
Velocissimo. Nessun ordine, nessun accesso, nessuna utenza: solo pagine pubbliche.*

## 22.1 Le due app, come stanno oggi (letto il 26/10/2026)

| | iPhone (App Store) | Android (Google Play) |
|---|---|---|
| Identificativo | `it.webapp.amanoamanopugliese`, id 6453763774 | `it.webapp.amanoamanopugliese` |
| **Conto che la pubblica** | **Vi.Ru s.r.l.s.** (conto sviluppatore Apple n. 1699577632, «vi.ru srl semplificata»): ha **solo questa app** | **WEBAPP SRL** (Velocissimo), Via Terracina 311, Napoli: lo stesso conto pubblica decine di app di altri locali (Da Roby's, Ciotto Burgers, LievitArti…) |
| Versione | **1.0.0, uscita il 21/08/2023 e mai aggiornata** | aggiornata il 15/06/2026 (Velocissimo la ricompila per le regole di Google) |
| Requisiti | iOS 11+, 26,3 MB, IT/EN, iPhone e iPad | Android 6+, 500+ download |
| Voti | 4,7 (15) | 4,9 (18) |
| Email di assistenza | — | **edoardo.vighi@gmail.com** |
| Privacy | `url.velocissimo.app/privacy-policy/928/` | la stessa; dichiara «dati non criptati in transito» |

**Cosa vuol dire.**

- **iPhone: l'app è già nel conto di Vi.Ru.** È il caso migliore: un'app nostra può uscire come
  **aggiornamento della stessa app**, e chi ce l'ha la riceve da sola, con le notifiche già
  permesse (`11` §11.5). Che la versione sia ferma al 2023 mentre il menù, le fasce e i coupon
  cambiano ogni giorno conferma `08` §8.1: dentro il telefono c'è solo un guscio, tutto il resto
  arriva ogni volta dai server di Velocissimo.
- **Android: l'app è nel conto di Velocissimo.** Per aggiornarla noi serve che **WEBAPP SRL la
  trasferisca** a un conto Google Play di Vi.Ru. Il trasferimento lo avvia solo chi la possiede.
- Apple accetta le app fatte con un servizio «a modello» solo se le pubblica il locale stesso
  (regola 4.2.6), per questo l'iPhone è a nome Vi.Ru. Google non ha questa regola, e Velocissimo
  tiene tutto nel suo conto.

## 22.2 Il tasto di spegnimento di Velocissimo

All'avvio la web-app chiama `webservice/validita_app.php` (versione 5.9.4). Se il server risponde
`app_non_valida`, la funzione `oscura_validita(testo)` **copre l'app con un messaggio**, e lo
ricorda anche senza rete (`localStorage`). **Velocissimo può spegnere tutte e due le app in un
attimo**, anche quella iPhone che è nel conto di Vi.Ru, perché il contenuto arriva dai suoi
server.

**Regola che ne esce:** l'aggiornamento iPhone nostro va **approvato da Apple e pronto prima**
di lasciare Velocissimo. Se si lascia prima, i clienti aprono un'app oscurata. Per Android vale
lo stesso, col trasferimento fatto prima.

## 22.3 Cosa fa il guscio nativo (i plugin che la web-app chiama)

Cercati nel JavaScript della web-app (2,27 MB):

| Plugin | A cosa serve | Ci serve? |
|---|---|---|
| `pushNotification` (PhoneGap Push), `cordova.plugins.firebase` (analytics) | notifiche FCM/APNs, statistiche | **sì le push** (avvisi d'ordine, decisione di Edoardo 24/10); le statistiche no |
| `navigator.geolocation` | posizione per l'indirizzo e per la mappa del rider | sì, per «usa la mia posizione» |
| `cordova.plugins.barcodeScanner`, `navigator.camera` | leggere QR (card, coupon) | non subito |
| `SignInWithApple`, login Google, `facebookConnectPlugin` | accessi social (oggi Apple e Facebook spenti, Google acceso) | no: noi entriamo col telefono e un codice |
| `cordova.plugins.idfa` | tracciamento pubblicitario (per questo Apple scrive «Dati utilizzati per monitorarti») | **no** |
| `socialsharing`, `navigator.share` | «Porta un amico», condividi | dopo |
| `diagnostic`, `settings`, `Keyboard`, `nativepagetransitions`, `FileOpener` | permessi, tastiera, effetti | il minimo |
| `navigator.vibrate`, `notification` | vibrazione, avvisi | sì |

## 22.4 Cosa deve fare la nostra app (dalle schermate di `02`)

| Schermata dell'app di oggi | Da noi oggi | Manca |
|---|---|---|
| Ordina subito: domicilio/ritiro, indirizzo, catalogo, carrello, fascia con **SOLD OUT**, conferma | ✅ `/ordina`; i quarti pieni restano visibili con «SOLD OUT» (26/10, come l'app) | pagamento online (Nexi, domanda 6), coupon dentro l'ordine |
| Accesso (oggi email + password, o Google) | ospite: nome e telefono | **accesso col telefono e un codice**, senza password: le password di Velocissimo non si possono portare via, quindi tutti rientrano comunque una volta |
| Fidelity card col QR, punti, premi | punti calcolati (0065), card nel database | schermata card + QR, premi riscattabili; i numeri da caricare solo quando card e punti tornano (`20`) |
| Coupon (da ottenere / da usare) | coupon %/€ (0026) | il portafoglio coupon, le regole a ore (`10` n. 19), i 194 coupon validi da portare |
| I miei ordini, «Ordina di nuovo», mappa del rider | `/segui/[token]` (rider sulla mappa) | lista ordini del cliente, ordina di nuovo |
| Notifiche (lista + push) | `notifica_cliente` (0032) | invio FCM/APNs, lista nell'app |
| Prenota un tavolo (link a X-Reserve) | — | il link, poi le prenotazioni nostre (`10` n. 24) |
| Porta un amico, Chi siamo, Info | — | dopo; Info con telefono e orari subito (oggi manca anche da loro, `02` §1.3) |

## 22.5 Come la costruiamo (proposta)

1. **Un guscio Capacitor** (il successore di Cordova, lo stesso modo di lavorare di oggi) con lo
   **stesso identificativo** `it.webapp.amanoamanopugliese`, per iPhone e Android.
2. **Dentro, le pagine nostre**: `/ordina` più l'area cliente (card, coupon, i miei ordini,
   notifiche). Le schermate principali stanno **nell'app** e i dati arrivano dalle nostre API.
   Apple rifiuta le app che sono solo un sito incorniciato (regola 4.2), e Velocissimo infatti ha
   push, card e QR. Noi avremo push, card col QR anche senza rete, e posizione.
3. **Push**: tabella `dispositivo_cliente`, invio dal server con FCM v1 (Android) e APNs (iPhone),
   le chiavi solo su Vercel; i testi per stato come in `11` §11.3.
4. **Niente tasto di spegnimento di terzi**: un controllo versione nostro serve solo a dire
   «aggiorna l'app», mai a oscurarla.
5. **Prove solo chiuse**: TestFlight per iPhone, test interno per Android. **Nessuna versione va
   ai clienti** finché Edoardo non dice che è sicuro (regola del 24/10).

## 22.6 I passi che non dipendono dal codice

| # | Passo | Chi | Note |
|---|---|---|---|
| 1 | Entrare in **App Store Connect** col conto Vi.Ru e guardare chi ha accesso, quando scade l'abbonamento (99 $ l'anno: se scade, l'app sparisce dallo store) e chi ha i certificati | Edoardo | io non entro con le sue credenziali |
| 2 | Creare nel conto Apple la **chiave APNs** per le push | Edoardo, quando l'app è pronta | la chiave va su Vercel, mai in chat |
| 3 | Aprire un conto **Google Play di Vi.Ru come società** (25 $ una volta; serve il numero **D-U-N-S** gratuito) | Edoardo | un conto personale nuovo deve fare 14 giorni di prova chiusa con 12 tester prima di pubblicare; un conto società no |
| 4 | Chiedere a **WEBAPP SRL** il **trasferimento** di `it.webapp.amanoamanopugliese` al conto Play di Vi.Ru | Edoardo, solo quando l'app nostra è pronta | finché Velocissimo è il fornitore, chiederlo prima può rovinare il rapporto; se dicono no: app Android nuova, e i 500+ clienti Android la riscaricano (il coupon «Benvenuto da APP» c'è già come leva) |
| 5 | Fare uscire l'iPhone **prima** di disdire Velocissimo (§22.2) | insieme | Apple approva in 1–3 giorni; conviene tenere un margine di settimane |

## 22.7 In una riga

L'iPhone è già di Vi.Ru e si può aggiornare con un'app nostra. L'Android è di Velocissimo e va
trasferito, oppure rifatto. Velocissimo può oscurarle tutte e due, quindi le nostre vanno pronte
e approvate prima di lasciarlo. Il pezzo di prodotto che manca è l'**area cliente**: accesso col
telefono, card, coupon, i miei ordini, push.
