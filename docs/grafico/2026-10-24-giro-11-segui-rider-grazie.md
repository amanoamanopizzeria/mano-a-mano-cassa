# Grafico, giro 11 — Segui la consegna, Rider e borsello, «Grazie» e «Siamo chiusi» (24/10/2026)

Tre pagine, un commit ciascuna, su `main`. Nessun flusso cambiato: stesse rpc,
stessi tocchi, stessi dati. Deploy READY dopo il push (`e382ae3`).

## 1. `/segui/[token]` — `0f01f29`

È l'unica pagina che il cliente vede oltre a `/ordina`: adesso ha la stessa
veste (fascia sabbia col logo lineare e il bollino, barra vino col titolo
«Ordine C-xx», fondo bianco). Lo stato è in Oswald 30 maiuscolo vino, verde
quando è «consegnata», con lo scooter quando il rider è partito; la mappa va a
tutta larghezza (46 % dello schermo, almeno 280 px); i passi sono righe col
filo, pallino vino su quello di adesso, sabbia su quelli fatti; «Apri in Google
Maps» è il pulsante sabbia da 52 px. Rpc `segui_consegna`, i 5 secondi di
rilettura, Leaflet e i marker non cambiano.

Misurato sulla pagina senza consegna (per vedere una consegna vera ci vorrebbe
un ordine, e gli ordini di prova non si fanno): a 390×844, prima e dopo,
1 schermata, 0 testi < 13 px, 0 tasti < 40 px, 0 sfori. La differenza è di
veste: foto `lettura/giro11-dopo-segui-rider.jpg`.

## 2. `/cassa/rider` — `56f45f4`

Prima: nome 18 px, lo stato solo nelle voci da 14, «Mappa →» «Cassa →» link
grigi alti 16 px, movimenti a 15 px con gli stili in riga.
Dopo: nome Oswald 26 con sotto l'etichetta di stato (vino «2 in corso», oro
«da saldare», grigio «libero»/«non attivo») e il filo vino a sinistra della
scheda del rider in giro; «in mano» 38 px; rimandi a pillola da 44 px; errore
ed esito in una fascia colorata; importo da 56 px; movimenti a righe da 16 con
la cifra 18 (verde deposito, vino prelievo). `movimento`, `salda` e le rpc
intatte.

| | prima | dopo |
|---|---|---|
| 390: tasti/link < 40 px | 2 (Mappa, Cassa: 16 px) | 0 |
| 390: testi < 13 px | 0 | 0 |
| 390: schermate | 1,0 | 1,1 |
| 1024: tasti/link < 40 px | 2 | 0 |

## 3. `/ordina`: «Grazie» e «Siamo chiusi» — `e382ae3` (+ `bollino` a capo nel commit del rapporto)

«Grazie»: titolo Oswald 30, numero d'ordine Oswald 44 in un tassello sabbia col
bordo, riepilogo come una sezione col filo nero e il totale da 18, «Segui la
consegna» sabbia da 52 px con lo scooter, «Nuovo ordine» a filo vino della
stessa altezza. «Siamo chiusi»: l'avviso ha la croce vino in cerchio e il testo
da 16, il numero del giorno chiuso è barrato oltre che spento (prima solo
opacity .4 in riga: tolto, lo fa `button:disabled`).

Non si confermano ordini di prova, quindi le due schermate sono state montate
dentro la pagina vera con lo stesso CSS (markup identico a `page.tsx`, dati
finti): a 390×844 una schermata ciascuna, 0 testi < 13, 0 tasti < 40, 0 sfori;
«Segui la consegna» e «Nuovo ordine» 52 px (prima ≈ 50 e 48). Foto
`lettura/giro11-dopo-grazie-chiusi.jpg`.

## Non fatto

- Una consegna vera su `/segui` con la mappa e il rider in movimento: si
  guarda la prima sera che un cliente ordina a domicilio dall'app.
- Il coordinatore descriveva `/cassa/rider` come «consegne da assegnare»: quelle
  stanno in `/cassa/mappa` (giro 7); qui c'è la rosa col borsello.
