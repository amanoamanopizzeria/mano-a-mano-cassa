# Giro 24 del grafico: l'origine sulle carte di /cassa, «Chiama la pizzeria» su /segui, l'indice del menù (25/10/2026)

Il giro è partito dal deploy 59b62eb, dopo averne visto lo stato READY. Ho fatto un commit per pagina e non ho fatto push: il push lo fa il coordinatore.

Ho toccato solo l'aspetto delle pagine: i tocchi sono gli stessi, non ho scritto niente nel database e non ho fatto ordini.

Gli ordini veri di stanotte arrivano solo da Cassa e da Sito. Per vedere tutte e sette le origini ho cambiato a video le classi delle prime sette carte (App, Telefono, Just Eat, Glovo, Deliveroo, Cassa, Sito). La modifica restava solo nel browser e non ha toccato nessun dato.

## 1. /cassa, la pastiglia dell'origine — `1fc5fdd`

**Prima (59b62eb).** Le pastiglie erano piene: vino, giallo, arancio, salmone e beige. Sulla stessa carta c'erano già la fascia gialla o salmone a sinistra e lo stato grigio o verde, quindi una carta poteva avere tre colori pieni. In più il testo bianco era poco leggibile: su arancio (Just Eat) e su salmone (Glovo, Deliveroo) il contrasto era 2,5:1.

**Ho scelto il velo con il bordo.** Il colore pieno lo tiene solo la fascia, che dice il tipo: consegna nostra oppure ritiro della piattaforma. La pastiglia dice da dove arriva l'ordine con un bordo e un testo del suo colore, su un velo chiaro dello stesso colore, in Oswald maiuscolo come gli stati.

Il velo si vede a colpo d'occhio più del solo bordo, e fa meno «arcobaleno» del pieno. Ho provato anche la versione col solo bordo su bianco: si legge, ma a 1024 si nota meno.

| Origine | Testo su velo | Contrasto |
|---|---|---|
| App, Sito | vino su #f7e8ed | 7,9:1 |
| Telefono | #6b5200 su #fff4c2 | 6,7:1 |
| Just Eat | #a34f00 su #ffeedd | 5,0:1 |
| Glovo, Deliveroo | #9a3d16 su #fde8de | 5,8:1 |
| Cassa | grigio su bianco | 5,4:1 |

**L'altezza della riga non cambia.** La pastiglia non alza la riga: il bordo da 1,5 px è compensato da `line-height: 14px; vertical-align: middle`. La prima prova alzava ogni carta di 3 px, cioè 210 px in tutto a 390.

**A 390, «Link per il cliente» a tutta riga.** Restava da solo a metà riga, con un buco accanto. Adesso l'ultimo tasto della carta, se resta da solo, prende tutta la riga.

**«Pronto».** Stanotte non c'era nessuna carta in consegna con il rider assegnato, quindi «Pronto» non l'ho visto dal vero. È un tasto `.azione` come gli altri passi, con la stessa forma.

**Misure.** L'altezza della pagina è la stessa di prima: 8831 px a 1024 e 20740 a 390. Testi sotto 13 px: 0. Tasti sotto 44 px: 0. Elementi fuori dal bordo: 0.

Foto: `lettura/giro24-cassa-origine-390-prima-dopo.png` e `lettura/giro24-cassa-origine-1024-prima.png`.

## 2. /segui, «Chiama la pizzeria» — `c21833a`

**Prima.** Il tasto aveva una forma sua: angoli da 12 px (la pagina usa 4 px), altezza 43 px, testo da 16 px, nessuna ombra.

**Ora.** Ha la stessa forma di «Apri in Google Maps»: altezza 52, angoli da 4, ombra e testo da 17. Resta vino, perché è l'azione principale. Il numero sta accanto, più leggero, così si legge anche senza chiamare.

**Misure.** L'ho misurato montando la pagina col CSS vero e un ordine in viaggio. Il tasto passa da 43 a 52 px, quindi i tasti sotto 44 passano da 1 a 0. Testi sotto 13: 0. Fuori dal bordo: 0.

Foto: `lettura/giro24-segui-chiama-prima-dopo.png`.

**Da sapere.** Un ordine annullato dice «Per qualsiasi cosa chiamaci», ma in quel caso il tasto per chiamare non c'è. Aggiungerlo è una funzione, quindi lo decide la chat principale.

## 3. /cassa/menu, l'indice — `7a0746c` (il CSS è dentro 77975f3)

In cima alla pagina c'è una striscia vino che resta ferma mentre si scorre, come la striscia delle categorie di /ordina. Contiene il nome del gruppo (Pizze, Cucina, Bar) e, dopo ognuno, le sue categorie.

Con un tocco si arriva alla carta della categoria, che si ferma sotto la striscia. L'ho provato su «Fritti»: la carta si ferma a 56 px dall'alto, sotto la striscia alta 44.

Nell'indice ci sono solo le categorie con almeno un prodotto in vendita: 13 su 14. La Burgeria è tutta spenta, quindi resta nella pagina ma non compare nell'indice.

**Larghezze.**
- A 390 la striscia scorre di lato, con voci alte 44.
- Sul PC va su due righe (88 px) e non scorre. L'ancora lì ha 100 px di margine.

**Misure.** La pagina a 390 passa da 6865 a 6922 px (8,1 schermate; erano 8,4 prima che i burger fossero spenti). Testi sotto 13: 0. Tasti sotto 44: 0. Fuori dal bordo: 0.

Foto: `lettura/giro24-menu-indice-390.png`.

**Nota sul commit.** Il CSS della striscia stava nel mio albero di lavoro non ancora committato quando è stato fatto 77975f3, ed è finito dentro quel commit. Il mio commit contiene il markup e il margine dell'ancora a 1024. Su main è tutto coerente.

## Le categorie di /cassa/nuovo dopo 77975f3 (da decidere)

Non ho rimpicciolito niente. Con le categorie quasi raddoppiate, le 14 tessere occupano molto spazio:

| | Spazio delle categorie | Spazio per i prodotti | Pizze classiche viste insieme |
|---|---|---|---|
| 1024×768 | 360 px su 768 (4 righe da 84) | 343 px | 12 su 22 |
| 390×844 | 380 px (5 righe da 70) | 183 px, fra le categorie e il pannello chiuso | 6 su 22 |

Foto: `lettura/giro24-cassa-nuovo-categorie-1024-390.jpg`.

**Proposta, con le misure di oggi:**
- **A 1024**, le categorie in una colonna a sinistra larga circa 150 px, che scorre da sola. I prodotti avrebbero tutta l'altezza (circa 700 px) e su tre colonne entrerebbero tutte e 21–22 le pizze. Le categorie vanno in colonna invece che in griglia: è un cambio di disposizione, gli stessi tocchi restano.
- **A 390**, le categorie in una fila sola di tessere grandi (70 px) che scorre di lato, come la striscia di /ordina. I prodotti salirebbero da 183 a circa 490 px. Arrivare alle categorie in fondo alla fila richiede però una passata di dito, quindi questa la deve decidere Edoardo.

**Da sapere:** in /cassa/nuovo la Burgeria compare ancora fra le categorie, anche se i burger sono spenti.
