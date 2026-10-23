# Giro 4b del critico — la grafica del grafico, vista da cassiere e da cliente (23/10/2026, 08:05–08:20)

> Il grafico ha rifatto l'aspetto di quasi tutte le pagine (giro 1 e giro 2,
> `docs/grafico/`). Il voto qui lo do io, da cassiere con la fila davanti e da
> cliente che guarda lo schermo. Deploy di produzione `be580a2` (READY alle
> 08:03), che porta `c6945a3` e tutti i commit del grafico. Niente
> Velocissimo, nessuna utenza, nessuna password. Ordine di prova creato:
> **C-11** (asporto, oggi 21:00, 2× La margherita, 14,40 €). Il tavolo D1 l'ho
> aperto, mandato al conto e liberato: è tornato libero.

**Come sono entrato.** Browser già loggiato con l'utenza di Edoardo, finestra a
1280 px; i 640 e 1024 px della cassa li ho misurati montando la pagina in un
riquadro della larghezza voluta e leggendo da dentro (colonne, pannello,
`elementFromPoint` sulle categorie, pulsanti su più righe, testi sotto i 13 px).
Orario di Roma 08:05–08:20: fuori orario, totem non guardato (come chiesto).

---

## I voti

| Pagina | Prima | Ora | In una riga |
|---|---|---|---|
| `/cassa/nuovo` | 8 | **8** | Tutto al suo posto: 6/4/3 colonne, pannello 340/300/250, categorie raggiungibili a 640. Più leggibile. L'errore in vino però non sembra più un errore. |
| `/cassa/cliente` | 8 | **8** | Nome grande, note fisse su velo oro: si vede. «mappa» è un link piccolo e grigio; «15.40 €» ha ancora il punto. |
| `/cassa/fasce` | 7 | **8** | Grigio/oro/vino si capiscono al volo, la legenda li nomina. Il «2» accanto alla lente non dice cos'è. |
| `/cassa/capacita` | 7 | **7** | Pulito. «SOLD OUT» da solo non dice se sono finite le pizze o le consegne (a 20:30 sono le consegne, 1/1, e le pizze sono 5/20). |
| `/cassa` (lista) | 7 | **8** | «DOMANI alle 20:30» in vino: risolto il difetto del giro 4. «non stampata» in grigio. Ma stato, prezzo e tasto d'azione sono tutti dello stesso vino. |
| `/` (home) | — | **8** | Dodici porte, logo nostro, si legge. «Nuovo ordine», la porta che si apre cento volte a sera, è in terza fila. |
| `/cassa/mappa` | 5 | **7** | Finalmente la pizzeria, la goccia col numero, la legenda e le schede. Ma fra le «consegne in corso» c'è APP-2, consegnata ieri alle 03:11. |
| `/cassa/rider` (borsello) | 8 | **9** | «In mano» grande, i quattro tasti col verso scritto, «+ 20,00» verde / «− 20,00» vino: il «−» del giro 4 adesso si spiega da solo. |
| `/cassa/riepilogo` | — | **7** | Quattro numeri grandi, totale con la virgola. Ma «di oggi» conta anche C-10, che è per domani: 7 ordini e 128,60 € contro i 6 e 121,40 € di `/cassa/fasce`. |
| `/cassa/tavoli` | — | **7** | Libero grigio, occupato oro, conto vino: tre stati, tre colori, si capisce. Ma 35 tavoli = 12 file da scorrere: la sala non si vede in una schermata. |
| `/cassa/menu` | — | **8** | Una riga per prodotto, prezzo in colonna, spenti barrati ma leggibili. I doppioni spenti a 0,00 € confondono (due «La margherita ricca»). |
| `/login` | — | **8** | Bollino, «ACCEDI» in Oswald, un solo tasto vino. Da loggiato la pagina si apre lo stesso invece di rimandare in cassa. |

Misure dal sito (`be580a2`): a 640, 1024 e 1280 px nessun testo sotto i
13 px sulle pagine della cassa (gli unici due a 12 px sono «Open chat» e
«Dismiss», che non sono nostri), nessun pulsante su più righe, nessuno
scorrimento orizzontale. Le tessere con nomi lunghi («I fiori e il
datterino») vanno a capo dentro la tessera, com'è giusto.

---

## 1. `/cassa/nuovo` — 8

**Più chiaro di prima.** La barra vino con il titolo in Oswald si legge da
lontano; la categoria attiva in vino pieno si distingue dalle altre, che prima
erano tutte colorate e urlavano insieme; la striscia di 4 px sotto la tessera
basta a ritrovare il reparto. Il `2×` in vino e il totale grande in basso a
destra si leggono anche di sfuggita. «Invia in cucina» spento (rosa) e acceso
(vino) si distinguono.

**Tutto al suo posto?** Sì. A 1280: 6 colonne di tessere, pannello 340 px,
tastierino, Adesso/Giorno/Ora, COUPON, Note, Svuota + totale, Invia. A 640
(riquadro): 3 colonne, pannello 250 px (x 397–634), Fritti/Bevande/Birre/
Cantina/Menù tutti raggiungibili con `elementFromPoint`, «Invia» a y 805 su
873 visibile. A 1024: 4 colonne, pannello 287 px, «Invia» a y 700 su 768. Il
titolo lungo va coi puntini. Varianti: «← Prodotti» bianco col bordo vino,
IMPASTO attivo in vino, CON in vino e SENZA bianco col bordo oro.

**Cosa confonde.**
- **L'errore in vino non sembra un errore.** «A quest'ora non si ritira
  (ritiro 19:00–22:45)…» sta in un riquadro vino, dello stesso colore di
  «Invia in cucina», della categoria attiva e del totale. Prima era rosso e
  l'occhio si fermava; adesso è «un altro riquadro vino». Il verde della
  conferma invece si stacca bene. Riprodurre: Asporto, un prodotto, Adesso,
  Invia alle 08:00.
- Con Asporto/Domicilio scelto compare la riga Contanti/POS/Già pagato e la
  lista della comanda si riduce a ~70 px a 713 di altezza: con quattro righe
  nell'ordine si vede solo l'ultima. Non è nuovo del grafico, ma la riga in più
  lo peggiora. Riprodurre: Asporto, quattro prodotti diversi.
- Nella barra delle varianti i gruppi finiscono con «VERDURE» tagliato a
  destra senza segno che ce ne siano altri (a 1280 ci stanno tutti e sei:
  è il bordo del pulsante che tocca il bordo della colonna).

## 2. `/cassa/cliente` — 8

**Più chiaro.** Nome in Oswald, telefono tabulare a destra, la stella oro coi
punti, le note fisse su velo oro con la barra: la prima cosa che il cassiere
deve leggere è la prima che vede. «Salva scheda» a tutta larghezza in vino.

**Cosa confonde.**
- «Via Nomentana 120 00161 Roma **mappa**»: «mappa» è un link a 13 px grigio
  sottolineato, lo stesso stile delle fonti. Un cassiere che vuole vedere dove
  sta il cliente non lo vede.
- «Ultimi ordini: #8 · domicilio · cassa · **15.40 €**» col punto, mentre
  ovunque nell'app c'è la virgola (il riepilogo è stato corretto, questa no).
- La riga «CASSA — CLIENTE» e la barra del telefono occupano un terzo dello
  schermo a 1280; non è un difetto, ma la scheda del cliente comincia a metà.

## 3. `/cassa/fasce` — 8

**Più chiaro.** Testata in Oswald, pillole grigie quando c'è posto, vino
«1/1» a 20:30 (sold out consegne): si vede subito dov'è il problema. La legenda
in fondo dice «grigio: posti liberi · oro: quasi piena · vino: sold out».

**Cosa confonde.**
- Il **«2» in vino accanto alla lente** (20:30, 20:45, 21:00) non ha etichetta:
  è il numero degli ordini della fascia, ma la legenda non lo dice; a 21:00 c'è
  «2» e «4/20» e uno pensa a due pizze.
- La legenda sta solo in fondo, dopo 18 righe: in alto non c'è.
- La riga «6 ordini · 16 pizze · 2 consegne · 121,40 €» è a 13 px grigio in
  alto a destra: è il numero più utile della pagina ed è il più piccolo.

## 4. `/cassa/capacita` — 7

**Più chiaro.** L'ora a 18 px, le schede bianche, SOLD OUT in vino.

**Cosa confonde.**
- **«SOLD OUT» non dice di cosa.** A 20:30 la scheda dice «Pizze 5 / 20 ·
  Consegne 1 / 1» e la pillola «SOLD OUT»: sono finite le consegne, non le
  pizze, e il cassiere che deve decidere se accettare un asporto lo capisce
  solo leggendo le due righe piccole. Riprodurre: `/cassa/capacita` di oggi,
  scheda 20:30.
- «Blocca pizze» e «Blocca consegne» sono due pillole bianche identiche, una
  accanto all'altra, su 19 schede: 38 pulsanti uguali. Non si vede se una
  fascia è già bloccata senza leggere.
- «Pizze 0 / 20 · Consegne 0 / 2» a 13 px grigio sotto l'ora: il numero che
  conta è piccolo, l'ora che è uguale per tutti è grande.

## 5. `/cassa` (lista) — 8

**Più chiaro.** Numero «C-11» in Oswald, totale grande vino, «DOMANI alle
20:30» in vino (risolto il n. 2 del giro 4), «non stampata» in grigio scuro
(risolto il n. 7), la nota fissa del cliente su velo oro con il ⚠.

**Cosa confonde.**
- **Lo stato, il prezzo e l'azione sono dello stesso vino.** Pillola
  «RICEVUTO» vino, «14,40 €» vino, pulsante «In preparazione» vino: tre cose
  diverse, un colore. Dal fondo della cassa non si distingue una scheda da
  lavorare da una già in lavorazione. «CONSEGNATO» verde e «ANNULLATO» grigio
  invece si vedono.
- «In preparazione» (vino, pieno) è il pulsante più grosso della scheda ed è
  l'unico pieno: sembra lo stato, non l'azione da fare.

## 6. `/` — 8

**Più chiaro.** Logo lineare nostro, dodici porte bianche col titolo vino e la
riga oro sotto, un sottotitolo per ciascuna: si capisce cosa c'è dietro.

**Cosa confonde.**
- L'ordine delle porte è quello di un elenco, non di una serata: «Cassa»,
  «Rider», «Cliente» in prima fila; **«Nuovo ordine»** (quella che si apre
  ogni due minuti) in terza fila a sinistra, «Totem» in seconda.
- Il logo in alto è piccolo (≈ 150 px) e grigio; sulla pagina d'accesso c'è
  il bollino grande: due loghi, due pagine.

## 7. `/cassa/mappa` — 7 (era 5)

**Più chiaro.** La mappa parte dalla pizzeria col bollino nel disco oro, la
goccia oro «8» (C-8, Via Nomentana 120) sta dove deve, la legenda a sei voci
sotto la mappa, le schede dei rider («FERMO», «0 consegne in corso · nessuna
posizione») e delle consegne con numero, ora, via e stato. Dal 5 del giro 3 e
4 è un'altra pagina.

**Cosa confonde o è sbagliato.**
- **Fra le «consegne in corso» c'è «#2 · per le 03:11 · DA ASSEGNARE»**: è
  APP-2, che in `/cassa` è **CONSEGNATO** da ieri notte. La consegna nella
  tabella `consegna` è rimasta `da_assegnare` (letto dal database: tre righe,
  tutte `da_assegnare`, una è l'ordine APP-2). La mappa dice 3 consegne in
  corso, la lista ne ha 2. Riprodurre: `/cassa/mappa`, sezione Consegne in
  corso. Non è grafica, ma lo vede chi guarda la mappa.
- «#5 · per le 20:30 · senza indirizzo»: C-5 è un domicilio senza indirizzo
  (ordine di prova del giro 1). La scheda lo dice, ma la goccia non c'è e
  nessuno capisce che è un ordine da sistemare: «senza indirizzo» andrebbe in
  vino, non in grigio.
- Le consegne portano «#2», «#5», «#8» mentre in `/cassa` sono «APP-2»,
  «C-5», «C-8»: due nomi per lo stesso ordine (anche nel riepilogo, vedi sotto).
- Il rider «senza posizione» ha nella legenda un disco grigio, ma sulla mappa
  non c'è nessun disco: va bene così (non si sa dove metterlo), ma la legenda
  promette una forma che non compare.

## 8. `/cassa/rider` (borsello) — 9

**Più chiaro.** «0,00 €» a 34 px in vino con «in mano» sotto; «0 da saldare
0,00 € · prelievi 20,00 € · depositi 20,00 €» leggibili; «SALDA — LE CONSEGNE
FATTE TORNANO IN CASSA» spento quando non c'è niente da saldare. Il pannello:
Importo grande, Note, **Fondo** oro «dalla cassa al rider, a inizio serata»,
**Prelievo** bianco bordo vino «dalla cassa al rider», **Deposito** bianco
bordo verde «dal rider alla cassa», Chiudi crema. Nei movimenti «fondo (dalla
cassa al rider) · − 20,00 €» vino e «deposito (dal rider alla cassa) · + 20,00 €»
verde: il difetto del giro 4 («− 20,00 si capisce solo sapendo che il fondo
esce dalla cassa») è risolto.

**Cosa confonde.** Poco. «Fondo» oro pieno e «Prelievo» bianco hanno lo
stesso verso (cassa → rider) e colori diversi, «Deposito» (rider → cassa) è
verde come il «+»: funziona, ma l'oro del fondo non vuol dire niente di suo.
Il testo sotto i tasti («dalla cassa al rider, a inizio serata») è a 13 px:
al limite.

## 9. `/cassa/riepilogo` — 7

**Più chiaro.** Ordini 7, Pizze 17, Consegne 2, Totale 128,60 € (con la
virgola) a 34 px; i canali «CASSA 6 ordini · APP 1 ordine»; le schede con
numero e totale in vino.

**Cosa è sbagliato.**
- **«Riepilogo di oggi» conta un ordine di domani.** Fra gli ordini c'è «#10 ·
  cassa · ritiro · per le 20:30» che è C-10 di **domani** (in `/cassa` dice
  «DOMANI alle 20:30»; nel database `ora_consegna` è il 24/10). Così il
  riepilogo dice 7 ordini · 17 pizze · 128,60 € mentre `/cassa/fasce` di oggi
  dice 6 · 16 · 121,40 €: la differenza (1 ordine, 1 pizza, 7,20 €) è C-10.
  Due pagine, due numeri per la stessa sera. Riprodurre: con C-10 in piedi,
  aprire `/cassa/fasce` e `/cassa/riepilogo`.
- Le schede dicono «#10», «#4», non «C-10», «APP-4» come in `/cassa`.
- Nella scheda «per le 20:30» senza il giorno: lo stesso difetto della lista
  del giro 4, qui non corretto.

## 10. `/cassa/tavoli` — 7

**Più chiaro.** D1 aperto con 2 coperti: scheda su velo oro, pillola
«OCCUPATO» oro, «2 coperti · 0 min», tasti Conto e Libera; al conto: velo
vino e pillola «CONTO» vino, resta solo «Libera»; liberato: torna grigio.
Tre stati, tre colori, e i numeri in ordine (D1, D2, … D20).

**Cosa confonde.**
- **La sala non si vede in una schermata.** 35 schede alte 100 px su 3
  colonne: a 1280×713 ne entrano 9, e per vedere se F12 è libero si scorre
  quattro volte. In sala il colpo d'occhio è tutto; qui è una lista. Le
  schede potrebbero essere un quarto (numero + colore), ma non lo decido io.
- «Apri» in vino pieno su 35 schede libere: 35 pulsanti vino identici; il
  colore dell'azione è lo stesso dello stato «conto».

## 11. `/cassa/menu` — 8

**Più chiaro.** Categoria in Oswald vino, una riga per prodotto, prezzo a
destra in colonna con la virgola, «Varianti: Impasto (2) · Latticini (13)…»
in fondo a ogni categoria, i prodotti spenti barrati ma leggibili.

**Cosa confonde.**
- Nelle Pizze classiche ci sono doppioni spenti a «0,00 €» («La margherita
  ricca» due volte, «La margherita con bufala» due volte, «La boscaiola» a
  0,00 €): barrati e grigi si leggono, ma un cassiere che cerca un prezzo
  trova due righe con lo stesso nome. È il menù importato, non la grafica,
  ma ora che si legge bene si vede.
- «Sola lettura: il menù si cambia dal back office e dal database» a 13 px
  grigio: la frase che spiega perché non si può toccare niente è la più
  piccola.

## 12. `/login` — 8

**Più chiaro.** Bollino centrato, «ACCEDI» in Oswald, scheda bianca coi due
campi, «ACCEDI» vino a pillola, «Registrati» bianco sotto. Un occhio e si sa
cosa fare.

**Cosa confonde.**
- Da loggiato, `/login` si apre lo stesso coi campi vuoti (il browser li
  riempie in azzurro da solo): un cassiere che ci finisce per sbaglio pensa
  di essere uscito. Riprodurre: loggiati, andare su `/login`.
- «Registrati» su una cassa: un cliente al banco può crearsi un'utenza? Già
  segnalato nei giri precedenti, resta.

---

## I tre difetti più gravi

1. **`/cassa/riepilogo` conta domani dentro oggi**: 7 ordini · 128,60 € contro
   i 6 · 121,40 € di `/cassa/fasce`; la differenza è C-10 per domani. Due
   numeri per la stessa sera.
2. **`/cassa/mappa` tiene «in corso» una consegna consegnata ieri** (APP-2,
   03:11): la riga `consegna` resta `da_assegnare` quando l'ordine passa a
   consegnato. La mappa dice 3 consegne, la lista ne ha 2.
3. **Il vino fa tutto**: in `/cassa` stato «RICEVUTO», prezzo e tasto «In
   preparazione» sono dello stesso colore; in `/cassa/nuovo` l'errore è vino
   come il tasto «Invia». Lo stato, l'azione e l'errore andrebbero distinti,
   non per forza con un colore nuovo: basta che non siano tutti pieni.

## Cosa resta da provare

- Totem in orario (18:30–22:45): categorie col bollino, menù, conferma.
- `/rider` con un'utenza rider; la mappa con un rider che manda la posizione
  (le linee rider → consegna).
- `/cassa/nuovo` a 390 px non è una pagina da telefono: non l'ho misurata.

## Risposta (23/10/2026, mig. 0029 + codice)

I tre gravi: il riepilogo «di oggi» conta per la sera di consegna (il preordine di domani non c'è più, come in Fasce); la consegna segue l'ordine (consegnato → consegnata, mig. 0029, righe vecchie sistemate: la #2 non è più «in corso» sulla mappa); gli errori tornano rossi (`--errore`), distinti dal vino delle azioni; in Capacità al posto di SOLD OUT c'è il perché: PIZZE FINITE, RIDER PIENI, BLOCCATO, NO CONSEGNE. I minori restano in lista per il prossimo giro del grafico.
