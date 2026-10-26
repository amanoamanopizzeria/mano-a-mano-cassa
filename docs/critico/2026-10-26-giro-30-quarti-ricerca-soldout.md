# Giro 30 — uscite a quarto d'ora, −/+ della serata, SOLD OUT su /ordina, ricerca cliente (26/10/2026)

Deploy provati: `3591dc9` (uscite a quarto d'ora) e, a metà giro, `68826f0` (il giorno col nome e la
data, niente «Preordini 0»), entrambi READY. Ricerca: `1471dbd` (mig. 0071). Orario: 03:28–03:50 di
Roma (02:28–02:50 UTC), lunedì 26/10, quindi la «serata in corso» per l'app è ancora quella del 25.
Browser: Claude in Chrome a 1288×925, sessione di Edoardo. Database letto col connettore, solo in
lettura (`tnuyeyqwoqhmgpskqtuq`).

In parallelo un'altra sessione creava ordini di prova (W-106, W-108, clienti «PROVA Rossi/Russo»
0009990041/46, una «Chiamata delle 03:34»): non sono miei e non li ho toccati.

## Cosa ho creato, e com'è finito

| Cosa | Dettaglio | Stato finale |
|---|---|---|
| Cliente | «Prova Critico giro 30», 0009990030, Via Nizza 10 (CAP 00198), nota «PROVA critico 30» | resta (scheda di prova) |
| C-112 | domicilio, oggi 26/10 19:00, 19,00 € contanti | **consegnato**: portato fino in fondo per la prova, poi **non si annulla** (vedi D4) |
| C-113 | ritiro, oggi 26/10 20:15, «Prova Critico giro 30 ritiro», 8,50 € | annullato |
| C-114 | domicilio, domani 27/10 20:00, 22,00 € | annullato (consegna `annullata`) |
| C-115 | domicilio, domani 27/10 21:15, 20,00 € | annullato (consegna `annullata`) |
| Capacità 26/10 | prima 18 righe, pizze 32 e consegne 3 | dopo: identica (32/3, 18 righe) |
| Capacità 27/10 | prima nessuna riga (regola: 35 pizze, 2 consegne) | dopo: nessuna riga («Torna alla regola») |

Da fare per chi sviluppa: **C-112 resta consegnato** (19,00 € contanti, senza rider) e va tolto a mano
o da una funzione di storno: dalla cassa non c'è nessun tasto.

## 1. «In uscita a quarto d'ora» — voto B (7,5/10)

Cosa ho fatto: quattro ordini in quattro quarti d'ora diversi (due giorni), poi aperto `/cassa`.

Funziona:
- È la prima vista (`In uscita a quarto d'ora 4`). Una riga per quarto d'ora, divisa per giorno:
  «LUNEDÌ 26 OTTOBRE» con 19:00 e 20:15, «MARTEDÌ 27 OTTOBRE» con 20:00 e 21:15. Le pillole
  dicono numero, stato, cliente, via, totale.
- Il domicilio delle 19:00 dice **«entro le 19:30»**, l'intestazione «consegna entro le 19:30 · 1
  ordine · 1 consegna». Il ritiro delle 20:15 dice «entro le 20:15». Giusto.
- **Ritardo**, provato spostando in avanti l'orologio della pagina (solo nel browser, `Date.now`):
  alle 20:40 del 26 il ritiro C-113 diventa «in ritardo di 25 min» e la riga «passato»; alle 20:42
  del 27 il domicilio C-114 diventa «in ritardo di 12 min» (12 dopo le 20:30, non dopo le 20:00).
  L'intestazione del giorno diventa «martedì 27 ottobre · serata in corso».
- Tocco su una pillola: si apre la carta sotto la riga con Comanda, Stampa, Link per il cliente,
  Modifica, il passo successivo, Annullato.
- C-112 portato avanti dalla carta: Ricevuto → In preparazione → Pronto → In consegna (tutte e tre
  restano in vista, la pillola cambia etichetta) → **Consegnato: sparisce** dalla riga e dal conto
  del filtro. Gli annullati spariscono al secondo tocco («Sicuro? Tocca ancora»).
- La colonna di sinistra si aggiorna da sola: 19:00 «2/32 · 1/3», 20:15 «1/32».

Già sistemato durante il giro (`68826f0`, letto nel codice e visto a video): alle 3 di notte con
`3591dc9` gli ordini del 26 sarebbero finiti sotto «Domani» (la serata finisce alle 6); ora c'è il
nome del giorno e la data. Anche il riquadro vuoto «Preordini 0» non compare più.

Difetti:
- **D1 (medio) — un ordine aperto di ieri sparisce dalla vista, e «Ieri e prima» non lo fa
  tornare.** Prova: con l'orologio della pagina al 27/10 20:42, C-113 (ritiro del 26 alle 20:15,
  ancora «ricevuto») non c'è più in nessuna riga. Tocco su «Ieri e prima (98)»: il tasto diventa
  «Nascondi ieri e prima» ma la pagina non cambia (0 carte, pillole C-114 e C-115 soltanto). Nel
  codice `vecchiAperti` vale solo per la griglia degli altri filtri, e `inUscita` tiene solo stasera
  e i giorni dopo. Un ritiro o una consegna dimenticati senza «Ritirato/Consegnato» escono dalla
  vista principale senza dirlo. Serve almeno una riga «Rimasti aperti da ieri (N)» in cima.
- **D2 (lieve)** — nei quarti senza consegne l'intestazione dice «fra 998 min» (20:15, alle 03:38):
  per un quarto di stasera fra 16 ore un numero di minuti non si legge; meglio «fra 16 h» o niente.
- **D3 (lieve)** — «In consegna» senza rider: la pillola e la carta non dicono «nessun rider», e in
  `consegna` resta `id_rider` vuoto con stato `consegnata`. Alle 3:40 di notte ho potuto segnare
  consegnato un ordine delle 19:00 di stasera senza nessun avviso (né «è fra 15 ore», né «manca il
  rider»).
- **D4 (medio, già visto al giro 28 con C-92)** — un ordine consegnato non si annulla più dalla
  cassa: in «Chiusi» la carta di C-112 ha solo Comanda, Stampa, Link. Un «Consegnato» toccato per
  sbaglio (è il tasto accanto ad «Annullato») resta per sempre.

Non provato: la vista a 390 px; ordini da Glovo/Deliveroo.

## 2. −/+ di «Pizze» e «Consegne» e «Annulla» — voto B− (7/10)

Cosa ho fatto: + sulle consegne, poi Annulla; + sulle pizze e Annulla subito (con uno script nella
pagina, per toccare dentro i 6 secondi); poi il caso con un quarto chiuso.

Funziona:
- + consegne: 3 → 4 su tutti i 18 quarti (database: `consegne`, 18 righe a 4), «Salvato · Annulla»
  compare. + pizze: 32 → 33 in 0,36 s, Annulla rimette 32 in 1,7 s; il database torna a 32/3 su 18
  righe. Il «−» delle consegne ha rimesso il 4 a 3.
- Con l'orologio vero, «Annulla» resta 6 secondi: al primo tentativo, toccando dopo aver guardato la
  foto, era già sparito (il mio tocco è andato a vuoto). Per un cassiere che guarda lo schermo va
  bene; per chi tocca e poi pensa è stretto.

Difetti:
- **D5 (medio) — «Annulla» dopo un «−» riapre un quarto che era chiuso.** Prova: da `/cassa/fasce`
  ho messo le consegne delle 22:45 di oggi a 0 (le altre a 3). In `/cassa`: «−» consegne → 22:30
  3→2, 22:45 resta 0/0; «Annulla» → 22:30 torna 3, **22:45 diventa 0/1**. `cambia()` fa
  `max(0, attuale + delta)` e l'Annulla fa `attuale − delta` sul numero nuovo, non rimette quello di
  prima. Una sera con l'ultimo quarto chiuso per mancanza di rider, un «−» toccato per sbaglio e
  annullato riapre un posto che non c'è. `/cassa/fasce` lo fa giusto (`prima`), la colonna no.
  (Rimesso a 3 a mano dopo la prova.)
- **D6 (lieve)** — il «−» si spegne guardando solo il primo quarto (`n <= 0` di `primo`): se il
  quarto in corso è a 0 e gli altri no, non si può togliere a nessuno.
- **D7 (lieve)** — «Da adesso a fine serata» usa il giorno di calendario (`oggi()`): dopo
  mezzanotte, a serata ancora aperta, i −/+ cambiano i quarti della sera dopo. Alle 3:30 la colonna
  mostrava i quarti del 26 dalle 18:30, non quelli della serata in corso. Da guardare insieme alla
  regola delle 6 di `/cassa`.
- **D8 (lieve)** — ogni tocco scrive 18 righe in `fascia_capacita` anche quando torna uguale alla
  regola: dopo + e Annulla il giorno resta «a mano» e un cambio di turno in `/cassa/capacita` non lo
  sposta più. Oggi il 26 ha già 18 righe (32/3) da prima del giro.

## 3. /ordina e il SOLD OUT — voto A− (8,5/10)

Cosa ho fatto: in `/cassa/fasce`, 27/10, consegne delle 20:45 da 2 a 0 con due «−». Poi `/ordina` →
Consegna a casa → «via nizza 10» → due Diavole → Avanti → Domani.

Funziona:
- Domani mostra tutti i quarti dalle 19:00 alle 22:30, **«20:45 SOLD OUT»** al suo posto, grigio
  (`disabled`, opacità 0,45). Tocco sopra: non succede niente, la barra resta «domani alle 19:00».
- `sito_fasce('ritiro', '2026-10-27')`: 20:45 **non** è piena per il ritiro, perché le consegne a 0
  non toccano le pizze. Giusto.
- Ripristino: tocco sul numero delle 20:45 → «Torna alla regola» → nessuna riga per il 27 nel
  database, come prima.

Difetti:
- **D9 (lieve)** — «SOLD OUT» è scritto piccolo, in vino, dentro un tasto a opacità 0,45: su un
  telefono al sole si legge male. Il testo della frase sopra («Quelli SOLD OUT sono pieni») aiuta.
- Non provato: un cliente che aveva già scelto le 20:45 prima che si riempissero (la pagina non
  rilegge le fasce da sola; dipende dal controllo del server all'invio).

## 4. Ricerca in /cassa/cliente — voto B (7/10)

Cosa ho fatto: ricerche scritte nel campo, con il tempo dalla battuta alla lista ferma.

| Scritto | Cosa è uscito | Tempo |
|---|---|---|
| `nomentana` | lista di clienti in Via Nomentana, prima quelli che hanno ordinato | ~0,5 s |
| `ventisei` | 1: «Prova Critico Ventisei», Via Novara 9 (trova il nome; «26» scritto in lettere non è un civico, ed è giusto così) | 0,8 s |
| `347` | 30 clienti, anche con 347 **in mezzo** al numero (es. 327**8347**…) e in ordine di nome, non prima chi comincia con 347 | 0,6 s |
| `via novara 9` | 30 clienti in Via Novara con civici 17, 27, 33…: **Via Novara 9 è al 22° posto** | 0,5 s |
| `novara 9` | i due «PROVA» dell'altra sessione in cima (hanno ordinato oggi), poi civici a caso | 0,5 s |
| `nicolo` e `nicolò` | stessa lista, «Nicolò …» trovati in tutte e due | 0,5–0,6 s |
| `demoia` | «… demoià» trovato | 0,5 s |
| `universita` | «Viale dell'Università» trovato | 0,5 s |
| `d'amuri` | i due «D’Amuri» (apostrofo curvo nel database) trovati | 0,6 s |
| `damuri`, `dippolito` | **nessuno** | 0,5–0,6 s |
| `3477270655` (numero intero) | 1 cliente | 0,5 s |

«+ Nuovo cliente» dopo «Prova Critico giro 30»: il nome passa nella scheda, il campo di ricerca si
svuota. Salvato con 0009990030, Via Nizza (scelta da Google) 10 e la nota: nel database
«Via Nizza», «10», «00198», «PROVA critico 30». «Salva e prendi l'ordine» apre la comanda col cliente
e la zona «PORTA PIA PIAZZA FIUME (1,00 €)».

Difetti:
- **D10 (medio) — il civico corto trova tutto.** `via novara 9`: la parola «9» si cerca come pezzo di
  testo dovunque, quindi va bene anche il CAP 00198/00199 e i civici 19, 29, 39…; i 60 clienti di
  Via Novara passano tutti, la lista si ferma a 30 e l'ordine non premia il civico giusto. Nel
  database ci sono **2** clienti in Via Novara 9: nella lista ne compare **uno, al 22° posto**,
  l'altro è tagliato fuori dai 30. Con la via e il civico, che al telefono sono la cosa più sicura,
  il cliente giusto deve venire primo: un numero da solo andrebbe confrontato col civico intero
  (uguale o «9/A»), non come pezzo di testo, e non col CAP.
- **D11 (lieve)** — un pezzo di telefono si cerca anche in mezzo e l'ordine non mette prima chi
  *comincia* così: `347` dà in cima un 327… e un 329…. Chi detta il numero dice le prime cifre.
- **D12 (lieve)** — l'apostrofo conta: `damuri` e `dippolito` non trovano «D’Amuri» e «D'IPPOLITO».
  Al telefono il cassiere scrive senza apostrofo. Basterebbe toglierlo in `testo_semplice` da tutti e
  due i lati.
- **D13 (lieve)** — dopo «+ Nuovo cliente» il cursore resta nel campo di ricerca, non va su
  «Telefono»: il numero che ho scritto è finito nella ricerca (che l'ha copiato anche nella scheda).
  Poi è comparso «Nessun cliente con …», la scheda è scesa di ~40 px e il mio tocco successivo è
  andato nelle note del cliente invece che nella via.

## Voti

| Pagina | Funziona | Veloce | Chiaro | Meglio di oggi | Voto |
|---|---|---|---|---|---|
| `/cassa` uscite a quarto d'ora | B | A | B+ | A− (2Bit non ha l'«entro le») | 7,5 |
| Colonna −/+ | B− | A | B | B | 7 |
| `/ordina` SOLD OUT | A | A | B+ | A | 8,5 |
| `/cassa/cliente` ricerca | B− | A | B | A− (in 2Bit solo per telefono) | 7 |

**Giro: 7,5 su 10.**

## Difetti in ordine di gravità

1. D5 — «Annulla» dopo «−» riapre un quarto chiuso (22:45 da 0 a 1).
2. D10 — `via novara 9` mette il cliente giusto al 22° posto e ne taglia fuori un altro.
3. D1 — ordine aperto di ieri sparito dalla vista principale; «Ieri e prima» lì non fa niente.
4. D4 — consegnato non si annulla (C-112 resta da togliere).
5. D3 — consegnato alle 3:40 un ordine delle 19:00, senza rider e senza avviso.
6. D7 — dopo mezzanotte i −/+ cambiano la sera dopo.
7. D11, D12, D13 — ordine dei numeri, apostrofo, cursore dopo «+ Nuovo cliente».
8. D2, D6, D8, D9 — «fra 998 min», «−» guardando il primo quarto, 18 righe a mano, SOLD OUT poco leggibile.
