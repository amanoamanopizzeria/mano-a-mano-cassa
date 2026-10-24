# Grafico, giro 17 — via gli stili in riga: riepilogo, planner, capacità

24/10/2026, da `dcbfaf9`. Tre pagine, un commit l'una: `39d897f` riepilogo,
`de69566` planner, `248b08d` capacità. Deploy READY. Foto in `lettura/giro17-*.jpg`.

Regola di sempre: aspetto, non modo di lavorare. Stesse query, stesse rpc, stessi
tocchi; niente scritture sul database per misurare (il modulo del massimo l'ho
aperto e chiuso con Annulla).

## Misure (390×844 e 1024×768, metro 44 px)

«In riga» = elementi a video con l'attributo `style`. I 2 che restano su ogni
pagina sono della barra di `AuthGate` (email ed «Esci»), comuni a tutta l'app.

| pagina | prima 390 | dopo 390 | prima 1024 | dopo 1024 | in riga prima → dopo |
|---|---|---|---|---|---|
| /cassa/riepilogo | 5,9 schermate | **1,2** (6,3 col ramo aperto) | 3,2 | **1,0** | 210 → 2 |
| /cassa/fasce | 2,7 | 2,7 | 1,7 | 1,7 | 158 → 2 |
| /cassa/capacita | 2,8 | 2,8 | 2,1 | 2,1 | 39 → 2 |

Su tutte, prima e dopo: 0 testi sotto i 13 px, 0 tasti sotto i 44 px, 0 sfori,
niente scroll laterale. **0 peggiorati.** (Il riepilogo nel giro 16 diceva 5,5
schermate e 190 in riga: la sera del critico ha aggiunto ordini, oggi erano 56.)

## Cosa è cambiato

1. **Riepilogo.** Gli ordini uno per uno — la parte lunga, 56 carte — stanno in
   un `<details>` chiuso (`.r-ramo`) col conto nel titolo: «ORDINI 56 · 24
   validi». Nessun numero tolto: si apre e c'è tutto (misurato: 6,3 schermate
   aperto, come prima). Le carte prendono le classi `.r-ordine`, `.r-num`
   (Oswald 26), `.r-dove`, `.r-tot` (Oswald 24 vino); la griglia dei canali e
   l'errore le loro.
2. **Planner.** I 41 siti di `style={{…}}` sono diventati classi sotto
   `.fasce-pagina`: testata, data, tabella e intestazione, `tr.f-riga`
   `.corrente/.passata/.aperta`, il pallino `.f-punto`, la lente `.f-lente.con`,
   la pillola `.f-pillola .piena/.quasi/.vuota` (ora da 44 senza `!important`),
   la riga degli ordini della fascia, il velo e il modulo del massimo
   (`.f-modifica`: tasti −/+ 52, cifra Oswald 44, «Torna alla regola / Annulla /
   OK» da 52). **Correzione del giro 18:** avevo scritto che `--accento` non esisteva e
   messo `--errore`; esiste (è il vino, riga 13 di globals.css), e il colore è
   tornato `--accento` come prima.
3. **Capacità.** I 4 siti a classi: `.c-errore`, il margine del turno in CSS,
   `.c-fascia.spenta` (opacità .5 quando pizze e consegne sono a zero), `.c-testa`
   (l'errore: stessa correzione del planner, torna `--accento`).

## Cosa resta

- I 2 stili in riga di `AuthGate` (email ed «Esci»): un commit a parte, vale per
  16 pagine insieme.
- `/cassa/nuovo` ha ancora 42 (390) / 84 (1024) stili in riga e `/cassa` i suoi:
  sono le due pagine della sera, si toccano con più cautela e una per giro.
