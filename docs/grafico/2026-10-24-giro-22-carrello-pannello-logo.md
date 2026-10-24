# Giro 22 del grafico — avvio del totem, carrello del totem, pannello di /cassa/nuovo, logo di /ordina (24/10/2026)

Quattro modifiche, una per commit, solo veste: stessi tocchi, stessi campi,
stesso ordine, niente database, nessun ordine. Misure prese nel browser sul
sito vero, con la regola nuova aggiunta alla pagina prima del push (la stessa
poi committata).

## 0. /totem, la schermata d'avvio (critico giro 20) — `433199d`

**Il difetto era mio, del giro 21.** La regola
`.totem .t-sabbia { position: relative }` di 370178c vinceva su
`position: absolute; top: 0` della fascia d'avvio, e la fascia scendeva nella
colonna fino al bollino. Ora sull'avvio la fascia è di nuovo fissa in cima. A
1024×768 il bollino finiva sotto la fascia anche prima di 370178c, quindi ora
si stringe anche con l'altezza: `min(44vw, 360px, 36vh)`.

Misurato sul /totem vero, che diceva «siamo chiusi»:

| Schermo | Fascia prima → dopo | Bollino prima → dopo | Sovrapposizione |
|---|---|---|---|
| 1080×1920 | 976–1072 → 0–96 | 957–1317 → uguale | 96 → **0** |
| 390×844 | 368–428 → 0–60 | 378–549 → uguale | 50 → **0** |
| 1024×768 | −5–91 → 0–96 | 45–405 → 129–405 | 46 → **0** |

Testi e tasti sotto la soglia: 0 → 0, fuori bordo: 0 → 0, su tutti e tre.

Foto: `lettura/giro22-avvio-prima-dopo.jpg`.

## 1. /totem, il carrello a righe col filo come l'app — `7bc7caf`

Era la differenza lasciata dal giro 21. Ogni riga era una scheda bianca con
ombra e angoli tondi; ora le righe sono trasparenti, con un filo sottile fra
l'una e l'altra e nessun filo sotto l'ultima. Foto, − e + sono gli stessi.

La schermata è montata dal codice, come nel giro 21, con tre prodotti veri.

| Misura a 1080×1920 | Prima | Dopo |
|---|---|---|
| Altezza | 1620 | 1620 |
| Testi < 20 px | 0 | 0 |
| Tasti < 72 px | 0 | 0 |
| Fuori bordo | 0 | 0 |
| Altezza di una riga | 176 | 181 |

Foto: `lettura/giro22-carrello-totem-prima-dopo.png`.

## 2. /cassa/nuovo a 390, i tasti del pannello aperto a 44 — `6ea8c84`

Sul telefono Adesso, Applica, € e % restavano a 40: lo stile in riga vinceva,
e la regola dei 44 c'era solo sopra i 600 px. Ora una regola in `nuovo.css`
**solo sotto i 600 px** porta a 44 i tasti e anche i campi delle stesse file
(Giorno, Ora, Coupon, Sconto, Nome, Note), così ogni fila resta pari. Sopra i
600 px, cioè sulla comanda del PC, non cambia niente.

Misurato a 390×844 col pannello aperto:
- elementi sotto 44: da 10 a **0**;
- contenuto del pannello: da 968 a 988 px (+20).

Foto: `lettura/giro22-cassa-nuovo-pannello-prima-dopo.jpg`.

## 3. /ordina a 390, il logo della testata grande come nell'app — `cf4191b`

Il logo era 87×32. Il lockup ha sopra e sotto «PIZZA ITALIANA», «FORNO A
LEGNA» e «2013», e la scritta AMANOAMANO ne occupava un terzo. Nell'app, nella
fascia c'è la sola scritta.

Ora c'è `public/brand/logo-scritta.png`, che è la scritta **ritagliata dal
nostro lockup** (non è un logo nuovo).

| Misura a 390×844 | Prima | Dopo |
|---|---|---|
| Logo | 87×32 | 258×36 |
| Fascia | 48 | 56, il tetto chiesto |
| Distanza dal bollino | — | 22 px |
| Testi < 13 px | 0 | 0 |
| Tasti < 44 px | 0 | 0 |
| Fuori bordo | 0 | 0 |

Foto: `lettura/giro22-ordina-logo-prima-dopo.png`.

## Rimasto

- Il totem usa ancora il lockup intero nella fascia sabbia (1080 di larghezza,
  alto 66). Lì la scritta si legge già. Se si vuole la stessa resa di /ordina,
  basta cambiare l'immagine, ma è una modifica in più.
