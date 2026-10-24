# Giro 10 del grafico — riepilogo, capacità, l'avviso delle fasce (24/10/2026)

Tre pagine, un commit ciascuna, misure prima/dopo a 390×844 e 1024×768 con il
metro dei giri precedenti (testi < 13 px, tasti < 40 px, sfora, schermate).
Deploy `READY` controllato dal connettore. Foto in `lettura/giro10-*.jpg`
(fuori da git). Non toccati `docs/critico` e le migrazioni. La foto d'avvio
del totem (`mani-farina.jpg`, 4967ddc) sta bene in verticale con
`object-fit: cover` e il respiro già in CSS: non serviva altro.

## 1. /cassa/riepilogo, il blocco «Cassa» — `9824a1b`

Prima le sette (o più) cifre della cassa erano tutte uguali, carte da 44 px
in griglia: «In cassa · contanti» come le altre, i contanti in mano ai rider
come carte in più. Dopo:

- **«In cassa · contanti»** è una carta vino grande (56 px, bordo vino, sotto
  «quello che conti a fine serata») a sinistra: è la cifra che conta a fine
  serata;
- le altre sei (POS in cassa, ai rider contanti e POS, online nostro,
  piattaforme, ancora aperti) a 28 px in tre colonne a destra; **«Ancora
  aperti» si colora d'oro** quando c'è qualcosa da chiudere;
- i contanti **in mano a ogni rider** in una lista con la cifra a 24 in vino;
- sul telefono tutto in colonna: la grande a 48, le altre due a due.

Stessi numeri, stesse letture (`vendite_giornata_totali`, `rider_borsello`).

| 390 / 1024 | Prima | Dopo |
|---|---|---|
| schermate | 3,3 / 2,1 | 3,7 / 2,3 (la carta grande e la lista dei rider prendono più spazio: è voluto, la cifra si legge da lontano) |
| testi < 13 · tasti < 40 · sfora | 0 · 0 · 0 | 0 · 0 · 0 |

## 2. /cassa/capacita — `25ba9ea`

- Giorno, Pizzaioli e Rider con l'etichetta in Oswald e i numeri a 26 in
  Oswald su campi da 48 px; **«Salva turni»** 48 px che **diventa verde con
  «✓ Salvato»** (stesso secondo e mezzo di prima: ora si vede);
- la frase **«Ogni quarto d'ora: fino a N pizze e M consegne»** in un riquadro
  oro con N e M a 26 in vino (era grigia a 13 px);
- le carte dei quarti d'ora con l'ora 24 in Oswald, «Pizze 2 / 35» a 15/17,
  tasti Blocca da 44 px, filo oro a sinistra quando è piena o bloccata; due
  per riga sul telefono.

`salvaTurni` e `alterna` non cambiano.

| 390 / 1024 | Prima | Dopo |
|---|---|---|
| tasti < 40 px | 37 / 37 (Salva turni e i Blocca a 37) | **0 / 0** |
| schermate | 3,3 / 1,4 | 2,8 / 1,6 |
| testi < 13 · sfora | 0 · 0 | 0 · 0 |

## 3. /cassa/fasce, l'avviso «salvato · Annulla» — `9ca8648`

Il `div role="status"` fisso in fondo (critico giro 10) era una pillola
nera a 15 px con «Annulla» oro da 36 px, stili scritti nel JSX. Ora è la
classe `.f-salvato`: pillola vino con l'ora in Oswald a 18, «35 → 36» a 18,
«✓ salvato» in oro chiaro, «Annulla» bianco su vino da 44 px; sul telefono a
tutta larghezza sopra il bordo, con lo spazio del gesto di casa, ed entra dal
basso. Stesso `role`, stessi sei secondi, stesso `annullaUltimo`. I − e +
della tabella restano da 44 px (giro 7): a 390 la tabella sta in quattro
colonne senza scorrere di lato.

| 390 / 1024 | Prima | Dopo |
|---|---|---|
| tasti < 40 px (tabella) | 0 / 0 | 0 / 0 |
| «Annulla» nell'avviso | 36 px, oro su nero | 44 px, bianco su vino |
| schermate | 2,6 / 1,6 | 2,8 / 1,7 |

L'avviso compare solo dopo un − o un + veri, che salvano sul database: non
l'ho provocato sulle fasce di stasera. Misurato in CSS e nel codice.
