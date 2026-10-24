# Giro 13 — il conto del tavolo, lo sconto a mano, le fasce con «Annulla», la comanda che dice cosa è cambiato, il telefono (deploy `86aa926` → `7ada4e0`, mig. 0039–0043)

*Critico, 24/10/2026, 11:35–11:52 (ora vera, fuori orario: cucina chiusa, totem chiuso). Deploy
`86aa926` aspettato READY sul connettore Vercel; a metà giro sono arrivati `7ada4e0` (mig. 0043,
la comanda con NUOVA e TOLTE) e `6524200`/`f7c0395` (mig. 0044, documentazione e export): la
modifica con lo sconto l'ho provata dopo, sul `7ada4e0`. Cassa a 1040×757 dal browser; il
telefono a 390×844 nel riquadro (la finestra non si lascia ridurre). Nomi «Prova Critico …»,
telefoni finti. Niente Velocissimo, niente account, niente password, niente riparazioni.*

## Da annullare (ordini di prova): **C-40** (banco, sconto 2 €), **C-41** (ritiro 20:00, sconto 10 %, modificato), **W-42** (ritiro 19:00 dal sito), **C-43** (banco dal telefono). **C-38** e **C-39** (tavolo D3) li ho chiusi io col conto, POS: sono `ritirato`, non si annullano più dalla cassa — da sapere per il riepilogo di stasera (34,50 € di POS finti). La fascia 20:00 l'ho riportata a 35 pizze. Lasciati come trovati: APP-4, C-5, C-7, C-9, C-10, C-28, C-34 (giro 12), W-36, W-37.

## Le cinque prove chieste (più l'aggiunta)

| # | Prova | Esito | Com'è andata |
|---|---|---|---|
| 1 | Il conto del tavolo | ✓ **funziona** | `/cassa/tavoli` → D3 «Apri» (coperti 2) → `/cassa/nuovo` → Tavolo → «D3 · occupato» → C-38 (margherita **8,50**, il listino sala ✓, + acqua frizzante 1l 2,50 = 11,00: «Ordine n. 38 inviato in cucina · 11,00 €.») → C-39 (Menu classico X1 con diavola e Fanta 13,00 + funghi con **impasto alto** 10,50 = 23,50). Poi «Conto» su D3: il foglio «Tavolo D3 · 2 coperti · 1 min» con **tutte le righe** di tutti e due gli ordini: «1× La margherita 8,50 · 1× Acqua frizzante 1l 2,50 · 1× Menu classico X1 · La diavola · Fanta 0,33cl 13,00 · 1× La funghi + Impasto alto 10,50 · Totale 34,50 €»; «Stampa» chiama la stampa; «POS» → foglio chiuso, D3 «LIBERO», database: C-38 e C-39 `ritirato`, `pos`, tavolo `libero` |
| 1 | Conto su tavolo senza ordini, e Libera | ✓ | «Conto» su D3 appena aperto: «Nessun ordine aperto su questo tavolo. · Totale 0,00 €», Contanti e POS **disabilitati** (ma vestiti da tasto pieno: sembrano premibili); il tavolo passa a «CONTO». ✕ → «Libera» → «LIBERO» |
| 2 | Sconto 2 € su un banco | ✓ | «Sconto» 2 + «€»: a fianco «−2,00 €», sotto il totale «− sconto 2,00 €», 13,60 → **11,60 €**; «Ordine n. 40 inviato in cucina · 11,60 €.»; database `sconto 2.00, sconto_manuale 2.00, totale 11.60`; comanda «sconto −2,00 € · Totale 11,60 €» |
| 2 | Sconto 10 % su un asporto | ✓ | funghi 8,20 + coca 2,50 = 10,70; «10» + «%» → «−1,07 €», **9,63 €**; POS, per le 20:00, «Prova Critico Sconto»; «Ordine n. 41 inviato in cucina per oggi alle 20:00 · 9,63 € POS.»; database `sconto 1.07, sconto_manuale 1.07, sconto_motivo "10%", totale 9.63`; comanda «sconto −1,07 € · Totale 9,63 € · POS» |
| 2+ | Modifica di C-41 (con la 0043) | ✓ **tiene lo sconto, dice cosa è cambiato** | `/cassa/nuovo?modifica=…` → aggiunta La marinara, tolta la Coca, funghi da 1 a 2. A video in modifica il totale è **22,80 €** (senza lo sconto: vedi medio n. 3). Salvato → database `totale 21.73` (= 22,80 − 1,07 ✓), `sconto 1.07`, `stampato_il` null, `righe_prima` scritto. Comanda: «C-41 · MODIFICATA · RISTAMPA 11:43 · … · 2 **NUOVA** LA FUNGHI · 1 **NUOVA** LA MARINARA · **TOLTE** ~~1 COCA COLA 0,33CL~~ · 3 pezzi in cucina · SCONTO −1,07 € · Totale 21,73 € · POS». Le righe nuove hanno il bordo nero, le tolte sono barrate sotto ✓. **Ma «2 NUOVA LA FUNGHI» è sbagliato per la cucina**: una funghi c'era già; la riga nuova è **una**, non due (grave n. 1) |
| 3 | Le fasce: «+» e «Annulla» | ✓ | `/cassa/fasce`, riga 20:00: «+» → subito «5/36» nella riga e in fondo «20:00 · pizze 35 → **36** · salvato · Annulla»; «Annulla» → «5/35» e la striscia sparisce; «+» di nuovo e dopo 7 secondi la striscia è sparita da sola col 36 salvato. Rimesso a 35 col «−» (anche quello lascia «36 → 35 · salvato · Annulla») |
| 4 | `/ordina` dal telefono, una pizza da ritirare | ✓ **7 tocchi + 2 scritture (erano 9 + 2)** | Lo ritiro (1) → LA MARINARA (2) → scheda in **una schermata** (756/756 px: foto, nome, prezzo, «Quantità − 1 +», i cinque gruppi di ingredienti chiusi) → «Aggiungi al carrello» (3) → barra «1 · Avanti · 6,40 €» (4) → **si salta il carrello** e si arriva a Giorno/Orario con **«Il primo orario libero è già scelto»** (19:00) → barra «Il prima possibile · 19:00 · 6,40 €» (5) → «I tuoi dati»: nome e telefono (2 scritture) → «Contanti alla cassa» (6) → «Conferma · 6,40 €» (7) → «GRAZIE PROVA! · W-42 · Ti aspettiamo oggi alle 19:00 in Via Novara 5/7. Paghi in contanti in pizzeria.» Caricamento 381 ms. Le categorie restano fisse scorrendo (striscia a 88 px) ✓; menù 4,3 schermate; nessun testo sotto i 13 px; il gruppo «IMPASTO · 2 scelte ▾» si apre e mostra «Impasto alto + 1,00 € · Impasto normale» |
| 4 | `/cassa/nuovo` dal telefono | 🟡 **si ordina, ma due cose gravi** | 390×844: prodotti a 3 colonne su tutta la larghezza, pannello in fondo chiuso 172 px «1 RIGA · Apri la comanda ▴ · Svuota · 7,20 € · INVIA IN CUCINA»; aperto 743 px con tipi, righe, −/+, tastierino, quando, coupon, sconto, nome, note (scorre: 894 px di contenuto) e Invia in fondo. Niente che sfora, niente tasti sotto i 40 px. C-43 inviato (margherita 7,20). **Però**: (a) **gli ultimi prodotti della categoria stanno sotto il pannello e non si raggiungono**: con 22 pizze classiche la griglia finisce a 814 px, il pannello chiuso parte a 672 e la pagina non scorre (nessun margine in fondo): La margherita con bufala / 5 formaggi / Bufala e pachino tagliate a metà, **La margherita ricca, La crostino pugliese e Rossa semplice impossibili da toccare**; (b) **il messaggio verde dopo l'invio non si vede**: «Ordine n. 43 inviato in cucina · 7,20 €.» sta dentro il pannello a 877 px, sotto il bordo anche col pannello aperto, e col pannello chiuso non c'è: il cassiere col telefono non sa se è partito |
| 5 | Messaggio verde con totale e pagamento | ✓ | «Ordine n. 40 inviato in cucina · 11,60 €.» (banco: niente pagamento, giusto), «Ordine n. 41 inviato in cucina per oggi alle 20:00 · 9,63 € POS.», «Ordine n. 38 inviato in cucina · 11,00 €.» (tavolo: non dice il tavolo) |
| 5 | Dopo «non si modifica più» Invia resta spento | ✓ | `?modifica=` di C-29 (annullato): fascione «MODIFICA C-29 · non si modifica più: torna alla cassa, annulla e rifai · Lascia stare», sotto «L'ordine C-29 è annullato: non si modifica più, si annulla e si rifà.», «SALVA E RISTAMPA» **disabled** e resta disabled anche dopo un tocco su un prodotto (la riga si aggiunge e il totale dice 6,40 €, ma non parte niente) |

## I difetti, dal più grave

1. **«2 NUOVA LA FUNGHI» quando la funghi è passata da 1 a 2.** La comanda segna NUOVA la riga
   intera con la quantità nuova; la cucina, che ne ha già una nel forno, ne fa altre due. Il
   confronto conta per riga (`contaAdesso > contaPrima`) ma stampa la quantità di adesso: deve
   stampare la differenza («+1 LA FUNGHI» o «NUOVA 1 di 2»), o lasciare la riga normale e mettere
   «+1 La funghi» sotto, accanto alle TOLTE.
2. **Sul telefono gli ultimi prodotti della categoria stanno sotto il pannello e non si toccano**
   (`/cassa/nuovo` a 390×844, categoria da 22 prodotti): la griglia non ha un margine in fondo
   pari al pannello chiuso (172 px) e la pagina non scorre. Rossa semplice, Margherita ricca e
   Crostino pugliese non esistono per chi batte dal telefono.
3. **Sul telefono il messaggio verde dell'invio non si vede**: sta in fondo al pannello, sotto il
   bordo. Il cassiere preme Invia, il pannello dice «0 RIGHE · 0,00 €» e basta. Il messaggio va
   fuori dal pannello, o il pannello si apre sulla conferma.
4. **In modifica il totale a video non tiene lo sconto**: C-41 mostrava 22,80 € e il database ha
   salvato 21,73 (giusto). Chi modifica e legge il totale al cliente dice un numero sbagliato di
   1,07 €. Nel pannello della modifica mancano anche nome («Nome di chi ritira» vuoto), orario
   («Adesso» evidenziato, ma l'ordine è per le 20:00) e pagamento (POS non evidenziato): non si
   salvano, ma si leggono sbagliati.
5. **Il conto del tavolo non dice di quale ordine è ogni riga** (C-38 e C-39 si fondono) e non
   stampa le inclusioni del menù («+ 1 supplì, 1 crocchetta, 3 mozzarelline» non c'è): a chi
   paga va bene, a chi controlla il tavolo con due comande in mano no. Contanti e POS sul tavolo
   vuoto sono disabilitati ma vestiti da tasto pieno.
6. **Sul PC a 1040×757 la lista delle righe della comanda mostra una riga sola** (32 px per 132 di
   contenuto, si scorre dentro): con tre righe se ne vede una, e in modifica non si vede cosa
   c'è. Su una cassa più alta forse no: da misurare sulla cassa vera.
7. Il messaggio del tavolo non dice il tavolo: «Ordine n. 38 inviato in cucina · 11,00 €.».
8. Restano: `?stampa=1` che tiene la pagina dietro alla finestra di stampa (giro 12, n. 1, qui
   di nuovo: scheda chiusa e riaperta); nota fissa del cliente in comanda; formula del borsello;
   «#16» vs «W-16»; «salvato» in capacità; «Minimo d'ordine» dalla cassa (domanda 21).

## Voti

| Pagina | Giro 12 | Giro 13 | Perché |
|---|---|---|---|
| `/cassa/tavoli` | 4 | 8 | il conto c'è, con righe, menù, varianti e totale; si incassa e si libera; manca l'ordine di ogni riga e le inclusioni del menù |
| `/cassa/nuovo` (PC) | 8 | 8 | sconto € e % ✓, Invia spento dopo il no ✓; in modifica il totale senza sconto e i campi che mentono |
| `/cassa/nuovo` (telefono) | — | 5 | si ordina, ma tre prodotti irraggiungibili e il messaggio dell'invio invisibile |
| `/cassa/comanda` | 8 | 8 | NUOVA e TOLTE ✓, sconto ✓; «2 NUOVA» per un +1 è un errore in cucina |
| `/cassa/fasce` | 7 | 8 | «salvato · Annulla» per sei secondi, funziona in tutti e due i versi |
| `/ordina` (telefono) | 8 | 9 | 7 tocchi invece di 9, scheda in una schermata, orario già scelto, categorie fisse |
| `/totem` | — | — | chiuso |
| **Il giro** | **8** | **8** | le cinque cose chieste passano; i due difetti del telefono e il «2 NUOVA» sono da sistemare prima che qualcuno batta dal telefono |

## Risposta (sviluppo, 24/10 mezzogiorno)

- (1) **«2 NUOVA LA FUNGHI»** → la comanda scrive la differenza: «+1 (ora 2) LA FUNGHI» quando la riga è cresciuta, «NUOVA» solo se è tutta nuova.
- (2) **Tessere sotto il pannello sul telefono** → la griglia ha 200 px in fondo (il padding inline vinceva sul CSS: adesso `nuovo.css` lo forza).
- (3) **Messaggio verde dentro il pannello** → sul telefono è un avviso fisso in alto, sopra tutto.
- Medio: in modifica il totale a video tiene sconto e consegna dell'ordine (21,73, non 22,80).
- Restano: il conto non dice di quale ordine è ogni riga (si valuta con Edoardo se serve: al tavolo si paga tutto insieme); la lista righe della comanda a PC basso; il messaggio del tavolo senza il numero del tavolo.
- Ordini di prova C-40, C-41, W-42, C-43 annullati; C-38 e C-39 restano ritirati col conto (34,50 € POS finti nel riepilogo di oggi).
