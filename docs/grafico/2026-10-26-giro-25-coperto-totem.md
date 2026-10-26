# Giro 25 del grafico: il coperto nel conto del tavolo, il totem a 1080×1920 (26/10/2026)

Il giro parte da `ec8a1ae` (main), sul ramo `grafico/giro-25`, in una cartella di lavoro mia. Un commit per
pagina, nessun push su main, niente database, nessun ordine.

**Come ho guardato le pagine.** Senza Chrome: tutto in locale con Playwright.
- Il conto di /cassa/tavoli è montato col `globals.css` vero e i caratteri veri (@fontsource), con il markup
  della pagina e tre conti di prova: 2 ordini e 2 coperti, 1 ordine e 1 coperto, 3 ordini da 18 righe e 6 coperti.
- Il totem gira davvero (`next dev`) con un Supabase finto: le chiamate `totem_menu` e `ordine_da_totem_api`
  rispondono con il menù letto dalle migrazioni 0013 e 0021 (136 prodotti in 13 categorie, la Burgeria
  esclusa come in produzione, 40 aggiunte). Metà delle foto risponde, metà dà 404 apposta. Il giro fa
  tutti i passi: avvio, le 13 categorie, la scheda di una pizza con un'aggiunta e quantità 2, un dolce dal
  nome lungo, carrello, nome sulla tastiera (MASSIMILIANO), pagamento, grazie.

## 1. /cassa/tavoli, il conto col coperto — `64e2bac`

**Prima.** La riga «2× Coperto 3,00 €» (aggiunta a video dal commit della mig. 0065) stava in coda alle righe
dell'ultimo ordine, identica a una pizza: con due ordini sembrava del secondo. L'intestazione diceva
«1 coperti». Sul PC un conto lungo faceva scorrere tutto il foglio: a 1280×800 e 1024×768 il totale e
Contanti/POS finivano sotto il bordo.

**Ora.**
- Il coperto ha la sua riga col filo sopra (non tratteggiato), quantità e nome in grigio, accanto
  «1,50 € a persona»; il prezzo resta nero come gli altri. Stampato a 80 mm va in nero.
- «1 coperto» al singolare.
- Sul PC il foglio fa come a 390 dal giro 13: scorrono solo le righe, intestazione, totale e tasti restano fermi.

| | prima | dopo |
|---|---|---|
| Conto lungo, totale e tasti in vista (1280, 1024, 390) | no, no, sì | sì, sì, sì |
| Conto corto, altezza del foglio a 1280 | 587 px | 593 px |
| Testi < 13 px, tasti < 44 px, fuori dal bordo (tutte e tre le misure) | 0, 0, 0 | 0, 0, 0 |

Stessi tocchi, stesso ordine. Foto: `lettura/giro25/{prima,dopo}-{piccolo-2cop,piccolo-1cop,lungo-6cop}-{1280,1024,390}.png`.

## 2. I «da decidere» del giro 23 e 24

- **INVIA stretto sul PC (giro 23)**: già chiuso dalla chat principale in `005b272` (il blocco in fondo è
  una colonna anche sopra i 600 px). Non c'era niente da fare.
- **L'indice del menù (giro 23)**: fatto nel giro 24.
- **Le categorie di /cassa/nuovo** (colonna a 1024, fila a 390): cambiano la disposizione della pagina
  della sera, restano a Edoardo. Non toccate.
- **La Burgeria fra le categorie di /cassa/nuovo** e **il tasto per chiamare su /segui quando l'ordine è
  annullato**: sono funzioni, non aspetto. Restano alla chat principale.

## 3. /totem a 1080×1920 — `71f657d`

Il totem vero è un PC Windows con un browser a tutto schermo in verticale. Oltre a 1080×1920 ho
misurato 864×1536 e 720×1280, cioè lo stesso schermo con la scala di Windows al 125 e al 150 %: se il
PC non è al 100 %, la pagina vede quelle misure.

**Non esce niente.** Su tutti i passi e su tutte e 13 le categorie, alle tre misure: 0 elementi fuori
dallo schermo, 0 scorrimento di lato, 0 testi tagliati, 0 tasti sotto i 72 px, e le barre in fondo
(«Vedi ordine», «Annulla / Aggiungi», «Avanti») sempre dentro lo schermo. I nomi lunghi (LA MARGHERITA
CON BUFALA, BARATTOLO COCCO MANGO E PASSION FRUIT) vanno a capo dentro la loro carta.

**Il difetto trovato: le foto che non si caricano.** Le foto stanno ancora sul CDN di WebApp. Il totem
guardava solo se il prodotto aveva un link: quando il link non rispondeva, la carta mostrava l'icona
dell'immagine rotta su un riquadro vuoto. Ora la foto che non si carica lascia il posto al bollino, come
per i prodotti senza foto.

| Con metà delle foto fatte fallire | prima | dopo |
|---|---|---|
| Immagini rotte a video (13 categorie) | 63 | 0 |
| Bollini al posto della foto | 17 | 80 |

Foto: `lettura/giro25/{prima,dopo}-totem-{1080,864,720}-{1-avvio … 9-fatto}.png`.

**Da sapere.**
- Solo a 720×1280 (Windows al 150 %) i due testi piccoli dell'avvio scendono a 16 px («Tocca lo
  schermo per iniziare», «Ordina e ritira al banco»): sono in `vw`. Al 100 % e al 125 % sono 24 e 19.
  Sul PC del totem conviene la scala al 100 %: è un'impostazione di Windows, non del codice.
- Al passo «Pagamento» la metà bassa dello schermo è vuota e «Conferma» sta a metà altezza, mentre
  negli altri passi l'azione sta nella barra in fondo. Spostarla è un cambio di posto di un tasto: lo
  propongo, non l'ho fatto.
- /ordina ha lo stesso `Foto` senza ripiego: stessa correzione, da fare nel prossimo giro (un commit a pagina).

## Da decidere

1. /cassa/nuovo: le categorie in colonna a 1024 e in fila a 390 (giro 24, Edoardo).
2. /totem, «Conferma» del pagamento nella barra in fondo come gli altri passi (Edoardo o chat principale).
3. Il PC del totem con la scala di Windows al 100 % (chi lo installa).
