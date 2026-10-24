# REA · 10. Cosa manca alla cassa nuova per spegnere Velocissimo

*Scritto il 24/10/2026, chiude il REA (capitoli 01–12). Ordine = quello in cui lo farei:
prima ciò senza cui una sera non si regge, poi ciò che sposta i clienti, poi il resto.
Ogni riga: come lo fa Velocissimo (con la fonte), cosa abbiamo (migrazioni 0001–0033),
cosa manca. Lo sviluppo riparte da qui.*

## A. Senza questi una serata non si regge

| # | Cosa | Velocissimo (fonte) | Noi | Manca |
|---|---|---|---|---|
| 1 | **Stampa automatica** di ogni ordine che entra (app, sito, totem, telefono, piattaforme), ristampa marcata | il POS stampa alla conferma (stato 2 = Vendita + Stampa, `01` §1.4); il totem chiede la stampa al POS sulla 37150 (`12` §12.4); `PUT /orders` → «ristampa» (`08` §8.5) | `/cassa/comanda/[id]?stampa=1` col Chrome in kiosk-printing, 80 mm, per reparto | un **agente di stampa** in negozio (ESC/POS, sempre acceso, prende la coda da Supabase realtime), stampa all'arrivo, «RISTAMPA», fine carta segnalata |
| 2 | **Scontrino fiscale** (Epson RT) e annullo dall'ordine, più scontrini per ordine | video 4:14, 12:26, 20:32; driver NRG nel pacchetto 2Bit | — | integrazione RT (stesso agente del n. 1), corrispettivi, annullo; senza questo la cassa non sostituisce niente |
| 3 | **Area preordini** che non stampa finché non è ora; conto alla rovescia e colore del ritardo sulla lista | flag «È un preordine» negli stati (`09` §9.2); video 8:48 | preordini fino a 7 giorni (mig. 0022), stati e log (0027) | stato «preordine», stampa all'ora giusta meno l'attesa, minuti mancanti/ritardo in lista |
| 4 | **Assegnazione del rider dalla cassa** sulla mappa, oltre al «la prendo io» | video 18:52; app RIDER (`04`) | `prendi_consegna` (0032), `/cassa/mappa` che mostra | tasto «assegna a…» sulla goccia, rider suggerito (il più vicino / il primo che rientra), avviso al rider |
| 5 | **Fascia piena mostrata «piena»** (non nascosta) ovunque si ordini | video 22:31; checkout `parsedTimeslots[].soldOut` (`08` §8.3) | capacità per quarto d'ora, eccezioni, blocchi (0005, 0016) | la risposta delle fasce con `piena: true` invece di toglierla, nel totem e nella pagina d'ordine |

## B. Per portare i clienti dell'app nella cassa nuova

| # | Cosa | Velocissimo (fonte) | Noi | Manca |
|---|---|---|---|---|
| 6 | **Pagina d'ordine nostra** per il sito (domicilio, ritiro, al tavolo) | web-app `so/?928`, percorso in 15 passi (`08` §8.3) | totem (catalogo, varianti, combo), zone e minimo, fasce, `accetta_ordine_esterno` | indirizzo prima del menù con zona/costo/minimo detti subito, giorno + fascia, contanti «paga con» o online, registrazione veloce **in POST**; poi il link «Ordina» di amanoamano.it punta qui |
| 7 | **Contratto `/api/ordini`** come l'Ordering API | anteprima col totale del server, `expected_total`, `external_ref`, errori a codice (`08` §8.5) | `/api/ordini`, `/api/ordini-esterni` idempotente | anteprima, prezzi calcolati dal server (Velocissimo li prende dal client: §8.3 n. 7), codici d'errore stabili |
| 8 | **Pagamento online** | Nexi (`payments` id 12, `isPaid 1`) | `pagato_online` sull'ordine (0024) | un gateway (Nexi di Edoardo o altro), conferma via webhook prima di stampare |
| 9 | **Avvisi al cliente per stato** dentro l'app | push FCM/APNs dal cloud, configurate per stato con testo e segnaposto (`11` §11.3) | coda `notifica_cliente` (0032), `/segui/[token]` col rider sulla mappa | tabella testi per stato modificabile, `dispositivo_cliente`, invio FCM v1 / APNs (o web push dal sito come primo passo) |
| 10 | **App nativa nostra come aggiornamento della stessa app** | iOS a nome Vi.Ru, Android a nome Velocissimo (`08` §8.1, §8.6) | — | verificare il conto Apple; chiedere a Velocissimo il trasferimento del pacchetto Android; guscio nativo sulla pagina d'ordine (n. 6) con push (n. 9); fidelity, coupon, «i miei ordini» |
| 11 | **Deliverect** (Glovo, Deliveroo, Just Eat) | catalogo 7 «SOLO DELIVERECT», L3, origine «Da Deliverect» = 61 ordini su 100 (`01` §1.7) | `/api/deliverect/ordine` (HMAC), mappa canali vuota | credenziali (Edoardo), mappa prodotti, stati restituiti a Deliverect, stampa (n. 1) |
| 12 | **Import dei clienti** (nome, telefono, indirizzi, punti, credito, consensi) | `/customer`, ~57.000 ordini dal 2023 | cliente completo (0026) con `id_velocissimo` | export dal back-office (Edoardo) o dall'API clienti, import una volta; punti per euro da confermare |

## C. Per farlo uguale, poi meglio

| # | Cosa | Velocissimo (fonte) | Noi | Manca |
|---|---|---|---|---|
| 13 | Totem completo | `12` | `/totem` | mangia qui/porta via col listino giusto, attesa stimata, POS sul totem, lingue |
| 14 | Tavoli: colore a tempo, anteprima con preconto, vista palmare | video 8:32, 9:26, 11:36 | `/cassa/tavoli` (0009, 0031) | tempo di apertura, preconto, layout telefono per i camerieri |
| 15 | Prenotazioni (cassa + modulo + Reserve with Google) | video 13:28; X-Reserve `pr/928-17` (`02` §6) | — | tabella e pagina; Google dopo |
| 16 | Coupon completi (3×2, consegna gratis, omaggio) e i 54 coupon con le regole | video 19:34; `/coupon` (`01` §1.6) | 0026 (3 «Lunedì» caricati) | le regole mancanti, coupon a barcode |
| 17 | Automatici a evento: rider arrivato, in ritardo, carrello abbandonato | `/marketingpushnotification` (`11` §11.3) | — | dopo il n. 9 |
| 18 | Notifiche ai rider per stato (gruppo di zona / assegnato) | `/weborderstatus` | — | push nell'app rider (PWA) |
| 19 | Storico per data, lista documenti con filtri | video 15:24, 15:52 | riepilogo del giorno | ricerca per data, cliente, pagamento |
| 20 | Monitor cliente e cassa automatica | video 16:14 | — | solo se Edoardo lo chiede |

## D. Le strade per gli ordini dell'app, in una riga (dettagli in `08` §8.4)

- **E — l'app e il sito parlano con noi** (n. 6–10): la strada vera.
- **D — Velocissimo acceso accanto** per l'app finché non è passata: il ponte, con la
  capacità divisa a mano e la serata sommata da `/vendite` + `v_vendite_giornata`.
- **F — Deliverect** per le piattaforme, in parallelo.
- No: fingersi la cassa 2Bit sulla porta 9000, leggere il back-office con un robot.
  `/vendite` solo per i conti.

## E. Le domande per Edoardo (tutte insieme, una volta)

1. In cassa gira ancora il **PC 2Bit** o il **Velocissimo POS** nuovo?
2. Il conto **Apple** dove sta l'app «A Mano A Mano Pugliese» è di Vi.Ru (lo apri tu su App
   Store Connect)?
3. Chiediamo a Velocissimo il **trasferimento dell'app Android** a un conto Play tuo?
4. Che **terminale POS** e che **gateway online** hai (Nexi? Ingenico?) e che **stampante
   fiscale** (Epson RT, modello)?
5. Quando cambiare il link **«Ordina»** del sito sulla pagina nostra.
6. (già aperte nel `07`) listino L3 per Just Eat, punti per euro, credenziali Deliverect.
