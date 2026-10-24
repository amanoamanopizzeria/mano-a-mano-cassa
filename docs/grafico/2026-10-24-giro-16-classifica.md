# Grafico, giro 16 — La classifica di tutte le pagine e le due peggiori (24/10/2026)

Misurato da `29114a6` (deploy READY), coi dati veri della sera, a 390×844 e a
1024×768 (il totem a 1080×1920). Metro: schermate, testi sotto i 13 px, tasti
e link sotto i **44** px (da questo giro: prima contavo i 40), scorrimento
laterale, stili scritti in riga (un segno di «fuori marchio»: colori e misure
decisi nella pagina e non nel vocabolario). /login da loggati rimanda alla
home: i suoi numeri sono della home.

## La classifica (peggiore in cima)

| # | pagina | 390: schermate · testi <13 · tasti <44 · sfori | 1024: schermate · tasti <44 | stili in riga | nota |
|---|---|---|---|---|---|
| 1 | `/cassa/fasce` | 2,6 · 0 · **37** · 0 | 1,7 · 1 | **158** | le 36 pillole «0/35» da 40 px + Esci |
| 2 | `/cassa/nuovo` | 1,0 · 0 · **7** · 0 | 1,0 · **15** | 42 / 84 | la barra ⌂ · Dati cliente · Ordine · Sala da 40, i tasti della comanda da 40 sul PC |
| 3 | `/cassa/riepilogo` | **5,5** · 0 · 1 · 0 | 3,0 · 1 | **190** | lunga e tutta scritta in riga |
| 4 | `/cassa` | **16,7** · 0 · 1 · 0 | 7,7 · 1 | 3 | la lunghezza è dei 47 ordini di prova di stasera |
| 5 | `/cassa/menu` | **8,4** · 0 · 1 · 0 | 6,2 · 1 | 2 | 147 prodotti: lunga per natura |
| 6 | `/cassa/capacita` | 2,8 · 0 · 1 · 0 | 2,1 · 1 | 39 | |
| 7 | `/cassa/tavoli` | 1,4 · 0 · 1 · 0 | 1,0 · 1 | 34 | |
| 8 | `/cassa/mappa` | 1,1 · 0 · 1 · 0 | 1,2 · 1 | 8 | |
| 9 | `/cassa/cliente` | 1,0 · 0 · 1 · 0 | 1,0 · 1 | 6 | |
| 10 | `/rider` | 1,0 · 0 · 1 · 0 | 1,0 · 1 | 5 | (senza consegne) |
| 11 | `/cassa/rider` | 1,2 · 0 · 1 · 0 | 1,0 · 1 | 4 | |
| 12 | `/cassa/comanda/[id]` | 1,0 · 0 · 1 · 0 | 1,0 · 1 | 2 | |
| 13 | `/` | 1,2 · 0 · 0 · 0 | 1,3 · 0 | 0 | |
| 14 | `/ordina` | 1,0 · 0 · 0 · 0 | 1,0 · 0 | 0 | |
| 15 | `/segui/[token]` | 1,0 · 0 · 0 · 0 | 1,0 · 0 | 0 | |
| 16 | `/totem` (1080×1920) | 0 testi <20 · 0 tasti <72 · 1,0 | — | — | |

Il tasto «Esci» della barra d'accesso era 40 px su tutte le pagine dello
staff: è l'«1» ricorrente nella colonna dei tasti.

## Le due sistemate

### 1. `/cassa/fasce` — `1f0289b`

Le pillole del posto occupato («0/35», «0/2») erano 40 px dallo stile in
riga: la regola del giro 13 le copriva solo dai 900 px. Ora 44 px a ogni
larghezza, Oswald 18, angoli da 12. − e + restano come nel giro 7.

| 390 | prima | dopo |
|---|---|---|
| tasti < 44 | 37 | **0** |
| schermate | 2,6 | 2,7 |

A 1024: 1 → 0 (Esci, col commit 2).

### 2. `/cassa/nuovo` — `01575a2` (+ i tasti della comanda sul PC nel commit del rapporto)

La barra vino in cima (⌂ · Dati cliente · Ordine · Sala) da 40 a 44 in
Oswald maiuscolo 15 con angoli da 10, come le tab di /ordina; «Esci» della
barra d'accesso da 44 su tutte le pagine (`AuthGate`). Nel commit del
rapporto anche i tasti dentro la comanda (Adesso, Contanti/POS/Già pagato,
Applica, €, %, Svuota) da 44 sul PC e sul tablet, dove restavano 40.

| | prima | dopo |
|---|---|---|
| 390: tasti < 44 | 7 | **0** |
| 1024: tasti < 44 | 15 | 8 → 0 col commit del rapporto |

## Cosa resta per i prossimi giri

- `/cassa/riepilogo`: 190 stili in riga e 5,5 schermate a 390: da portare
  alle classi come il blocco Cassa del giro 10.
- `/cassa/fasce` e `/cassa/capacita`: 158 e 39 stili in riga.
- `/cassa` e `/cassa/menu` sono lunghe per i dati, non per la veste.

Foto: `lettura/giro16-prima-fasce-nuovo.jpg`, `lettura/giro16-dopo-fasce-nuovo.jpg`.
