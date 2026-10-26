# Giro 37 — ricontrollo della sera: ordini Deliverect coi codici di Velocissimo, M7, Cerca nel menù (26/10/2026)

Commit provati: `23fbeab` (ordini Deliverect: codici Velocissimo, rimozioni, menu, 409, totale; cassa M7; autofocus)
e `4be2ab5` (Cerca in `/cassa/menu`). Sul connettore Vercel tutti e due **READY** in produzione
(`dpl_7C3puKhWhJG5CzxvL8L2YmAz54gx` e `dpl_5zgCckUu1F8mSz34xEMVzi9S5fAE`, il secondo è quello servito). Orario ~18:42–18:48 UTC.

**Regole, rispettate:** nessuna scrittura nel database, nemmeno dalle pagine (due schede aperte e chiuse con
**Annulla**, nessun Esaurito, nessuna freccia, nessuna Copia), nessun ordine, nessuna utenza. Supabase
`tnuyeyqwoqhmgpskqtuq` solo SELECT. Browser: Claude in Chrome, sessione di Edoardo, una scheda mia chiusa alla
fine; la pagina a 1280×713 e, per i 390, la stessa pagina in un iframe da 390×844. Lo script del commit l'ho lanciato
com'è; i casi nuovi stanno in `casi.mts` nello scratchpad (`g37/`), non nel repo. Dopo: 0 ordini nelle ultime 2
ore, 15 categorie, 0 esauriti.

## 1. Ordini Deliverect (`23fbeab`)

`npx --yes tsx scripts/prova-deliverect-ordine.mts` → «ok». Ma lo script, come al giro 36, mette nel catalogo una cosa
che nel DB non c'è: **`La finocchiona` spenta** (riga 9). Nel database è **accesa** (`598103d1…`, id Velocissimo 260,
categoria Novità).

### La prova sui codici, col catalogo vero

Ho rifatto in SQL (sola lettura) la stessa regola di `perPlu` (`ordine.ts:61-64`: i prodotti col codice della tabella
`CODICI_VELOCISSIMO`, vince il primo acceso) per **tutti i 138 prodotti accesi**, coi codici di
`docs/rea/dati/codici_prodotti_velocissimo.csv` (168 righe), e l'ho confermata facendo girare `traduciArticoli` vero
sulle righe vere.

| Esito | Prodotti accesi |
|---|---|
| Il codice porta al prodotto giusto | **131** |
| Il codice porta a **un altro** prodotto | **2** |
| Nessun codice nel CSV | **5** |
| Totale | 138 |

- **Sbagliati (2):**
  - **`142` → La finocchiona invece di L'arrabbiata.** Il codice 142 è di 260 (finocchiona) e 264 (arrabbiata), tutti
    e due accesi da noi: vince il primo della lista, 260. È **proprio l'esempio del commit** («142 porta all'id 264»).
  - **`C072` → Barattolo variegato nutella invece di Cheesecake al pistacchio** (170 e 269, accesi tutti e due).
- **Senza codice (5):** i vini Arpione (276), Balestrone (277), Battifreddo (278), Armabianca (279), Torriero (280):
  non sono nel CSV. Se arrivano da Glovo vanno per nome; se il nome non torna entrano come sconosciuti **con
  destinazione «cucina»** (`ordine.ts:105`, il ripiego), cioè stampati in cucina.
- Codici doppi che vanno bene solo per caso: `11` (204 Menu puccia, 207 non c'è da noi), `24` (210 Menu classico X1 e
  sei id 216–221 che da noi non ci sono). Se uno di quelli venisse importato, `24` andrebbe al primo acceso.

### Ricontrollo dei difetti del giro 36

| | Giro 36 | Oggi |
|---|---|---|
| G1 | il PLU 142 non si riconosceva | **Mezzo chiuso:** 131 su 138 giusti. Ma 142 va alla finocchiona (sopra): il caso che il commit cita è sbagliato. Il criterio «vince l'acceso» non basta quando sono accesi tutti e due; la tabella deve dire **quale** id (il CSV non lo dice: serve chiedere a Edoardo o leggere il menù di Deliverect) |
| G2 | ordine non preso → 200 OK | **Chiuso nel senso stretto, ma 409 non è la risposta giusta** (sotto) |
| M1 | nome a caso fra acceso e spento | **Chiuso:** gli accesi prima (`ordine.ts:41`); provato con «Chips di patate» e «L'arrabbiata» doppi |
| M2 | rimozione → aggiunta | **Chiuso** per `modifierAction` NO/REMOVE. Nuovo lieve: il nome vince sull'azione (L1 sotto) |
| M3 | il gruppo P-/G- rompeva i menu | **Chiuso:** il gruppo si apre e la quantità si moltiplica (`ordine.ts:74-75`) |
| M4 | pizza del menu con extra → variante | **Chiuso** per i nomi normali; **riaperto** per i nomi che sono anche varianti (M-a sotto) |
| M5 | extra col nome di un prodotto → riga | **Chiuso** fuori dai menu |
| M6 | totale mai confrontato | **Chiuso in parte:** se non torna la nota lo scrive (`route.ts:91-96`). Mancano `bagFee` e il salvataggio di sconto e consegna nei campi dell'ordine (`sconto`, `costo_consegna`) |
| M7 | avviso «Tolto» cancellato subito | **Chiuso** (sezione 2) |

### Il 409: cosa fa Deliverect

La documentazione pubblica dice:

- l'ordine si considera ricevuto con **200 o 201 entro 30 secondi** ([Order Notification](https://developers.deliverect.com/reference/post-orders-webhook));
- **si riprova solo** se la connessione non si apre in 3 s o se la risposta è **502, 503 o 504**: fino a 6 tentativi,
  poi l'ordine è segnato fallito ([How POS Order Failover works](https://developers.deliverect.com/v1.1-restaurants/docs/pos-orders),
  [schema del failover](https://developers.deliverect.com/page/pos-order-webhook-failover-flow));
- un 409 quindi **non si riprova**: l'ordine finisce «fallito» nel pannello di Deliverect, dove qualcuno deve
  aprirlo, leggere il motivo e premere **Retry Order** a mano ([help: Retry an order](https://help.deliverect.com/en/articles/7979019-retry-an-order)).
  Che cosa succede su Glovo (annullato o lasciato accettato) la documentazione non lo dice.

È meglio del 200 di prima (almeno da qualche parte risulta fallito), ma **non è la risposta giusta per «pieno» e
«fuori orario»**: un ordine di Glovo è già pagato, il pannello di Deliverect di sera non lo guarda nessuno, e un
Retry fatto dieci minuti dopo nella stessa fascia piena torna 409. Per `pieno` l'ordine va **messo in cassa lo
stesso** e segnalato (la fascia si sfora, lo decide la cassa); il 409 va tenuto per i casi in cui davvero non si può
registrare (`errore`, nessuna riga). E se la scelta resta il 409, va detto in cassa: oggi nessuno in negozio vede che
un ordine è stato respinto (`route.ts:113-115`, nessuna traccia nel DB).

### Difetti nuovi

**G-1 — Il PLU `142` (l'esempio del commit) diventa La finocchiona; `C072` diventa il barattolo di nutella**
(`ordine.ts:62-64`, `codici-velocissimo.ts`: `"142": [260, 264]`, `"c072": [170, 269]`). Caso A e B di `casi.mts`. Lo
script del commit passa solo perché spegne a mano la finocchiona (`prova-deliverect-ordine.mts:9`). In cucina esce
un'altra pizza; la Cheesecake esce come barattolo.

**M-a — Nel menu, una scelta che si chiama come una variante diventa una variante** (`ordine.ts:93`: `eFiglia` vuole
`!variazioneDi(s)`, e `variazioneDi` ripiega sul **nome**, riga 70). Nel DB «Chips di patate» e «Ciauscolo» sono
prodotti accesi **e** varianti. Caso C: «Menu classico X1» con Margherita, **Chips di patate** e Coca → la Chips
esce come variante del menu (niente riga, niente friggitrice). Caso D: «Menu speciale X1» con la pizza
**Ciauscolo** → nessuna riga figlia, la pizza è un «+ Ciauscolo» del menu e non conta nel forno. Rimedio: se il
PLU porta a un prodotto, è quello; il nome della variante solo quando il PLU non dice niente.

**M-b — 409 su «pieno»/«fuori orario»** (sopra): l'ordine pagato si ferma in Deliverect, non arriva in cassa e
nessuno lo vede.

**L1 — Il nome vince sull'azione** (`ordine.ts:34`): un modificatore «No lattosio» con `modifierAction: "ADD"` e 1 €
diventa la rimozione «lattosio» da 1 € (caso H). Raro, ma `modifierAction` quando c'è dovrebbe decidere lui.

**L2 — Extra dentro un extra non si moltiplicano** (`ordine.ts:83`): Margherita 8,50 + 2× bufala 2,00 con dentro
origano 0,50 → 13,00 invece di 13,50 (caso F). La nota «TOTALE DIVERSO» lo farà vedere, almeno.

**L3 — Lo sconosciuto va in cucina** (`ordine.ts:105`): un vino che non si riconosce si stampa al forno.

**L4 — `bagFee` non entra nel conto del totale** (`route.ts:92`): con un sacchetto a pagamento ogni ordine avrà la
nota «TOTALE DIVERSO». Sconto e consegna restano solo nella nota, non nei campi dell'ordine.

Già aperti dal giro 36, non toccati: annullo (`status` 100) ignorato (`route.ts:65`), capacità che non moltiplica le
figlie per il padre (`accetta_ordine_esterno`).

## 2. Cassa — M7 (`src/app/cassa/nuovo/page.tsx:216, 222-229, 238`)

Letto il codice, nessun ordine battuto. Il controllo (bozza all'apertura e rilettura dei due minuti) alza
`toltiDaSolo` quando toglie righe; l'effetto su `righe.length` lo consuma e **non** cancella l'avviso. Se a svuotare
è il cassiere (✕ o Svuota), il flag è giù e l'avviso sparisce come voleva il giro 34. Con StrictMode il setter gira
due volte ma alza lo stesso flag: va bene. **M7 chiuso.**

**L5 (nuovo, lieve)** — l'avviso «Tolto dalla comanda…» ora resta finché non si invia o si svuota, anche mentre si
batte una comanda nuova. E finché c'è un `errore`, gli avvisi delle righe 818 e 821 sono nascosti (`!errore && …`):
a domicilio non compare «Serve l'indirizzo di consegna» / «Fuori dalle zone» / «Minimo d'ordine». Il blocco
arriva comunque all'invio, ma il cassiere lo scopre lì. Rimedio: cancellare «Tolto…» al primo tocco che aggiunge
una riga.

L5 e L6 del giro 36 (ordine di arrivo menù/ordine con «Modifica», figlie dei menu non controllate) restano come erano.

## 3. Il Cerca di /cassa/menu (`4be2ab5`)

### Le prove

| Cosa scrivo | 1280 | 390 |
|---|---|---|
| «marg» | Trovati 8: 4 accesi in testa, 4 spenti barrati sotto | uguale, risultati subito sotto il campo |
| «diav» | 2: La diavola, Diavola (spenta) | uguale |
| un codice: «P01» / «p01» | 1: Margherita (spenta) | — |
| un codice: «P03» | — | 1: Diavola (spenta) |
| «C050», «142», «V264» | **Nessun prodotto** | — |
| «pizzaxyz», «nonce» | «Nessun prodotto con questo nome» | uguale |
| «baccala» | 2: i due scritti con l'apostrofo; **manca «Filetto di baccalà pastellato»** (acceso) | — |
| «baccalà» | 4, ma **mancano «Aglio olio e baccala'» e «Pepite di baccala'» accesi** | — |
| «suppli» | **Nessuno** («Supplì di riso» acceso c'è) | — |

Righe trovate a 390 alte 97 px come nell'elenco (con Copia ed Esaurito), quindi 8 risultati sono già una schermata.

### Difetti

**G-2 — Scorrendo, il campo Cerca copre l'indice delle categorie** (`globals.css:1208` `.me-cerca` sticky `top: 8px`,
`z-index: 5`; `.m-indice` sticky `top: 0`, `z-index: 4`, riga 916). A 1280 l'indice è alto 88 px su due righe: il
campo (8–53 px) **nasconde la riga di Pizze e Cucina**, si vedono solo «Bar · Bevande · Birre · La nostra cantina».
A 390 l'indice è alto 44 px e il campo lo **copre tutto**: scorrendo l'indice sparisce. Il giro 36 chiedeva il Cerca
«appiccicato **con** l'indice»; ora è appiccicato **sopra**. Prova: screenshot e misure con `getBoundingClientRect`
dopo `scrollTo(0, 3000)` (1280) e `4000` (390).

**M-c — Scrivendo da metà pagina i risultati compaiono in cima, fuori vista** (`page.tsx:169-175`). Il campo resta in
vista, ma i risultati sono una sezione nel flusso sotto la testata. Scorso fino alle pucce, scrivo «diav»: la pagina
**non cambia**, i risultati stanno a −2953 px. Chi usa il campo che «resta in vista» crede che non abbia trovato
niente. Rimedio: portare in cima la pagina quando si comincia a scrivere, o mostrare i risultati sotto il campo
(nello stesso blocco appiccicato).

**M-d — «nome o codice», ma il codice che si conosce non si trova** (`page.tsx:129`). Il campo cerca solo
`prodotto.codice`, che è pieno su 5 prodotti, tutti spenti (P01–P05). Né il codice di Velocissimo (C050, 142), né il
PLU che mostra `/cassa/menu/deliverect` (V264) portano a niente. O si cerca anche l'id Velocissimo/PLU, o il
segnaposto dice solo «nome».

**L6 — Accenti e apostrofi** (`page.tsx:127-129`): «suppli» non trova «Supplì», «baccala» non trova «baccalà» e
viceversa. Basta togliere accenti e apostrofi a tutti e due (`normalize("NFD")`).

**L7 — Il limite di 40 non si dice** (`page.tsx:173`): «Trovati: 46» e se ne vedono 40.

**L8 — Id doppi**: la stessa riga sta nei risultati e nella sua categoria con lo stesso `id="prod-…"` (2 per La
diavola). Lo `scrollIntoView` dopo il salvataggio va al primo, cioè ai risultati: probabilmente va bene, ma è per
caso.

### Tastiera all'apertura della scheda (`SchedaProdotto.tsx:112`, `SchedaCategoria.tsx:96`)

- 390: aperta «La tre pachino», a fuoco **BODY** → la tastiera non si apre. Chiusa con Annulla.
- 1280: aperta «La diavola» dai risultati di «diav», a fuoco il campo Nome (va bene sul PC). Chiusa con Annulla; il
  Cerca resta «diav».
- Lieve: la soglia è 700 px, quindi su un tablet in verticale (768–834 px) la tastiera si apre ancora. La regola
  giusta sarebbe «niente fuoco sul tocco» (`pointer: coarse`), non la larghezza.

## Voti

| Cosa | Funziona | Veloce | Chiaro | Meglio di oggi | Voto |
|---|---|---|---|---|---|
| Ordini Deliverect | C+ (142 e C072 sbagliati, menu con Chips/Ciauscolo, 409 su pieno) | A | B | B+ (131/138, gruppi, rimozioni, totale) | 6,5 |
| Cassa, avviso «Tolto» | A− (M7 chiuso; resta sopra la comanda nuova) | A | B+ | A | 8 |
| Cerca in /cassa/menu a 1280 | B− (copre metà indice, accenti, codici) | B (risultati fuori vista da metà pagina) | B | A− | 6,5 |
| Cerca in /cassa/menu a 390 | C+ (indice scompare tutto) | B | B | B+ | 6 |
| Scheda a 390 senza tastiera | A | A | A | A | 9 |

**Giro: 7 su 10.** Il lavoro è giusto nella direzione e ha chiuso M1, M3, M5, M7 e quasi tutto G1 (131 prodotti su 138
si riconoscono dal codice di oggi). Ma il caso-bandiera del commit, 142 → L'arrabbiata, in produzione dà **La
finocchiona**, perché lo script spegne una pizza che nel DB è accesa: la terza volta che la prova si fa su un catalogo
che non è quello vero. Il 409 non si riprova e lascia l'ordine pagato nel pannello di Deliverect, che di sera non
guarda nessuno. Il Cerca funziona, ma appiccicato sopra l'indice lo copre (a 390 tutto) e da metà pagina mostra i
risultati dove non si vedono.

## In ordine di lavoro

1. G-1: per i codici doppi (142, C072) dire nella tabella **quale** id vale (chiedere a Edoardo), e rifare lo script
   leggendo il catalogo vero, non scritto a mano.
2. G-2 + M-c: Cerca e indice nello stesso blocco appiccicato (indice sotto il campo), e risultati che si vedono.
3. M-b: «pieno» e «fuori orario» da Deliverect entrano in cassa con l'avviso; 409 solo per `errore`.
4. M-a: il PLU che porta a un prodotto vince sul nome della variante.
5. M-d, L6: cercare anche id Velocissimo/PLU e senza accenti.
6. Lievi: L1–L5, L7, L8, soglia della tastiera.

## Fonti

- [Deliverect — Order Notification (POS webhook)](https://developers.deliverect.com/reference/post-orders-webhook)
- [Deliverect — How POS Order Failover works](https://developers.deliverect.com/v1.1-restaurants/docs/pos-orders)
- [Deliverect — POS Order Webhook, Failover Flow](https://developers.deliverect.com/page/pos-order-webhook-failover-flow)
- [Deliverect — Order and Courier Statuses](https://developers.deliverect.com/page/order-status)
- [Deliverect Help — Retry an order](https://help.deliverect.com/en/articles/7979019-retry-an-order)
