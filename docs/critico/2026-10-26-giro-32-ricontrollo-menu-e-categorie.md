# Giro 32 — ricontrollo del giro 31 e prima prova delle categorie (26/10/2026)

Deploy provati: `8159b3b` (correzioni giro 31) e `39e7380` (`src/app/cassa/menu/SchedaCategoria.tsx`),
**READY** sul connettore Vercel prima di cominciare (`dpl_9xi9y62ZsZ6vyUufhB4AM8EEPSbV`). Browser: Claude in
Chrome a 1288×925, sessione di Edoardo, due schede mie (`/cassa/menu` e `/cassa/nuovo`, poi `/ordina` e il
riquadro 390×844), chiuse alla fine. Database letto col connettore, solo in lettura (`tnuyeyqwoqhmgpskqtuq`).
Nessun ordine confermato: le righe battute in cassa le ho tolte con ✕. Orario: 03:58–04:12 UTC.

## Cosa ho creato, e com'è finito

| Cosa | id | Cosa ci ho fatto | Stato finale |
|---|---|---|---|
| Prodotto «PROVA critico 31 pizza» | `98c20d5f-cbe2-4b2f-abde-b4fb4900e455` | riacceso solo «In cassa»; L1 9,90 → 9,70 → 9,60 per la prova della cassa aperta | **spento** (attivo/app/sito/totem false), L1 **rimesso 9,90**, Pizze speciali, L2 10,50, L3 11,00 |
| Prodotto «PROVA critico 31 copia» | `9b0b76a4-f2d9-4836-a20a-71fd390a7849` | riacceso solo «In cassa»; spostato in Pizze speciali (prova D12), poi in «PROVA critico 32» | **spento**, rimesso in **Pizze classiche** (`ordine` 28), prezzi invariati, foto rotta di prima invariata |
| Categoria «PROVA critico 32» | `972a74b6-961a-4dcb-ab4b-5717d2fd9330` | creata con «+ categoria» in Pizze, colore #2980B9 poi #C0392B | **vuota** (0 prodotti), app/sito **false**, totem **false**; resta in anagrafica: **non c'è un tasto per cancellarla** (né per spegnerla) |
| Colore di una categoria vera | — | **non toccato**, vedi K1 | tutti i 14 colori veri come prima (Pizze classiche `#f5c518`) |

Perché non ho cambiato il colore di una categoria vera: aperta «Pizze classiche» (`#f5c518`), **nessuno dei 10
quadratini è segnato** e nemmeno «nessuno». Nessuno dei 14 colori di oggi (quelli di Velocissimo, pastello) è
fra i 10 della tavolozza: un tocco su un quadratino lo cambia per sempre e dalla scheda **non si può più
rimettere** quello di prima. Con il database in sola lettura non avrei potuto rimetterlo: ho fatto la prova
sulla categoria PROVA (stesso codice, stessa strada fino alla cassa).

## A. Ricontrollo del giro 31

| # | Difetto del giro 31 | Com'è adesso | Esito |
|---|---|---|---|
| D2 | L3 vuoto sembrava «come asporto» | segnaposto **«vuoto = non va»** e una nota sotto i prezzi | **a posto** (la nota dice «(e non sotto «In cassa» spento)»: si capisce a fatica) |
| D3 | cassa aperta vende al prezzo vecchio | `/cassa/nuovo` aperta, L1 9,90 → 9,70: con l'evento di ritorno in primo piano il tasto passa a **9,70 €** in 2,5 s; poi 9,70 → 9,60 salvato alle 04:00:59, **senza toccare niente** il tasto dice 9,60 alle 04:02:03 (giro dei 2 minuti) | **mezzo a posto**: vedi K2 |
| D4 | Copia porta online foto e descrizione | Copia della Diavola: «Copia di un prodotto», **foto vuota**, solo «In cassa» acceso (app e totem spenti) | **a posto**; la **descrizione** della Diavola resta copiata (lieve, L5) |
| D5 | tocco sul fondo chiude la scheda | clic sul velo grigio: la scheda resta aperta | **a posto** |
| D8 | «è già in cassa» dopo averlo spento | «**salvato e spento**: non si vende da nessuna parte.» | **a posto** |
| D9 | foto rotta senza avviso | indirizzo che dà 404 (`…/non-esiste-critico32.jpg`): in 2,5 s «Questa foto non si apre: controlla l'indirizzo…» | **a posto**; con `https://esempio.invalid/…` (host che non risponde) dopo 5 s ancora niente (`complete` false): l'avviso arriva solo se il browser dà errore |
| D10 | prezzi strani | «-5» → «Il prezzo d'asporto non va: … (niente lettere né segno meno)»; L3 «abc» → «Il prezzo piattaforme non va…»: **dice quale** | **mezzo a posto**: **0 € e 85 € passano ancora** (`SchedaProdotto.tsx:36-41`, nessun tetto, nessun «sicuro?») |
| D11 | codice doppio sensibile alle maiuscole | `p01` → «Il codice p01 è già di «Margherita»» | **a posto** nel browser (nel database ancora nessun indice unico) |
| D12 | cambiando categoria l'`ordine` restava | PROVA copia da Pizze classiche a Pizze speciali: `ordine` 29 (ultimo era 28) | **a posto** |
| D13 | messaggio verde fuori schermo; errore vecchio resta | il messaggio ora è fisso in basso e si vede; l'errore sparisce toccando nome, categoria, spunte… | **mezzo a posto**: **correggendo un prezzo l'errore resta** (scritto 9,90 dopo «-5»: «Il prezzo d'asporto non va» ancora lì). I tre campi prezzo usano `setL1/L2/L3`, non `cambia` (`SchedaProdotto.tsx:120-122`) |
| D14 | pagina bianca senza «Carico…» | nel codice c'è «Carico il menù…» (`page.tsx`); a vista non colto (carica in fretta) | a posto dal codice |
| D1, D6, D7, D15–D17 | non toccati da questi commit | — | aperti |

## B. Categorie — voto C+ (6,5/10)

Cosa ho fatto e cosa è successo:

- **Il nome della categoria apre la scheda**: sì, il nome è un pulsante (con il pallino del colore) e apre
  «Modifica categoria»: nome, gruppo, 10 colori + «nessuno», comanda (cucina / cassa / non si stampa),
  «Conta come pizza nei quarti d'ora», «App e sito», «Totem». Chiara, una schermata sola.
- **«+ categoria» nel gruppo Pizze**: gruppo già scelto, «Nuova categoria», tutto acceso (app, sito, totem,
  cucina, forno). Salvata in ~1 s; nel database `ordine` 14, colore `#2980B9`, `id_gruppo` Pizze, 0 gruppi di
  varianti. Nella pagina compare subito in fondo a Pizze, vuota, senza «nessun prodotto» scritto.
- **Errori**: nome vuoto e nome «   » → «Scrivi il nome della categoria.»; gruppo «Scegli…» → «Scegli il gruppo
  (Pizze, Cucina, Bere…).» (il gruppo si chiama **Bar**, non «Bere»).
- **In cassa**: messo PROVA copia nella categoria nuova; in `/cassa/nuovo` (con la rilettura) compare la
  tessera «PROVA CRITICO 32» **in fondo, dopo Menù e dopo i vini**, non vicino alle pizze; il prodotto ha la
  striscia `#2980B9`. Cambiato il colore in `#C0392B` → dopo la rilettura la striscia della tessera è
  `#C0392B`. **Il colore arriva in cassa.** «Varianti» sul prodotto: vuoto, niente impasto né CON/SENZA (la
  scheda lo dice: «Una categoria nuova parte senza varianti»).
- **Vuota non compare**: `sito_menu()` la restituisce (le categorie si filtrano solo per `visibile_web`), ma
  `/ordina` la scarta perché non ha prodotti in vendita online: in pagina nessun «PROVA». Il totem fa lo
  stesso filtro (`src/app/totem/page.tsx:109`; `totem_menu` filtra solo `visibile_totem`): non provato a
  schermo, serve la chiave del totem. In cassa una categoria vuota non c'è (`src/lib/menu.ts:54-57`).
- **App/sito e totem via**: database `visibile_app` false, `visibile_web` false, `visibile_totem` false. Giusto.

## C. Telefono 390 px — voto B+ (8/10)

Scheda categoria dentro un riquadro 390×844: alta 795 px, **sta in una schermata**, «Annulla / Salva» visibili
senza scorrere, niente scorrimento di lato (`scrollWidth` 388). I colori vanno su due righe (6 + 4 + «nessuno»),
quadratini **40×40 px** con 8 px fra l'uno e l'altro: si prendono, ma sono sotto i 44 px che si consigliano
per un dito. Il colore scelto ha il bordo scuro: si vede, non salta all'occhio. «Conta come pizza nei quarti
d'ora (il forno)» va a capo su due righe.

## Difetti nuovi, in ordine di gravità

### Medi

- **K1 — Aprire una categoria vera e toccare un colore cancella il colore di Velocissimo per sempre.**
  `SchedaCategoria.tsx:19` ha 10 colori fissi; nessuno dei 14 colori veri ci sta (`#f5c518`, `#4dd0c4`,
  `#8ed0f5`…), quindi la scheda li mostra come «niente scelto» (`:74-77`) e non c'è modo di tornare indietro
  (né un quadratino «quello di adesso», né un campo libero). In più i 10 sono scuri e saturi accanto ai pastello
  di oggi: la prima categoria ricolorata stonerà con le altre 13. Basta un quadratino in più col colore attuale.
- **K2 — La cassa aperta rilegge i tasti, ma la comanda tiene il prezzo vecchio anche per le pizze battute
  DOPO.** Battuta una PROVA a 9,70, cambiato il prezzo a 9,60: il tasto dice **9,60 €**, ma un secondo tocco
  sullo stesso tasto fa **«2× PROVA critico 31 pizza 19,40 €»** (cioè 9,70 l'una). `aggiungiRiga`
  (`src/lib/menu.ts:132-135`) somma alla riga con la stessa chiave e tiene il suo `prezzo_unit`; e
  `ordine_da_cassa` prende il prezzo dal browser. Il cassiere vede 9,60 sul tasto e incassa 9,70. Allo stesso
  modo, un prodotto spento resta nelle righe già battute e si può inviare. Raro (solo se il prezzo cambia
  mentre si batte quella comanda), ma è soldi.
- **K3 — «+ categoria» parte sempre come pizza.** `categoriaVuota` (`SchedaCategoria.tsx:13-16`) mette
  `destinazione: "cucina"` e `impegna_forno: true` qualunque sia il gruppo: una categoria nuova creata sotto
  **Bar** («Amari», «Cocktail») stampa in cucina e **mangia posti del forno nei quarti d'ora** finché qualcuno
  non toglie la spunta. Il default dovrebbe seguire il gruppo (Bar → cassa, niente forno).
- **K4 — Una categoria nuova finisce in fondo a tutto, e non si sposta.** L'`ordine` è il massimo di **tutte**
  le categorie + 1 (`SchedaCategoria.tsx:40-42`), e `/cassa/nuovo` mette le tessere in quell'ordine senza
  badare al gruppo: «Pizze d'autunno» nasce dopo «La nostra cantina» e «Menù», lontana dalle pizze. Nella
  scheda non c'è un modo per spostarla (né su/giù, né trascinare).
- **K5 — Non si cancella né si spegne una categoria.** La scheda non ha «Elimina» e non ha «spenta»; l'unico
  modo per toglierla di mezzo è svuotarla (in cassa sparisce perché vuota). Una categoria di prova o sbagliata
  resta per sempre nel menù a tendina dei prodotti («Pizze · PROVA critico 32») e nella pagina del menù.

### Lievi

- **L1** — Correggere un prezzo non toglie l'errore (`SchedaProdotto.tsx:120-122`, `setL1/2/3` invece di
  `cambia`): dopo «-5» → «9,90» resta scritto «Il prezzo d'asporto non va».
- **L2** — 0 € e 85 € passano ancora senza domanda (`SchedaProdotto.tsx:36-41`); il commento a riga 35 dice
  ancora «per L2 e L3: vale quello d'asporto», che per L3 non è più vero.
- **L3** — «Scegli il gruppo (Pizze, Cucina, **Bere**…)» (`SchedaCategoria.tsx:36`): il gruppo si chiama Bar.
- **L4** — Una categoria con app/sito spento **nasconde online anche i prodotti che hanno «App e sito» acceso**
  (`/ordina` mostra solo le categorie della lista), e la scheda del prodotto non lo dice: «App e sito» spuntato
  ma non si vede. Una riga nella scheda prodotto («la categoria X non è sull'app») basta.
- **L5** — La Copia porta ancora la **descrizione** dell'altra pizza (la foto no): quando la si accende su app
  e totem, se nessuno la cambia, esce con gli ingredienti della Diavola.
- **L6** — La nota sotto i prezzi «(e non sotto «In cassa» spento)» non si capisce; e intanto D1 resta: un
  prodotto «solo cassa» con L3 va sulle piattaforme.
- **L7** — Quadratini dei colori 40×40 px al telefono (sotto i 44 consigliati); il colore scelto si distingue
  solo dal bordo.
- **L8** — Foto con host che non risponde: nessun avviso (l'avviso c'è solo se il browser dà errore).

## Voti

| Cosa | Funziona | Veloce | Chiaro | Meglio di oggi | Voto |
|---|---|---|---|---|---|
| Ricontrollo giro 31 | B+ (8 su 10 a posto, 3 a metà) | A | B+ | A | 8 |
| Cassa aperta che rilegge | B− (tasti sì, righe no: K2) | B (fino a 2 min) | B | B | 7 |
| Scheda categoria | C+ (colori veri persi, default da pizza, niente ordine né elimina) | A | B | B (Velocissimo ha i colori liberi) | 6,5 |
| Categoria nuova vuota online | A (non compare) | — | B | A | 8,5 |
| Telefono 390 | B+ | A | B+ | — | 8 |

**Giro: 7,5 su 10.** Il giro 31 è quasi tutto chiuso, e bene (il velo, la copia, il messaggio, il codice, la
cassa che rilegge). La scheda delle categorie fa il suo lavoro per una categoria nuova, ma sulle 14 vere è
pericolosa: il primo tocco su un colore butta via quello di Velocissimo senza ritorno (K1). E la cassa aperta
adesso mostra il prezzo nuovo sul tasto ma può ancora incassare quello vecchio (K2).
