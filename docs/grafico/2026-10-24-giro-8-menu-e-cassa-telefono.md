# Giro 8 del grafico — il menù di /ordina e /cassa/nuovo sul telefono (24/10/2026)

Due pagine, un commit ciascuna, misurate a 390×844 prima e dopo con lo stesso
metro dei giri precedenti (testi < 13 px, tasti < 40 px, elementi che sforano,
schermate). Foto in `lettura/giro8-*.jpg` (fuori da git). Deploy `READY`
controllato dal connettore dopo ogni push.

## 1. Il menù di /ordina — `7a54009`

> «Il menu va molto migliorato, l'impaginazione e tutto il resto» · «graficamente
> ancora devi migliorare proprio tanto» — Edoardo, 24/10

Modello: l'app A Mano A Mano Pugliese (`docs/grafico/APP_RIFERIMENTO.md`).

- **Le categorie restano fisse** sotto le due fasce mentre si scorre (striscia
  `sticky` a 88 px, in Oswald a 15 px, ombra sotto).
- **Ogni riga**: nome in Oswald 20 px, descrizione in due righe (prima tre),
  prezzo 19 px grassetto in fondo a destra della colonna di testo, foto
  128 px a destra su sabbia; il contatore «nel carrello» sulla foto è vino.
- **La scheda prodotto** (`SchedaProdotto`): foto 124 px a sinistra con nome,
  descrizione e prezzo a destra; «Quantità − 1 +» in una riga; i cinque
  gruppi di ingredienti (Impasto, Latticini, Salumi e pesce, Spezie, Verdure:
  63 voci) sono **righe chiuse** che si aprono una alla volta, con le scelte
  fatte scritte in vino sulla riga. I gruppi dei menù (le scelte
  obbligatorie, con il numero del passo) restano aperti come prima.
- Flusso invariato: un tocco su «A casa»/«Lo ritiro» apre il menù;
  `scegliTipo`, `confermaCivico`, le fasce ed `Esito` non cambiano; a
  `ordine_dal_sito` arrivano gli stessi dati.

| Misura a 390×844 | Prima | Dopo |
|---|---|---|
| menù, schermate (22 pizze classiche) | 4,6 | 4,3, con le categorie sempre a vista |
| scheda prodotto, altezza del corpo / visibile | 4.032 / 680 px (5,9 schermate) | **680 / 680 px: una schermata** |
| testi < 13 px · tasti < 40 px · sfora | 0 · 0 · 0 | 0 · 0 · 0 |

## 2. /cassa/nuovo sul telefono — `9dc6599`

Prima, a 390 px, la pagina era quella del tablet in piedi: la colonna della
comanda larga 140 px a destra con tastierino e «Invia in cucina» schiacciati,
la barra in alto che sforava (3 elementi fuori misura).

Dopo, fino a 600 px:

- i prodotti prendono tutta la larghezza (3 colonne, come a 760);
- la comanda è un **pannello fisso in fondo**. Chiuso (172 px) mostra la
  maniglia «3 righe · Apri la comanda», il fascione **«Modifica C-xx»** quando
  c'è (14 px, tasto «Lascia stare» da 40), il totale a 30 px e «Invia in
  cucina»; aperto (743 px, 88dvh) mostra tipi, righe, −/+, tastierino, quando,
  coupon, nome e note, con «Invia in cucina» che resta in fondo;
- la barra in alto scorre di lato invece di sforare.

Sul PC (1024) e sul tablet (760) **non cambia niente**: la maniglia non
esiste sopra i 600 px, la colonna resta di fianco. Stessi tasti, stesse
funzioni, stessi dati: cambia solo dove stanno sul telefono.

| Misura a 390×844 | Prima | Dopo |
|---|---|---|
| sfora · scorre di lato | 3 · no | **0** · no |
| tasti < 40 px · testi < 13 px | 0 · 0 | 0 · 0 |
| comanda | colonna da 140 px | pannello 172 px chiuso / 743 aperto |

## Appunti

- Il metro segna «a capo» i pulsanti fatti di più `span` su una riga sola
  («Impasto · 2 scelte · ▾»): è il contatore, non il testo. Controllato in foto.
- Nel menù con 63 ingredienti una scheda «in una schermata» si ottiene solo
  chiudendo i gruppi: chi vuole aggiungere apre il gruppo e sceglie, un tocco
  in più per chi aggiunge, zero per chi ordina la pizza com'è (la maggioranza).
