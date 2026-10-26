# Giro 33 — ricontrollo delle correzioni del giro 32 (26/10/2026)

Deploy provato: `0777c47` («Menù: i difetti del critico giro 32»), **READY** sul connettore Vercel
(`dpl_qJfhe1sEVZpZqrQS5EjrBAqFaRoS`; alla prima lettura era BUILDING, alla seconda READY). Browser: Claude in
Chrome, sessione di Edoardo, due schede mie (`/cassa/menu` e `/cassa/nuovo`), chiuse alla fine. Database letto
col connettore, solo in lettura (`tnuyeyqwoqhmgpskqtuq`). Nessun ordine inviato: le righe battute le ho tolte
con ✕. Orario: ~04:00–04:13 UTC.

## Cosa ho toccato, e com'è finito

| Cosa | Cosa ci ho fatto | Stato finale |
|---|---|---|
| «Pizze classiche» (vera) | aperta la scheda, letto, **Annulla** senza toccare | invariata (`#f5c518`, ordine 2) |
| «+ categoria» sotto Bar | aperta, cambiato il gruppo nel menù a tendina per prova, **Annulla** | nessuna categoria nuova (sempre 15 righe) |
| «PROVA critico 32» `972a74b6…` | ↑ ↑ poi ↓ ↓ ↓ | ordine **14** come prima; vedi tabella |
| «PROVA critico 31 pizza» `98c20d5f…` | acceso solo «In cassa», L1 9,90 → 9,60, prove 0 € e 85 € (mai salvate), poi L1 9,90 e spento | **spento** (attivo/app/sito/totem false), L1 **9,90**, L2 10,50, L3 11,00, Pizze speciali, `ordine` 28 |

### Ordine delle categorie, prima / durante / dopo

| Categoria | Gruppo | Prima | Dopo 1° ↑ | Dopo 2° ↑ | Fine |
|---|---|---|---|---|---|
| Le novità estive | Pizze | 0 | 0 | 0 | 0 |
| Novità | Pizze | 1 | 1 | 1 | 1 |
| Pizze classiche | Pizze | 2 | 2 | 2 | 2 |
| **Pizze speciali** | Pizze | 3 | 3 | **13** | 3 |
| Pucce pugliesi … La nostra cantina | Cucina/Bar | 4–12 | 4–12 | 4–12 | 4–12 |
| **Menù** | Pizze | 13 | **14** | 14 | 13 |
| PROVA critico 32 | Pizze | 14 | 13 | **3** | 14 |

Tutte e 15 tornate come all'inizio (riletto dal database a fine giro, colori compresi).

## Ricontrollo del giro 32

| # | Difetto | Com'è adesso | Esito |
|---|---|---|---|
| K1 | colori veri non nella tavolozza | aperta «Pizze classiche»: 24 quadratini + «nessuno», **il primo è `#f5c518` ed è segnato** (`.scelto`, `aria-pressed`); seguono i 13 colori delle altre categorie, poi i 10 di prima. Toccarne un altro non perde più il vecchio | **a posto**. Lieve: fra «i colori di oggi» c'è anche il `#c0392b` della categoria PROVA (le categorie di prova entrano nella tavolozza) |
| K2 | comanda aperta: tasto nuovo, riga vecchia | PROVA battuta a 9,90; prezzo cambiato a 9,60 nell'altra scheda; al `visibilitychange` la riga diventa **9,60**, il secondo tocco fa **2× … 19,20 €** | **a posto** per il prezzo. Resta: un prodotto **spento** mentre è in comanda sparisce dai tasti ma la sua riga resta (a 9,60, che ormai non è il prezzo di nessuno) e «Invia in cucina» è attivo (vedi M2) |
| K3 | «+ categoria» sotto Bar nasce pizza | scheda nuova sotto Bar: «Si stampa in cassa» e **forno spento**, come le sorelle | **a posto**. Lieve: se nella scheda si cambia il gruppo (Bar → Pizze) stampa e forno restano quelli di Bar (L1 qui sotto) |
| K4 | categoria nuova in fondo e non si sposta | ↑ ↓ ci sono, e nella pagina del menù la spostano fra le sorelle | **mezzo a posto**: vedi M1, lo scambio salta i gruppi in mezzo |
| K5 | niente elimina/spegni categoria | — | **aperto** (non toccato dal commit) |
| L1 g32 | correggere il prezzo non toglie l'errore | scritto 85 → avviso; corretto in 86 → **l'avviso sparisce** | **a posto** |
| L2 g32 | 0 € e 85 € passano | L1 = 0 → «Un prezzo è 0 € o sopra i 50 €: se è giusto, premi Salva di nuovo.», scheda aperta, **niente salvato** (database: 9,60). L3 = 85 → stesso avviso | **a posto** (nel database oggi non c'è nessun prodotto sopra i 50 € né a 0 €) |
| L3 g32 | «Bere» | «Scegli il gruppo (Pizze, Cucina, Bar…).» nel codice | **a posto** |
| L7 g32 | quadratini 40 px | 44×44 | **a posto** (a 390 px non rimisurato: con 24 colori la scheda è più alta di prima) |

## Difetti, in ordine di gravità

### Medi

- **M1 — ↑ ↓ scambiano il numero d'ordine con la sorella, ma le sorelle non sono vicine: una categoria vera
  salta dopo i vini.** `src/app/cassa/menu/page.tsx:80-91`: `sposta` scambia `ordine` con la categoria accanto
  **dello stesso gruppo**, ma l'ordine è uno solo per tutto il menù e il gruppo Pizze non è contiguo («Menù» sta
  a 13, dopo Bar). Provato: PROVA (13) ↑ con Pizze speciali (3) → **Pizze speciali passa a 13** e in
  `/cassa/nuovo` la tessera «PIZZE SPECIALI» compare **dopo «LA NOSTRA CANTINA»**, ultima fila. Nella pagina del
  menù invece sembra tutto giusto (la vista è per gruppo): chi sposta non vede cosa ha combinato in cassa. Due
  tocchi su ↑ di «Menù» fanno lo stesso con le pizze speciali. Rimedio: rinumerare tutto il gruppo in fila, o
  spostare solo dentro la sequenza globale.
- **M2 — Prodotto spento mentre è in comanda: la riga resta e si invia.** `riprezzaRighe`
  (`src/lib/menu.ts:127`) lascia com'è una riga il cui prodotto non c'è più fra gli attivi; la tessera sparisce
  ma «2× PROVA critico 31 pizza 19,20 €» resta, a un prezzo vecchio, e con «Contanti» scelto «Invia in cucina» è
  attivo. `ordine_da_cassa` non guarda `attivo` (letto con `pg_get_functiondef`). Raro, ma è il caso «finito
  l'impasto, la spengo»: meglio segnare la riga («non si vende più») e chiedere.
- **M3 — «Dopo l'ultima del suo gruppo» per Pizze vuol dire ancora «dopo Menù».** `SchedaCategoria.tsx:50-51`:
  l'ultima del gruppo Pizze è «Menù» (13), che sta dopo Bar; una nuova categoria di pizze nasce a 15, quindi in
  cassa ancora dopo i vini (dal codice e dai dati, non salvata). Per Cucina e Bar invece funziona (Cucina → 10, e
  da Bevande in giù scalano di uno). Lo scalare è un `update` per riga, in fila, non in una transazione
  (`:53-57`): se uno a metà fallisce restano due categorie con lo stesso numero.

### Lievi

- **L1** — Cambiare il gruppo dentro la scheda nuova non rifà stampa e forno (`SchedaCategoria.tsx:79`, solo
  `cambia("id_gruppo")`): «+ categoria» da Bar, gruppo messo a Pizze → resta «Si stampa in cassa», forno spento.
- **L2** — La tavolozza prende i colori di tutte le categorie, anche quelle di prova (`SchedaCategoria.tsx:35`).
- **L3** — ↑ sulla prima e ↓ sull'ultima non fanno niente e non sono spenti (nessun segno).
- **L4** — Il riprezzo dopo la rilettura vale anche per un ordine riaperto con «Modifica»: dopo 2 minuti le sue
  righe prendono il listino di oggi, anche se il menù non è cambiato per quel prodotto ma il prezzo dell'ordine
  era diverso (il commento in `src/app/cassa/nuovo/page.tsx:204-205` dice «finché il menù non cambia», ma la
  rilettura parte ogni 2 minuti comunque). Le righe-figlie dei menù non si riprezzano.
- K5 del giro 32 (nessun elimina/spegni categoria) resta aperto.

## Voti

| Cosa | Funziona | Veloce | Chiaro | Meglio di oggi | Voto |
|---|---|---|---|---|---|
| Colori di oggi nella scheda | A | A | A− | A | 9 |
| Default stampa/forno dalle sorelle | A− (solo all'apertura) | A | B+ | A | 8,5 |
| ↑ ↓ categorie | C (rompe l'ordine in cassa: M1) | A | B− (in pagina sembra giusto) | B | 5,5 |
| Comanda aperta che riprezza | B+ (spenti esclusi: M2) | B (fino a 2 min) | B+ | A | 8 |
| Conferma 0 € / > 50 € | A | A | A | A | 9 |

**Giro: 7,5 su 10.** Quasi tutto il giro 32 è chiuso bene (colori, default, riprezzo, conferma, errore che
sparisce). Il nuovo ↑ ↓ però è pericoloso proprio sulle categorie vere: due tocchi mandano «Pizze speciali» in
fondo alla cassa, dopo i vini, e dalla pagina del menù non si vede.
