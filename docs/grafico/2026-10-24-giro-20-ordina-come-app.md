# Grafico, giro 20 — /ordina sul modello dell'app «A Mano A Mano Pugliese»

24/10/2026, da `4f16335`. Commit: `ee3a6b0` testata, `b668d8f` righe del menù,
`4e52b20` scheda del prodotto, più il tasto del carrello nella barra (col
rapporto). Deploy READY. Foto in `lettura/giro20-*.jpg`.

## Come ho guardato l'app vecchia

La web app di Velocissimo (`service.web-app.it/…/webapp.php?area_clienti=amanoamanopugliese&visione_web=1`,
la stessa dell'app iOS/Android, «ver. 5.9») aperta a 390 px dentro un
riquadro accanto a /ordina nostra, **in sola lettura**: Ordina subito → Ritiro
al locale → OK al «Preordina» (la cucina apre alle 19) → menù → L'Arrabbiata →
Aggiungi 1 al carrello → Vai a carrello. **Mai «Ordina»**, nessun account,
nessuna password, niente salvato. Foto fianco a fianco:
`giro20-confronto-menu-390.jpg`, `giro20-confronto-scheda-390.jpg`,
`giro20-confronto-carrello-390.jpg`.

## Le dieci differenze che contano (app → noi, prima del giro)

1. **Il logo.** Nell'app il logo lineare domina la fascia sabbia: centrato, alto
   quanto la fascia. Da noi era 26 px in un angolo. → **sistemato** (1/3).
2. **Il prezzo nella riga.** L'app lo mette in basso a **sinistra**, in
   grassetto nero, con «! Novità» accanto. Da noi stava a destra sotto la
   foto. → **sistemato** (2/3).
3. **La scheda del prodotto.** L'app: nome centrato, foto grande al centro su
   sabbia (circa 176 px), descrizione, poi «Quantità» come titolo di sezione
   con i tondi − 1 + centrati da 48. Da noi: foto 124 a sinistra col testo a
   fianco, i tondi da 40 in una riga. → **sistemato** (3/3): foto 168, nome
   24, tondi 48; stesso markup, l'ordine lo fa il CSS (`display: contents`).
4. **Il titolo della sezione nel menù** è «NOVITA'» in maiuscolo; da noi
   «Pizze classiche». → sistemato con la 2/3 (solo quel titolo: «Quantità»,
   «Giorno» ecc. nell'app restano in minuscolo).
5. **Il «‹» indietro** nell'app è un chevron grande e solo quello; da noi
   «‹ Indietro» con un chevron piccolo. → chevron da 30 (1/3), la parola resta.
6. **Le foto.** Nell'app sono circa 90 px con molto bianco intorno; le nostre
   128 px riempiono la riga: qui siamo **meglio** dell'app, non si tocca.
7. **Il carattere.** L'app usa quello di sistema; noi Oswald per i nomi e
   Figtree per il resto: regola del marchio, non si tocca.
8. **Il pulsante in fondo.** Nell'app è sabbia con testo **bianco**; da noi
   testo nero: bianco su sabbia è un contrasto di 2:1 (scritto in
   `APP_RIFERIMENTO.md`), resta nero.
9. **Il carrello.** Nell'app è una pagina sola: giorno, orario, righe con
   «Rimuovi», nota, codice sconto, coupon, pagamento, «Ordina». Da noi sono
   tre passi (carrello → quando → dati). È il modo di lavorare, non l'aspetto:
   non si tocca in questo giro.
10. **Modifica ingredienti e la ricerca.** L'app toglie gli ingredienti della
    pizza (− accanto a ognuno) e ha un tondo vino «cerca» in basso a destra;
    da noi non ci sono. Sono funzioni, non vesti: da decidere con Edoardo.

## Misure a 390 (prima → dopo)

| schermata | schermate | tasti < 44 | testi < 13 | sfori |
|---|---|---|---|---|
| menù (Pizze classiche) | 4,3 → 4,3 | 1 → 0 (il tasto del carrello nella barra 34 → 44) | 0 | 0 |
| scheda (La marinara) | 1 → 1 | 2 → 0 (i tondi − + 40 → 48) | 0 | 0 |
| carrello | 1 → 1 | 3 → 0 («Aggiungi prodotti» 38 → 44, − + 34 → 44) | 0 | 0 |

0 peggiorati; nessun tocco in più (un tocco apre il menù, uno la scheda, uno
aggiunge). La striscia delle categorie resta appiccicata sotto la testata
(96 px: 48 sabbia + 48 vino).

## Non fatto

- **/totem** sul modello dell'app: non è avanzato tempo. La cucina apre alle
  18:30; prima dice «siamo chiusi». Le indicazioni stanno già nella tabella
  in fondo a `APP_RIFERIMENTO.md`.
