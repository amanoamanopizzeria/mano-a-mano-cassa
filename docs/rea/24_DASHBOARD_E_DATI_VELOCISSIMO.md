# REA · 24. La dashboard, i report e gli export di Velocissimo, a fondo (26/10/2026)

*Richiesta di Edoardo (26/10/2026, 21:33Z): «per quanto riguarda la dashboard, utilizza Google Chrome,
accedi alla dashboard di Velocissimo, guarda come sono fatti, molte più pagine, export, clienti, dati e
tutto. Fai un bel REA su questa cosa.» Scopo: ricostruire nella cassa nuova la parte «conti» del
back-office, così che Edoardo «possa lavorare pure da casa, avere tutti i conti, avere il menù».*

*Completa, senza ripeterli, `01` (mappa del menu), `13` (le 61 voci con i valori), `15` (il CSV a 40
colonne per l'OS), `20` (inventario dati) e `21` (cosa manca). Qui c'è quello che lì non c'era: **come
è fatto dentro il motore della dashboard** (entità, metriche, dimensioni, grafici, periodi, confronti),
**le sette dashboard widget per widget**, i **report con colonne, filtri e «Metriche»**, **come
funzionano gli export**, e il **confronto voce per voce con la nostra `/cassa/dashboard`**.*

## 24.0 Come è stato fatto, e le regole rispettate

- Chrome di Edoardo, una scheda mia, già entrata in `admin.velocissimo.app` (nessun login fatto,
  nessuna credenziale letta). Scheda chiusa alla fine.
- **Sola lettura**: aperte pagine, cambiato solo il periodo di vista della dashboard (preset «Mese
  scorso» = settembre 2026, che il back-office ricorda nel browser), aperto e richiuso il menu
  dell'ingranaggio senza premere niente. Nessun Salva / Elimina / Importa / Genera / Esporta.
- **Nessun download**: gli export sono descritti dai tasti e dal codice della pagina (DataTables
  Buttons), non scaricati.
- Le configurazioni delle dashboard e il «catalogo» delle metriche lette con le stesse chiamate GET che
  fa la pagina (`/dashboards/{id}/config`, `/dashboard/breakdown/catalog`); per contare le sezioni della
  matrice prodotti una `POST /productmatrix/search` identica a quella che fa la tabella (è una ricerca,
  non scrive).
- **Dati personali**: la dashboard «Marketing e Clienti» mostra a video una tabella con nome, email e
  telefono dei clienti (RFM). **Non è copiata qui**: solo le colonne e il totale. Così per `/customer`,
  `/issuedcoupon`, `/customer-sales-report`, `/abandoned-cart-report`.
- Nessun commit, nessuna scrittura nel database.

## 24.1 Le pagine viste

| Pagina | Percorso | Visto |
|---|---|---|
| Dashboard · Riepilogo giornata | `/dashboard?id=11` | config + valori di oggi |
| Dashboard · Vendite | `/dashboard?id=12` | config + valori di settembre 2026 + dati dei grafici |
| Dashboard · Marketing e Clienti | `/dashboard?id=13` | config + valori di settembre + grafici |
| Dashboard · Andamento | `/dashboard?id=14` | config |
| Dashboard · KPI | `/dashboard?id=15` | config + i 16 numeri di settembre |
| Dashboard · Tavoli | `/dashboard?id=16` | config |
| Dashboard · Negozi | `/dashboard?id=17` | config |
| Catalogo del motore | `/dashboard/breakdown/catalog` | 6 entità, metriche, dimensioni, 7 grafici |
| Ingranaggio della dashboard | menu | voci (non premute) |
| Statistiche (indice) | `/statistics-hub` | le 17 voci |
| Ordini | `/weborder` | 53 colonne, 6 viste, 20 filtri, tasti, export |
| Report giornata | `/day-report` | colonne, filtri, 0 righe |
| Report negozio | `/storereport` | colonne, filtri, totale da sempre |
| Report rider | `/riderreport` | colonne, filtri |
| Report zone | `/delivery-zone-report` | colonne, filtri |
| Report sconti | `/discount-report` | colonne, filtri, prime 10 voci da sempre |
| Report prodotti | `/productreport` | colonne, filtri |
| Report categorie | `/productcategoryreport` | colonne, filtri, valori |
| Matrice dei prodotti | `/productmatrix` | colonne, le 4 sezioni |
| Report clienti | `/customer-sales-report` | colonne, filtri (nessun dato copiato) |
| Report carrelli abbandonati | `/abandoned-cart-report` | colonne, filtri, «Metriche» |
| Coupon emessi | `/issuedcoupon` | colonne, filtri, «Metriche» |
| Clienti | `/customer` | 51 colonne, 27+ filtri, tasti |

Non aperti in questo giro (già in `13` o fuori tema): report variazioni / composti / upsell / cross
sell (vuoti: upsell e cross sell non sono configurati, venduto 0,00 €), i due report X-Reserve, report
errori coupon (`13` §13.3), mappa rider, borsello rider (`04`).

## 24.2 Il motore della dashboard: com'è fatto dentro

La dashboard nuova di Velocissimo non è una pagina fissa: è **un motore di «breakdown»** che disegna
widget da una configurazione JSON. Ogni dashboard (`/dashboards/{id}/config`) è una lista di widget, e
ogni widget dice: **entità** × **metrica** (una o più) × **dimensione** (zero o più) × **grafico** ×
**confronto** × filtro di data proprio o ereditato. Le sette dashboard di Edoardo sono tutte «GLOBALE»
(le dà Velocissimo, uguali per tutti i clienti).

### Le sei entità, con metriche e dimensioni

| Entità | Metriche | Dimensioni (per cosa si divide) |
|---|---|---|
| **Ordini** (grana: ordine) | Numero ordini · Totale venduto · Fatturato IVA esclusa · Scontrino medio (con e senza IVA) · **Margine assoluto** · **Food cost %** · Quantità venduta · N° ordini in cui compare (un prodotto) · Venduto da carrelli risvegliati · da cross sell · da cross sell al checkout · da upsell · **Coperti asporto** · Coperto asporto medio (con e senza IVA) · Margine medio su coperto. Nascoste ma usate dai widget: **Consegne puntuali %**, **Ritardo medio di consegna**, coperti e coperto medio al tavolo | Tipo · Origine · Stato · Negozio · Giorno della settimana · Fascia oraria · **Prodotto** · **Categoria** · **Operatore** · **Variazione** · Giorno · Settimana · Mese · Trimestre · Quadrimestre · Anno · «come la vista della dashboard» (si adatta al periodo); in più, nei widget dei Tavoli: Sala, Tavolo, Cameriere |
| **Clienti** | Nuovi utenti dell'app · Nuovi invitati da amici · **Clienti attivi** · **Nuovi clienti (primo ordine)** · **Clienti ricorrenti** · Giorni dall'ultimo ordine · Numero ordini · Totale speso · Lifetime value (margine) | Cliente · Email · Telefono · Negozio · Tag · Giorno della settimana · Fascia oraria · **Tipo cliente (Nuovo / Ricorrente)** · Giorno … Anno |
| **Recensioni** | Numero recensioni · Voto medio | Voto · tempo |
| **Prenotazioni** | Numero · Coperti totali · Coperti medi | Origine · Negozio · Form · giorno della settimana · fascia · tempo |
| **Coupon** | Coupon emessi · Coupon usati | Coupon · tempo |
| **Premi** | Nuovi premi ottenuti | Negozio · tempo |

Alcune metriche non si possono dividere per alcune dimensioni (es. «scontrino medio per prodotto» non
ha senso e il catalogo lo esclude): il catalogo porta per ogni dimensione la lista delle metriche vietate.

### Grafici, periodi, confronti, filtri

- **Sette forme**: Numero (la tessera grande col ▲▼ e la cifra del periodo prima), Ciambella, Torta,
  Colonne, Colonne orizzontali, Linea, **Tabella**. La tessera «Numero» si apre in un grafichetto con i
  tasti **G S M T Q A** (raggruppa per giorno, settimana, mese, trimestre, quadrimestre, anno) e il
  doppio periodo «attuale / precedente».
- **Periodo** (in alto a destra, uno per tutta la dashboard): Date personalizzate · Oggi · Ieri ·
  Ultimi 7 giorni · Ultimi 30 giorni · Mese corrente · Mese scorso · Anno corrente · Anno scorso ·
  Ultimi 12 mesi. Il periodo scelto **resta** passando da una dashboard all'altra.
- **Confronto** (nell'ingranaggio): **Periodo precedente** oppure **Anno precedente**. Ogni numero
  mostra la variazione in % e, fra parentesi, il valore del periodo di confronto.
- **Filtri globali**: **Origini** (App, Cassa, Backoffice, Sito web, Deliverect, Totem, AI) e **Tipi**
  (Banco, Consegna, Tavoli, Ritiro, Consumazione); in più l'autoconsumo è sempre escluso
  (`web_order_autoconsumo = 0`).
- **Ingranaggio**: le tue dashboard (stella = preferita, matita, cestino), Crea nuova dashboard,
  **Esporta / Importa** (la configurazione della dashboard, non i dati), tipo di confronto,
  **Personalizza** (sposta e cambia i widget). Non toccati.
- **Remy AI**: il tasto tondo in basso a destra apre l'assistente (chiama `/admin/ai-agent/history`).
  Non aperto.
- Il motore è **lento e fragile**: al primo caricamento di oggi tre widget hanno risposto 503 e uno 422,
  poi sono arrivati al secondo tentativo; «Consegne puntuali» resta «–» con il tasto «Riprova».

## 24.3 Le sette dashboard, widget per widget

Valori di **settembre 2026** (preset «Mese scorso», confronto con agosto, mese di ferie: per questo
i ▲ sono enormi). Solo aggregati.

### Riepilogo giornata (`id=11`) — «com'è andata oggi?»

Totale venduto · Numero ordini · Scontrino medio · Persone servite · Quanto spende in media una
persona · Consegne puntuali; Come sono distribuiti gli ordini (colonne per fascia oraria) · Incasso per
fascia oraria · Tipologia degli ordini di oggi (ciambella per tipo) · Ordini di oggi per stato (ciambella).
Stasera alle 22:3x: 516,86 € con 22 ordini, 39 persone, 13,09 €/persona (servizio ancora in corso).

### Vendite (`id=12`) — «quanto ho venduto e cosa?»

| Widget | Settembre 2026 |
|---|---|
| Incasso | **33.060,44 €** (agosto 13.712,27) |
| Margine | 23.145,47 € (vedi §24.9: non è un margine vero) |
| Numero ordini | 1.353 |
| Scontrino medio | 24,43 € |
| Persone servite (= coperti asporto) | 2.631 |
| Scontrino medio per persona | 12,00 € |
| Da dove arrivano gli ordini (€) | Deliverect 17.142 · App 7.406 · PC 6.676 · Sito web 1.173 · Totem 664 |
| Come ordinano (€) | Ritiro 17.574 · Domicilio 9.746 · Tavolo 3.208 · Banco 2.532 |
| Top prodotti (€, colonne orizzontali) | Margherita 4.618 · Margherita con bufala 2.018 · **«Non specificato» 1.477** · Diavola 1.424 · Supplì 1.202 · Salsiccia 1.036 · Menu classico X2 888 · X1 760 … |
| Top categorie (€) | Pizze classiche 16.558 · Speciali 4.332 · Fritti 4.073 · Menu 2.644 · Novità 988 · Bevande 953 … |
| Giorni più forti (ordini) | lun 146 · mar 165 · mer 145 · gio 155 · ven 188 · **sab 279 · dom 275** |
| Fasce orarie (ordini) | 18:00 5 · 19:00 220 · **20:00 553** · 21:00 408 · 22:00 154 · 23:00 13 |
| Venduto e margine per mese (anno in corso) | gen 48.920 · feb 42.925 · mar 45.920 · apr 40.026 · mag 43.892 · giu 34.302 · lug 29.476 · ago 13.712 · set 33.060 · ott (al 26) 32.388 |

«Non specificato» fra i prodotti (1.477 €) sono righe senza prodotto collegato: le righe libere e le
\*GESTIONALE\* del 2Bit (`13` §13.6). Da noi ogni riga ha `id_prodotto` o è una variazione: non deve
esistere.

### Marketing e Clienti (`id=13`) — «i clienti tornano?»

Nuovi utenti app **9** · Clienti che ordinano **180** (sono i clienti registrati con un ordine nel
mese, non tutti: gli ordini di settembre sono 1.353) · Voto medio recensioni 0,00 (nessuna recensione in
Velocissimo) · Premi riscattati **28**; Coupon emessi e usati per mese (gen–set 2026: 84/54, 78/61,
64/50, 61/42, **122/97** a maggio, 56/43, 52/43, 13/13, 50/40); Nuovi vs ricorrenti (174 ricorrenti, 6
nuovi); Recensioni per voto (vuoto); **Coupon più usati** nell'anno (Premio pizza speciale 124 · NON
CUCINO 69 · Premio fritti 66 · Premio birra 54 · Benvenuto 2025 48 · GIOVEDÌ SONO FRITTO 40 ·
FESTEGGIAMO 38 · Lunedì di rientro 10 % 22 · Un dolce martedì 21 …); Up-sell, Cross-sell, Cross-sell al
checkout **0,00 €** (non configurati); **Recuperato da carrelli abbandonati 363,60 €**; **«Clienti da
riconquistare (analisi RFM)»**: tabella con Cliente · Email · Telefono · Giorni dall'ultimo ordine ·
Numero ordini · Totale speso · Lifetime value (margine), ordinata dai più lontani, centinaia di righe
(dati personali: non copiati). La tabella mescola utenti dell'app che non hanno mai ordinato (0 ordini)
con clienti persi: così com'è non serve a richiamare nessuno.

### Andamento (`id=14`) — «come va nel tempo?»

Dieci grafici, tutti col confronto dell'**anno prima**: Numero ordini · Scontrino medio · Incasso ·
**Incasso progressivo** (linea cumulata) · Margine · Margine progressivo · Distribuzione ordini · Nuovi
clienti · Persone servite · Scontrino medio per persona nel tempo. La grana segue il periodo
(«come vista dashboard»: giorni in un mese, mesi in un anno).

### KPI (`id=15`) — sedici numeri in fila

Settembre: Ordini 1.353 · Venduto 33.060,44 € · Scontrino medio 24,43 € · Margine 23.145,47 € ·
Coperti asporto 2.631 · Coperto asporto medio 12,00 € · Margine medio su coperto 8,80 € · Cross sell
checkout 0 · Cross sell 0 · Upsell 0 · **Carrelli risvegliati 363,60 €** · Nuovi utenti app 9 · Premi
ottenuti 28 · Coupon emessi 50 · Coupon usati 46 · Nuovi utenti invitati da amici 0.

### Tavoli (`id=16`) — sala e prenotazioni

Incasso in sala · Conti al tavolo · Coperti serviti · Conto medio · Coperto medio · Margine in sala ·
**Rendimento camerieri** (tabella per operatore: incasso, conti, coperti, coperto medio, margine) ·
Incasso per sala · Quando si riempie la sala (coperti per ora) · Tavoli più redditizi · Conti e coperti
per giorno della settimana · Piatti più venduti al tavolo · Categorie in sala · Andamento incasso ·
Coperto medio nel tempo · Incasso per cameriere · Prenotazioni, coperti prenotati, persone per
prenotazione, per fascia, per giorno, per origine, andamento. **Per A Mano A Mano è quasi vuota**: i
tavoli e i camerieri stanno sul 2Bit, non nel cloud (`13` §13.0).

### Negozi (`id=17`) — il confronto fra punti vendita

Incasso, margine, ordini, scontrino medio, food cost, consegne puntuali; tabelle «Volumi per negozio»
e «Medie e qualità per negozio» (scontrino, coperto, food cost %, puntualità, **ritardo medio**);
mix tipi, origini, curva oraria e giorni per negozio. Con un negozio solo non dice niente di più delle
altre; serve solo la riga di «Medie e qualità».

## 24.4 I report (`/statistics-hub`): colonne, filtri, export

Tutti i report sono tabelle Backpack con filtri in alto, **Esporta** (Excel, CSV, PDF) e **Colonne**.
Alcuni hanno sopra un riquadro «**Metriche**» coi totali. Valori fra parentesi: letti oggi, aggregati.

| Report | Domanda | Colonne | Filtri | Metriche / valori |
|---|---|---|---|---|
| **Report negozio** `/storereport` | quanto ho incassato, pagato e da incassare | Negozio · Città · N. ordini accettati · Totale accettati · Margine · **Già pagati** · **Da pagare** · Costo consegna · N. rifiutati · **Totale sconti** · Scontrino medio | Data · Tipo · Origine · Fascia oraria | da sempre: 55.095 ordini, 1.282.347,45 €, già pagati 649.942,92, da pagare 597.469,71, rifiutati 450, sconti −58.498,37, medio 23,28 |
| **Report rider** `/riderreport` | chi ha consegnato quanto e con che puntualità | Rider · Consegnati · Totale · Già pagati · **Totale contanti** · Contante versato · Costo consegna · Annullati · Scontrino medio · **In ritardo** · **Tempo medio** · Sotto il minuto · Distanza | Data · Fascia oraria · Origine | 16 righe (Rider 1…n); versato, tempo e km a 0 (`13` §13.7) |
| **Report zone** `/delivery-zone-report` | dove consegno e quanto rende ogni zona | Zona · N. ordini · Importo · Scontrino medio · Margine · Margine medio · Distanza media · Tempo di consegna medio · Costo medio consegna | Data · Fascia · Origine | 17 righe |
| **Report sconti** `/discount-report` | quanto regalo e con quale sconto | Descrizione · Quantità · Importo totale | Data ordine · Tipo · Origine · Fascia · Negozio | da sempre, 54 voci: **SCONTO (manuale) 12.678 volte, −52.565,39 €**; SCONTO (seconda voce) 823, −2.351; NON CUCINO 68, −624; Benvenuto da APP 92, −460; Benvenuto 2025 91, −455; SCONTO 10 % 134, −360; FESTEGGIAMO 38, −338; SCONTO 20 % 51, −315; Benvenuto da volantino 119, −312; BUONANNO2025 51, −282 |
| **Report prodotti** `/productreport` | cosa vendo | Id · Nome · Formato · Categoria · Negozio · Quantità · Importo · **Importo netto** · Aliquota · Margine | Data · Negozio · Categoria · Fascia · Origine · Tipo · Scomponi formati · Formato · **Escludi prodotti dentro i menu** | — |
| **Report categorie** `/productcategoryreport` | cosa vendo, per famiglia | Nome · Formato · Negozio · Quantità · Importo · Margine | Data · Negozio · Fascia · Origine · Tipo · Scomponi formati | 24 righe; da sempre: Menu classico X1 3.800 / 59.786 € · X2 1.526 / 41.658 € · X3 606 / 21.943 € · Novità 2.152 / 25.019 € … |
| **Matrice dei prodotti** `/productmatrix` | quali piatti spingere e quali togliere (menu engineering) | Prodotto · **Sezione** · Categoria · Quantità · Margine unitario · Importo · Margine | Data · Negozio · Categoria | 177 prodotti in 4 sezioni: **Campione 10 · Cavallo da battaglia 31 · Sfida 50 · Bidone 63** (popolarità × margine); col food cost compilato su 14 prodotti la sezione è poco attendibile |
| **Report clienti** `/customer-sales-report` | chi compra, quanto e da quando non torna | Nome · Cognome · Email · Cellulare · Telefono · Città · N. ordini · Importo · Margine · Giorni dall'ultimo ordine · Data ultimo / primo ordine · Data registrazione | Negozio · Cliente · Città · Tipo · Data ordine · Fascia · Data registrazione · Origine · «Mostra tutti i clienti / solo con ordini» | 19.552 righe |
| **Carrelli abbandonati** `/abandoned-cart-report` | quanto recupero da chi lascia il carrello | Stato (Risvegliato / Abbandonato) · Data e ora notifica · Data ordine · Data ultimo ordine · Importo carrello · Cliente · Negozio | Data · Negozio · Tipo · Fascia · Stato | da sempre: **4.147 risvegli tentati, 768 risvegliati (18,52 %), 21.969,87 € venduti dai risvegli su 264.366,51 € dell'app (8,31 %)** |
| **Coupon emessi** `/issuedcoupon` | quali buoni girano e chi li usa | Barcode · Coupon · Nome · Cognome · Email · Telefono · Numero card · Codice · Data ottenimento · Data utilizzo · N. ordine · Importo sconto · Importo ordine · Negozio · **Usato da** · Inizio / fine validità | Barcode · Codice · Pubblicazione · Validità · Data utilizzo · Cliente · Negozio · Coupon · Usato da · Stato (Bruciati / Ottenuti) · Numero card | 2.248 righe; Metriche: **2.239 emessi, 1.770 usati, 1.764 ordini, 44.086,84 € venduti, margine 31.730,58, 10.513,82 € scontati** |
| **Report giornata** `/day-report` | le chiusure X/Z | Data chiusura · Tipo (Parziale / Totale) · Importo totale · Numero documenti · Negozio · Cassa | Data chiusura · Tipo · Negozio · Cassa | **0 righe**, da sempre |

Il riquadro «Metriche» è la cosa che serve di più nei report: tre-quattro totali sopra la tabella, gli
stessi filtri. È la grammatica «riassunto, poi il fondo» che l'OS già usa.

## 24.5 Ordini (`/weborder`): la lista che Edoardo usa per cercare

- **Viste**: In corso · In consegna · Annullati · Consegnati · In attesa · Tutti (55.592 ordini oggi).
- **20 filtri**: numero `#` · data creazione · data ordine · orario richiesto · negozio · cliente ·
  indirizzo · città · provincia · città negozio · gruppo di zone · **note** (testo) · **stato** · **tipo**
  · **origine** · **pagamento** · **rider** · **zona** · **prodotti** (ordini che contengono un prodotto)
  · id cliente. Più la ricerca libera «Cerca…».
- **Pagamento, vocabolario completo del filtro** (più ampio di quello visto nei CSV): Bancomat ·
  Bancomat alla cassa · Bancomat alla consegna · Contanti · Contanti alla cassa · Contanti alla consegna ·
  Pagamento online · **PayPal**.
- **Colonne**: 53 (le 40 del CSV di `15` più quelle solo a video). A video di base: #, orario
  richiesto, negozio, stato, cliente, indirizzo, rider, tipo, data creazione, data e ora ordine, data
  ordine, totale, costo consegna, origine, pagamento, note, ritardo (s. e testo), coperti asporto, zona.
- **Attenzione, non è sola lettura**: la colonna Stato è un **menu a tendina dentro la riga** (cambiare
  il valore cambia lo stato dell'ordine) e c'è «Cambia stato» in blocco. Da noi lo storico deve essere
  **solo da leggere**; i cambi di stato restano in `/cassa`.
- **Righe per pagina**: 10 / 25 / 50 / 100 (niente «tutte»).

## 24.6 Clienti (`/customer`)

51 colonne (quelle di `13` §13.2), di cui a video: nome, azienda, cellulare, telefono, email, ultimo
utilizzo card, numero card, saldo punti, saldo credito, n. ordini, zona, città, CAP, provincia, ultimo
negozio, scadenza card, tipologia card, ultimo accesso app, card amico, sync, data e tipo ultimo
ordine, coperti acquistati, coperto asporto medio, totale venduto, **RFM ×4**. **27 filtri e oltre**:
nome, cellulare, telefono, email, tipo contatti (con cellulare / email), città, CAP, provincia, zona,
sesso, età, compleanno, i tre consensi, data registrazione, numero card, tipologia card, **saldo punti**,
**saldo credito**, scadenza card, ultimo utilizzo card, lista, **tag** (Black List, «coupon usato…»),
cliente di prova, utente app, contatto verificato… Tasti: Aggiungi, Elimina, Crea notifica, Esporta,
Colonne. 19.552 clienti oggi (19.543 il 25/10).

## 24.7 Come funzionano gli export (letto dal codice della pagina, senza scaricare)

- Il tasto **Esporta** di ogni lista è quello di Backpack: **DataTables Buttons** in versione
  `copyHtml5` / `excelHtml5` / `csvHtml5` / `pdfHtml5`. Il file **si costruisce nel browser** con le
  colonne **visibili** più quelle marcate «visibili nell'export» (le «(h)» di sopra: è per questo che
  il CSV degli ordini ha 40 colonne e la lista a video meno).
- La tabella è **server-side** (`POST /weborder/search`, pagine da 10–100): nel codice non c'è il passo
  che allarga la pagina a «tutte» prima di esportare. **Da verificare senza scaricare**: se l'export
  prende solo le righe caricate (al massimo 100) o tutte quelle filtrate. Con 65 ordini a sera l'export
  di una serata ci sta comunque. → domanda D24-1.
- Formati: **Excel (.xlsx)**, **CSV**, **PDF**, più «Copia». Le colonne si scelgono con «Colonne»
  prima di esportare.
- L'export dei **clienti** che Edoardo ha già fatto («export 28», 19.028 righe contro 19.552 in lista,
  `20` §8) potrebbe essere un'altra strada (un job del server con email): lascia fuori i più recenti.
- L'«Esporta» della **dashboard** esporta la **configurazione** (JSON dei widget), non i numeri.

## 24.8 La nostra `/cassa/dashboard` contro Velocissimo

Letta `src/app/cassa/dashboard/page.tsx` (282 righe) e `/api/ordini/csv`. Oggi la pagina legge gli
ordini **nel browser** (fino a 10 pagine da 1.000) e fa i conti in JavaScript.

| Voce Velocissimo | Da noi | Stato |
|---|---|---|
| Periodo Serata / Settimana / Mese con frecce e calendario | sì | **fatto** |
| Periodi Oggi, Ieri, Ultimi 7/30, Anno, Anno scorso, Ultimi 12 mesi, **date libere** | solo serata/settimana/mese | **manca** |
| Confronto col periodo precedente | sì (serata = stesso giorno della settimana prima) | **fatto**, e più giusto di Velocissimo per la serata |
| Confronto con l'**anno prima** | — | **manca** |
| Venduto, Ordini, Scontrino medio, Coperti, Annullati | sì | **fatto** |
| Persone servite / **spesa media a persona** | coperti sì, €/persona no | **parziale** (una riga) |
| Consegne puntuali | sì (entro la mezz'ora scelta) | **fatto**; manca il **ritardo medio** in minuti |
| Per origine, per tipo, per pagamento (€ e ordini) | sì | **fatto** |
| Incasso per ora | sì (dall'ora richiesta) | **fatto**; manca «ordini per ora» |
| Filtri globali Origini / Tipi | — | **manca** |
| **Top prodotti / Top categorie** (€ e quantità) | — | **manca** (i dati ci sono: `ordine_riga` + `prodotto.id_categoria`) |
| **Giorni più forti** (per giorno della settimana) | — | **manca** |
| **Andamento per mese** (12 mesi, progressivo) | — | **manca**; il caricamento nel browser non regge un anno (≈16.000 ordini) |
| Margine / food cost % | — | **non da copiare**: il food cost vero sta nell'OS (`v_food_cost_competenza`) |
| Rider: consegne, € , contanti | sì | **fatto**; mancano ritardo, tempo medio, annullati per rider |
| Elenco ordini del periodo | sì (ultimi 200, poi «tutti») | **parziale**: niente filtri, niente ricerca, niente dettaglio con le righe |
| Export CSV della vista (16 colonne, `;`) e CSV 40 colonne per l'OS (serata) | sì | **fatto**, meglio di Velocissimo (file vero e completo, non la pagina) |
| Export Excel / PDF | — | non serve (il CSV col `;` si apre in Excel) |
| Report sconti (manuale, coupon) | `ordine.sconto`, `sconto_manuale`, `sconto_motivo`, `codice_coupon` ci sono | **manca la vista** |
| Report zone | `ordine.id_zona` c'è | **manca la vista** |
| Clienti nuovi / ricorrenti, chi non torna | `cliente`, `ordine.id_cliente`, `ordini_cliente` | **manca** |
| Coupon emessi/usati, premi riscattati | `coupon_emesso` (0 righe), `cliente_punti_movimento` | **manca** (prima vanno importati, `20`) |
| Report giornata / chiusura di cassa | — | **manca** (`21` D7) |
| Menù raggiungibile dalla dashboard | link «Cambia il menù →» | **fatto** (26/10) |
| Recensioni, prenotazioni, carrelli abbandonati, upsell | — | non nella cassa (OS / app nostra) |

## 24.9 Le dieci cose più utili che mancano, in ordine

Ordine pensato per «lavorare da casa e avere tutti i conti». Le stime sono di sviluppo, con prova.

| # | Cosa | Perché a Edoardo | Dati nel nostro DB | Lavoro |
|---|---|---|---|---|
| 1 | **Conti calcolati dal database** (una funzione `cruscotto(dal, al, origini, tipi)` che restituisce i totali e i raggruppamenti) al posto della lettura di tutti gli ordini nel browser | da casa, col telefono, un mese o un anno si apre in un secondo; senza, «Anno» non si può fare | `ordine`, `consegna` | ½ giornata (una migrazione + riscrivere `leggi`/`conti`) |
| 2 | **Periodi liberi e anno**: Oggi, Ieri, Ultimi 7/30, Anno, Anno scorso, Ultimi 12 mesi, dal–al; **confronto anno prima** accanto al periodo prima | «come va rispetto all'anno scorso» è la domanda vera di settembre e di dicembre | come sopra | ½ giornata (dopo il 1) |
| 3 | **Top prodotti e top categorie** (€, pezzi, con e senza i menu) | sapere cosa vende, quanto pesano fritti e menu | `ordine_riga` (id_prodotto, quantita, prezzo_unit, variazioni, id_riga_padre), `prodotto.id_categoria`, `categoria` | ½ giornata; regola da fissare: le scelte dentro un menu contano come pezzi ma non come € (filtro «escludi prodotti in menu» di Velocissimo) |
| 4 | **Storico ordini con filtri e dettaglio**: per data, stato, tipo, origine, pagamento, rider, zona, prodotto, testo nelle note e numero; scheda con le righe, la storia degli stati (`ordine_stato_log`), lo sconto, chi ha annullato | ritrovare un ordine contestato, un rimborso, un cliente che chiama il giorno dopo | `ordine`, `ordine_riga`, `ordine_stato_log`, `consegna`, `annullato_da` | 1 giornata; **solo lettura** (niente stato a tendina come in Velocissimo) |
| 5 | **Andamento per mese** (12–36 mesi, venduto e ordini, progressivo) e **giorni della settimana** | il colpo d'occhio del mese e il sabato contro il lunedì | `ordine` | ½ giornata (dopo il 1). **Prima del cambio la storia è in Velocissimo**: senza import dello storico (55.592 ordini) il grafico parte dal giorno del passaggio → D24-3 |
| 6 | **Sconti**: quanti e quanto, manuale e per coupon, con il motivo | lo sconto manuale è la prima voce di sconto (12.678 volte da sempre, −52.565 €) | `ordine.sconto`, `sconto_manuale`, `sconto_motivo`, `codice_coupon`, `id_coupon` | 2 ore |
| 7 | **Rider completo**: consegne, ritardo medio, tempo medio (partenza → consegna), in ritardo, annullati, contanti | sapere chi rende e chi fa tardi, senza la Chiusura | `consegna` (assegnata_il, ritirata_il, consegnata_il), `ordine.ora_consegna`, `rider_movimento` | 2–3 ore |
| 8 | **Zone**: ordini, €, scontrino medio, ritardo medio per zona | quale zona rende e quale arriva tardi (VERBANO è la prima) | `ordine.id_zona`, `zona.nome`, `consegna` | 2 ore |
| 9 | **Clienti**: nuovi (primo ordine) e ricorrenti nel periodo, i migliori del periodo, **chi non torna da N giorni** (solo con almeno 2 ordini, non gli iscritti che non hanno mai ordinato) | il marketing di WhatsApp dell'OS ha bisogno di sapere chi richiamare | `cliente`, `ordine.id_cliente`, `ordini_cliente`; **manca** lo storico ordini per cliente prima del passaggio | 1 giornata; dati personali: pagina solo per il ruolo di Edoardo |
| 10 | **Coupon e punti**: emessi, usati, scontato, premi riscattati, punti dati e spesi | vedere se «GIOVEDÌ SONO FRITTO» e i premi rendono | `coupon_emesso` (0 righe oggi), `cliente_punti_movimento`, `ordine.id_coupon` | 2–3 ore, **dopo** l'import di card, punti e coupon (`20` §7) |

Fuori dai dieci, da sapere: **spesa a persona** e **ordini per ora** sono una riga ciascuno nella
pagina di oggi (farle subito costa 15 minuti); la **chiusura di cassa / report giornata** è il buco
più grande di tutti, ma è un lavoro di cassa, non di cruscotto (`21` §13, D7); il **margine** non va
rifatto nella cassa: il food cost lo tiene l'OS.

### Dati che il nostro DB non ha

- **Food cost per prodotto**: nessuna colonna in `prodotto` (Velocissimo l'ha su 14 prodotti). Resta
  all'OS.
- **Operatore che ha battuto l'ordine** (dimensione «Operatore», «Rendimento camerieri»): `ordine`
  non ha `creato_da`; c'è solo `annullato_da`. Una colonna, se serve.
- **Storico ordini di Velocissimo** (55.592): non importato (`20` §4, «da decidere»).
- **Pagamenti divisi** (`pagamento`: 0 righe): oggi un ordine ha un solo metodo.
- **Carrelli abbandonati, recensioni, prenotazioni, upsell**: non nella cassa.
- **«Già pagati / Da pagare»** del report negozio: da noi è `pagato_online` + `pagamento`; il «da
  incassare» della serata è nel riepilogo, non nel cruscotto.

## 24.10 Domande per Edoardo

- **D24-1.** L'export della lista Ordini di Velocissimo, quando lo fai per un mese, ti dà tutti gli
  ordini o solo quelli della pagina (10–100)? (Dal codice sembra solo la pagina; non l'ho scaricato.)
- **D24-2.** Il «Margine» di Velocissimo (settembre 23.145 € su 33.060, il 70 %) lo guardi? Il food
  cost è compilato solo su 14 prodotti, quindi quel margine non è vero. Proposta: nella cassa **niente
  margine**, il conto economico resta all'OS.
- **D24-3.** Lo **storico** (55.592 ordini da 2023) lo vuoi vedere nella dashboard nuova (grafico dei
  mesi, confronto anno prima, clienti che non tornano)? Se sì va importato almeno per totali giornalieri
  e per cliente; se no la storia parte dal giorno del passaggio e il confronto con l'anno prima lo dà
  l'OS.
- **D24-4.** Le dashboard **Tavoli** (camerieri, tavoli più redditizi) e **Negozi** ti servono? Per i
  camerieri bisogna salvare chi batte l'ordine (`creato_da`).
- **D24-5.** I clienti da richiamare: la lista con nome e telefono deve stare nella cassa (solo il tuo
  ruolo) o basta mandarla all'OS per WhatsApp?
- **D24-6.** Nella dashboard ti serve l'**Excel/PDF** o basta il CSV che si apre in Excel?
- **D24-7.** Il conto «a persona» per l'asporto: Velocissimo divide per i **coperti asporto** (2.631 a
  settembre, 12,00 €/persona). Da noi i coperti sugli asporti non sempre si chiedono (`15` §15.6): li
  rendiamo obbligatori al telefono, o il «per persona» vale solo al tavolo?

## 24.11 Problemi incontrati

- **Login**: nessuno, il Chrome di Edoardo era già dentro.
- Il motore della dashboard ha risposto **503 e 422** a tre widget al primo caricamento; ricaricando
  sono arrivati. «Consegne puntuali» resta «–» (non calcolato).
- Il filtro dei caratteri dello strumento di Chrome blocca le uscite con `=`, `?`, `&`: i parametri
  delle URL sono stati riscritti prima di leggerli.
- Una tabella della dashboard «Marketing e Clienti» stampa a video nomi, email e telefoni: letta solo
  per le colonne e il totale, **niente copiato**.
- Non verificato senza scaricare: se l'export di una lista prende tutte le righe filtrate (D24-1).
- Report rider, zone, prodotti e matrice si caricano lenti (3–5 s); alla ricerca della matrice con 200 righe per pagina sono
  tornate 154 righe su 177 dichiarate (motivo non chiaro: da non prendere come conteggio esatto).
