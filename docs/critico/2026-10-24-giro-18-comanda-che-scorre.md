# Giro 18 — il ricontrollo del giro 17 e la serata dalla postazione (1024×768), sul deploy `dcbfaf9`

*Critico, 24/10/2026, 17:08–17:16 (ora vera; la serata è recitata). Deploy `dcbfaf9` letto READY
sul connettore Vercel (contiene `1c89e66`, le correzioni del giro 17, e il giro 16 del grafico).
Tutto a **1024×768** nel riquadro; `/rider` a 390. `window.open`, `print`, `confirm` e `prompt`
intercettati. Niente Velocissimo, niente account, niente password, niente messaggi mandati, niente
riparazioni, file del grafico non toccati. Nomi «Prova Critico …», telefoni finti (3331234888 è la
scheda di prova; 0003334418 dal sito).*

**Il totem non l'ho provato**: alle 17:10 di Roma la cucina apre alle 18:30 e il totem dice
«SIAMO CHIUSI». Resta da vedere dopo le 18:30, come al giro 17.

## Da annullare (ordini di prova)

Aperti: **C-69** (banco, contanti, marinara + funghi 14,60) e **W-73** (ritiro dal sito 22:45,
POS, margherita + funghi 15,40). Ritirati, non si annullano più: **C-70** (tavolo D5, tre pizze
27,50, conto POS) e **C-72** (asporto 22:30 POS, ritirato in anticipo). Consegnato e saldato:
**C-71** (domicilio 22:15, 15,80 contanti con sconto 1 €, «paga con 50»). D5 è tornato libero.
Lasciati come trovati gli altri (C-10 compreso).

## Il ricontrollo (1024×768)

| | Chiesto | Letto | |
|---|---|---|---|
| 1 | La colonna della comanda scorre; totale e INVIA sempre in vista | `aside.cassa-comanda` alta 768, `overflow-y: auto`, dentro 845 px col banco (2 righe), 768 col tavolo (3 righe), 875 col domicilio a pannello pieno, 789 con l'asporto. `.c-totale` è `sticky` a 644–694 (620–694 col domicilio: consegna e sconto), **INVIA IN CUCINA a 724–768** in tutti e quattro i casi, in vista senza scorrere. Le righe partono da 90 px e crescono (146 con tre pizze) | ✓ |
| 1b | …col pannello pieno sul domicilio | «📞 Prova Critico Tre … Via Nomentana 120 · BOLOGNA SPALLANZANI (1,00 €)» · capricciosa + marinara · Oggi 22:15 · Contanti · **paga con 50** · sconto 1 € Applica («−1,00 €») · note → «+ consegna 1,00 € · − sconto 1,00 € · 15,80 € · INVIA IN CUCINA», INVIA a 724. Il campo «paga con…» (566–606) e lo sconto stanno sopra il totale fisso: si vedono; coupon/sconto/nome/note da 504 a 744 scorrono sotto il totale (serve una rotella di 107 px per vederli tutti, ed è giusto così) | ✓ |
| 2 | Il banco non parte senza Contanti/POS e lo dice | Banco → marinara + funghi → INVIA → **«scegli Contanti o POS.»** (riga a 688 px, INVIA diventa spento). Contanti → INVIA → «Ordine n. 69 inviato in cucina · 14,60 € contanti.» | ✓ |
| 3 | Lo spazio in `/cassa/rider` | «17:00 · RIDER DI PROVA · **deposito dal rider** alla cassa · 1 consegne saldate · + 16,80 €» | ✓ |
| 4 | Tasti della barra in cima e della comanda ≥ 44 | Barra: «⌂ · DATI CLIENTE · ORDINE · SALA» e le categorie tutte **44**. Comanda: Banco/Tavolo/Asporto/Domicilio, −/+, Varianti, Togli, tastierino, INVIA (44) ✓. **Ma otto tasti della comanda sono ancora a 40**: Adesso, Contanti, POS, Già pagato, Applica, €, %, Svuota. In `/cassa` le carte: tutti 44 ✓ | metà |

Una cosa nuova che nasce dalla correzione: **il messaggio verde si infila sotto INVIA**. L'esito
(«Ordine n. 69 inviato in cucina · 14,60 € contanti.», 63 px) sta a 688–751 nella colonna, e il
blocco fisso totale+INVIA occupa 644–768: a scorrimento zero l'elemento sotto il mouse a 730 px è
INVIA, non il messaggio. Si legge la prima riga («Ordine n. 69 inviato in cucina») e la seconda
(«14,60 € contanti») è coperta, finché non si scorre la colonna di 90 px. Lo stesso per «scegli
Contanti o POS.» (688–738). Il messaggio dovrebbe stare **dentro** il blocco fisso, sopra il
totale, non nel flusso che ci passa sotto.

## La serata (1024×768)

| Passo | Pagina | Com'è andata |
|---|---|---|
| Banco (C-69) | `/cassa/nuovo` | Sopra: prima senza pagamento (rifiutato con la frase), poi Contanti → «Ordine n. 69 inviato in cucina · 14,60 € contanti.» |
| Tavolo D5 (C-70) e il conto | `/cassa/tavoli`, `/cassa/nuovo` | Apri D5 (2 coperti) → Tavolo → D5 → margherita 8,50 + napoli 9,50 + diavola 9,50 (listino sala ✓) + nota → «Ordine n. 70 · tavolo D5 inviato in cucina · 27,50 €.» con INVIA a 706–768 e le tre righe tutte in vista (146 px). Nessuna riga pagamento sul tavolo ✓. Conto: «TAVOLO D5 · 2 coperti · 0 min · ORDINE C-70 · 1× La margherita 8,50 · 1× La napoli 9,50 · 1× La diavola 9,50 · TOTALE 27,50 · Stampa · CONTANTI · POS» → POS (518–570) → «D5 · LIBERO». In `/cassa`: «C-70 · RITIRATO · tavolo D5 · cassa · 17:12 · POS · 27,50 € · Note: giro 18 tavolo» |
| Domicilio con tutto (C-71) | `/cassa/nuovo?telefono=…` | Sopra. **Il resto però è sbagliato a video**: la cassa dice «Resto da portare: **33,20 €**» (50 − 16,80, cioè senza lo sconto), il rider legge «paga con 50,00 € → resto **34,20 €**» (50 − 15,80, giusto). Due numeri per la stessa cosa; quello della cassa è quello che il cassiere dice al telefono |
| Asporto preordine ritirato in anticipo (C-72) | `/cassa/nuovo`, `/cassa` | Asporto → funghi → Oggi 22:30 → POS → nome → INVIA (724) → «Ordine n. 72 · Prova Critico Diciotto inviato in cucina per oggi alle 22:30 · 8,20 € POS.» In `/cassa` Preordini: «Comanda · Stampa ora · Modifica · In preparazione · Ritirato · Annullato» (tutti 44) → Ritirato → «C-72 · RITIRATO · ritiro · cassa · 17:13 · per le 22:30 · Prova Critico Diciotto · POS · 8,20 €» in griglia, Preordini da 3 a 2 |
| Rider su C-71 | mappa, `/rider`, `/cassa/rider` | Mappa: «71 · C-71 · per le 22:15 · Via Nomentana 120 · Assegna a…» → «Rider di prova (1 in corso)». Rider: «#71 · ASSEGNATA · BOLOGNA SPALLANZANI · per le 22:15 · Via Nomentana 120 00161 Roma · Prova Critico Tre · ⚠ citofono rotto … · 15,80 € in contanti · **paga con 50,00 € → resto 34,20 €** · 1× La capricciosa · 1× La marinara · Note: giro 18 domicilio» (il resto al rider è una bella cosa) → RITIRATA → CONSEGNATA → «Hai in mano 15,80 € · da versare in cassa 15,80 €». Borsello: «DA SALDARE · 15,80 € IN MANO · depositi 137,70 €» → Salda → «saldate 1 consegne, versati 15,80 €» · «LIBERO · 0,00 € · DEPOSITI 153,50 €» ✓ |
| Dal sito (W-73) | `/ordina` | Ritiro → margherita → Aggiungi → funghi → Aggiungi → Avanti → 22:45 → dati → Bancomat → Conferma → «GRAZIE PROVA! · W-73 · Ti aspettiamo oggi alle 22:45 in Via Novara 5/7. Paghi col POS in pizzeria. · Totale 15,40 €» |
| Il riepilogo | `/cassa/riepilogo` | sotto |

### Il riepilogo, attesi e letti (17:16)

Base a fine giro 17: contanti 205,20 · POS 51,40 · aperti 49,20; la Direzione ha annullato C-61,
C-62, C-64 e W-68 (aperti −42,00 → 7,20, solo C-10).

| Voce | Atteso | Letto | |
|---|---|---|---|
| In cassa · contanti | 205,20 + C-71 saldato 15,80 = **221,00** | **221,00 €** | ✓ |
| In cassa · POS | 51,40 + D5 27,50 + C-72 8,20 = **87,10** | **87,10 €** | ✓ |
| Ai rider · contanti | **0,00** | 0,00 € | ✓ |
| Ancora aperti | C-10 7,20 + C-69 14,60 + W-73 15,40 = **37,20** | **37,20 €** | ✓ |
| Venduto | 221,00 + 87,10 + 37,20 = **345,30** | 345,30 € | ✓ |

Quarta serata di fila che torna. Lo sconto di C-71 entra giusto (15,80, non 16,80).

## I difetti, dal più grave

1. **«Resto da portare: 33,20 €» in cassa, «resto 34,20 €» dal rider**: la cassa calcola il resto
   sul totale senza lo sconto manuale. Il cassiere lo dice al cliente, il rider porta un euro in
   più. (`/cassa/nuovo`, riga del resto.)
2. **Il messaggio dell'invio (e «scegli Contanti o POS.») sta sotto il blocco fisso**: a
   scorrimento zero la seconda riga è coperta da INVIA. Era il motivo per cui si voleva il
   messaggio in vista; ora c'è, ma a metà.
3. **Otto tasti della comanda a 40 px** (Adesso, Contanti, POS, Già pagato, Applica, €, %,
   Svuota): proprio Contanti e POS, che adesso sono obbligatori al banco.
4. Il totem alle 17 è chiuso: riepilogo e «grazie» ancora da vedere.

## Voti per pagina

| Pagina | Voto | Perché |
|---|---|---|
| `/cassa/nuovo` a 1024×768 | **8** (era 5) | INVIA e totale sempre in vista in tutti i tipi, il banco pretende il pagamento; resta il resto senza sconto, il messaggio mezzo coperto e i tasti a 40 |
| `/cassa` a 1024 | 9 (era 8) | Tasti 44, ritiro in un tocco, solo stasera |
| `/cassa/tavoli` + conto | 9 | Tre righe, «ORDINE C-70», due tocchi |
| `/cassa/mappa` | 8 | Come prima |
| `/rider` | 9 | «paga con 50,00 € → resto 34,20 €» è il dettaglio giusto |
| `/cassa/rider` | 9 (era 8) | Lo spazio c'è, i numeri tornano |
| `/cassa/riepilogo` | 9 | Quattro serate di fila |
| `/ordina` a 1024 | 9 | Come prima |
| `/totem` | — | Chiuso prima delle 18:30 |

**Giro 18: 8 su 10** (era 7). La postazione da 1024×768 adesso funziona; i tre difetti sono di
rifinitura, ma il primo è un euro sbagliato detto al cliente.

## Risposta (chat principale, 24/10/2026)

- (a) «Resto da portare» ora scala anche il coupon e lo sconto manuale: dice lo stesso euro che legge il rider.
- (b) Messaggio dell'invio e «scegli Contanti o POS» stanno nel blocco fermo in fondo (`.c-fondo`, insieme a totale e INVIA): niente più sotto il bordo.
- (c) Nella comanda sul PC nessun tasto sotto i 44 px, anche con lo stile in riga (`nuovo.css`).
- (d) Totem: dopo le 18:30.
- C-69 e W-73 annullati.
