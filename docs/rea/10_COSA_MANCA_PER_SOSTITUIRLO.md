# REA · 10. Cosa manca alla cassa nuova per spegnere Velocissimo

*Scritto il 24/10/2026 a chiusura del secondo passaggio (capitoli 01–12) e **riordinato la sera
stessa dopo il terzo** (13–16: back-office voce per voce, la serata minuto per minuto, l'export,
le domande). Ordine = quello in cui lo farei: prima ciò senza cui una sera non si regge, poi ciò
che serve perché mano-a-mano-os non si accorga del cambio, poi ciò che sposta i clienti, poi il
resto. Ogni riga: come lo fa Velocissimo (con la fonte), cosa abbiamo (migrazioni 0001–0037), cosa
manca. Lo sviluppo riparte da qui; le domande sono in `16`.*

**Le scoperte del terzo passaggio che hanno cambiato l'ordine** (`13` §13.10, `14`, `15`):
Enterprise non attivo → in cassa c'è il **PC 2Bit**, non il POS del video; le **chiusure X/Z non
salgono mai al cloud**; la capacità è **per giorno della settimana** (10 / 18 / 22 pizze a quarto
d'ora); **borsello e tracciamento rider non si usano**; lo **sconto manuale** è 190 volte al mese;
la consegna è registrata come **sconto negativo**; l'OS legge **due** export (API per articolo e
CSV per ordine) e il canale delle piattaforme **sta nel testo della nota**; la stampante fiscale
del pacchetto è una **Ditron**, non una Epson.

## A. Senza questi una serata non si regge

| # | Cosa | Velocissimo (fonte) | Noi | Manca |
|---|---|---|---|---|
| 1 | **Stampa automatica** di ogni ordine che entra, su **due stampanti** (cucina + cassa), raggruppata per gruppo di prodotti, con la nota fissa del cliente e «[N ORD.]»; ristampa marcata | stato 2 = Vendita + Stampa (`01` §1.4); 2Bit: due stampanti, loghi `domicilio.2bt` / `take-away.2bt` (`14` §14.3); `PUT /orders` → «ristampa» (`08` §8.5) | `/cassa/comanda/[id]?stampa=1` col Chrome in kiosk-printing, 80 mm, per reparto | un **agente di stampa** in negozio (ESC/POS di rete, sempre acceso, coda da Supabase realtime), stampa all'arrivo, «RISTAMPA», fine carta; **domanda 2** (modelli e collegamento) |
| 2 | **Scontrino fiscale** alla scelta del pagamento, annullo dall'ordine, Z serale | Edoardo 22/10; video 4:14, 12:26; driver NRG → **Ditron PrintF** Ethernet nel pacchetto 2022 (`14` §14.3) | — | integrazione RT (stesso agente del n. 1), corrispettivi, annullo, Z; **prima** le domande 2 e **4** (per online e domicili lo scontrino quando?): senza risposta non si può progettare |
| 3 | **Modifica di una comanda già stampata** con ristampa marcata | 2Bit: si riapre e si ristampa; POS nuovo: «RISTAMPA» | **non si può** (critico giro 10, grave 4) | tasto «Modifica» su ogni stato non chiuso, righe aggiunte/tolte in evidenza, ristampa; domanda 7 |
| 4 | **Sconto manuale** sulla comanda | report sconti: SCONTO 190 volte, −1.050 € a ottobre (`13` §13.7) | solo coupon (0026) | sconto in € o % con motivo, nel totale e nell'export (`scontoInRiga`, `importoScontato`); domanda 7 |
| 5 | **Preordini e lista**: non stampa finché non è ora; conto alla rovescia e colore del ritardo | flag «È un preordine» (`09` §9.2); video 8:48 | preordini (0022), stati e log (0027), **annullo anche sui preordini e consegnati fuori dai preordini (0037)** | stampa all'ora giusta meno l'attesa è ✅; mancano minuti mancanti/ritardo in lista e il «+» delle fasce che chiede conferma |
| 6 | **Fascia piena mostrata «piena»** ovunque si ordini; capacità di partenza **per giorno della settimana** | video 22:31; `parsedTimeslots[].soldOut` (`08` §8.3); reparto PIZZE: dom 22, lun–mer 10, gio–ven 18, sab 22 (`13` §13.7) | capacità per quarto d'ora dai pizzaioli del giorno, eccezioni, blocchi (0005, 0016) | `piena: true` invece di togliere la fascia in `/ordina` e `/totem`; la tabella per giorno della settimana come default quando nessuno imposta i turni (domanda 14) |
| 7 | **Chiusura di cassa**: fondo, incassato per metodo, in mano ai rider, X/Z | il 2Bit fa la Z sulla fiscale e **non manda nulla al cloud** (`/day-report` vuoto); l'OS la compila a mano (`14` 23:00) | `/cassa/riepilogo` con la sezione «Cassa» (0037): incassato sui chiusi, contanti / POS / online, aperti, per rider | fondo e apertura, la Z quando c'è il fiscale, e l'export per l'OS (B.9); domanda 5 |
| 8 | ~~Assegnazione del rider dalla cassa~~ | video 18:52 | ✅ **fatto** (0034, dalla tendina sulla mappa; 0037: solo le consegne di stasera) | rider suggerito («il primo che rientra», il più vicino): dopo |

## B. Perché mano-a-mano-os non si accorga del cambio (`15`)

| # | Cosa | Velocissimo (fonte) | Noi | Manca |
|---|---|---|---|---|
| 9 | **Export per ordine con le 40 colonne del CSV `/weborder`** | l'OS lo carica in `/chiusura` per sala/interno/asporto, piattaforme dalla nota, contanti/POS/online, consegne per rider (`15` §15.2) | — | `v_ordini_giornata` + `GET /api/ordini-giornata?formato=csv`: stesse intestazioni, traduzioni di Tipo/Origine/Pagamento/Stato, «# Comanda», Ritardo in secondi, Zona, nota con `GLOVO`/`DELIVEROO`/`JUST_EAT`; prova: il parser dell'OS lo legge senza modifiche |
| 10 | **Riga di vendita completa** come `RigaVendita` | `GET /vendite` (`05` §5.2) | `v_vendite_giornata`, `/api/vendite` (0025) | `formato`, `descrizioneArticoloConFormato`, `numeroCoperti`, `idArticoloPadre`, `scontoInRiga`, `pagamentiScontrino[]`; `informazioni.numeroCoperti`, `importoScontato`, `pagamenti[]` (`15` §15.3) |
| 11 | **Aliquote IVA vere** e **coperti sugli asporti** | «Codice IVA» / «Codice IVA asporto» nel 2Bit; «coperti asporto» 1–8 su ogni ordine | `aliquota_iva` default 10; coperti solo sul tavolo | domande 12 e 13; poi i netti e le «persone servite» tornano |

## C. Per portare i clienti dell'app nella cassa nuova

| # | Cosa | Velocissimo (fonte) | Noi | Manca |
|---|---|---|---|---|
| 12 | **Pagina d'ordine nostra** per il sito | web-app `so/?928`, 15 passi (`08` §8.3) | ✅ `/ordina` (0035, 0036, giri 8–10 del critico: ritiro e domicilio puliti, giorno e indirizzo corretti con 0037) | pagamento online (n. 14), coupon, fidelity, «i miei ordini»; poi il link «Ordina» di amanoamano.it punta qui (domanda 19) |
| 13 | **Contratto `/api/ordini`** come l'Ordering API | anteprima, `expected_total`, `external_ref`, errori a codice (`08` §8.5) | `/api/ordini`, `/api/ordini-esterni` idempotente, prezzi dal database (0035) | anteprima col totale, codici d'errore stabili |
| 14 | **Pagamento online** | Nexi (`payments` id 12) | `pagato_online` (0024) | gateway (Nexi di Edoardo o altro: **domanda 6**), conferma via webhook prima di stampare |
| 15 | **Avvisi al cliente per stato** dentro l'app | push FCM/APNs dal cloud per stato (`11` §11.3); automatici «rider a 200 m», «in ritardo», carrello abbandonato (`13` §13.3) | `notifica_cliente` (0032), `/segui/[token]` | testi per stato, `dispositivo_cliente`, invio FCM v1 / APNs (o web push dal sito come primo passo) |
| 16 | **App nativa nostra come aggiornamento della stessa app** | iOS a nome Vi.Ru, Android a nome Velocissimo (`08` §8.1, §8.6) | — | conto Apple, trasferimento Android (domanda 18); guscio nativo su `/ordina` con push (n. 15); fidelity, coupon, «i miei ordini» |
| 17 | **Deliverect** (Glovo, Deliveroo, Just Eat) | 216 ordini su 389 in una settimana (`13` §13.4) | `/api/deliverect/ordine` (HMAC), mappa canali vuota | credenziali (**domanda 17**), mappa prodotti, stati restituiti, stampa (n. 1) |
| 18 | **Import dei clienti** (nome, telefoni, indirizzi, note fisse, punti, credito, consensi) | `/customer` 19.500 righe (coi finti di Deliverect), stradario e note sul 2Bit | cliente completo (0026) con `id_velocissimo` | export dal cloud o dal PC (domanda 11), import una volta; punti per euro (domanda 9) |
| 19 | **Coupon veri**: prodotto omaggio con **validità a ore** (GIOVEDÌ SONO FRITTO, il più usato), solo-primo-ordine, giorno della settimana, codice dinamico; **premi a punti** | `/coupon` 5 schede, 54 coupon, 3 premi (`13` §13.3) | 0026 (% / €, minimo, periodo; 3 «Lunedì») | le regole mancanti, emissione ≠ uso, riscatto premi, tag sul cliente |

## D. Per farlo uguale, poi meglio

| # | Cosa | Velocissimo (fonte) | Noi | Manca |
|---|---|---|---|---|
| 20 | **Periodi di chiusura** con messaggio | `/closing-period`, 10 (`13` §13.7) | solo `fascia_bloccata` a mano | tabella (dal, al, titolo, messaggio) letta da `/ordina`, `/totem`, cassa; domanda 15 |
| 21 | **Storico ordini per data** con filtri (origine, pagamento, rider, zona, prodotto) | `/weborder` viste e filtri; video 15:24 | riepilogo del giorno | ricerca per data e filtri |
| 22 | Tavoli: **conto con righe e totale**, split, colore a tempo, preconto, vista palmare | 2Bit: preconto (`14` §14.2); video 8:32, 9:26, 11:36 | `/cassa/tavoli` (0009, 0031), 14 tavoli a settimana | il conto (critico: «un cronometro con due stati»), tempo, preconto |
| 23 | Totem completo | `12` | `/totem` | mangia qui/porta via col listino giusto, attesa stimata, POS, lingue; domanda 8 |
| 24 | Prenotazioni (cassa + modulo + Reserve with Google) | 25 in due mesi, 18 da Google, mai un tavolo (`13` §13.5) | — | tabella e pagina; Google dopo; domanda 16 |
| 25 | Notifiche ai rider per stato | `/weborderstatus` | — | push nell'app rider (PWA) |
| 26 | Etichette, allergeni, richieste fuori zona registrate | `/product-label`, `/allergen`, `/delivery-request` 809 | — | una colonna ciascuna; una riga per ogni «qui non consegniamo» |
| 27 | Monitor cliente, cassa automatica, carrelli abbandonati | video 16:14; 4.107 carrelli | — | solo se Edoardo lo chiede (serve l'app nostra) |

## E. Le strade per gli ordini dell'app, in una riga (dettagli in `08` §8.4)

- **E — l'app e il sito parlano con noi** (n. 12–16): la strada vera; `/ordina` c'è già.
- **D — Velocissimo acceso accanto** per l'app finché non è passata: il ponte, con la capacità
  divisa a mano e la serata sommata da `/vendite` + `v_vendite_giornata` (domanda 19).
- **F — Deliverect** per le piattaforme, in parallelo (domanda 17).
- No: fingersi la cassa 2Bit sulla porta 9000, leggere il back-office con un robot.
  `/vendite` solo per i conti.

## F. Le domande per Edoardo

Sono **20**, numerate e con «cosa cambia» per ognuna, in `16_DOMANDE_PER_EDOARDO.md`. Le quattro
che bloccano il lavoro di prima fila: **2** (stampanti), **4** (scontrino quando, per online e
domicili), **6** (Nexi di chi), **17** (Deliverect).
