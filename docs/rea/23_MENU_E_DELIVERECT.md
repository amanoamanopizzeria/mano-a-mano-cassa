# REA · 23. Il menù: come lo fa Velocissimo, come lo facciamo noi, come arriva a Deliverect

*26/10/2026, su richiesta di Edoardo: «ricostruire anche la parte del menù… menu prodotti, come si
possono aggiungere… tasti al computer e prodotti sull'app in maniera veloce» e «lì c'è pure come si
interfaccia con Deliverect… come noi carichiamo un prodotto sul menu nostro e poi lo troviamo anche
caricato su Deliverect». Il back-office l'ho letto dal Chrome di Edoardo, **in sola lettura**: nessun
salvataggio. Deliverect l'ho letto sulle pagine pubbliche (fonti in fondo). Riprende `13` §13.6 e
`05` §5.3 senza ripeterli.*

## 23.1 Il menù di Velocissimo in una pagina

Un prodotto (`/product`, 177) vive in **un solo posto**. Tutto il resto sono «viste» su di lui:

| Pezzo | Cosa decide | Da noi |
|---|---|---|
| **Prodotto** | nome, codice, descrizione, foto, categoria, gruppo, prezzo nei **tre listini** L1/L2/L3, IVA, disponibile, visibile | `prodotto` (stessi campi) |
| **Categoria** (24) | le **varianti** (gruppi con min/max/gratis), il forno, i coperti, l'IVA | `categoria` + `categoria_gruppo_variazione` |
| **Gruppo di prodotti** (26) | la riga della comanda e dei report | `categoria.destinazione` + `gruppo_categoria` |
| **Pagina catalogo** (17) | una sezione del menù; **Tipo App o Pos** | le categorie, nell'ordine |
| **Catalogo** (4) | quali pagine si vedono in un canale | `visibile_app` / `visibile_web` / `visibile_totem` |

Le cose nuove viste stanotte, che in `13` non c'erano:

1. **La pagina catalogo ha il tipo «App» o «Pos»**, e il catalogo ha due liste: «Pagine catalogo APP» e
   «Pagine catalogo POS». Sono le **pagine di tasti della cassa**. Da noi **non ce n'è nessuna di tipo
   Pos**: la cassa 2Bit i tasti li tiene per conto suo sul PC, e il back-office non li comanda.
2. **Il catalogo «SOLO DELIVERECT»** (id 7, tipo App, singola pagina) ha **quattro pagine**: 79 MENU
   DELIVERECT, 80 NOVITA', 81 LA NOSTRA CANTINA, 69 DOLCI. La pagina «MENU DELIVERECT» contiene i **sei
   menu combo** (Classico e Speciale X1, X2, X3). Non è il menù che vedono Glovo e Deliveroo (vedi 23.3):
   serve a tenere i menu combo fuori dall'app.
3. **Il codice del prodotto quasi sempre è univoco, ma non del tutto.** Letti tutti i 168 prodotti
   (`dati/codici_prodotti_velocissimo.csv`): i vecchi hanno C001…C089 e PP001…PP010, i nuovi un numero
   (2…150). Doppioni: «24» su 7 prodotti (il Menu classico X1 e sei prodotti che da noi non ci sono più),
   «11» su 2, e **due doppioni tra prodotti vivi**: «142» è sia **La finocchiona** sia **L'arrabbiata**,
   «C072» è sia il **Barattolo variegato nutella** sia la **Cheesecake al pistacchio**. Tre senza codice.
   Se Deliverect usa il codice come PLU, oggi una di quelle due pizze e uno di quei due dolci sono già
   confusi sulle piattaforme (23.4). L'id del prodotto (210, 278…) è invece univoco.
4. Nome e descrizione hanno il tasto **«Genera»** con l'intelligenza artificiale.
5. Il menu combo «Menu classico X1» (id 210) ha **L1 13,00 · L2 13,00 · L3 12,00**: sulle piattaforme
   costa meno, ed è «pietanza menu analitica», non «attivatrice».

## 23.2 Aggiungere un prodotto: da loro e da noi

**Da loro**, otto schede (Generali, Upsell, Cross sell, Limiti e orari, Menu, Composizione, Ricetta,
Totem), poi il prodotto va **messo a mano** nella pagina catalogo giusta perché compaia in app; la cassa
lo riceve col tasto «scarica le configurazioni» sul PC (`09`); e **Deliverect non lo vede** finché in
Deliverect non si rifà la sincronizzazione e lo si mette nel menù (23.3).

**Da noi**, da stanotte (`/cassa/menu`, commit 52044be): **una scheda sola**: nome, categoria, prezzo
asporto / sala / piattaforme, dove si vende (cassa, app e sito, totem), descrizione, foto, codice, IVA.
Si salva e il prodotto è **subito** il tasto in cassa, la riga di `/ordina` e del totem: la categoria
porta con sé varianti, comanda e posto nel menù. «Copia» fa un prodotto simile in due tocchi (la pizza
nuova si fa copiando la più vicina e cambiando nome, prezzo e descrizione).

## 23.3 Come Velocissimo parla con Deliverect

- È un'**integrazione ufficiale** Velocissimo ↔ Deliverect, «a due vie»: gli ordini delle piattaforme
  arrivano sul POS Velocissimo, e **i prodotti si sincronizzano dal POS** verso Deliverect. Servono tutti
  e due gli abbonamenti. [deliverect.com/integrations/velocissimo]
- **Nel back-office di Velocissimo non c'è nessuna pagina Deliverect**: niente chiavi, niente mappe. Il
  collegamento sta dalla parte di Deliverect (la location di Deliverect punta al POS Velocissimo).
- **Il menù delle piattaforme si fa in Deliverect**: Deliverect riceve dal POS l'elenco dei prodotti
  (coi PLU e i prezzi), poi **in Deliverect** si sceglie quali prodotti mettere nel menù di Glovo,
  Deliveroo e Just Eat e lo si pubblica. [developers.deliverect.com, Insert/Update Products]
- **I problemi noti** che Deliverect stesso scrive per Velocissimo [help.deliverect.com, «Velocissimo:
  Solve Issues»]:
  1. un prodotto **spento** su Velocissimo **resta in vendita** su Deliverect (nessun avviso): va messo in
     «snooze» a mano su Deliverect;
  2. **i menu combo («meal deal») non si sincronizzano**: vanno rifatti a mano in Deliverect;
  3. «Invalid PLU» quando il POS spegne un prodotto arrivato al limite orario;
  4. errori 500 quando il POS non risponde: gli ordini si rimandano a mano.

  Il punto 2 spiega perché i menu combo stanno in un catalogo a parte «SOLO DELIVERECT».

## 23.4 Come ci colleghiamo noi a Deliverect

Deliverect riceve i menù **solo da un POS integrato**, e un POS nuovo deve essere **partner certificato**:
modulo partner → account di prova (staging) con le chiavi → sviluppo → certificazione («in media due
chiamate») → chiavi di produzione. [developers.deliverect.com, Become an integration partner] Non c'è
una strada «fai da te» per il ristorante.

Le strade, in ordine:

| | Strada | Cosa vuol dire | Pro | Contro |
|---|---|---|---|---|
| **A** | **Diventare partner POS** (Vi.Ru come «POS nostro») | noi facciamo quello che oggi fa Velocissimo: registriamo la location, mandiamo i prodotti, riceviamo gli ordini e rimandiamo gli stati | un menù solo: lo cambi in cassa e Deliverect lo riceve; lo «spento» e l'«esaurito stasera» diventano snooze automatici (meglio di Velocissimo, punto 1) | servono l'ok di Deliverect e la certificazione; tempi loro |
| **B** | **Menù tenuto a mano in Deliverect**, ordini a noi | Deliverect resta come oggi sul menù; gli ordini arrivano al nostro webhook | niente sviluppo sul menù | il webhook degli ordini **è comunque un'integrazione POS**: stessa certificazione di A. Quindi B da sola non esiste |
| **C** | **Ponte**: Velocissimo resta il POS di Deliverect durante il parallelo | gli ordini piattaforme entrano in Velocissimo come oggi; noi li leggiamo dalla Public API `/vendite` per i conti | zero rischio nel parallelo | gli ordini piattaforme non stampano dalla nostra cassa e non occupano le nostre fasce |

**Raccomandazione:** C per tutto il parallelo (è quello che c'è), e intanto **A**: Edoardo compila il
modulo partner di Deliverect a nome Vi.Ru (o chiede al suo referente Deliverect se una location può usare
un «POS proprio»), così arrivano le chiavi di prova e io sviluppo contro lo staging senza toccare la
location vera.

### Cosa manda il nostro POS a Deliverect (strada A), già mappato sul nostro database

`POST /productAndCategories` con `accountId`, `locationId`, `products`, `categories`, `priceLevels`:

| Deliverect | Da noi |
|---|---|
| `categories[].posCategoryId`, `name` | `categoria.id`, `categoria.nome` |
| `products[].plu` (**univoco**) | `prodotto.codice` (oggi quasi vuoto; vedi sotto) |
| `name`, `description`, `imageUrl` | `nome`, `descrizione`, `foto_url` |
| `price` in centesimi | `prezzo_piattaforme` (L3) × 100; L3 vuoto = il prodotto non va sulle piattaforme |
| `deliveryTax`, `takeawayTax`, `eatInTax` (millesimi: 10% = 10000) | `aliquota_iva` × 1000 |
| `productType` 1 prodotto, 2 variante, 3 gruppo di varianti | `prodotto` = 1; `variazione` = 2; `categoria_gruppo_variazione` = 3 (con `min`, `max`, `maxFree` = `min_n`, `max_n`, `max_gratis`) |
| `subProducts` | i gruppi della categoria del prodotto |
| `visible` / snooze | `attivo`, `esaurito_fino` |
| menu combo (bundle) | `pacchetto_gruppo` / `pacchetto_scelta` (0023) |

Gli ordini tornano al webhook che c'è già (`/api/deliverect/ordine`, firma
`X-Server-Authorization-HMAC-SHA256`), con `items[].plu` → `prodotto.codice`; gli stati da rimandare sono
20 accettato, 70 pronto per il ritiro, 90 chiuso, 110 annullato, 120 fallito.

### La domanda che decide i PLU

Oggi Deliverect conosce i prodotti coi **PLU di Velocissimo**. Se il nostro POS manda PLU diversi,
Deliverect li vede come prodotti nuovi e il menù delle piattaforme va rifatto. **Serve sapere quale PLU
usa oggi Deliverect**: in Deliverect → Menu → Products, la colonna PLU di due prodotti (es. «Menu
classico X1» e una pizza). Se è l'**id di Velocissimo** (210…) lo abbiamo già (`prodotto.id_velocissimo`)
e lo copiamo nel `codice`; se è il **codice** (C001, 142…), va prima ripulito dei doppioni: «142» e
«C072» sono ciascuno su due prodotti vivi. Vale la pena guardare in Deliverect anche **La finocchiona**
e **L'arrabbiata**: se hanno lo stesso PLU, un ordine Glovo di una può arrivare in cassa come l'altra.

## 23.5 Cosa resta da fare, in ordine

1. **Fatto stanotte:** l'editor del menù (23.2).
2. **Edoardo:** la colonna PLU in Deliverect (23.4) e il modulo partner Deliverect (strada A).
3. **Io, senza toccare il database:** il generatore del menù Deliverect (`/api/deliverect/menu`, solo
   lettura: costruisce il JSON di `productAndCategories` dal nostro menù e lo mostra, senza mandarlo), così
   quando arrivano le chiavi di prova basta accenderlo.
4. **Da approvare (database):** riempire `prodotto.codice` coi PLU giusti; una colonna
   `visibile_piattaforme` per dire quali prodotti vanno su Deliverect (oggi lo direbbe solo il prezzo L3).
5. Le **pagine di tasti** della cassa (le «Pagine catalogo POS» che Velocissimo ha ma non usa): da noi
   oggi i tasti seguono le categorie. Se Edoardo vuole una pagina «tasti veloci» con i 12 prodotti più
   venduti, si aggiunge sopra le categorie.

## Fonti

- deliverect.com/en-gb/integrations/velocissimo
- help.deliverect.com/en/articles/15857585-velocissimo-solve-issues
- developers.deliverect.com: v1.1-restaurants/reference/insert-update-products-and-categories ·
  page/glossary-product-insert-with-supplement-nutrition-info · page/channel-menu-model ·
  page/glossary-pos-orders · v1.1-restaurants/reference/update-order-status · reference/hmac-authentication ·
  reference/access-token · docs/become-an-integration-partner · docs/staging-and-production-environment ·
  v1.1-restaurants/reference/pos_register · v1.1-restaurants/reference/pos_syncproducts
- back-office Velocissimo, letto il 26/10/2026 03:3x: `/product/create`, `/product/210/edit`,
  `/ecommercecategory` (17 pagine, tutte tipo App), `/ecommercecategory/73/edit`, `/ecommercecategory/79/edit`
  (Prodotti), `/showcase/7/edit`; i codici di tutti i prodotti in `dati/codici_prodotti_velocissimo.csv`.
