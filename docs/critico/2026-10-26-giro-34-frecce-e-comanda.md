# Giro 34 — ricontrollo del commit b2e24bd: frecce che rinumerano, categoria nuova, comanda che toglie gli spenti (26/10/2026)

Deploy provato: `b2e24bd` («Menù: i difetti del critico giro 33»), **READY** sul connettore Vercel
(`dpl_C5WwpQD4vqUbMWLgbb8nkGxLBzfG`; alle prime due letture era BUILDING, alla terza READY). Browser: Claude in
Chrome, sessione di Edoardo, **una** scheda mia (`/cassa/menu`, `/cassa/nuovo`, chiusa alla fine). Database letto
col connettore, solo lettura (`tnuyeyqwoqhmgpskqtuq`). Nessun ordine inviato, nessuna modifica salvata a un ordine.
Orario ~04:20–04:35 UTC.

## Cosa ho toccato, e com'è finito

| Cosa | Cosa ci ho fatto | Stato finale |
|---|---|---|
| «PROVA critico 32» `972a74b6…` | ↑, ↑, poi ↓ due volte di fila (doppio tocco), poi ↓ | **ultima della fila, ordine 15** |
| «+ categoria» sotto Pizze | aperta, gruppo cambiato Bar → Cucina → Pizze, **Annulla** | nessuna categoria nuova (sempre 15) |
| «PROVA critico 31 pizza» `98c20d5f…` | acceso solo «In cassa», battuto 2× in cassa (+ 1 Margherita), spento da `/cassa/menu`, tornato in cassa | **spento** (attivo/app/sito/totem false), L1 **9,90**, L2 10,50, L3 11,00, `ordine` 28 |
| Ordine APP-4 `da118192…` (ricevuto) | aperto con `?modifica=`, lanciato `visibilitychange`, **uscito senza salvare** | invariato: 3 righe, stato `ricevuto` |
| Comanda di prova | righe tolte con ✕ | bozza vuota |

### Ordine delle categorie: prima / durante / dopo

Le frecce adesso rinumerano tutto da 1: i numeri cambiano tutti al primo tocco (la fila partiva da 0).

| Categoria | Gruppo | Prima | 1° ↑ | 2° ↑ | ↓↓ (doppio tocco) | ↓ | Fine |
|---|---|---|---|---|---|---|---|
| Le novità estive | Pizze | 0 | 1 | 1 | 1 | 1 | **1** |
| Novità | Pizze | 1 | 2 | 2 | 2 | 2 | **2** |
| Pizze classiche | Pizze | 2 | 3 | 3 | 3 | 3 | **3** |
| **PROVA critico 32** | Pizze | 14 | 14 | **4** | **5** | 15 | **15** |
| Pizze speciali | Pizze | 3 | 4 | 5 | 4 | 4 | **4** |
| Pucce pugliesi | Cucina | 4 | 5 | 6 | 6 | 5 | **5** |
| Fritti | Cucina | 5 | 6 | 7 | 7 | 6 | **6** |
| Burgeria | Cucina | 6 | 7 | 8 | 8 | 7 | **7** |
| Insalate | Cucina | 7 | 8 | 9 | 9 | 8 | **8** |
| Friselle | Cucina | 8 | 9 | 10 | 10 | 9 | **9** |
| Dolci | Cucina | 9 | 10 | 11 | 11 | 10 | **10** |
| Bevande | Bar | 10 | 11 | 12 | 12 | 11 | **11** |
| Birre | Bar | 11 | 12 | 13 | 13 | 12 | **12** |
| La nostra cantina | Bar | 12 | 13 | 14 | 14 | 13 | **13** |
| Menù | Pizze | 13 | 15 | 15 | 15 | 14 | **14** |

**Ordine relativo delle 14 categorie vere: intatto** a ogni passo (riletto dal database dopo ogni pressione; colori
invariati). In `/cassa/nuovo` le tessere dopo il 2° ↑ erano: Le novità estive, Novità, Pizze classiche, Pizze speciali,
Pucce pugliesi, Fritti, Insalate, Friselle, Dolci, Bevande, Birre, La nostra cantina, Menù — come prima. PROVA 32 e
Burgeria in cassa non hanno tessera perché non hanno prodotti accesi (0 su 0 e 0 su 9): **dove finisce PROVA nella fila
della cassa si vede solo dal database**.

## Le prove

### 1) ↑ ↓ su PROVA

- Spente sulla prima e sull'ultima del gruppo: **sì**. All'apertura «Le novità estive» ↑ spento, «PROVA critico 32» ↓
  spento; nei gruppi Cucina (Pucce ↑, Dolci ↓) e Bar (Bevande ↑, Cantina ↓) lo stesso. Dopo il 1° ↑ si spegne ↓ su
  «Menù», che è diventata l'ultima.
- 1° ↑: PROVA passa prima di «Menù» (14 → 14, Menù 13 → 15). In cassa **non cambia niente** di visibile: tutte e due
  restano dopo i vini.
- 2° ↑: PROVA passa prima di «Pizze speciali» (ordine 4): in cassa sarebbe la quarta tessera.
- ↓ ↓ in un colpo solo (due `click()` di fila, come un doppio tocco): **si sposta di un posto solo**, non due (vedi L2).
- ↓: PROVA dopo «Menù», ultima. Nessun errore a video.

### 2) «+ categoria» sotto Pizze, poi cambio gruppo

| Gruppo scelto | Comanda | Conta come pizza |
|---|---|---|
| Pizze (all'apertura) | Si stampa in cucina | sì |
| Bar | **Si stampa in cassa** | **no** |
| Cucina | Si stampa in cucina | **sì** (vedi M2) |
| Pizze (di nuovo) | Si stampa in cucina | sì |

Stampa e forno adesso seguono il gruppo (L1 del giro 33 **a posto**). La tavolozza ha 24 colori (14 di oggi + 10);
il rosso `#C0392B` di PROVA c'è ancora, ma perché è anche nei 10 fissi: il filtro sulle «prova» funziona (L2 g33
**a posto**). Annulla: nessuna categoria nuova.

### 3) Prodotto spento mentre è in comanda

- In cassa: PROVA 31 battuta due volte (2× 19,80 €) + 1 Margherita 7,20 → totale 27,00 €.
- Spenta da `/cassa/menu` (una scheda sola: sono uscito dalla cassa e la comanda è tornata dalla bozza).
- Al ritorno, **prima** del `visibilitychange`, la riga «PROVA critico 31 pizza 19,80 €» c'è ancora (la bozza ripresa
  non viene controllata al caricamento, vedi L3); «Invia in cucina» spento solo perché non c'era il pagamento.
- `document.dispatchEvent(new Event('visibilitychange'))` → la riga **esce**, la Margherita resta, totale **7,20 €**,
  e nel riquadro rosso: «Tolto dalla comanda perché spento nel menù: PROVA critico 31 pizza.» **M2 del giro 33 a posto.**
- Tolta anche la Margherita con ✕: l'avviso resta lì, con la comanda vuota (L4).

### 3-bis) Lo stesso controllo su un ordine riaperto con «Modifica» — il difetto grave

Il controllo nuovo toglie ogni riga il cui `id_prodotto` non è fra i prodotti accesi. Ma le righe degli ordini venuti da
fuori non hanno `id_prodotto`: `accetta_ordine_esterno` scrive solo la descrizione
(`supabase/migrations/0006_ordini_esterni.sql:68`), e «Modifica» le carica con `id_prodotto: ""`
(`src/app/cassa/nuovo/page.tsx:137`). Nel database: APP-4 (ricevuto) e C-5 (pronto) hanno tutte le righe così.

Provato su APP-4 (`/cassa/nuovo?modifica=da118192…`, nessun salvataggio):
- all'apertura: «1× Il crudo di Parma 11,90 € · 2× Supplì di riso 4,40 € · 1× Peroni 33cl 2,50 €»;
- `visibilitychange` → **la comanda si svuota** («Tocca un prodotto per iniziare la comanda.») e l'avviso dice
  «Tolto dalla comanda perché spento nel menù: Il crudo di Parma, Supplì di riso, Peroni 33cl.» — **falso**: sono
  prodotti accesi.

Succede da solo dopo 2 minuti (la rilettura a tempo) o appena il cassiere torna sulla scheda. Se poi aggiunge una
cosa e salva, la modifica riscrive l'ordine senza le righe del cliente. Database riletto dopo: APP-4 ancora con 3 righe
e `ricevuto`.

## Difetti, in ordine di gravità

### Gravi

- **G1 — «Modifica» di un ordine da app/esterno: dopo 2 minuti (o tornando sulla scheda) la comanda si svuota e dice
  «spento nel menù».** `src/app/cassa/nuovo/page.tsx:210-214`: `vivi.has(r.id_prodotto)` è falso per ogni riga con
  `id_prodotto` vuoto (righe di `accetta_ordine_esterno`, mig. 0006:68; caricate a `""` a `page.tsx:137`). Provato su
  APP-4 (sopra). Rimedio: togliere solo le righe che hanno un `id_prodotto` e quel prodotto non è più acceso; le righe
  senza prodotto non si toccano (e nemmeno si riprezzano).

### Medi

- **M1 — In pagina un passo, in cassa un salto: ↓ su «Pizze speciali» la manderebbe dopo i vini.** `page.tsx:85-92`:
  la sorella dopo «Pizze speciali» è «Menù», che sta dopo il Bar; ↓ la inserisce dopo «Menù», cioè dopo «La nostra
  cantina» (dal codice: non provato sulla vera, come chiesto). Lo stesso al contrario: il 1° ↑ di PROVA l'ha spostata
  da dopo-Menù a prima-di-Menù, cioè in cassa **niente**, e il 2° ↑ l'ha fatta saltare da dopo i vini alla quarta
  tessera. L'ordine relativo delle altre ora è salvo (giro 33 M1 **a posto**), ma chi guarda la pagina per gruppo non
  sa che ↓ su Pizze speciali la porta in fondo alla cassa. Rimedio: o una fila sola anche in pagina (le tessere come in
  cassa), o rendere contiguo il gruppo (spostare «Menù» vicino alle pizze, decisione di Edoardo), o un avviso «in cassa
  passa dopo La nostra cantina».
- **M2 — Categoria nuova sotto Cucina nasce «conta come pizza».** `SchedaCategoria.tsx:15`: il modello è la prima
  sorella del gruppo, e per Cucina è «Pucce pugliesi», l'unica delle sei col forno. Una «Antipasti» nuova toglierebbe
  posti nei quarti d'ora. Rimedio: prendere il valore più frequente fra le sorelle (Cucina: forno no).

### Lievi

- **L1** — `rinumeraCategorie` (`SchedaCategoria.tsx:24-32`) scrive una riga per volta, senza transazione: al primo
  tocco di oggi ha riscritto **tutte e 15** (partivano da 0). Se una scrittura a metà fallisce restano due categorie con
  lo stesso numero, e l'avviso è solo il messaggio grezzo di Supabase.
- **L2** — Doppio tocco su ↓ = un passo solo: i pulsanti non si spengono durante il salvataggio e il secondo `sposta`
  lavora sulla fila vecchia (`page.tsx:86`). Innocuo per l'ordine (tutti e due scrivono la stessa fila), ma il secondo
  tocco si perde.
- **L3** — La bozza ripresa da `sessionStorage` al caricamento non passa dal controllo «spento»: il controllo parte solo
  alla prima rilettura (`page.tsx:208`, `riletto === 0`). Per 2 minuti si vede (e con un pagamento scelto si potrebbe
  inviare) un prodotto spento.
- **L4** — L'avviso «Tolto dalla comanda…» resta anche dopo aver tolto tutte le righe a mano.
- **L5** — Una categoria vuota (PROVA 32) non ha tessera in cassa: chi la sposta non vede l'effetto finché non ci mette
  un prodotto. Non è un difetto, ma con M1 rende le frecce ancora più al buio.
- Aperti dai giri prima: K5 g32 (nessun elimina/spegni categoria).

## Ricontrollo del giro 33

| # | Difetto g33 | Esito |
|---|---|---|
| M1 | ↑ ↓ scambiano il numero con la sorella lontana | **a posto** per l'ordine relativo (rinumera 1…n, vere intatte); resta il salto in cassa visto qui come M1 |
| M2 | prodotto spento resta in comanda e si invia | **a posto** sulla comanda nuova; **rotto** su «Modifica» (G1) |
| M3 | categoria nuova di Pizze nasce dopo «Menù» | **a posto** dal codice (dopo la prima fila di sorelle, cioè dopo Pizze speciali); non salvata |
| L1 | cambio gruppo non rifà stampa e forno | **a posto** (Bar → cassa/no forno); vedi M2 per Cucina |
| L2 | colori delle PROVA nella tavolozza | **a posto** |
| L3 | ↑ prima / ↓ ultima non spenti | **a posto** (disabilitati, anche dopo lo spostamento) |
| L4 | riprezzo su «Modifica» | non ricontrollato; G1 lo supera |

## Voti

| Cosa | Funziona | Veloce | Chiaro | Meglio di oggi | Voto |
|---|---|---|---|---|---|
| ↑ ↓ categorie | B+ (ordine relativo salvo; salto in cassa) | A− (doppio tocco perso) | C+ (in pagina non si vede la cassa) | B | 7 |
| Categoria nuova: stampa e forno dal gruppo | B+ (Cucina col forno) | A | A− | A | 8 |
| Spento tolto dalla comanda | A− (bozza al caricamento) | B (fino a 2 min) | A | A | 8,5 |
| Lo stesso su «Modifica» | **F** (svuota l'ordine con un avviso falso) | — | D | F | 2 |

**Giro: 6,5 su 10.** Le frecce non rompono più l'ordine delle categorie vere (provato a ogni passo) e il prodotto spento
esce dalla comanda col suo avviso. Ma il controllo nuovo svuota ogni ordine da app/esterno riaperto con «Modifica» dopo
due minuti, dicendo che i prodotti sono spenti: va corretto prima di stasera.
