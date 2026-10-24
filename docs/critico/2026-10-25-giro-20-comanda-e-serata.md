# Giro 20 — la comanda dal modello comune, il riepilogo dopo mezzanotte, il totem chiuso, sul deploy `c7a317d`

*Critico, 25/10/2026, 01:05–01:20 ora di Roma (la serata del 24 è aperta fino alle 06:00). Deploy
`c7a317d` («Riepilogo: dopo mezzanotte è ancora la serata…») letto **READY** sul connettore Vercel
prima di cominciare (sopra c'è `3c45c49`, la coda di stampa con mig. 0047). Riquadro a 1024×768,
390×844 e 1080×1920. Per la modifica ho usato un riquadro `sandbox` senza `allow-modals`, così il
`?stampa=1` non ha aperto la finestra di stampa. Niente Velocissimo, niente account, niente password,
niente messaggi mandati, niente riparazioni, file del grafico non toccati.*

**Il totem è chiuso** (01:00): l'ho guardato solo sulla schermata «SIAMO CHIUSI», e lì c'è un difetto
(sotto, punto 3).

## Da annullare (ordini di prova)

**C-76**: asporto **domani 26/10 alle 20:00**, POS, «Prova Critico Venti», modificato: margherita +
2 funghi + marinara, 30,00 €. È l'unico ordine nuovo di questo giro. Le altre comande le ho solo
lette (C-44, C-45, C-47, C-54, C-74, C-75), senza toccarle.

## 1. `/cassa/comanda/[id]` dal modello di `src/lib/comanda.ts`

Prima ho confrontato il codice. La parte che disegna la pagina è identica: le uniche righe diverse
sono `nuova(r)` / `segnoNuova(r)`, che adesso arrivano già calcolate come `r.segno` da
`vistaComanda`, con la stessa formula. Ci sono due differenze vere, e nessuna delle due cambia
quello che si legge stanotte:
- **le ore** («ricevuto», «RISTAMPA») prima usavano il fuso del browser, adesso sono sempre in ora
  di Roma. Il browser della cassa è a Roma, quindi non cambia niente;
- **«domani»** prima si calcolava con `setDate(+1)`, adesso con `adesso + 24 h`. Il giorno in cui
  si spostano le ore le due cose possono non coincidere: stanotte l'ora va indietro e non succede
  niente, ma l'ultima domenica di marzo il giorno ha 23 ore. Dopo le 23:00 di quella domenica, un
  preordine per lunedì risulterebbe «lunedì 30 marzo alle …» invece di «DOMANI alle …». È un caso
  di un'ora l'anno, lo segnalo come nota.

Poi ho letto le comande sul deploy e le ho messe accanto a quelle lette nei giri 15 e 16:

| Caso | Comanda | Letto ora | Rispetto a prima |
|---|---|---|---|
| Semplice (banco) | C-75 | «C-75 · AL BANCO · subito · ricevuto 00:57 · Cassa · PIZZE CLASSICHE · 1 · LA MARINARA · 1 pezzo in cucina · Totale 6,40 € · POS» | ✓ (C-75 è stato annullato da voi, e la comanda non lo dice: era così anche prima) |
| Domicilio con nota del cliente, nota d'ordine, sconto e paga con | C-74 | «C-74 · DOMICILIO · per le 21:00 · ricevuto 00:56 · Cassa · Prova Critico Tre · 3331234888 · ⚠ citofono rotto, chiamare al cancello · Via Nomentana 120 · 00161 Roma · zona BOLOGNA SPALLANZANI · PIZZE CLASSICHE · 1 · LA CAPRICCIOSA · 1 · LA NAPOLI · NOTE: giro 19 · 2 pezzi in cucina · consegna 1,00 € · SCONTO −2,00 € · Totale 16,80 € · CONTANTI · **PAGA CON 50,00 → RESTO 33,20**» | ✓ (il resto è uguale a quello della cassa e del rider) |
| Domicilio di ieri | C-44 | «C-44 · DOMICILIO · **sabato 24 ottobre alle 20:00** · ricevuto 11:55 · … · NOTE: giro 14 telefono · 2 pezzi in cucina · consegna 1,00 € · SCONTO −2,00 € · Totale 14,60 € · CONTANTI» | ✓ identica al giro 15; solo «per le 20:00» è diventato «sabato 24 ottobre», perché oggi è il 25 |
| Menu con le scelte | C-47 | «C-47 · TAVOLO D4 · subito · ricevuto 11:57 · Cassa · MENÙ · 1 · MENU CLASSICO X1 · · LA CAPRICCIOSA · · COCA COLA 0,33CL · + 1 SUPPLÌ, 1 CROCCHETTA, 3 MOZZARELLINE · 1 pezzo in cucina · Totale 13,00 € · CONTANTI» | ✓ le scelte stanno sotto il menu, «1 pezzo» conta la pizza e non la riga del menu |
| Preordine di domani, modificato con riga nuova, cresciuta e tolta | **C-76** (fatto ora) | Battuto con margherita + funghi + coca, «Domani», 20:00, POS → «Ordine n. 76 · Prova Critico Venti inviato in cucina per domani alle 20:00 · 17,90 € POS.». Poi in Modifica: funghi «+», coca «Togli», marinara aggiunta → «SALVA E RISTAMPA» → **«C-76 · MODIFICATA · RISTAMPA 01:08 · RITIRO · DOMANI alle 20:00 · ricevuto 01:07 · Cassa · Prova Critico Venti · PIZZE CLASSICHE · 2 · +1 (ORA 2) LA FUNGHI · 1 · LA MARGHERITA · 1 · NUOVA LA MARINARA · TOLTE · 1 COCA COLA 0,33CL · NOTE: giro 20 domani · 4 pezzi in cucina · Totale 30,00 € · POS»** | ✓ tutte e tre le marcature; 7,20 + 16,40 + 6,40 = 30,00 |
| Modificate di ieri | C-45, C-54 | C-45: «MODIFICATA · RISTAMPA 12:01 · RITIRO · sabato 24 ottobre alle 20:15 · … · 2 · +1 (ORA 2) LA FUNGHI · 1 · NUOVA LA MARINARA · TOLTE · 1 COCA COLA 0,33CL · 3 pezzi in cucina · Totale 22,80 € · POS». C-54: «MODIFICATA · RISTAMPA 12:16 · … · 1 · LA FUNGHI · BEVANDE · 1 · NUOVA COCA COLA 0,33CL · 1 pezzo in cucina · Totale 10,70 € · POS» | ✓ identiche al giro 15, a parte il giorno |

Le ore sono quelle di Roma: «ricevuto 01:07», «RISTAMPA 01:08», «DOMANI alle 20:00»; nel database
C-76 risulta creato alle 01:07 di Roma per il 26/10 alle 20:00. **La comanda dice esattamente le
stesse cose di prima.**

## 2. `/cassa/riepilogo` dopo mezzanotte (01:12)

| Voce | Atteso (serata del 24, da database con `giornata_lavorativa`) | Letto | |
|---|---|---|---|
| Titolo | — | **«RIEPILOGO DELLA SERATA»** (prima era «di oggi») | ✓ |
| Ordini | 24 validi su 57 | «ORDINI 24» e il ramo «ORDINI 57 · 24 validi» | ✓ |
| Venduto | 315,30 € | **315,30 €** | ✓ |
| In cassa · contanti | 221,00 (fine giro 18) | 221,00 € | ✓ |
| In cassa · POS | 87,10 | 87,10 € | ✓ |
| Ancora aperti | C-10 7,20 (C-75 è annullato) | 7,20 € | ✓ |
| 221,00 + 87,10 + 7,20 | = 315,30 | = il venduto in cima | ✓ |
| Il ramo | dalla C-75 in giù, senza C-74 (serata del 25) né C-76 (serata del 26) | «C-75 · ANNULLATO · … · W-73 · ANNULLATO · C-72 · RITIRATO · C-71 · CONSEGNATO …», niente C-74 e niente C-76 | ✓ |

Testa, ramo degli ordini e blocco Cassa leggono la stessa serata. **Il grave del giro 19 è chiuso.**
A 1024 la pagina sta in una schermata col ramo chiuso.

## 3. Le pagine cambiate dal grafico nel giro 21

`/cassa/cliente`: gli ultimi ordini adesso sono «C-74 · 25 ott · domicilio · 16,80 €», senza il «·»
vuoto in fondo ✓.

`/totem` chiuso, misurato a 1080×1920, 390×844 e 1024×768. Testo: «SIAMO CHIUSI · La cucina apre
alle 18:30 · TORNA A TROVARCI», uguale a prima. Nessun testo sotto i 13 px e nessun tasto; esce dal
bordo solo la foto di sfondo, che è fatta apposta più larga. Le immagini sono tutte caricate.
**Però la nuova fascia sabbia col logo (giro 21, 1/3) è finita sopra il bollino rotondo**:

| Misura | Fascia sabbia col logo | Bollino | |
|---|---|---|---|
| 1080×1920 (il totem vero) | 340,976 → 400×96, `z-index: 2` | 360,957 → 360×360 | la fascia attraversa il terzo alto del bollino |
| 390×844 | 0,368 → 390×60 | 109,378 → 172×172 | la fascia copre la cima del bollino |
| 1024×768 | logo in alto a 10 px | bollino da 45 px | qui sono staccati |

Nelle foto: al centro dello schermo c'è il bollino «A MANO A MANO PUGLIESE», e una striscia color
sabbia con «PIZZA ITALIANA · A MANO A MANO · FORNO A LEGNA» ci passa sopra, tagliandone la cima.
Si vedono **due loghi uno sopra l'altro**, e quello sotto è mozzato. La schermata «siamo chiusi» è la
stessa schermata d'avvio, con il testo diverso: è molto probabile che il totem aperto si mostri allo
stesso modo, ma lo si potrà vedere solo dopo le 18:30.

## I difetti, dal più grave

1. **Totem: la fascia sabbia col logo sta sopra il bollino** a 1080×1920 e a 390. Sono due loghi
   sovrapposti, e il bollino viene tagliato. Va rivisto anche a totem aperto.
2. Nota: «DOMANI» calcolato come `adesso + 24 h` sbaglia per un'ora nella notte del cambio d'ora di
   marzo. Non si vede né stasera né in una serata normale.
3. Nota, come prima: la comanda di un ordine annullato (C-75) non dice «ANNULLATO». Se qualcuno la
   ristampa, la cucina la fa.

## Voti per pagina

| Pagina | Voto | Perché |
|---|---|---|
| `/cassa/comanda/[id]` | **9** | Uguale a prima in sei casi su sei, con le ore di Roma |
| `/cassa/nuovo` (modifica) | 9 | «+», Togli, aggiunta e Salva e ristampa come al giro 13 |
| `/cassa/riepilogo` | **9** (era 7) | Una sola serata dall'alto in basso, 315,30 = 221,00 + 87,10 + 7,20 |
| `/cassa/cliente` | 9 (era 8) | Il «·» vuoto non c'è più |
| `/totem` chiuso | 5 | Il testo c'è tutto, ma due loghi uno sull'altro sulla misura del totem vero |

**Giro 20: 8 su 10.** La comanda e il riepilogo sono a posto; il totem va guardato prima di
accenderlo.

## Risposta (chat principale, 25/10/2026)

- «DOMANI» si calcola sul calendario di Roma, non come «adesso + 24 ore»: provato sulla notte del cambio d'ora di marzo e di ottobre (`scripts/prova-stampa.mts`).
- Una comanda annullata dice «ANNULLATO · NON FARE», sulla pagina e sulla carta ESC/POS.
- Totem: la fascia col logo sopra il bollino va al grafico (giro 22).
- C-76 annullato.
