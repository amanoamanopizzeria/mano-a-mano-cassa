# Giro 21 del grafico — /totem sul modello dell'app (24/10/2026)

Il totem a 1080×1920 accanto all'app vecchia (la tabella «Cosa portare nel
totem» in fondo a `APP_RIFERIMENTO.md` e le foto del giro 20). Tre differenze,
una per commit, solo CSS in `src/app/totem/totem.css`: stesso markup, stessi
tocchi, nessun dato, nessun ordine.

## Come si è misurato di notte

Il totem diceva «siamo chiusi». Le quattro schermate (menù, scheda, carrello,
pagamento con riepilogo) sono state montate dal JSX dentro un iframe di
`/totem` a 1080×1920, così il `totem.css` vero è caricato; nomi, descrizioni e
foto sono quattro prodotti veri letti da `/ordina` (La marinara, La
margherita, La funghi, La napoli). Il markup si disegna e basta: nessun
gestore cliccato, niente scritto. La scheda sta dentro `.schermo.totem` come
nella pagina vera (la prima prova la metteva fuori e le regole non valevano:
corretto prima di misurare).

Foto: prima `lettura/giro21-prima-totem.jpg`, dopo
`lettura/giro21-dopo-totem.jpg` (fuori da git).

## Le tre differenze

| # | Nell'app | Da noi prima | Da noi dopo | Commit |
|---|---|---|---|---|
| 1 | logo grande al centro della fascia sabbia, bollino a destra | logo piccolo nell'angolo | logo alto 66 al centro (x 450, 180×66), bollino 72 a destra | `370178c` |
| 2 | prezzo in basso a sinistra, «! Novità» accanto | prezzo a destra, pillola sopra | prezzo a sinistra (x 26) con la pillola accanto | `2247ed9` |
| 3 | «Dettagli»: nome in cima, foto quadrata al centro su sabbia, poi descrizione e prezzo | foto a tutta larghezza (880×653) e nome sotto | nome in cima (y 145), foto 400×400 al centro su sabbia, descrizione, prezzo centrato; opzioni e titoli larghi 880 come prima | `61f8eea` + correzione larghezze in questo commit |

## Misure a 1080×1920, prima → dopo

| Schermata | Altezza | Testi < 20 | Tasti < 72 | Fuori bordo |
|---|---|---|---|---|
| Menù | 1523 → 1523 | 0 → 0 | 0 → 0 | 0 → 0 |
| Scheda | 1523 → 1523 | 0 → 0 | 0 → 0 | 0 → 0 |
| Carrello | 1620 → 1620 | 0 → 0 | 0 → 0 | 0 → 0 |
| Pagamento e riepilogo | 1740 → 1740 | 0 → 0 | 0 → 0 | 0 → 0 |

**0 peggiorati.**

## Le differenze rimaste (non fatte, apposta)

- **Carrello**: da noi righe a schede con l'ombra, nell'app righe con la
  riga sottile. È la prossima: scritta e tolta per stare a tre.
- **Tasto in fondo**: nell'app testo bianco sul sabbia; da noi resta nero,
  il bianco su quel sabbia sta a circa 2:1 di contrasto.
- **Caratteri**: restano Oswald e Figtree (regola del marchio).
- **Carrello unico con giorno, ora, coupon e pagamento online**: non vale per
  il totem (ordine al banco, nome alla fine, cassa o POS).
- **«Modifica ingredienti» (togliere) e la ricerca**: sono funzioni, non
  vesti; da decidere con Edoardo (domanda 22 in `docs/rea`).
