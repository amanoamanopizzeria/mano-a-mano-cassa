# Grafico, giro 14 — Rider, borsello, comanda a 80 mm, «Grazie» e Segui (24/10/2026)

Quattro pagine, un commit ciascuna, su `main` da `8bc3deb`; deploy READY
(`452af32`, poi il commit del rapporto). Nessun flusso cambiato, nessuna
scrittura sul DB: le schede del rider e la comanda modificata sono state
montate con markup finto sul CSS vero (non ci sono consegne in corso e un
ordine modificato non si fabbrica).

## 1. `/rider` a 390 — `bff7f73`

«⇄ Stesso indirizzo di #43: portale insieme» è un tassello vino col numero in
Oswald 17 (era una riga vino da 15); «In tutto da incassare in contanti» è un
tassello oro con la cifra Oswald 26 vino a destra (era grigia con la cifra 18);
il GPS è una riga da 13 col pallino verde/grigio (era 14 sotto il titolo).
Ritirata/Consegnata 64 px, Naviga/Chiama 56, come prima. 1,3 schermate con una
consegna, 0 testi < 13, 0 tasti < 40 prima e dopo. Nel commit del rapporto il
tassello «Stesso indirizzo» è diventato un blocco (a 390 la pillola andava a
capo in tre pezzi).

## 2. `/cassa/rider` — `22187a1`

A 390 le voci «in corso · da saldare · fondo e prelievi · depositi» sono
righe col filo, etichetta grigia a sinistra e cifra 17 a destra (prima una
riga che andava a capo a caso); dai 900 px tre colonne con etichetta Oswald
13 e cifra Oswald 20. Movimenti: nome Oswald 17, il verso e la nota sulla
seconda riga a 14 (in riga a 1024). 390: 1,1 → 1,2 schermate; 0/0 prima e dopo.

## 3. `/cassa/comanda/[id]`, stampa a 80 mm — `80a768e`

MODIFICATA · RISTAMPA ha la cornice doppia oltre allo sfondo nero; NUOVA un
riquadro col bordo da 2 px e la riga nuova il filo nero da 8 a sinistra; TOLTE
è una banda nera col bordo sopra un filo doppio e le righe tolte hanno la barra
da 3 px; in `@media print` `print-color-adjust: exact` e gli sfondi forzati.
Così si legge anche su una termica che non stampa gli sfondi. I tasti
Stampa / Torna alla cassa da 37 a 44 px (nel commit del rapporto). 0 testi
< 13 nella comanda, anche con NUOVA e TOLTE montate.

## 4. `/ordina` («Grazie») e `/segui` a 390 — `452af32`

La lapide «A MANO A MANO · PUGLIESE» (Oswald 13 spaziato, come sul sito) sotto
la spunta del «Grazie» e sotto il titolo nella barra vino di `/segui`; l'errore
«Questo link non corrisponde…» ha il «!» vino in cerchio come l'esito non ok.
0 testi < 13, 0 tasti < 40, una schermata.

Foto: `lettura/giro14-prima-rider-comanda-borsello.jpg`, `lettura/giro14-dopo-rider-comanda-borsello.jpg`.
