# REA · 30. Cosa manca, tutto insieme: cassa, dashboard, app iOS e Android, PC con 2Bit, Deliverect (28/10/2026)

*Edoardo, 28/10 00:44Z: «un altro giro REA per vedere cosa ci manca e cosa va migliorato per arrivare a
sviluppare tutto il software, sia sulle app di Apple che su quella di Google che sul PC con 2Bit, sulla
dashboard… un lavoro completo, fatto bene». Questo capitolo **aggiorna il REA 21** (26/10, 143 voci)
con quello che è stato fatto dopo (migrazioni 0069–0080, commit fino a `f5c1bf0`), con il PC di cassa
(REA 27 e 29, sul ramo `claude/project-thread-9z7krm`) e con Deliverect (REA 26 e 28). Lo stato è
**riverificato stanotte** sul codice di `main` e sul database (`tnuyeyqwoqhmgpskqtuq`, solo `SELECT`).
Le voci del REA 21 che non sono cambiate non vengono ricopiate: si trovano lì.*

## 30.0 In breve

- **Il banco della sera è quasi completo.** Dal 26/10 sono arrivati:
  - l'esaurito per stasera;
  - il menù che si cambia dalla cassa;
  - fondo e conteggio a fine sera;
  - il riepilogo anche di una sera passata;
  - la dashboard coi conti dal database e lo storico ordini con la storia degli stati;
  - la colonna dei quarti d'ora sempre aperta mentre si prende l'ordine;
  - il ritiro dalla scheda del cliente.
- **Per la prova in parallelo mancano cinque cose**, e nessuna è di codice difficile:
  1. accendere la stampa in negozio (le stampanti ora sono note);
  2. le utenze dei rider e delle postazioni (nel database c'è ancora un solo utente);
  3. il numero di chi chiama, letto dal modem USB;
  4. la regola dello scontrino durante il parallelo;
  5. correggere un ordine già chiuso.
- **Per spegnere Velocissimo** restano le cose grandi, quasi tutte fuori dalla cassa:
  - lo scontrino fiscale sulla Epson;
  - Deliverect, che aspetta la tua telefonata;
  - punti, card e coupon dei clienti;
  - il pagamento online;
  - le foto del menù (117 su 135 sono ancora sul server di Velocissimo);
  - gli avvisi al cliente;
  - l'app negli store;
  - i periodi di chiusura (Natale);
  - l'OS che legge la cassa nuova.
- **Due cose trovate stanotte**:
  - **Il ramo dei controlli di sicurezza del 26/10 non era mai arrivato su `main`.** In produzione `/login` aveva ancora «Registrati». Il database era già a posto. Portato su `main` stanotte (`f5c1bf0`), solo codice.
  - **Nel database ci sono 12 ordini di prova del 27/10 sera.** Sono ordini a domicilio con la nota «PROVA serata intensa», tutti ancora «ricevuto», dal n. 121 al 132, per 270,20 €. Non li ho fatti io e non li ho toccati. Vanno annullati, o almeno esclusi dai conti, prima che entrino in un confronto con il 2Bit (§30.2).

## 30.1 Cosa è cambiato dal REA 21 (verificato stanotte)

| Voce del REA 21 | Era | Adesso | Prova |
|---|---|---|---|
| Prodotto esaurito per stasera | mancante | **fatto** | `prodotto.esaurito_fino` (0070); oggi 0 esauriti |
| Pagina per cambiare menù e prezzi | mancante | **fatto** | `/cassa/menu` con editor, scrivono solo cassa e admin (0074) |
| Fondo e chiusura di cassa (conteggio) | mancante | **fatto** come conteggio | `cassa_conteggio` (0077, 0078); **0 conteggi registrati**: non è ancora stato usato |
| Riepilogo di una sera passata | parziale | **fatto** | `/cassa/riepilogo` con ‹ Prima / Dopo › |
| Storico ordini per data con filtri e scheda | mancante | **fatto** nella dashboard | `/cassa/dashboard`, «Tutti gli ordini», storia degli stati da `ordine_stato_log` |
| Dashboard (le 10 voci del REA 24 §24.9) | — | **9 su 10** | `cruscotto()` (0075, 0076): periodi, anno, confronto, prodotti, categorie, sconti, rider, zone, clienti da riconquistare. Manca il 10 (coupon e punti), che aspetta l'import |
| Ordini delle piattaforme rifiutati a quarto pieno | — | **entrano sempre** | 0073 |
| Ricerca clienti anche per via e civico | — | **fatto** | 0071, 0072 |
| Colonna dei quarti mentre si prende l'ordine | — | **fatto**, da provare in servizio | `68bdf71`; la prova del 27/10 sera non si è fatta (Chrome non collegato) |
| `window.prompt` dei coperti | parziale | **fatto** | nessun `prompt(` nelle pagine della cassa |
| Niente «Registrati» su `/login`, «Parto con tutte» | parziale | **fatto stanotte** | `f5c1bf0` |
| Deliverect, canali e annulli | parziale | **parziale, più avanti** | ricevitore rivisto, client API, copie per il parallelo (REA 26 §26.8), tutto spento |
| Storico ordini di Velocissimo | — | **tabelle pronte, vuote** | `velocissimo_ordine` = 0 righe: il CSV non è ancora stato caricato da `/cassa/importa` |

Resta **com'era** (riletto stanotte):
- **utenti:** 1 utente in tutto, 0 profili rider;
- **stampa:** tabella `stampante` vuota;
- **telefono:** 13 chiamate, tutte di prova;
- **clienti:** 3.849, 4 con punti (di prova), 0 card;
- **coupon:** 0 attivi, 0 emessi;
- **IVA:** una sola aliquota su tutto il menù;
- **avvisi al cliente:** 23 «da inviare»;
- **pagamenti:** 0 righe in `pagamento`;
- **periodi di chiusura:** 0 fasce bloccate, nessuna gestione;
- **ordine chiuso:** nessuna transizione da `ritirato` e `consegnato`;
- **lista ordini di `/cassa`:** nessuna ricerca per numero o nome.

## 30.2 Cassa (le pagine della sera)

| # | Cosa manca o va migliorato | Perché | Stato | Chi lo sblocca |
|---|---|---|---|---|
| C1 | **Correggere un ordine chiuso** (metodo sbagliato, consegnato per errore): riaprire con motivo e chi, oppure uno storno | Senza, il riepilogo non torna col 2Bit la prima sera che succede | mancante | sviluppo + migrazione (il tuo sì) |
| C2 | **Ricerca nella lista ordini** di `/cassa`, per numero, nome o telefono | Il cliente che richiama «a che punto è il mio ordine» | mancante | solo codice |
| C3 | **Lista delle chiamate della sera**, con «gestita» e chi | Oggi si vede solo l'ultima; il 2Bit ne ha 10.695 | parziale | codice + migrazione per «chi» |
| C4 | **Più pagamenti su un conto**, cioè alla romana o metà contanti e metà POS, e **altri metodi** (buoni pasto, Satispay) | Il 2Bit ha 78.008 righe di pagamento; da noi un ordine ha un metodo solo | mancante | **D8** |
| C5 | «Chiusi» e la lente delle fasce **contano anche gli annullati** | Numeri della sera gonfiati | parziale | solo codice |
| C6 | **Preconto** del tavolo sulla stampante della cassa, non con la stampa del browser | Al tavolo si porta il preconto | parziale | dopo la stampa in negozio |
| C7 | **Apri cassetto** | Il cassetto si apre dalla fiscale | mancante | con la fiscale |
| C8 | **Ordini di prova nel database**: n. 121–132 del 27/10, «PROVA serata intensa» | Entrano nei conti della dashboard e nell'export del 27/10 | da pulire | il tuo sì per annullarli |
| C9 | **Prova in servizio** della colonna dei quarti d'ora in `/cassa/nuovo` | Fatta solo fuori servizio | da provare | una sera con Chrome collegato |

## 30.3 Dashboard

È la parte più avanti: 9 delle 10 voci del REA 24. Quello che manca:

| # | Cosa | Perché | Chi lo sblocca |
|---|---|---|---|
| D-1 | **Lo storico di Velocissimo nei grafici**: «anno scorso» e i mesi prima del passaggio. Le tabelle ci sono, ma la dashboard non le legge ancora | Senza, il confronto con l'anno prima parte da zero il giorno del cambio | prima il caricamento da `/cassa/importa` (55.593 ordini); poi solo codice |
| D-2 | **Coupon e punti** (voce 10 del REA 24) | Vedere se coupon e premi rendono | dopo l'import di card e punti |
| D-3 | **Confronto con il 2Bit, sera per sera** (ordini, incasso per metodo, per canale) | È lo strumento del mese di prova: dice se la cassa nuova ha perso o raddoppiato qualcosa | codice; i dati del 2Bit arrivano dall'agente sul PC (§30.5) o dall'export di Velocissimo |
| D-4 | **Margine e food cost** | Restano nell'OS: Velocissimo ha un 70 % finto. Nessun lavoro qui | — |

## 30.4 App iOS e Android

Com'è oggi: c'è il guscio Capacitor in `app-mobile/` (appId `it.webapp.amanoamanopugliese`, versione
2.0.0) che apre `/ordina`. In Actions c'è un APK di prova Android. **Niente è pubblicato**, ed è giusto
così fino a quando non sei sicuro.

| # | Cosa manca | Perché | Stato | Chi lo sblocca |
|---|---|---|---|---|
| A1 | **Pagamento online** su `/ordina` e nell'app (Nexi o un altro) | Oggi solo contanti e POS alla consegna; l'app di oggi incassa con Nexi | mancante | **D11**: il conto Nexi è tuo? |
| A2 | **Area cliente**: accesso col telefono, i miei ordini, ordina di nuovo, card con QR, punti, coupon | È quello che il cliente trova nell'app di oggi | mancante | dopo l'import di punti e card |
| A3 | **Notifiche push** a ogni stato e le quattro automatiche (ritardo, anticipo, rider a 200 m, carrello abbandonato) | L'app di oggi le manda; i 23 avvisi «è partito» non partono | mancante | **D15**, poi: conto Firebase (Android) e chiave APNs (Apple), che crei tu |
| A4 | **Coupon e punti su `/ordina`** | `/ordina` non chiama `coupon_verifica` | mancante | dopo l'import |
| A5 | **Togliere un ingrediente** dalla pizza in `/ordina` (oggi si aggiunge e basta) | L'app di oggi lo fa | parziale | solo codice |
| A6 | **iPhone**: uscire come 2.0.0 della stessa app (id6453763774, conto Vi.Ru) | Chi ha l'app la aggiorna e basta | pronto il guscio | il giorno del cambio; prima **TestFlight** chiuso |
| A7 | **Android**: l'app è nel conto di WEBAPP SRL | Senza trasferimento serve un'app nuova nel conto Google di Vi.Ru, e chi ha la vecchia va avvisato | da decidere | **D13**; la verifica dell'identità Google può richiedere giorni: conviene aprire il conto sviluppatore presto |
| A8 | **Il link «Ordina» del sito** verso `/ordina` | Oggi punta a Velocissimo | non si tocca fino al cambio | regola tua |
| A9 | **Controllo versione nostro** (dire al cliente «aggiorna l'app») | Il guscio di oggi ha il tasto di spegnimento di Velocissimo | mancante | solo codice |

## 30.5 Il PC di cassa con il 2Bit

Dal REA 27 e 29 (sola lettura sul PC, 27/10) e dalla tua conferma:
- **Le stampanti sono tre:** la fiscale Epson FP-81 II RT (192.168.1.200), la PIZZERIA in rete (192.168.1.12:9100) e la ASP, una TM-T88V **via USB** al PC.
- **Il numero di chi chiama** lo legge il **modem USB U.S. Robotics su COM4**.
- **Glovo, Deliveroo e Just Eat** si riconoscono nel 2Bit solo dal testo della nota.

| # | Cosa manca | Perché | Stato | Chi lo sblocca |
|---|---|---|---|---|
| P1 | **Accendere l'agente di stampa** sul PC: righe in `stampante` per la PIZZERIA (.12:9100) e la ASP | Senza, la cassa nuova non comanda la cucina | codice pronto (0047, 0058); manca la configurazione | **D20** (vedi sotto); `STAMPA_KEY` su Vercel e sul PC |
| P2 | **La ASP è USB, non in rete.** L'agente oggi manda alla porta 9100 | O l'agente impara a stampare su una stampante di Windows, o la ASP va in rete con un IP | mancante | **D20**; con «stampante di Windows» è solo codice dell'agente |
| P3 | **Il numero di chi chiama senza togliere il modem al 2Bit** | Verificato il 28/10: il 2Bit salva ogni chiamata in `PIZ_tabChiamateRicevute` **allo squillo** (entro 1 s). Si legge in sola lettura e si manda a `/api/telefono/chiamata`: il 2Bit non se ne accorge | codice pronto e spento: `agente-chiamate/` (PowerShell, niente da installare) | l'ok di Edoardo per l'utente SQL di sola lettura (chiesto nel thread del PC); `TELEFONO_KEY` in `chiave.txt` sul PC |
| P4 | **Lo scontrino fiscale** sull'Epson: emissione, annullo, X e Z, cassetto, IVA vere | Senza, non si spegne il 2Bit | mancante | test in negozio con la stampante in RT (REA 17 §9.3); **D2, D7, D14** |
| P5 | **L'agente lettore** che copia nella cassa nuova gli ordini di app e piattaforme dal database del 2Bit (`DD_AMANOAMANOPUGLIESE`, sola lettura) | È la strada di base del parallelo per gli ordini online (REA 25 strada 1, REA 26 strada A) | da costruire | **D25-1 / D26-6**: va bene un programma in sola lettura sul PC? |
| P6 | **Confronto 2Bit e cloud**: 51.550 ordini nel 2Bit contro 55.593 nel cloud; 10.000 tessere contro 1.578 card | Da spiegare prima di importare | da leggere | seconda lettura del PC (REA 29 §7) |
| P7 | **Rischi del 2Bit**: porta 9000 aperta su Internet, password di `sa` in chiaro in un `.bat`, backup solo sullo stesso disco | Restano aperti finché il 2Bit è acceso | da sapere | **D22**; dopo lo spegnimento si cambia la password |
| P8 | **Il PC resta collegato** solo se la finestra di PowerShell con `remote-control` resta aperta | Se il PC si riavvia, il collegamento cade | da sistemare | si può mettere in avvio automatico, col tuo ok |

## 30.6 Deliverect

Aspetta la tua telefonata (le domande sono nella **REA 28**). Cosa dice internet, dalla documentazione
pubblica letta il 27–28/10:

- **Per diventare sviluppatori** si compila il modulo partner, e arriva un account di **staging** con le chiavi. Poi si sviluppa e si passa la **certificazione**: una lista non pubblica, «in media due chiamate». Le chiavi di produzione arrivano subito dopo. **Costi e tempi non sono pubblici**: sul forum degli sviluppatori la domanda sui costi è rimasta senza risposta.
- **La prova in parallelo** si fa con le **Reporting Webhooks**: una copia di ogni ordine e di ogni stato verso un nostro indirizzo, mentre Velocissimo resta il POS. Hanno un accordo sui prezzi da firmare, un tentativo solo per messaggio e la firma HMAC. Il nostro ricevitore c'è (`/api/deliverect/copia`), spento.
- **Già pronto e spento**:
  - il ricevitore POS, che non rifiuta mai un ordine pagato, usa il quarto d'ora del ritiro e gestisce gli annulli;
  - il client per gli stati (20 accettato, 110 annullato), «occupato» e «esaurito per PLU».
- **Da fare dopo lo staging**:
  - la stampa dell'annullo in cucina;
  - lo stato 90;
  - l'occupato legato ai quarti pieni;
  - l'esaurito di stasera verso lo snooze;
  - il Register POS;
  - il sync del menù con **gli stessi PLU di Velocissimo**.
- **Non pubblici:**
  - il **codice canale di Glovo**: Deliveroo è 2 e Just Eat è 9, Glovo si legge in staging;
  - la lista di certificazione;
  - il prezzo delle Reporting Webhooks.

## 30.7 Clienti, punti, coupon, menù

| # | Cosa | Stato | Chi lo sblocca |
|---|---|---|---|
| K1 | **Punti e card**: 1.578 card e circa 37.900 punti nel cloud, ma 10.000 tessere e 11.885 movimenti nel 2Bit | bloccato finché i numeri non tornano (regola tua) | seconda lettura del PC + export a servizio finito |
| K2 | **Coupon veri** (NON CUCINO, Benvenuto, FESTEGGIAMO, GIOVEDÌ SONO FRITTO) e **premi** col costo in punti | 0 attivi | **D10**: nel parallelo restano su Velocissimo? |
| K3 | **194 coupon validi non usati** da portare | mancante | con K1 |
| K4 | **Foto del menù**: 117 dei 135 prodotti attivi le prendono da `service.web-app.it` | spento Velocissimo, spariscono | **D17**: posso copiarle nel nostro storage? |
| K5 | **IVA**: tutto il menù ha una sola aliquota | sbagliato per le bevande, se sono al 22 % | **D14** |
| K6 | **Periodi di chiusura** con messaggio (Natale 24–25/12) letti da `/ordina`, totem e cassa | mancante | solo codice + migrazione; da fare **prima di dicembre** |
| K7 | **Allergeni ed etichette** sul prodotto | mancante | obbligo di legge sull'app: da fare prima della pubblicazione |
| K8 | **Doppioni dei codici** 142 e C072 prima del sync con Deliverect | da decidere | **D26-7** |

## 30.8 Dati verso mano-a-mano-os

| # | Cosa | Stato |
|---|---|---|
| O1 | L'OS legge ancora solo Velocissimo. L'export a 40 colonne c'è (`/api/ordini/csv`), ma nessuno lo chiama | mancante (lavoro nell'OS, **D1**) |
| O2 | Vendite per articolo complete: `numeroCoperti`, `scontoInRiga`, pagamenti per scontrino | parziale (REA 15 §15.3) |
| O3 | Nel parallelo l'OS **non deve contare due volte** le piattaforme (copie Deliverect, agente lettore) | regola scritta in REA 25 §25.5 e 26 §26.5; da rispettare nel codice delle copie |

## 30.9 L'ordine dei lavori

**A. Per la prima sera di parallelo** (dipende da D1: doppia battitura o cassa nuova che comanda la cucina)

1. **Stampa in negozio** (P1, P2): configurazione della PIZZERIA, agente sul PC, la ASP via Windows o in rete. Solo con il parallelo «vero».
2. **Utenze**: le dieci `riderN@` e una per postazione (D4). Le crei tu dal pannello di Supabase: io non creo account.
3. **Correggere un ordine chiuso** (C1).
4. **Ricerca nella lista ordini** (C2) e **«Chiusi» senza annullati** (C5): solo codice, li faccio subito.
5. **Telefono**: chi tiene il modem nel parallelo (P3, D26).
6. **La regola dello scontrino** nel parallelo (D2): si ribatte sul 2Bit al pagamento.
7. **Pulire gli ordini di prova** del 27/10 (C8) e caricare lo storico (D-1).
8. **Confronto sera per sera col 2Bit** (D-3).

**B. Per spegnere Velocissimo**

9. Scontrino fiscale (P4).
10. Deliverect: staging, sviluppo e certificazione (§30.6).
11. Agente lettore per gli ordini dell'app durante il parallelo (P5).
12. Punti, card, coupon (K1–K3).
13. Pagamento online (A1).
14. Foto del menù (K4).
15. Avvisi e push (A3).
16. Area cliente (A2, A4, A5).
17. App iOS e Android (A6, A7, A9).
18. Periodi di chiusura (K6) e allergeni (K7).
19. L'OS che legge la cassa (O1, O2).
20. IVA vera (K5).
21. Più pagamenti e altri metodi (C4).
22. Fattura (D9).

**C. Da avere**

23. Lista delle chiamate (C3).
24. Preconto in stampa (C6).
25. Prenotazioni (D16).
26. Etichette Brother (D19).
27. Il PC in avvio automatico (P8).

## 30.10 Domande aperte, tutte in un posto

Quelle già fatte, ancora senza risposta (il numero è quello del REA dove stanno):

- **D1** come si fa il parallelo;
- **D2** lo scontrino;
- **D4** le utenze;
- **D8** pagamenti divisi e altri metodi;
- **D9** fatture;
- **D10** punti e coupon nel parallelo;
- **D11** Nexi;
- **D13** app Android;
- **D14** IVA;
- **D15** avvisi al cliente;
- **D16** prenotazioni;
- **D17** foto;
- **D20** le due comande e la ASP via USB;
- **D21** le 10.000 tessere;
- **D22** porta 9000;
- **D25** il totem è in uso?;
- **D26** modem;
- **D25-1 / D26-6** agente lettore sul PC;
- **D26-1…7** Deliverect (nella telefonata).

Nuove di stanotte:

- **D30-1.** ~~Gli ordini di prova del 27/10~~: annullati il 28/10 col sì di Edoardo.
- **D30-2.** ~~Chi tiene il modem nel parallelo?~~ Risolta il 28/10: il modem resta al 2Bit, noi leggiamo la sua tabella delle chiamate (P3).
- **D30-3.** Posso mettere `claude remote-control` **in avvio automatico** sul PC di cassa? *Cosa cambia:* dopo un riavvio il collegamento torna da solo, senza che tu riapra PowerShell.

## Fonti

- **Codice:** `main` a `f5c1bf0`; `supabase/migrations` fino alla 0080 (con 0063, 0064 e 0066 portate stanotte); `src/app/cassa/*`, `src/app/ordina`, `src/lib/types.ts:160`, `app-mobile/capacitor.config.json`, `agente-stampa/`.
- **Database** (solo `SELECT`, 28/10 notte): conteggi di `auth.users`, `profilo`, `stampante`, `chiamata`, `cliente`, `coupon`, `coupon_emesso`, `prodotto` (`foto_url`, `esaurito_fino`, `aliquota_iva`), `velocissimo_ordine`, `cassa_conteggio`, `notifica_cliente`, `ordine`, `fascia_bloccata`, `pagamento`.
- **REA:** 21, 22, 24, 25, 26, 28; 27 e 29 dal ramo `claude/project-thread-9z7krm`.
- **Deliverect:** developers.deliverect.com (pos-integration-overview, faq-1, reporting-endpoint-overview, update-order-status, how-to-handle-cancellations, update-store-status, snooze-by-plu, hmac-authentication), discuss/69b02ab5ffc8d35285e0913f.
