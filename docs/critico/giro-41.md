# Giro 41: il riepilogo di una sera qualunque, fondo e conteggio (26–27/10/2026)

Codice: `src/app/cassa/riepilogo/page.tsx` a `0753dfb` (mig. 0077 `fondo_e_conteggio_cassa`, nel registro).
In Chrome la pagina pubblicata ha già «Fondo e conteggio», quindi il deploy è quello.
**Senza scritture**: nel database solo SELECT, più una prova della policy fatta come utente cassa dentro
`begin … rollback`. Alla fine `cassa_conteggio` ha 0 righe. In Chrome non ho premuto «Scrivi il fondo» né
«Scrivi il conteggio». Le risposte lente le ho fatte con un `fetch` rallentato nella mia scheda, senza toccare il server.
Ho provato le funzioni di data e `leggiEuro` copiate in node, nello scratchpad.

**Voto: 6 su 10.** I conti di una sera passata sono giusti al centesimo. Il taglio delle 06:00 regge il cambio
d'ora del 25/10 con i dati veri. Però:
- se cambi sera mentre la pagina sta ancora caricando, mostra i numeri di due sere insieme sotto un titolo solo;
- una scheda lasciata aperta resta ferma sulla sera di ieri, e il fondo scritto la sera dopo finisce su ieri;
- «Dovevano esserci» cambia dopo che hai contato, quando un rider salda il giorno dopo.

## 1. I conti: pagina contro SQL

| Serata | Pagina (Chrome) | SQL (`vendite_giornata_totali` e `ordine`) |
|---|---|---|
| 24/10 | 24 ordini · 36 pizze · 10 consegne · 315,30 € · contanti 221,00 · POS 87,10 · aperti 7,20 | uguale |
| 25/10 (cambio d'ora) | 2 · 4 · 2 · 32,40 € · contanti 16,80 · ai rider 15,60 | uguale |
| 05/11 (futura) | tutto a 0 | 0 |

**La finestra degli ordini.** `inizioGiornata` dà 24/10 → 04:00Z e 25/10 → 05:00Z, quindi la serata del 24 dura
25 ore, com'è giusto. Ho rifatto in SQL l'`or(...)` della pagina per le sere dal 21 al 27/10: **0 ordini persi
dalla query** rispetto a `giornata_lavorativa(coalesce(ora_consegna, creato_il))`. Nessun ordine doppio fra due
sere, perché il filtro in JS dopo la query tiene una sola giornata per ordine. Nessun ordine vero cade nell'ora
doppia del 25/10.

## 2. Difetti, dal più grave

### G1 — Se cambi sera mentre carica, la pagina mescola due sere (provato)
`page.tsx:48-58`, `:84-87` e `:189-194`: nessuna delle tre letture controlla che la risposta sia ancora quella
della sera scelta.

Come rifarlo:
1. Sei sul 25/10.
2. Rendi lente le richieste del 24 (rete lenta; io ho rallentato `fetch` di 4 s).
3. Premi «Sera prima» e, entro 0,3 s, «Sera dopo».

Dopo 5 s il titolo dice **«Riepilogo di domenica 25 ottobre»**, ma i numeri sono metà di una sera e metà
dell'altra:
- in cima **24 ordini, 36 pizze, 10 consegne, 315,30 €**, che sono del 24;
- in «Cassa» 16,80 / 15,60, che sono del 25.

Il blocco «Cassa» si è salvato per caso: la risposta vecchia ha cambiato `ordini`, e questo ha fatto rileggere
il 25. Lo stesso può succedere con `cassa_conteggio`: compaiono il fondo e il conteggio di un'altra sera, e la
«Differenza» si calcola contro i contanti di un'altra sera.

Rimedio: un flag `annullato` nel cleanup di ogni effetto, oppure scartare la risposta se la giornata non è più
quella scelta.

### G2 — Una scheda lasciata aperta resta sulla sera di ieri, e il fondo va su ieri
`page.tsx:42`: `useState(giornataOggi)` si calcola una volta sola. Prima di `87c5fa6` ogni `carica()` rileggeva
`giornataOggi()`, quindi è una regressione.

Come rifarlo: lasci il riepilogo aperto sul PC di cassa dopo la chiusura (00:30) e lo riguardi alle 18:00 del
giorno dopo.
- `giornata` vale ancora ieri.
- Il titolo resta «della serata» finché qualcosa non fa ridisegnare la pagina, perché `inCorso` si ricalcola solo
  al render.
- Gli ordini nuovi arrivano in realtime ma vengono scartati da `filter(... === giornata)`.
- **«Scrivi il fondo» registra il fondo di stasera con la data di ieri** (`:201`).

La tabella è append-only, quindi l'errore resta: il fondo di ieri viene «corretto» e stasera risulta «Non scritto».

Rimedio: se la sera scelta era quella in corso, seguire il cambio di serata. Oppure, prima di scrivere fondo o
conteggio, chiedere conferma quando la sera non è quella in corso.

### G3 — «Dovevano esserci» cambia dopo che hai contato (dai conti)
Su questo si basa la differenza: `contantiInCassa` conta i contanti a domicilio solo se
`consegna.saldata_il is not null`, e lo guarda **adesso**, non all'ora del conteggio.

Caso reale nel database: la sera del 25/10 ha 15,60 € «Ai rider · contanti», non ancora saldati.
1. Il 25 a fine sera il cassetto ha fondo + 16,80 e la differenza «torna».
2. Il rider salda oggi (`rider_salda`).
3. La sera del 25 passa a «dovevano esserci» fondo + 32,40, cioè **«−15,60 € in meno»**.
4. Stasera i 15,60 sono davvero nel cassetto ma non sono attesi: **«+15,60 € in più»**.

Due sere sbagliate per un saldo fatto in ritardo. Lo stesso succede per gli ordini che passano a «consegnato» o
«ritirato» dopo il conteggio.

Rimedio: fissare l'atteso nel momento del conteggio, salvandolo nella riga di `cassa_conteggio`. Oppure contare
i depositi dei rider per `rider_movimento.creato_il` nella finestra della sera.

### M1 — L'atteso non considera i movimenti di cassa dei rider né gli ordini ancora aperti
`page.tsx:211`: «dovevano esserci» = fondo + `contantiInCassa`.

Restano fuori:
- i **prelievi** dal cassetto, cioè `rider_movimento` con `tipo='prelievo'` e `fondo_cassa=true` (il resto dato al
  rider; uno c'è già nel database, 20 €);
- i depositi a mano che non vengono da `rider_salda`;
- gli ordini ancora aperti ma già pagati in contanti. Il 24/10 c'era C-10, 7,20 €, rimasto «ricevuto».

Il risultato è una differenza falsa, in più o in meno, senza nessuna spiegazione. Almeno sotto la differenza
andrebbe scritto «ancora aperti X €» e «resto ai rider X €».

### M2 — POS: la differenza col terminale non conta il POS dei rider
`page.tsx:213`: si confronta con `posInCassa`, che esclude il domicilio. Se il rider usa lo stesso terminale
della cassa (in pizzeria capita spesso), il totale del terminale comprende anche `posAiRider`, e la differenza
viene sempre «in più». **Da chiedere a Edoardo**: un terminale solo o due?

### M3 — Riepilogo e dashboard danno due numeri per la stessa sera
Per il 24/10:
- `/cassa/riepilogo` dice **315,30 €, 10 consegne**. Usa `vendite_giornata_totali`, cioè la sera dell'ora richiesta.
- `/cassa/dashboard`, con `cruscotto('2026-10-24',…)`, dice **327,80 €, 11 consegne**. Usa la sera in cui
  l'ordine è stato creato.

La differenza è fatta da quattro ordini:
- C-10 (7,20 €) e C-15 (12,70 €), fatti il 23 per il 24;
- C-74 (16,80 €) e C-92 (15,60 €), fatti il 24 per il 25.

Il riepilogo nuovo serve a confrontare la sera col 2Bit: bisogna decidere una regola e usarla in tutte e due le
pagine.

### M4 — Si possono scegliere sere future, e fondo e conteggio si scrivono anche lì
`page.tsx:104-105`: `max` non impedisce di scrivere la data a mano. Ho impostato 05/11: la data viene accettata
(`validity.valid=false`, ma `onChange` passa lo stesso) e «Sera dopo ›» resta attivo. Si va avanti a piacere.

Il form del fondo resta attivo. In una transazione annullata, come cassa, `insert` su `cassa_conteggio` con
`giornata='2030-01-01'` **passa**: la migrazione non ha nessun `check` sulla data.

Il testo dice «Nessun ordine quella sera.», al passato, per una sera che deve ancora venire.

### M5 — Ogni evento realtime fa sparire per un attimo cassa e differenza
`page.tsx:83` e `:93`: l'effetto dipende da `[ordini]` e comincia con `setIncassato(null)`. Quindi a ogni ordine
nuovo o cambiato, anche per una sera passata, perché il canale ascolta tutta la tabella:
- tutto il blocco Cassa diventa «Leggo la cassa…»;
- `Conteggio` riceve `attesoContanti=null`, così «Dovevano esserci» e «Differenza» spariscono e poi ricompaiono;
- si rileggono `vendite_giornata_totali` e `rider_borsello`.

Di sabato significa decine di lampeggi, proprio mentre si conta. Due eventi ravvicinati fanno due chiamate
senza ordine fra loro, come in G1. Su una sera passata il canale realtime potrebbe anche essere spento.

### M6 — Il canale realtime ha sempre lo stesso nome a ogni cambio di sera (da codice, da finire di provare)
`page.tsx:61`: `channel("riepilogo")`. Il client del browser è unico (`@supabase/ssr`). `removeChannel` è
asincrono e `realtime-js` 2.118 `channel()` restituisce il canale esistente con lo stesso topic
(`RealtimeClient.js:338-349`).

Sul WebSocket ho visto `phx_leave` seguito da un nuovo `phx_join`, quindi la sottoscrizione rinasce. Però le
`bindings` del canale riusato possono tenere anche la `carica()` della sera precedente, con la sua chiusura, e
allora un evento rilegge due sere e vince l'ultima arrivata.

Non l'ho potuto provare con un evento vero (niente scritture). Rimedio a costo zero: `channel("riepilogo-" + giornata)`.

### L1 — `leggiEuro` (`page.tsx:176`), provata in node su 32 scritture
Giuste:

| Scritto | Letto |
|---|---|
| `150` | 150 |
| `150,50` | 150,5 |
| `150.50` | 150,5 |
| `1.234,56` | 1234,56 |
| `1 234,56` | 1234,56 |
| `€ 150` | 150 |
| `1.000,00€` | 1000 |
| `0,5` | 0,5 |
| `-5` | rifiutato |
| `1,234.56` | rifiutato |

Sbagliate o pericolose:
- **`150.999` → 150.999 €** e **`45.500` → 45.500 €**: un punto seguito da tre cifre viene preso per migliaia.
  Chi scrive con la tastiera inglese «45.500» intendendo 45,50 registra quarantacinquemila euro, senza nessun
  avviso, e la riga è append-only.
- **`€` da solo → 0 €**: il pulsante è attivo perché `trim() !== ""`, e si scrive un fondo di 0.
- `1e3` → 1000, `0x10` → 16.
- `12,345` → 12,35 ma `12.345` → 12.345: arrotonda senza dirlo.
- `100000000` → passa il controllo, poi il database risponde con l'errore inglese «numeric field overflow».

Rimedio: un tetto ragionevole (per esempio 20.000 €) con una domanda di conferma, e solo cifre, `.` e `,`.

### L2 — Il testo scritto resta quando cambi sera
`page.tsx:183-186`: `fondo`, `contanti`, `pos` e `nota` non si svuotano al cambio di `giornata`. Una cifra
scritta e non inviata segue la sera nuova e si invia lì.

### L3 — Nessun realtime su `cassa_conteggio`
La tabella non è nella pubblicazione `supabase_realtime`. Se il fondo lo scrive un altro dispositivo, qui resta
«Non scritto» finché non ricarichi o cambi sera. Chi lo vede può riscriverlo, e restano due fondi.

### L4 — 390 px (iframe same-origin, 390×844)
- Nessuno scorrimento orizzontale: `scrollWidth` 388.
- Tutti i campi e i pulsanti sono alti 44 px.
- «Sera dopo ›» va a capo da solo, su una seconda riga, sotto «‹ Sera prima» e la data.
- «Fondo e conteggio» comincia a 964 px, cioè nella seconda schermata, dopo sette carte della cassa e il
  borsello. Chi apre la pagina per scrivere il fondo deve scorrere per prima cosa.
- I campi del conteggio hanno solo il placeholder: appena scrivi una cifra non sai più se sei nel campo
  «contanti» o nel «POS». Servono etichette visibili.

### L5 — Italiano e chiarezza
- «−15,00 € in meno» e «+15,00 € in più»: il segno e le parole dicono due volte la stessa cosa. Meglio
  «mancano 15,00 €» e «ci sono 15,00 € in più».
- «Senza fondo, la differenza parte da zero.» si capisce male. Meglio: «Manca il fondo: la differenza lo conta 0 €».
- «Correggi il fondo» e «Riscrivi», insieme a «Riconta»: va bene, ma non si dice che vale l'ultimo.
- Dopo mezzanotte, nella serata in corso, dice «Nessun ordine oggi.» mentre il ramo dice «Ordini 12 · 0 validi»
  (12 annullati). Meglio «Nessun ordine valido stasera».
- Serata 26/10: «In mano ai rider · Rider di prova 15,60 €» compare insieme ad «Ai rider · contanti 0,00 €»: sono
  i 15,60 del 25. Il problema c'era già prima, ma ora salta all'occhio.

### Nota sulla sicurezza (niente da riparare subito)
Le policy sono giuste:
- `anon` legge 0 righe;
- la cassa inserisce solo con `chi = auth.uid()`;
- non c'è nessuna policy di modifica.

Le grant di default di Supabase però danno a `anon` e `authenticated` anche TRUNCATE e DELETE sulla tabella. Da
PostgREST non sono raggiungibili, ma l'«append-only» lo garantisce solo l'assenza di policy, non i permessi.

## 3. Cosa va bene
- I conti di una sera passata sono uguali a SQL al centesimo, compreso il 25/10 col cambio d'ora.
- La query degli ordini non ne perde e non ne raddoppia nessuno. Le date si spostano a mezzogiorno UTC, quindi
  l'ora legale non fa saltare un giorno.
- Il borsello dei rider è nascosto sulle sere passate, giustamente.
- Il conteggio è append-only, e lo storico si apre in «Tutti i conteggi».

`giornataDi` in JS non coincide col database in due ore all'anno:
- 25/10, 05:00–05:59 di Roma: JS dice 25, il database dice 24;
- 29/03, 06:00–06:59 di Roma: JS dice 28, il database dice 29.

In quelle ore l'ordine sparirebbe da tutte e due le sere. Oggi non c'è nessun ordine vero lì, quindi il difetto è
lieve. Rimedio: calcolare in ora di Roma e poi togliere 6 ore, come fa `giornata_lavorativa`.

## 4. Lavori che si aprono
1. G1 e M5 insieme: scartare le risposte che non sono più della sera scelta, e non azzerare la cassa a ogni evento.
2. G2: la sera in corso deve seguire l'orologio; conferma prima di scrivere fondo o conteggio su una sera che non
   è quella in corso.
3. G3 e M1: fissare l'atteso nel momento del conteggio e mostrare cosa resta fuori (aperti, resto ai rider).
4. M3: decidere con Edoardo se la sera di un ordine è quella in cui si consegna o quella in cui si ordina, e
   usarla in riepilogo, dashboard ed export.
5. M4 e L1: niente date future e un tetto sugli importi.
