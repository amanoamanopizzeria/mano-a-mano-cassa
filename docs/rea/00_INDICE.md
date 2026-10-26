# REA — Reverse engineering del sistema Velocissimo / 2Bit di A Mano a Mano Pugliese

*Fatto il 22–24/10/2026 (08–12 il 24/10: «studia tutto, tutto il codice» — Edoardo; 13–16 la sera del 24/10, terzo passaggio: «fai un REA ancora più approfondito, non ti far prendere dalla fretta, fatti le domande»). Edoardo: «è un REA, non da zero: l'app iOS/Android e il sistema nostro esistente sono la base» e «facciamolo fatto bene, da 10». Clean-room sul codice (niente codice 2Bit o Velocissimo), non sul comportamento: ogni regola che oggi il cliente, lo staff e i rider conoscono va ricostruita uguale nella cassa nuova, e poi migliorata.*

## Come è stato fatto

- **Back-office** (`admin.velocissimo.app`) letto sezione per sezione con l'utenza di Edoardo, in sola lettura: nessun «Salva», nessun secret letto, nessun dato personale copiato (solo struttura e aggregati).
- **App cliente** (iOS/Android = web-app Velocissimo 5.9 = «Ordina» su amanoamano.it) percorsa dal critico schermata per schermata, fino al riepilogo e mai oltre: nessun ordine, nessun pagamento, nessun account.
- **API** `pluto-server` lette dal browser mentre l'app le chiama; **Public API v1** letta dalla specifica OpenAPI ufficiale.
- **Cassa 2Bit** dal pacchetto `SETUP 2BIT.rar` (configurazioni, viste SQL, driver: letti, mai eseguiti; l'archivio è in parte danneggiato, 20 file su 126 non si aprono), dal video e dalle foto di Edoardo.
- **Terzo passaggio**: ogni voce del back-office con i valori attuali e la copertura; la serata ricostruita dagli orari veri di 389 + 65 ordini; il CSV dell'OS e `/api/vendite` confrontati campo per campo.
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
| `08_APP_E_INGRESSO_ORDINI.md` | L'app nei due store (iOS a nome **Vi.Ru**, Android a nome **Velocissimo**), il percorso d'ordine **chiamata per chiamata** con la forma dei dati, tutti gli endpoint del JavaScript, la Public API riletta per intero, **le sei strade** per portare gli ordini dell'app nella cassa nuova con la raccomandazione |
| `09_CASSA_2BIT_A_FONDO.md` | Vecchia 2Bit contro Velocissimo POS nuovo; il video ascoltato per intero, funzione per funzione (fasce, ordini, rider, sala, soldi, stampa) contro la nostra cassa, coi minutaggi |
| `10_COSA_MANCA_PER_SOSTITUIRLO.md` | **La lista finale**: 20 lavori in tre gruppi (la serata, i clienti dell'app, il resto), ciascuno con fonte Velocissimo, cosa abbiamo e cosa manca; le domande per Edoardo |
| `11_PUSH_E_AVVISI_AL_CLIENTE.md` | Le push: Firebase/APNs tramite il server di Velocissimo, i testi per stato configurati nel back-office, perché la nostra cassa non le può far partire, quando il permesso del cliente si conserva (aggiornamento della stessa app) |
| `12_TOTEM.md` | Il totem: la web-app in modalità totem, registrazione, mangia qui/porta via, nome a video, POS Ingenico/Viva, numero comanda e stampa dal Velocissimo POS sulla rete locale (porta 37150) |
| `13_BACKOFFICE_VOCE_PER_VOCE.md` | **Tutte le 61 voci** del back-office con i valori di A Mano A Mano e «la cassa nuova lo copre?» (sì 17 · in parte 16 · no 20 · non serve 8); l'**abbonamento** (Plus, 3 moduli su 19: **Enterprise non attivo → in cassa c'è il PC 2Bit**); coupon regola per regola, premi a punti, capacità per giorno della settimana, `/day-report` vuoto da sempre |
| `14_SERATA_MINUTO_PER_MINUTO.md` | La serata vera sul 2Bit dalle 18:00 alle 23:10, passo per passo, contro la cassa nuova dopo il giro 10 del critico; il modello del POS dalle viste SQL; il bancone (stampante fiscale **Ditron** nel pacchetto, modem per il numero che chiama, due stampanti comanda) |
| `15_REPORT_E_EXPORT.md` | Le **due** letture dell'OS (API per articolo, CSV per ordine); le 40 colonne del CSV una per una con la traduzione nostra; `RigaVendita` contro `v_vendite_giornata` campo per campo; cosa aggiungere perché l'OS non si accorga del cambio |
| `16_DOMANDE_PER_EDOARDO.md` | Le **20 domande** che non si deducono, ognuna con «cosa cambia a seconda della risposta» |
| `17_REA_COMPLETO_25_10.md` · `18_DOMANDE_PER_EDOARDO.md` | Rapporto completo del 25/10/2026 (cassa 2Bit, back-office ordini e zone, menu e disponibilità, app, sito, rider, telefono, stampa) con lo stato di ogni voce e le domande per Edoardo |
| `24_DASHBOARD_E_DATI_VELOCISSIMO.md` | La dashboard di Velocissimo **dentro**: il motore a widget (6 entità, metriche, dimensioni, 7 grafici, periodi, confronto periodo/anno prima), le **7 dashboard** widget per widget coi numeri di settembre 2026, i **report** con colonne, filtri e «Metriche», Ordini e Clienti (filtri e colonne), **come funzionano gli export**, il confronto con la nostra `/cassa/dashboard` e **le dieci cose che mancano** in ordine, coi dati del nostro DB (26/10/2026) |
| `dati/prodotti_nomi_ricette.md` | I 177 prodotti: id, codice, nome, pagina catalogo, ricetta, descrizione |
| `dati/prodotti_listini.md` | I tre listini per prodotto e il food cost |

## Le sedici cose da sapere a memoria

1. **Tre listini**: L1 app/sito/banco/asporto (Margherita 7,20), L2 sala/tavoli (8,50: Edoardo l'ha controllato sul menù del QR il 22/10), L3 piattaforme/Deliverect (7,90). Il tipo d'ordine e il canale decidono il listino.
2. **Le variazioni stanno sulla categoria**, con min/max/max gratis: 5 gruppi sulle pizze, 4 sulle pucce, 4 + salse sui burger, nulla su fritti/bevande/dolci; i menu hanno gruppi di scelta obbligatori a 0 €. Un extra una volta per riga; «senza» gratis solo sugli ingredienti della ricetta.
3. **Orari per tipo di carrello**: apertura 18:30–22:45, consegna 19:00–22:30 (finestre di 30 min ogni 15), ritiro 19:00–22:45 (orari puntuali), 7/7, attesa minima 15 min, preordini fino a 7 giorni, max 50 piatti.
4. **Domicilio**: 16 zone a poligono, consegna 1,00/1,50/2,00 €, minimo 10 € sul subtotale, fuori poligono non si consegna; l'indirizzo si chiede prima del menù.
5. **Pagamenti**: contanti alla consegna (con quanto paghi), online Nexi, contanti o bancomat alla cassa; POS alla consegna configurato ma spento.
6. **Tipi e origini**: banco/domicilio/consumazione/ritiro × app/manuale/sito/webapp/centralino/totem/deliverect/ai. I rider delle piattaforme sono «Ritiro».
7. **Stati**: Ricevuto → Confermato (stampa) → In lavorazione → Da ritirare → In consegna → Consegnato / Ritirato dal cliente / Annullato.
8. **Coupon e premi contano**: ~10 coupon al giorno, «Benvenuto da …» per canale di acquisizione, settimanali lun–gio, 3 premi a punti riscattati centinaia di volte.
9. **Il rider si assegna da solo** la prima comanda e tiene un borsello (prelievi − depositi = contanti in mano).
10. **Le vendite si leggono dall'API** (`/vendite`, una giornata per chiamata, 28 ore): la cassa nuova deve esporre la stessa riga, così mano-a-mano-os non cambia.
11. **Gli ordini dell'app nascono nel cloud di Velocissimo** e non c'è un modo pulito per riceverli: nessun webhook, nessuna lista ordini nell'API. La strada è che app e sito parlino con noi; Velocissimo resta acceso accanto solo come ponte (`08` §8.4).
12. **Le push le manda Velocissimo**, a ogni cambio di stato fatto dentro Velocissimo. Il permesso del cliente si conserva solo se la nostra app arriva come **aggiornamento della stessa app** (`11` §11.5).
13. **In cassa gira il PC 2Bit**, non il Velocissimo POS del video: Enterprise non è attivo (`13` §13.0). Il confronto giusto per la serata è `14`.
14. **L'OS legge due export**: l'API `/vendite` per articolo (c'è: 0025) e il CSV `/weborder` per ordine, 40 colonne, col canale delle piattaforme **nel testo della nota**. La cassa nuova deve dare anche il secondo (`15` §15.6).
15. **Le chiusure X/Z non salgono mai al cloud**, il borsello e il tracciamento dei rider non si usano, lo sconto manuale si fa 190 volte al mese e la consegna è uno sconto negativo: la serata vera è più semplice del back-office, e diversa (`13` §13.10).
16. **Quattro domande bloccano la prima fila**: stampanti (modello, Ditron o Epson), scontrino quando per online e domicili, Nexi di chi, credenziali Deliverect (`16`).
