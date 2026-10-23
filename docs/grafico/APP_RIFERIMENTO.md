# L'app «A Mano A Mano Pugliese»: come è fatta, schermata per schermata

*Studio del grafico, 24/10/2026. Edoardo: «prima studia e poi sviluppiamo». Serve
a portare il totem verso l'app. Questo è solo lo studio: il totem non è stato
toccato.*

## Fonti

- **App Store** (`id6453763774`, «A Mano A Mano Pugliese»): **3 screenshot**,
  solo iPhone 6,5″ (1242×2688). La pagina dichiara anche iPad e Mac, ma non
  pubblica immagini per loro. Le ho contate dal codice della pagina: sono 3,
  più un segnaposto.
- **Google Play** (`it.webapp.amanoamanopugliese`): le stesse 3 immagini.
- **Ordine online**: amanoamano.it → Ordina apre la WebApp
  (`service.web-app.it/…/webapp.php?area_clienti=amanoamanopugliese`), con lo
  stesso motore dell'app e la stessa veste. In fondo alla schermata Info
  c'è scritto «Velocissimo ver. 5.9». L'ho percorsa fino al carrello e **non ho
  mai premuto «Ordina»**.
- Le foto stanno in `lettura/app-riferimento/` (01–25), fuori da git. Il
  numero tra parentesi quadre dopo ogni schermata è quello del file.

Non ho potuto vedere **notifiche, coupon, registrati, porta un amico, chi siamo
e prenota un tavolo**. Stanno solo nell'app installata. Nell'ordine online
c'è soltanto «I miei ordini», e per vederla piena bisogna aver ordinato. Di
queste schermate si vede solo la tessera nella home dello screenshot 1. Per
vederle servirebbe un telefono con l'app e un'utenza, e io non posso crearne.

## Il carattere dell'app in sei righe

1. **Due fasce in testa, sempre**: sopra la **sabbia** `#C9A981` (circa 40 px)
   col logo lineare nero «AMANOAMANO» a sinistra e una (i) vino a destra. Sotto
   la **barra vino** `#8D0536` (circa 34 px), con «‹ Indietro» bianco a
   sinistra e il titolo del passo, bianco, grassetto e centrato («Ordina»,
   «Dettagli», «Carrello», «Info»).
2. **Fondo bianco piatto.** Niente schede con l'ombra nelle liste: righe
   separate da un filo grigio chiaro.
3. **Un solo pulsante d'azione, largo, in fondo.** È sabbia, col testo bianco
   in grassetto e angoli quasi vivi (3–4 px), su una fascia grigio chiaro
   `#EDEDED`. Dice cosa succede e quanto costa: a sinistra il **numero
   degli articoli in un quadratino sabbia più scuro**, al centro l'azione
   («Vai a carrello», «Aggiungi 1 al carrello», «Ordina»), a destra il
   **totale**. Quando non si può premere diventa sabbia sbiadita.
4. **Il vino serve solo a dire dove sei.** È il colore della barra, della
   categoria scelta, del giorno e della fascia oraria scelti, e del tondo della
   ricerca. Il sabbia serve per agire: pulsanti, link («Aggiungi prodotti»,
   «Rimuovi», «Modifica»), coupon.
5. **I titoli delle sezioni sono centrati e in grassetto, con una riga nera
   sottile sotto** che va da un bordo all'altro: «NOVITA'», «Quantità»,
   «Modifica ingredienti», «Giorno», «Orario», «Il tuo ordine», «Pagamento».
   È la cosa che si ripete di più.
6. **Il carattere è quello di sistema** (SanFrancisco, Verdana). Non c'è
   Oswald: il «tono» lo danno il logo, le pennellate della home dell'app e i
   colori.

## Le schermate

### App: home [03, 12]
- Fascia sabbia col logo lineare. Sotto c'è una **grande foto** (le mani
  nell'impasto) col **bollino** sopra, a metà altezza.
- Due **pennellate inclinate** (pennello a secco, angoli sfrangiati): «ORDINA
  SUBITO» vino col testo bianco e «PRENOTA UN TAVOLO» sabbia col testo nero,
  tutte e due in un maiuscolo stretto e alto, tipo Oswald.
- Una **griglia 3×2 di tessere bianche** con gli angoli arrotondati e un'ombra
  leggera. Ognuna ha un'icona a due colori (contorno sabbia e dettaglio vino)
  e un'etichetta maiuscola sotto: I MIEI ORDINI, REGISTRATI, NOTIFICHE,
  COUPON, PORTA UN AMICO, CHI SIAMO.
- Lo screenshot 2 è solo pubblicità: «Registrati ed effettua il tuo ordine
  da app», due telefoni inclinati, testo nero in maiuscolo stretto.

### App: Ordina [04]
- Fascia sabbia, barra vino «‹ Ordina» con le icone.
- Due **pulsanti rettangolari sabbia**, grandi e larghi quanto lo schermo, con
  un'icona bianca grande (scooter e scatola) e il testo bianco. È la scelta tra
  consegna e ritiro.

### Web: home [05, 13]
- Fascia sabbia, bollino centrato (circa 150 px), «A MANO A MANO PUGLIESE» in
  maiuscolo grassetto.
- **«Ordina subito»**: sabbia, testo bianco, alto 41 px e largo circa 230 px.
  **«I miei ordini»**: grigio chiaro, testo nero.
- Se il carrello ha qualcosa, la fascia «[2] Vai a carrello 24,70 €» resta in
  fondo **anche nella home**. Il carrello si vede da ovunque.

### Web: consegna o ritiro, preordina [06, 07]
- Due pulsanti sabbia con l'icona, come nell'app.
- Fuori orario c'è una **finestra bianca al centro** («Preordina», con gli
  orari) e un OK sabbia. La pagina sotto si scurisce.
- Se il carrello era già aperto: la finestra «Carrello aperto» con «Sì,
  continua» (sabbia) e «No, ricomincia» (grigio scuro) [16].

### Web: il menù [08, 10, 17, 18, 23]
- **Categorie**: una seconda fila **dentro la barra vino**, scorrevole in
  orizzontale. Nomi in maiuscolo grassetto bianco: quello scelto è pieno con
  una sottolineatura bianca, gli altri sono semitrasparenti. Le categorie
  sono NOVITA', PIZZE SPECIALI, PIZZE CLASSICHE, VETRINA NAPOLI, PUCCE
  PUGLIESI, MENU, FRITTI, DOLCI, LA NOSTRA CANTINA, BIRRE, BEVANDE. Le
  categorie non hanno foto.
- **Una colonna sola**, centrata (circa 800 px anche su schermo largo). Per
  ogni sezione c'è il titolo centrato con la riga sotto.
- **La riga di un prodotto**:
  - a sinistra il **nome in grassetto** (maiuscolo se è scritto così nel
    menù: le pizze sì, «Menù Classico X1» e «Coca 1,5lt» no);
  - sotto, la **descrizione** in tondo nero;
  - in basso a sinistra il **prezzo in grassetto nero** («9,90 €»);
  - a destra una **foto quadrata di circa 80 px**. Le pizze sono fotografate
    dall'alto su un **fondo sabbia uniforme**: tutte uguali, si legge la
    pizza e non lo sfondo. Le bibite sono scontornate sul bianco.
  - La riga è alta circa 125 px, separata da un filo.
- **Etichette** a pillola accanto al prezzo: «! Novità» magenta, «★ Eccellenza»
  arancio.
- **Nel carrello**: sulla riga compare un quadratino sabbia con il numero
  (es. «1») all'altezza del nome, a destra [10].
- **Cerca**: un tondo vino in basso a destra. Toccato, apre una fila «Cerca..»
  vino più chiaro al posto delle categorie e diventa una ✕ [24].
- **In fondo**, sempre: «[n] Vai a carrello  totale».

### Web: dettagli di un prodotto [09, 21]
- È una pagina intera, non un foglio che sale. Barra vino «Dettagli» (o
  «Scegli La tua Pizza/Puccia #1» dentro un menù).
- Il nome è centrato e grassetto. Sotto c'è la **foto quadrata di circa
  145 px** su sabbia, poi la descrizione a sinistra.
- **Quantità**: titolo con la riga, **− 1 +** in due tondi grigi `#EDEDED` da
  circa 36 px e il numero grande in mezzo.
- **Modifica ingredienti**: una riga per ogni ingrediente della pizza, con i
  tondi **− e +** a destra. Il − toglie, e nel carrello diventa «SENZA
  Radicchio» barrato.
- **Aggiungi ingredienti**: gruppi con il titolo maiuscolo grassetto a
  sinistra (IMPASTO, LATTICINI, …). Le righe hanno il nome a sinistra e un
  **tondo grigio «+» a destra**. Il prezzo dell'aggiunta non si vede qui: si
  vede nel carrello («CON Impasto Alto (1,00 €)»).
- In fondo: **«Aggiungi 1 al carrello  9,90 €»** sabbia. Il numero segue la
  quantità.

### Web: un menù (combo) [19, 20, 22]
- «Componi il tuo menu e continua». Per ogni scelta c'è una **casella
  tratteggiata** larga quanto la colonna: «La tua Pizza/Puccia #1», «#2»,
  «La tua bevanda grande».
- Toccata, la casella apre **una pagina con la lista delle pizze**, come il
  menù ma senza prezzo, con la barra vino «Scegli La tua Pizza/Puccia #1».
  Toccata una pizza, si apre la sua pagina con le varianti, e in fondo «Scegli
  La tua Pizza/Puccia #1».
- Tornati al menù, la casella fatta **perde il tratteggio**: piccolo «La tua
  Pizza/Puccia #1» sopra e il nome scelto («L'ORTOLANA») sotto.
- Sotto c'è la quantità − 1 +. In fondo «Aggiungi 1 al carrello», **sbiadito
  finché non hai scelto tutto**.
- Nel carrello: «1x MENU CLASSICO X1» e sotto, più piccole, le scelte una per
  riga, con il SENZA barrato.

### Web: il carrello [11, 25]
- Barra vino «Carrello». Una colonna con le sezioni, ognuna col titolo e la riga:
  - **Indirizzo di consegna** (solo per la consegna), con «Modifica» sabbia;
  - **Giorno**: una fila di tasselli grigi «Sab 24, Dom 25…», quello scelto
    vino col testo bianco;
  - **Orario**: tasselli grigi scorrevoli. Al ritiro sono i quarti d'ora
    «19:00», alla consegna le mezz'ore «20:00-20:30». Quello scelto è vino;
  - **Il tuo ordine**: «Aggiungi prodotti» (link sabbia), poi le righe
    «1x NOME  prezzo» con le varianti piccole sotto e «Rimuovi» sabbia a
    destra; «Consegna 1,00 €» come riga a sé; «Aggiungi una nota»;
  - **Codice sconto** (campo grigio + «Applica» sabbia) e **coupon** (riquadro
    puntinato sabbia);
  - **Pagamento**: caselle quadrate grigie con la spunta nera. Al ritiro
    «Contanti alla cassa», «Bancomat alla cassa», «Pagamento online»; alla
    consegna «Contanti alla consegna», «Pagamento online».
- In fondo: **«[2] Ordina  24,70 €»** sabbia. È l'unico punto dove l'ordine
  parte, e qui mi sono fermato.

### Web: I miei ordini, Info [14, 15]
- I miei ordini: barra vino (il titolo resta «ORDINA SUBITO») e una sola riga
  centrata «Non hai ancora effettuato nessun ordine».
- Info: bollino, nome, pulsante sabbia «Privacy Policy», in fondo il
  marchio Velocissimo e «ver. 5.9».

### App: notifiche, coupon, registrati, porta un amico, chi siamo
Non visibili da qui (vedi «Fonti»): ci sono solo le tessere della home.

## Cosa portare nel totem, e cosa no (per quando si svilupperà)

| Dall'app | Al totem 1080×1920 | Note |
|---|---|---|
| Fascia sabbia + barra vino col titolo del passo | Sì, più alte (circa 96 + 84 px), titolo e «‹ Menù» da 26–34 px | Il bollino nostro a destra al posto della (i) |
| Categorie come tab bianche nella barra vino | Sì, al posto dei tondi con la foto | Tab alte 80 px, testo 26 px; la scelta sottolineata |
| Lista a una colonna, foto quadrata a destra su sabbia | Sì, con la foto molto più grande (circa 230 px) | Le nostre foto vengono dallo stesso CDN: le pizze hanno già il fondo sabbia |
| Prezzo in grassetto nero in basso a sinistra, pillola «Novità» | Sì | Pillola vino invece che magenta: il magenta non è del marchio |
| Titoli di sezione centrati con la riga | Sì, ovunque (menù, scheda, carrello) | |
| Pulsante unico sabbia in fondo con il numero e il totale | Sì, sempre visibile e alto più di 100 px | **Testo nero, non bianco**: bianco su `#C9A981` ha un contrasto di circa 2:1 e non si legge da un metro |
| Varianti come righe con il tondo «+» a destra | Sì, con tondi da 60–72 px | |
| Menù combo a caselle tratteggiate che aprono una pagina | **No, per ora**: il nostro combo a passi resta com'è (regola del coordinatore) | Si può prendere il «tratteggiato → pieno» come segno di «fatto» |
| Dettagli prodotto a pagina intera | Da decidere: oggi è un foglio che sale dal basso | Cambiarlo cambia il passo: chiedere a Edoardo |
| Carattere di sistema | **No**: restano Oswald e Figtree | Regola del marchio |
| Giorno, orario, codice sconto, coupon, pagamento online | **No**: il totem è al banco, adesso, contanti o POS | |

La bozza di sviluppo (non pubblicata) è in
`lettura/totem-bozza/giro5-bozza.patch`, fuori da git.
