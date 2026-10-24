# Giro 23 del grafico: totem con la scritta, blocco in fondo di /cassa/nuovo, /cassa/mappa e /cassa/menu (24/10/2026)

Quattro modifiche, una pagina per commit. Tocca solo la grafica: tocchi, campi e dati restano quelli di prima, e non si scrive niente nel database. Ogni misura è stata ripresa in produzione dopo il deploy.

## 1. /totem: nella fascia sabbia solo la scritta — `2ccf08a`

**Cosa cambia.** Nella fascia sabbia, sia sulla schermata d'avvio sia su tutte le testate, adesso c'è la stessa `public/brand/logo-scritta.png` di /ordina.

**Prima.** C'era il logo intero (lockup) alto 66 px, e la scritta AMANOAMANO al suo interno era alta circa 25 px.

**Dopo, a 1080×1920.** La scritta misura 386×54 su una fascia alta 96: a distanza si legge meglio. Foto: `lettura/giro23-totem-scritta-prima-dopo.png`.

**Difetto trovato e corretto.** Sul telefono e sul tablet coricato le regole del giro 21 (logo 66 px, bollino 72 px) vincevano anche sulle fasce più basse, da 60 e 64 px, e uscivano dal bordo. A 390 il logo partiva da y −3 e il bollino da y −6. Adesso:

| Schermo | Scritta | Bollino | Sta nella fascia? |
|---|---|---|---|
| 1080×1920 | 386×54 | 72 | sì |
| 390×844 | 200×28 | 46 | sì |
| 1024×768 | 258×36 | 52 | sì |

**Controlli.**
- Sovrapposizione tra fascia e bollino all'avvio: 0 px a 1080×1920, a 390×844 e a 1024×768.
- Testi sotto 20 px: 0. Tasti sotto 72 px: 0.

## 2. /cassa/nuovo a 390: il blocco fermo in fondo — `a27a803`

Ho controllato a 390 la regola `.c-fondo` fermo in fondo che hai aggiunto tu.

- **INVIA era stretto.** Da quando INVIA sta dentro `.c-fondo`, e `.c-fondo` è un blocco normale e non più la colonna flex della comanda, il tasto si stringeva alla larghezza del testo: 169 px su 390, sia col pannello aperto sia chiuso. Adesso `.c-fondo` è una colonna e INVIA torna largo 378 px.
- **Il bordo del blocco.** Col pannello aperto il blocco ha un filo oro e un'ombra più netta. Così la fila che scorre sotto (Sconto, €, % a metà dello scorrimento) sembra passare dietro un bordo, invece di sembrare tagliata a metà.
- **In fondo alla lista.** Quando si scorre fino in fondo, Note resta tutta in vista, 6 px sopra il blocco: nessuna riga resta coperta per sempre.
- **Controlli.** Testi sotto 13 px: 0. Tasti sotto 44 px: 0.
- **Ambito.** La regola vale solo sotto i 600 px.

Foto: `lettura/giro23-cassa-nuovo-fondo-prima-dopo.png`.

**Da decidere.** Sul PC lo stesso difetto c'è ancora: a 1024×768 INVIA è largo 177 px in una comanda da 300. Non l'ho toccato perché la regola è non toccare la comanda sul PC. La correzione è una riga: `.cassa-comanda .c-fondo { display: flex; flex-direction: column }` anche sopra i 600 px. Va decisa dalla chat principale.

## 3. /cassa/mappa: via gli stili in riga — `4a11c2f`

Era l'ultima pagina della cassa, comanda esclusa, con stili scritti in riga.

- **Classi.** I 12 stili in riga del codice sono diventati classi in `mappa.css`.
- **Stessa resa.** Prima e dopo, a 390 e a 1024, ho confrontato coordinate, caratteri e colori di titolo, conteggio, legenda, titoli di sezione, schede e scritte grigie: sono identici. Gli unici cambiamenti sono i tasti + e − della mappa, passati da 40 a 44 px.
- **Correzione al messaggio del commit.** Dice «22–28 elementi a video», ma quel conto comprendeva anche gli stili in riga che Leaflet mette da sé su tessere e segnaposti. Quelli nostri a video erano 6 e adesso sono 0 (a 390 gli elementi con stile scendono da 22 a 16).
- **Segnaposto dei rider.** Sulla mappa è 40 px. È un'icona disegnata da Leaflet, non un tasto della pagina, e la lascio così.

## 4. /cassa/menu — `dd47154`

- **Stile in riga.** L'errore era l'unico stile in riga rimasto; adesso è la classe `.m-errore`, con lo stesso vino.
- **I quattro «Spenti (N)».** Erano alti 40 px e ora sono 44. I giri passati contavano come tasti solo `button` e `a`, non `summary`, e per questo erano sfuggiti.
- **Gli altri campi.** Ho ripassato tutte le pagine a 390 contando anche `summary`, `select`, `input` e `label`: non c'è nient'altro sotto i 44 px.

La pagina resta lunga 8,4 schermate (147 prodotti). Per accorciarla servirebbe un indice dei gruppi (Pizze · Cucina · Bar) che porta alla sezione con un tocco. Sarebbe una funzione e non un ritocco grafico, quindi va decisa con Edoardo.
