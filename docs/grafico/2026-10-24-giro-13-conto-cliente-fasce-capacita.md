# Grafico, giro 13 — Il conto in sala, la scheda cliente, il planner a 1024, la capacità (24/10/2026)

Quattro pagine, un commit ciascuna, su `main`. I quattro commit sono arrivati
in produzione nel push del coordinatore (`d43f99e`, deploy READY), insieme
alla sua correzione; il CSS sta tutto in `globals.css` ed è nei commit del
planner e della capacità. Nessun flusso cambiato, nessuna scrittura sul DB
durante le misure (il conto e la scheda sono stati montati con markup finto
sopra il CSS vero, perché aprire un conto mette il tavolo «al conto»).

## 1. `/cassa/tavoli`, il conto — `7a547aa` (+ CSS in `3a7bebe`/`fd71976`)

Prima: le righe di tutti gli ordini del tavolo in fila, senza dire da quale
ordine venissero; foglio al centro, 616 px.
Dopo: sopra le righe di ogni ordine «ORDINE C-12» col numero visibile in vino
(e il totale dell'ordine se sono più d'uno); a 390 il conto è un foglio dal
basso alto al massimo il 92 % dello schermo, lo scorrimento è solo sulle
righe e Stampa / Contanti / POS restano sempre in vista.

| 390×844 | prima | dopo |
|---|---|---|
| altezza del conto (9 righe, 2 ordini) | 616 px, dal 228 | 598 px, dal 246 al 844 |
| tasti in vista senza scorrere | sì | sì (fondo a 831) |
| testi < 13 · tasti < 40 | 0 · 0 | 0 · 0 |

## 2. `/cassa/cliente` — `4056b61`

Nome Oswald 32 (era 26), telefono 20 (18), la prima via a 20 in grassetto
subito sotto il nome (prima stava solo nella lista a 16), le note fisse in un
riquadro oro da 17 con l'etichetta «NOTE FISSE» prima di «Prendi l'ordine»
(prima una riga sottile dopo i punti), la scheda col filo oro a sinistra
(rosso se black list). Stesse chiamate, stessi campi. 1 schermata, 0 testi
< 13, 0 tasti < 40 prima e dopo.

## 3. `/cassa/fasce` a 1024 — `3a7bebe` (commit vuoto per un rebase a metà; il CSS è in `fd71976`) e `2039991` (il `!important` della pillola)

Dai 900 px: ora 22 (era 18), pillola Oswald 20 da 96×44 (era 16, 40 px: la
prima regola perdeva contro lo stile in riga, corretta nel commit del
rapporto), − e + da 48, intestazioni 15; il rimando «3 pizzaioli · 2 rider» da
33 a 44 px (1 tasto < 40 → 0, a 390 e a 1024); il toast «salvato · Annulla»
è ora una pillola bianca col bordo vino, l'ora in vino, «✓ salvato» verde e
Annulla vino. Sotto i 620 px non cambia niente. Celle: 53 → 57 px.
Schermate a 1024: 1,6 → 1,7.

## 4. `/cassa/capacita` — `fd71976`

Ora 28 (vino quando la fascia è piena), conteggio 16 col numero Oswald 22
vino (era 15/17), quattro colonne dai 900 px (erano cinque da 170 px),
due sotto i 480. A 1024: 1,6 → 2,1 schermate (le carte sono più larghe e
più alte: si legge da lontano, e si scorre una volta); a 390: 2,8 → 3,1.
0 testi < 13, 0 tasti < 40 prima e dopo.

Foto: `lettura/giro13-prima-tavoli-capacita-fasce.jpg`, `lettura/giro13-dopo-conto-cliente-fasce.jpg`.
