# Giro 31 — l'editor del menù e l'anteprima per Deliverect (26/10/2026)

Deploy provati: `52044be` (editor: «+ Nuovo prodotto», «+ prodotto», «Copia», scheda) e `ff7a0f3`
(`/cassa/menu/deliverect`), entrambi READY sul connettore Vercel prima di cominciare. Browser: Claude in
Chrome a 1288×925, sessione di Edoardo; il telefono provato con la pagina dentro un riquadro di 390×844.
Database letto col connettore, solo in lettura (`tnuyeyqwoqhmgpskqtuq`). Nessun ordine confermato.

Il metro: nel back-office Velocissimo un prodotto sono **otto schede** (Generali, Upsell, Cross sell,
Limiti e orari, Menu, Composizione, Ricetta, Totem) e poi va **messo a mano** nella pagina catalogo
perché compaia in app (REA 23.2).

## Cosa ho creato, e com'è finito

| Cosa | id | Dettaglio | Stato finale |
|---|---|---|---|
| Prodotto «PROVA critico 31 pizza» | `98c20d5f-cbe2-4b2f-abde-b4fb4900e455` | nato in Pizze classiche, L1 9,50 · L2 10,50 · L3 11,00, solo cassa; poi spostato in Pizze speciali con L1 9,90 | **spento** dalla scheda: `attivo` false, app/sito/totem false |
| Prodotto «PROVA critico 31 copia» | `9b0b76a4-f2d9-4836-a20a-71fd390a7849` | copia della Diavola (L1 8,40 · L2 9,50 · L3 8,90), solo cassa, foto rotta `https://esempio.invalid/foto-rotta.jpg` | **spento** dalla scheda: `attivo` false, app/sito/totem false |

Dopo lo spegnimento `/cassa/menu/deliverect` torna a 136 prodotti (0 dal nostro id). Le due righe
restano in anagrafica sotto «Spenti» delle loro categorie (non si cancellano dalla pagina).

## 1. Nuovo prodotto — voto A− (8,5/10)

Cosa ho fatto: «+ prodotto» su Pizze classiche → nome → L1, L2, L3 → tolte «App e sito» e «Totem» →
**doppio clic** su «Aggiungi al menù».

- **Tocchi: 7 tocchi e 4 scritture**, una scheda sola; la categoria è già scelta da «+ prodotto». Il
  salvataggio risponde in ~0,2 s. Contro le otto schede di Velocissimo più il catalogo a mano: molto
  meglio.
- Database: **una riga sola** (il doppio clic non ne crea due), prezzi 9,50/10,50/11,00, `ordine` 28
  (in coda: l'ultimo della categoria era 27, spenti compresi), IVA 10, app/sito/totem false.
- `/cassa/nuovo` (ricaricata): il tasto c'è, «PROVA CRITICO 31 PIZZA 9,50 €», in fondo a Pizze classiche.
  Varianti: i cinque gruppi della categoria (Impasto, Latticini, Salumi e pesce, Spezie e altro,
  Verdure), CON/SENZA, «Impasto alto +1,00 €». Al banco 9,50 €, al tavolo **10,50 €**. Riga tolta, niente
  inviato.
- `sito_menu()` non lo contiene (solo cassa): giusto.

## 2. Copia — voto C+ (6,5/10)

Cosa ho fatto: «Copia» su La diavola.

La scheda si apre come «Copia di un prodotto» con: nome «La diavola (copia)», categoria, i tre prezzi,
**descrizione** («La nostra margherita con spianata calabrese piccante»), **foto della Diavola**, IVA,
e **tutte e tre le spunte accese** (cassa, app e sito, totem). Il **codice si svuota** (giusto: niente PLU
doppio). Non copia `incluso` né le scelte di un menu combo (vedi D6). Salvata come «PROVA critico 31
copia», solo cassa.

## 3. Errori — voto B (7,5/10)

| Provato | Risposta |
|---|---|
| L1 vuoto, «abc», «-5», «1.234,50» | «Scrivi il prezzo d'asporto (es. 8,50).» (anche per il negativo) |
| L2 «abc» | «Un prezzo non è un numero: scrivilo come 8,50 o lascialo vuoto.» |
| nome «   » | «Scrivi il nome del prodotto.» |
| codice `P01` (della vecchia «Margherita», spenta) | «Il codice P01 è già di «Margherita»: due prodotti non possono avere lo stesso codice.» |
| codice `p01` | passa (il controllo distingue maiuscole) |
| foto `https://esempio.invalid/foto-rotta.jpg` | salvata senza un avviso; l'anteprima ha continuato a mostrare **la foto della Diavola** (immagine nuova mai caricata, `complete` false dopo 5 s) |
| doppio clic su Salva | una riga sola |

Dal codice (non salvato per non sporcare): **«0» e «85»** passano senza domande (`leggiEuro` accetta
`n >= 0`, nessun tetto), quindi una pizza a 0 € o a 85 € per una virgola dimenticata entra in cassa.

## 4. Cambiare un prodotto — voto C (6/10)

Cosa ho fatto: con `/cassa/nuovo` aperta in un'altra scheda, sul PROVA L1 9,50 → 9,90 e categoria →
Pizze speciali. Salvato in 207 ms, il database ha 9,90 e Pizze speciali.

- **La cassa aperta non lo vede**: dopo 8 s e più resta «PROVA critico 31 pizza» in Pizze classiche al
  prezzo vecchio. Solo **dopo la ricarica** compare in Pizze speciali a 9,90 €.
- `ordine` resta 28 cambiando categoria (qui per caso è in coda: in Pizze speciali l'ultimo era 24).

## 5. /cassa/menu/deliverect — voto B− (7/10)

- Si legge: una frase («Andrebbero su Deliverect 138 prodotti in 13 categorie…»), «Da guardare» con i
  due accesi senza L3 (Puccia broccoletti affumicati, La salmone) e i 18 senza foto, categorie chiuse col
  numero, «Restano fuori» in fondo.
- **I numeri tornano**: nel database 136 accesi con `prezzo_piattaforme`, più i 2 PROVA = 138; la pagina
  dice 138 (136 PLU da Velocissimo, 2 «dal nostro id»). Dopo lo spegnimento: 136.
- **I PROVA compaiono** (attivi + L3): `N-98c20d5f` 1100 e `N-9b0b76a4` 890, con i cinque gruppi della
  categoria. Ma erano «solo cassa» (vedi D1).
- JSON (letto intercettando il tasto, senza scaricarlo: `menu-deliverect-anteprima.json`, 131 KB): 325
  articoli, 138 prodotti (tipo 1), 144 varianti (tipo 2), 43 gruppi (tipo 3); **nessun PLU doppio**;
  tasse tutte **10000**; prezzi **interi in centesimi**; ogni `subProducts` punta a un PLU che esiste;
  nessun gruppo vuoto. `accountId`/`locationId` «DA-DELIVERECT».
- **Menu combo**: sette (Menu puccia 7,90, Classico X1 12,00 / X2 22,00 / X3 30,00, Speciale X1 14,00 /
  X2 24,00 / X3 35,00). X1 = `V210` a 1200 (L3 12,00 come nel REA 23.1 punto 5) con due gruppi: «Scegli la
  pizza o la puccia» (min 1, max 1, 38 scelte a 0 €) e «Scegli la bibita» (min 1, max 1, 7 scelte). Le
  scelte dentro il menu sono tipo 2 **senza gruppi propri** e il prodotto **non ha descrizione** (vedi D6).

## 6. Telefono (390 px) — voto B (7,5/10)

- Nessuno scorrimento di lato (`scrollWidth` 388). La scheda è alta 1088 px (1,3 schermate), i tre prezzi
  uno sotto l'altro; «Annulla / Aggiungi al menù» restano attaccati in fondo (sticky): bene.
- «In cassa» va a capo («In / cassa») accanto alla nota piccola. Nella lista, ogni riga ha «Esaurito
  stasera» sulla seconda riga; il nome che apre la scheda si riconosce solo dalla sottolineatura a
  puntini.
- **Tocco sul fondo grigio = scheda chiusa e testo perso** (provato: nome scritto, tocco sul velo,
  «CHIUSA»). A 390 px il fondo è la striscia di 16 px ai lati.

## Difetti

### Medi (da sistemare prima di usarlo davvero)

- **D1 — «Solo cassa» va lo stesso su Glovo, Deliveroo e Just Eat.** In «Dove si vende» non c'è la
  spunta «Piattaforme»: sulle piattaforme va tutto ciò che è acceso e ha L3
  (`src/lib/deliverect/menu.ts:51-53`). I due PROVA, salvati senza app, sito e totem, erano nell'anteprima
  (138). Il REA 23.5 punto 4 lo prevede già (`visibile_piattaforme`): finché non c'è, la scheda dovrebbe
  almeno dirlo accanto a L3.
- **D2 — L3 vuoto: la scheda dice una cosa, Deliverect ne fa un'altra.** Il campo Piattaforme ha come
  segnaposto il prezzo L1 (`SchedaProdotto.tsx:117`), come L2 dove «vuoto = come asporto»; ma L3 vuoto
  vuol dire **fuori dalle piattaforme** (`menu.ts:51-53`), e il REA 23.4 scrive «L3 × 100, se vuoto
  `prezzo`». Chi lascia L3 vuoto pensando «come asporto» toglie il prodotto da Glovo senza saperlo (oggi
  Puccia broccoletti affumicati e La salmone).
- **D3 — Una cassa aperta vende al prezzo vecchio.** Il menù di `/cassa/nuovo` si legge una volta sola
  (`src/lib/menu.ts:43-46`, niente realtime né rilettura); `ordine_da_cassa` prende `prezzo_unit` dal
  browser (`supabase/migrations/0037_serata_giro_10.sql:72`). Cambiato a 9,90 € → la cassa aperta
  vendeva ancora a 9,50 € (e un prodotto spento resterebbe vendibile) fino alla ricarica. La scheda dice
  «è già in cassa», che per una cassa aperta non è vero.
- **D4 — «Copia» porta online la foto e la descrizione di un'altra pizza.** `page.tsx:135` copia tutto
  tranne codice e id, con cassa+app+totem accesi. Tre tocchi (Copia, nome, Salva) mettono su app, sito e
  totem una pizza nuova con foto e ingredienti della Diavola. Meglio: foto e descrizione vuote (o
  evidenziate «da cambiare») e app/totem spenti finché non si controlla.
- **D5 — Tocco sul fondo chiude la scheda e butta via tutto** (`SchedaProdotto.tsx:98`, `onClick={onChiudi}`
  sul velo), senza «Sicuro?». Al telefono il fondo è la striscia ai lati.
- **D6 — Menu combo su Deliverect più poveri della cassa.** Le scelte dentro il menu sono varianti
  semplici (`menu.ts:103`): una pizza scelta nel Menu classico non può avere impasto alto o «senza»,
  mentre in cassa le figlie hanno i loro extra. E `incluso` («1 supplì, 1 crocchetta, 3 mozzarelline»)
  non va in `description`: su Glovo il Menu classico X1 non dice cosa c'è dentro. Il codice dice «da
  provare in staging»: va scritto come limite nella pagina.
- **D7 — I PLU non combaciano con niente di quello che c'è oggi.** `pluProdotto` manda `V210`
  (`menu.ts:45`): se Deliverect oggi usa l'id di Velocissimo (210) o il codice (C001, 142…), `V210` non è
  né l'uno né l'altro e tutto il menù arriverebbe come prodotti nuovi. In più il webhook
  `src/app/api/deliverect/ordine/route.ts:79-80` usa solo `name`, non il PLU: gli ordini in arrivo non si
  legano al prodotto. La domanda del REA 23.4 («quale PLU usa oggi Deliverect») decide anche il prefisso.

### Lievi

- **D8** — Dopo aver **spento** un prodotto il messaggio dice «salvato: è già in cassa.»
  (`page.tsx:80`): falso, è fuori da tutto.
- **D9** — Foto rotta salvata senza avviso; l'anteprima ha mostrato per più di 5 s la foto vecchia
  (`SchedaProdotto.tsx:135`: nessun `onError`). Un controllo «la foto non si apre» al salvataggio basta.
- **D10** — Prezzi strani accettati: 0 € e 85 € (virgola dimenticata) passano senza domanda
  (`SchedaProdotto.tsx:36-41`); «-5» risponde «Scrivi il prezzo», non «non può essere negativo»; l'errore
  non dice quale dei tre prezzi.
- **D11** — Codice doppio solo nel browser e sensibile alle maiuscole: `p01` passa accanto a `P01`
  (`SchedaProdotto.tsx:73`, `.eq`); nel database non c'è un indice unico su `codice`.
- **D12** — Cambiando categoria l'`ordine` resta quello vecchio (`SchedaProdotto.tsx:76-81` lo ricalcola
  solo per i nuovi): in una categoria con numeri più alti il prodotto finisce in mezzo.
- **D13** — Dopo il salvataggio la pagina scorre al prodotto e il messaggio verde, che sta in cima, resta
  fuori schermo. L'errore vecchio resta scritto finché non si risalva (nome corretto, «Scrivi il nome»
  ancora lì).
- **D14** — `/cassa/menu` resta bianca ~0,7 s senza «Carico…» (la pagina Deliverect ce l'ha).
- **D15** — IVA solo 10/4/22: un prodotto con un'altra aliquota nel database si apre mostrando un valore
  sbagliato. Le varianti su Deliverect hanno tassa fissa 10000 (`menu.ts:89`) anche dentro birre e vini:
  da chiedere al commercialista se l'alcol a domicilio resta al 10%.
- **D16** — Pagina Deliverect: «2 gruppi» senza dire quali, e nessun confronto con L1 (X1 13,00 in
  negozio, 12,00 sulle piattaforme: è la cosa che Edoardo vorrebbe vedere a colpo d'occhio).
- **D17 (da guardare)** — `prodotto_write` vale per `e_staff()`, che comprende il ruolo `totem`
  (`supabase/migrations/0002_auth_rls_realtime.sql:30-33`): la sessione del totem in negozio, con la
  chiave anon, può riscrivere prezzi e prodotti. Non nuovo, ma adesso c'è un editor che lo rende facile.

## Voti

| Pagina | Funziona | Veloce | Chiaro | Meglio di oggi | Voto |
|---|---|---|---|---|---|
| Nuovo prodotto | A | A | B+ | A (1 scheda contro 8) | 8,5 |
| Copia | B− | A | C | A− | 6,5 |
| Errori | B+ | A | B | B | 7,5 |
| Cambiare un prodotto | C (cassa aperta non vede) | A | B | B | 6 |
| Anteprima Deliverect | B− | A | B | A (Velocissimo non sincronizza i combo) | 7 |
| Telefono 390 | B | B | B | — | 7,5 |

**Giro: 7,5 su 10.** La scheda fa davvero quello che Edoardo chiedeva (un prodotto nuovo in cassa in
mezzo minuto); i problemi sono intorno: dove va il prodotto (piattaforme senza volerlo, foto di un altro
con la copia) e chi lo vede subito (la cassa aperta no).
