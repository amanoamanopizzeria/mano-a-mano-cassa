# Grafico, giro 18 — barra d'accesso, /cassa e la sinistra di /cassa/nuovo alle classi

24/10/2026, da `6eee8ef`. Tre commit: `1a9862c` AuthGate, `ac952e0` /cassa,
`ac65d41` /cassa/nuovo (solo la parte sinistra). Deploy READY. Foto in
`lettura/giro18-*.jpg`. Niente scritture sul database: per vedere i passi del
menu e le varianti ho aggiunto righe alla comanda senza inviare.

## Misure (390×844 e 1024×768, metro 44 px, ordini di stasera)

| pagina | schermate 390 prima → dopo | schermate 1024 | in riga prima → dopo | tasti spostati |
|---|---|---|---|---|
| /cassa | 19,6 → 19,6 | 8,7 → 8,7 | 3 → **0** | 0 su 78 (stesse coordinate x, y, larghezza, altezza) |
| /cassa/nuovo | 1 → 1 | 1 → 1 | 42 → 29 (390), 84 → 71 (1024) | 0 su 80 (barra e tessere) |
| /cassa/tavoli (controllo di AuthGate) | 1,5 → 1,5 | 1 → 1 | 34 → 32 | — |

Su tutte, prima e dopo: 0 testi sotto i 13 px, 0 tasti sotto i 44, 0 sfori,
niente scroll laterale. **0 peggiorati.** Le schermate di /cassa sono 19,6
perché stasera ci sono gli ordini di prova del critico (11 «ieri e prima» più
quelli in corso): non è un numero del giro, è il carico della serata.

## Cosa è cambiato

1. **AuthGate** (`src/components/AuthGate.tsx`): la fila con email ed «Esci» è
   `.ag-barra` (+ `.ag-barra button` da 44). Un commit, 16 pagine: su ognuna i
   2 stili in riga che restavano dal giro 17 sono a zero.
2. **/cassa**: il riquadro nascosto che stampa la comanda (`.lo-stampa`),
   l'errore (`.lo-errore`) e il tasto «annullato» spinto a destra
   (`button.annulla`, era `marginLeft: auto`). Nessun tasto cambia posto,
   misura o ordine: 78 elementi confrontati a 390 e a 1024 con le stesse
   coordinate.
3. **/cassa/nuovo, solo la sinistra**: `.cn-sinistra`, la barra vino
   (`.barra .ghost`, `.ghost.ordine`, `.titolo`, `.spazio`; gli `<a>` senza
   sottolineatura), `.cn-passi` per i passi del menu e i gruppi delle
   varianti (flex con i passi a larghezza uguale, al posto della griglia col
   numero di colonne calcolato in riga), `.cn-categorie`, `.cn-griglia`,
   `.cn-inclusi`, `.cn-figlie`; le tessere `.categoria`, `.passo` (+
   `.corrente` col bordo vino dentro), `.indietro` («← Annulla», «← Prodotti»),
   `.conferma`, `.colonna` (+ `.stretta`), `.segno` (CON/SENZA), `.variante`,
   `.conta` (il ×2 in alto a destra) e `.togli`. **Il colore della categoria
   resta uno stile in riga, ed è giusto così**: viene dal database, non si può
   scrivere in una classe; viaggia nella variabile `--riga` e la striscia in
   fondo alla tessera la disegna `.tessera.riga`. Per questo i 29/71 che
   restano sono: le tessere a video (13 categorie + i prodotti) e la comanda
   a destra, che non si tocca (900a7f0 del coordinatore, il critico la sta
   provando). I tasti «Su quale» delle figlie (si vedono solo coi menu)
   passano da 40 a 44.
4. **Correzione del giro 17**: avevo scritto che `--accento` non esisteva e
   messo `--errore` sugli errori del planner e della capacità. Esiste
   (`--accento: var(--vino)`, riga 13 di globals.css): tornano `--accento`,
   stessa resa di prima. Il rapporto del giro 17 è corretto.

## Cosa resta

- La comanda di /cassa/nuovo (la destra): ~60 stili in riga, da fare quando il
  critico ha finito di provarla, con lo stesso metodo (coordinate uguali prima
  e dopo).
- Le altre pagine con stili in riga sopra i 10: /cassa/tavoli (32),
  /cassa/cliente, /cassa/rider, /rider: un giro.
