# REA — Reverse engineering del sistema Velocissimo / 2Bit di A Mano a Mano Pugliese

*Fatto il 22–23/10/2026. Edoardo: «è un REA, non da zero: l'app iOS/Android e il sistema nostro esistente sono la base» e «facciamolo fatto bene, da 10». Clean-room sul codice (niente codice 2Bit o Velocissimo), non sul comportamento: ogni regola che oggi il cliente, lo staff e i rider conoscono va ricostruita uguale nella cassa nuova, e poi migliorata.*

## Come è stato fatto

- **Back-office** (`admin.velocissimo.app`) letto sezione per sezione con l'utenza di Edoardo, in sola lettura: nessun «Salva», nessun secret letto, nessun dato personale copiato (solo struttura e aggregati).
- **App cliente** (iOS/Android = web-app Velocissimo 5.9 = «Ordina» su amanoamano.it) percorsa dal critico schermata per schermata, fino al riepilogo e mai oltre: nessun ordine, nessun pagamento, nessun account.
- **API** `pluto-server` lette dal browser mentre l'app le chiama; **Public API v1** letta dalla specifica OpenAPI ufficiale.
- **Cassa 2Bit** dal pacchetto `SETUP 2BIT.rar`, dal video e dalle foto di Edoardo.
- **Rider** dalla scheda App Store di Velocissimo RIDER, dai report del back-office e dalle risposte di Edoardo.

## I capitoli

| File | Cosa contiene |
|---|---|
| `01_BACKOFFICE.md` | Le 93 voci del menu; negozio (orari per tipo di carrello, attese, zone, chiusure); stati ordine; catalogo (categorie coi gruppi di variazioni, listini L1/L2/L3, menu combo, cataloghi); clienti, coupon, premi, notifiche; ordini (numerazione, tipi, origini, pagamenti); prenotazioni |
| `02_APP_CLIENTE.md` | L'app del cliente schermata per schermata (514 righe): catalogo CENA con 105 prodotti e id, 62 extra con prezzo, menu combinati, domicilio con zona e minimo, fasce, pagamenti, coupon, fidelity, prenotazione; **29 regole da rispettare** e **22 cose che fanno male** |
| `03_CASSA_2BIT.md` | Il POS sul PC: componenti, come arriva un ordine (ping-executer → pluto-server, porta 9000), modello dati, cosa fa la cassa, cosa teniamo e cosa cambiamo |
| `04_RIDER.md` | App Velocissimo RIDER («si assegna da solo la prima comanda»), borsello (prelievi/depositi), mappa, report rider e zone, il «primo che rientra» |
| `05_API_E_INTEGRAZIONI.md` | Le tre API (pluto-server, ping-executer, **Public API v1** con i 15 endpoint: vendite, borsello, Ordering API), Deliverect, Centralissimo, Reserve with Google, Nexi, push |
| `06_DATI.md` | Entità per entità: Velocissimo → tabella nostra → cosa manca; le **141 variazioni coi prezzi**; la vista vendite per mano-a-mano-os |
| `07_GAP.md` | **La lista dei lavori** in ordine, con la migrazione che li fa (0021 → 0026), cosa resta fuori apposta, cosa si chiede a Edoardo |
| `dati/prodotti_nomi_ricette.md` | I 177 prodotti: id, codice, nome, pagina catalogo, ricetta, descrizione |
| `dati/prodotti_listini.md` | I tre listini per prodotto e il food cost |

## Le dieci cose da sapere a memoria

1. **Tre listini**: L1 app/sito/negozio, L2 piattaforme (il più alto), L3 intermedio (Just Eat?). Il canale decide il listino.
2. **Le variazioni stanno sulla categoria**, con min/max/max gratis: 5 gruppi sulle pizze, 4 sulle pucce, 4 + salse sui burger, nulla su fritti/bevande/dolci; i menu hanno gruppi di scelta obbligatori a 0 €. Un extra una volta per riga; «senza» gratis solo sugli ingredienti della ricetta.
3. **Orari per tipo di carrello**: apertura 18:30–22:45, consegna 19:00–22:30 (finestre di 30 min ogni 15), ritiro 19:00–22:45 (orari puntuali), 7/7, attesa minima 15 min, preordini fino a 7 giorni, max 50 piatti.
4. **Domicilio**: 16 zone a poligono, consegna 1,00/1,50/2,00 €, minimo 10 € sul subtotale, fuori poligono non si consegna; l'indirizzo si chiede prima del menù.
5. **Pagamenti**: contanti alla consegna (con quanto paghi), online Nexi, contanti o bancomat alla cassa; POS alla consegna configurato ma spento.
6. **Tipi e origini**: banco/domicilio/consumazione/ritiro × app/manuale/sito/webapp/centralino/totem/deliverect/ai. I rider delle piattaforme sono «Ritiro».
7. **Stati**: Ricevuto → Confermato (stampa) → In lavorazione → Da ritirare → In consegna → Consegnato / Ritirato dal cliente / Annullato.
8. **Coupon e premi contano**: ~10 coupon al giorno, «Benvenuto da …» per canale di acquisizione, settimanali lun–gio, 3 premi a punti riscattati centinaia di volte.
9. **Il rider si assegna da solo** la prima comanda e tiene un borsello (prelievi − depositi = contanti in mano).
10. **Le vendite si leggono dall'API** (`/vendite`, una giornata per chiamata, 28 ore): la cassa nuova deve esporre la stessa riga, così mano-a-mano-os non cambia.
