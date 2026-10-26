# Giro 35 — ricontrollo del commit 0797d41: «Modifica» di un ordine da app, frecce spente mentre salvano, «+ categoria» sotto Cucina (26/10/2026)

Deploy provato: `0797d41` («Cassa: "Modifica" di un ordine da app non si svuota più»), **READY** sul connettore Vercel
(`dpl_DQhXFx2qTaWXxptntLweyy2BkgpZ`; alle prime due letture era BUILDING, alla terza READY). Browser: Claude in Chrome,
sessione di Edoardo, **una** scheda mia (chiusa alla fine). Database letto col connettore, solo lettura
(`tnuyeyqwoqhmgpskqtuq`). Nessun ordine inviato, nessuna modifica salvata. Orario ~04:38–04:55 UTC. Giro breve.

## Cosa ho toccato, e com'è finito

| Cosa | Cosa ci ho fatto | Stato finale (riletto dal DB) |
|---|---|---|
| APP-4 `da118192-5ed4-4ead-ae76-7c638ae5cf87` (app, ricevuto) | `?modifica=`, `visibilitychange` ×2, lasciata aperta 168 s (giro a tempo a 121 s), uscito senza salvare | invariato: 3 righe, `ricevuto`, totale 17,90, `modificato_il` null |
| C-7 `0f5e865b…` (cassa, ricevuto, 4 righe con prodotto) | `?modifica=`, `visibilitychange`, uscito senza salvare | invariato: 4 righe, 21,60 |
| C-9 `cfd5075b…` (cassa, ricevuto, Menu classico X2 con 3 figlie) | `?modifica=`, `visibilitychange`, lasciata 135 s (giro a tempo a 120 s), uscito senza salvare | invariato: 4 righe, 26,50 |
| «PROVA critico 32» `972a74b6…` | ↑ con un secondo tocco dopo 60 ms, poi ↓ | **ultima, ordine 15**; le 14 vere 1–14 come prima, colori invariati |
| «+ categoria» sotto Cucina | aperta, letta, **Annulla** | nessuna categoria nuova (sempre 15) |
| Ordini nuovi dopo le 04:30 | — | **0** |

Nota: dalla scheda nuova `navigate back` non aveva storia, quindi «uscire» è stato andare direttamente all'ordine
successivo / a `/cassa/menu`: nessun Salva, nessun «Lascia stare».

## Le prove

### 1) APP-4 in «Modifica» — il grave del giro 34

- All'apertura: «MODIFICA APP-4 · 1× Il crudo di Parma 11,90 € · 2× Supplì di riso 4,40 € · 1× Peroni 33cl 2,50 €»,
  totale 18,80 €.
- `visibilitychange` (rilettura vera: partite le richieste a `categoria`, `prodotto`, `variazione`,
  `categoria_gruppo_variazione`, `pacchetto_gruppo`): **le 3 righe restano**, nessun avviso, nessun «Tocca un prodotto».
- Rifatto una seconda volta: uguale.
- Lasciata ferma: il giro a tempo è partito a 121 s; a 168 s le 3 righe c'erano ancora, nessun «spento nel menù».
- DB dopo: APP-4 identico. **G1 del giro 34: a posto.**

### 2) Ordini della cassa (righe con prodotto)

- **C-7** (Margherita, Margherita + bufala 9,70, Supplì 2,20, Coca 0,33 2,50; 21,60 €): dopo `visibilitychange`
  pannello identico carattere per carattere, totale 21,60, nessun avviso.
- **C-9** (Menu classico X2 con ↳ Marinara, ↳ Coca 1,5 lt, ↳ Napoli + bufala, «2 supplì, 2 crocchette, 3 mozzarelline»;
  26,50 €): identico dopo `visibilitychange` e dopo il giro a tempo (120 s). Il riprezzo non ha cambiato niente: i
  prezzi di oggi sono quelli dell'ordine.
- C-10 (1 Margherita) non provato: stesso caso di C-7.

### 3) ↑ ↓ spenti mentre salvano

- Prima: 30 frecce, 6 spente (prima/ultima di ogni gruppo).
- ↑ su PROVA, campionato ogni 20 ms: **tutte e 30 spente** per ~240 ms, poi di nuovo 6 spente (fine a 291 ms).
- Secondo tocco dopo 60 ms: il tasto era `disabled`, **ignorato**. DB: PROVA 14, Menù 15 — un passo solo, come deve
  (L2 del giro 34: **a posto**; adesso un doppio tocco è un tocco, non due mezzi).
- ↓: PROVA 15, Menù 14, ↓ di PROVA spento, nessun errore. Le 14 vere nell'ordine relativo di prima a ogni passo.
- `rinumeraCategorie` ora salta le righe che hanno già il numero giusto: per uno spostamento scrive 2 righe, non 15.

### 4) «+ categoria» sotto Cucina

Gruppo «Cucina», **Si stampa in cucina**, **Conta come pizza: no**, App e sito sì, Totem sì. Nel DB le sei sorelle di
Cucina: 5 in cucina + Dolci «nessuna»; forno solo le Pucce (1 su 6). Il «più frequente» dà cucina / no forno, giusto.
**M2 del giro 34: a posto.** Annulla: nessuna categoria nuova.

## Difetti

Nessun grave, nessun medio nuovo.

### Lievi (nuovi)

- **L1 — Le figlie di un menù non passano dal controllo «spento».** `src/app/cassa/nuovo/page.tsx:214` guarda solo
  `r.id_prodotto` della riga padre: se si spegne la Coca 1,5 lt, il «Menu classico X2» resta con la Coca dentro e si
  invia. Dal codice, non provato (avrebbe voluto dire spegnere un prodotto vero).
- **L2 — APP-4: la cassa mostra 18,80 €, il database dice 17,90 €.** Le righe sommano 18,80 (11,90 + 2×2,20 + 2,50); il
  totale salvato è 17,90. Probabilmente l'ordine di prova è stato toccato a mano dopo `accetta_ordine_esterno`
  (che il totale lo calcola dalle righe, mig. 0006:79), ma in «Modifica» nessuno lo dice: un Salva cambierebbe il
  totale di +0,90 € senza avviso. Non viene da questo commit.

### Ancora aperti dal giro 34 (dal codice, non riprovati)

- M1 g34 — in pagina un passo, in cassa un salto (gruppo Pizze non contiguo per «Menù»): invariato.
- L1 g34 — rinumera senza transazione (`SchedaCategoria.tsx:31-39`): ora scrive meno righe, ma resta una per volta.
- L3 g34 — bozza da `sessionStorage` non controllata al caricamento (`page.tsx:208`, `riletto === 0`).
- L4 g34 — l'avviso «Tolto dalla comanda…» resta dopo aver tolto tutto a mano.
- K5 g32 — nessun elimina/spegni categoria.

## Ricontrollo del giro 34

| # | Difetto g34 | Esito |
|---|---|---|
| G1 | «Modifica» da app si svuota con «spento nel menù» falso | **a posto** (APP-4: visibilitychange ×2 e giro a tempo) |
| M2 | categoria nuova sotto Cucina col forno | **a posto** (cucina, forno no) |
| L2 | doppio tocco su ↓ perso a metà | **a posto** (frecce spente ~240 ms, secondo tocco ignorato) |
| M1, L1, L3, L4 | | aperti (vedi sopra) |

## Voti

| Cosa | Funziona | Veloce | Chiaro | Meglio di oggi | Voto |
|---|---|---|---|---|---|
| «Modifica» da app dopo la rilettura | A | A | A | A | 9 |
| «Modifica» di un ordine della cassa | A− (figlie non controllate) | A | A | A | 8,5 |
| ↑ ↓ spenti mentre salvano | A | A (0,3 s) | B (in pagina non si vede la cassa) | B+ | 8 |
| «+ categoria» sotto Cucina | A | A | A− | A | 8,5 |

**Giro: 8 su 10.** Il grave del giro 34 è chiuso: un ordine da app riaperto con «Modifica» resta intero alla rilettura
e dopo i due minuti, e gli ordini della cassa non cambiano. Frecce e categoria nuova fanno quello che dicono. Restano
lievi: le figlie dei menù fuori dal controllo, un totale di prova che non torna, e i lievi vecchi del menù.
