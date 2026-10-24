# Grafico, giro 19 — tavoli, scheda cliente, borsello e rider senza stili in riga

24/10/2026, da `ad1a3ca`. Quattro commit, uno per pagina: `862ed21` /cassa/tavoli
(e il conto), `acefe71` /cassa/cliente, `3ff38bd` /cassa/rider, `03466f6` /rider.
Deploy READY. Foto in `lettura/giro19-*.jpg`. Niente scritture sul database:
per vedere il modulo della scheda ho cercato un numero che non esiste
(«Cliente nuovo»), senza salvare; «Prova chiamata» non l'ho toccato.

## Misure (390×844 e 1024×768, metro 44 px)

| pagina | schermate 390 | schermate 1024 | in riga prima → dopo | elementi confrontati (x, y, misura, carattere, colore) |
|---|---|---|---|---|
| /cassa/tavoli | 1,5 → 1,5 | 1 → 1 | 32 → **0** | 48, 0 diversi |
| /cassa/cliente | 1 → 1 | 1 → 1 | 4 → **0** | 4, 0 diversi; il modulo: Nome 44/16, Via 44/16, Civico 44/16, Salva 48/17 come prima |
| /cassa/rider | 1,4 → 1,4 | 1,1 → 1,1 | 2 → **0** | 7, 0 diversi |
| /rider | 1 → 1 | 1 → 1 | 3 → **0** | 4, 0 diversi |

Stasera non c'erano consegne in corso, quindi la scheda della consegna e la
carta «da saldare» di /rider le ho provate montando sulla pagina pubblicata la
stessa scheda due volte, una col markup vecchio (stili in riga) e una col nuovo
(classi): 23 elementi, **0 differenze** su misura, carattere, peso, colore,
margini, bordo, sfondo e interlinea. Il conto del tavolo cambia solo la riga
degli sconti (`.conto .sconti`, a destra).

Su tutte, prima e dopo: 0 testi sotto i 13 px, 0 tasti sotto i 44, 0 sfori,
niente scroll laterale. **0 peggiorati.** L'app è ora **senza stili in riga**
su tutte le pagine tranne la comanda di /cassa/nuovo (che il critico prova
stasera) e le tessere con il colore della categoria, che è un dato (`--riga`).

## Le classi

- **Sala**: `.s-errore`, `.s-zona`, `.s-intesta`, `.riga-min b.da-troppo`,
  `.tavolo .azioni`, `.conto .sconti`.
- **Cliente**: `.cl-errore`, `.cl-cerca` (l'input del telefono 48/22, `.cerca`,
  `.prova`), `.cl-tags`, `.cl-modulo` (`.titolo`, gli input 44/16, `.salva`),
  `.cl-via-box`, `.cl-via-fila` (`.via` 3, `.civico` 1), `.cl-sugg` (i tasti
  44/15, `.testo`, `.fonte`), `.cl-zona.ok/.civico/.fuori`.
- **Borsello**: `.b-testa h1`, `.b-tasti.sotto`.
- **Rider**: `.r-errore`, `h2.r-sez`, `.r-borsello b`, `.r-saldo` (`.chi`,
  `.cifra`), `.r-intesta`, `.r-quando`, `.r-via`, `.r-nome`, `.r-avviso`,
  `.r-soldi` (`.come`, `.resto`), `.r-righe`, `.r-note`, `.r-azioni`.

## Cosa resta

- La comanda (destra) di /cassa/nuovo: ~60 stili in riga, quando il critico ha
  finito; stesso metodo (markup vecchio e nuovo fianco a fianco, 0 differenze).
