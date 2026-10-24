# Giro 19 — il resto, il blocco in fondo, i tasti, e le pagine rivestite dal grafico, sul deploy `f0029e1`

*Critico, 25/10/2026, 00:55–01:08 ora di Roma (dopo mezzanotte: la serata del 24 è ancora aperta
fino alle 6). Deploy `f0029e1` letto READY sul connettore Vercel (contiene `900a7f0`, le correzioni
del giro 18, e i giri 17–20 del grafico). Riquadro a 1024×768 e a 390×844. `window.open`, `print`,
`confirm` intercettati. Niente Velocissimo, niente account, niente password, niente messaggi
mandati, niente riparazioni, file del grafico non toccati. Scheda di prova «Prova Critico Tre»
(3331234888).*

**Il totem è chiuso** (01:00 di notte): «SIAMO CHIUSI · La cucina apre alle 18:30 · TORNA A
TROVARCI». Non provato.

## Da annullare (ordini di prova)

Aperto: **C-75** (banco, POS, marinara 6,40). Consegnato e saldato (non si annulla più): **C-74**
(domicilio «Oggi 21:00» = 25/10, capricciosa + napoli, sconto 2 €, paga con 50, 16,80 contanti).
Nessun tavolo aperto, nessun ordine dal sito.

## Il ricontrollo di `/cassa/nuovo` a 1024×768

| | Chiesto | Letto | |
|---|---|---|---|
| 1 | «Resto da portare» con sconto manuale = quello del rider | Domicilio capricciosa 9,40 + napoli 8,40 + consegna 1,00 − sconto 2,00 = 16,80, paga con 50 → cassa **«Resto da portare: 33,20 €»**, rider **«paga con 50,00 € → resto 33,20 €»** | ✓ |
| 1b | …anche col coupon | **Non provato**: nella tabella `coupon` non ce n'è nessuno attivo, e accenderne uno sarebbe cambiare la configurazione. Nel codice la riga del resto scala `coupon?.sconto` come il totale (`src/app/cassa/nuovo/page.tsx`, riga 656); il rider legge `contanti_da_incassare` dal server | da provare con un coupon vero |
| 2 | Il messaggio dell'invio dentro il blocco fermo, a scorrimento zero | «Ordine n. 74 inviato in cucina per oggi alle 21:00 · 16,80 € contanti · BOLOGNA SPALLANZANI, consegna 1,00 €.» a 533–635 px, **dentro `.c-fondo`** (622–768 col totale e INVIA a 706), sopra tutto (`elementFromPoint` dà il messaggio), `scrollTop` 0 | ✓ |
| 2b | «scegli Contanti o POS» nello stesso posto | Banco senza pagamento → **«Al banco si paga subito: scegli Contanti o POS.»** a 590–640, dentro `.c-fondo`, sopra INVIA; con POS → «Ordine n. 75 inviato in cucina · 6,40 € POS.» a 577–640 | ✓ (e la frase adesso dice anche il perché) |
| 3 | Nessun tasto della comanda sotto i 44 (PC) | Nella colonna a 1024 col domicilio a pannello pieno: **0 tasti sotto 44** (Adesso, Contanti, POS, Già pagato, Applica, €, %, Svuota tutti a 44) | ✓ |
| 3b | (non chiesto) lo stesso a 390 | Col pannello aperto restano **Adesso, Applica, €, % a 40** | nota |

## Le pagine rivestite (stili in riga alle classi): uguali a prima?

Misure: schermate di altezza (Sch.), testi sotto 13 px, elementi oltre il bordo, tasti sotto 44.
«Prima» sono le misure dei giri 16–18.

| Pagina | 390: Sch. (prima) | 1024: Sch. | <13 px / sborda / tasti <44 | Testo | |
|---|---|---|---|---|---|
| `/cassa/riepilogo` | **1,1** (5,1) — 1,7 col ramo aperto | 1,0 | 0 / 0 / 0 | «ORDINI 6 · 2 validi» è un ramo chiuso (summary 44 px); dentro le carte di prima | ✓ meglio, ma vedi il grave n. 1 |
| `/cassa/fasce` | 2,7 (2,6) | 1,7 | 0 / 0 / 0 | «PLANNER — FASCE · 3 pizzaioli · 2 rider → · 2 ordini · 3 pizze · 1 consegne · 23,20 €», legenda e tabella come prima | ✓ uguale |
| `/cassa/capacita` | 2,9 (3,1) | 2,1 | 0 / 0 / 0 | Nuova riga utile: «Turno non impostato per questo giorno: vale quello del 24 ottobre finché non salvi.» | ✓ |
| `/cassa/tavoli` | 1,5 (1,4) | 1,0 | 0 / 0 / 0 | «SALA · DENTRO · D1 · LIBERO · Apri …» come prima | ✓ uguale |
| `/cassa/cliente` | 1,0 → 1,5 con la scheda | 1,0 | 0 / 0 / 0 | «PROVA CRITICO TRE · 3331234888 · Via Nomentana 120 · NOTE FISSE · citofono rotto … · Prendi l'ordine · ★ 159 punti · INDIRIZZI … Mappa ↗ · ULTIMI ORDINI · C-74 · 25 ott · domicilio · · 16,80 €». La riga degli ultimi ordini finisce con un «·» vuoto (il separatore senza il pagamento), come le carte di `/cassa` prima del giro 16 | ✓ con una virgola |
| `/cassa/rider` | 1,4 (1,1–1,4) | 1,3 | 0 / 0 / 0 | «deposito · dal rider alla cassa» a 390 su due righe, «deposito dal rider alla cassa» a 1024 con lo spazio ✓; Salda 16,80 → «saldate 1 consegne, versati 16,80 €» · depositi 153,50 → 170,30 | ✓ uguale |
| `/rider` | 1,1 (1,1–1,6) | — | 0 / 0 / 0 | «GPS negato: consenti la posizione …», «#74 · ASSEGNATA · … · 16,80 € in contanti · paga con 50,00 € → resto 33,20 € · … · Note: giro 19», poi «Hai in mano 16,80 € · da versare in cassa 16,80 €» | ✓ uguale |

**Nessuna pagina rivestita si legge peggio.** Il riepilogo è passato da 5 schermate a una.

## `/ordina` a 390 (testata, righe, scheda)

- **Testata**: «‹ Indietro» 96×48 a sinistra ✓; il logo è al centro (centro a 195 px su 390) ma è
  **87×32 px**: «grande» non è; a destra il bollino 34×34.
- **Righe del menù**: titolo della categoria «PIZZE CLASSICHE» in maiuscolo (Figtree 16 px) ✓;
  ogni riga alta 152 px con nome (20 px), descrizione (14 px) e **prezzo a sinistra** sotto la
  descrizione (19 px), foto 128×128 a destra ✓. La fila delle categorie scorre di lato (fino a
  897 px): è una fila, va bene.
- **Scheda**: «‹ Indietro · **Dettagli** · LA CAPRICCIOSA · descrizione · 9,40 € · Quantità − 1 + ·
  Aggiungi ingredienti · IMPASTO 2 scelte ▾ · LATTICINI 13 · SALUMI E PESCE 17 · SPEZIE E ALTRO 9 ·
  VERDURE 22 · 1 · Aggiungi al carrello · 9,40 €» ✓ come «Dettagli» dell'app.
- **Togliere ingredienti** e **cercare nel menù** (REA 16, domanda 22) non ci sono ancora: nessun
  campo di ricerca, nessun «Senza …» nella scheda. È una domanda aperta, non un difetto.

## Il riepilogo dopo mezzanotte (il grave di questo giro)

A 00:58 `/cassa/riepilogo` dice in cima **«RIEPILOGO DI OGGI · ORDINI 2 · PIZZE 3 · CONSEGNE 1 ·
VENDUTO 23,20 €»** e nel ramo «ORDINI 6 · 2 validi» (C-75, C-74 e quattro preordini del 25
annullati), cioè il **giorno di calendario** dalla mezzanotte; ma il blocco **CASSA** sotto dice
«IN CASSA · CONTANTI **221,00 €** · IN CASSA · POS **87,10 €** · AI RIDER 0,00 · ANCORA APERTI
13,60 €», cioè **la serata del 24** (taglio alle 6, `giornata_lavorativa`). Sulla stessa pagina:

| Voce | Serata del 24 (atteso) | Letto | |
|---|---|---|---|
| In cassa · contanti | 221,00 (fine giro 18; C-74 è del 25 perché la sua ora di consegna è il 25 alle 21) | 221,00 € | ✓ per la serata |
| In cassa · POS | 87,10 | 87,10 € | ✓ |
| Ancora aperti | C-10 7,20 + C-75 6,40 (battuto alle 00:56, è ancora la sera del 24) | 13,60 € | ✓ |
| Ordini / venduto in cima | 26 ordini, ≈ 350 € della serata | **2 ordini, 23,20 €** | ✗ |

Un cassiere che chiude alle 00:30 — l'ora in cui si chiude davvero — legge «2 ordini · venduto
23,20 €» sopra «in cassa 221,00 €»: due giorni diversi uno sopra l'altro. La testata e il ramo
degli ordini usano la mezzanotte (`inizioGiorno()`, righe 21–23 di `src/app/cassa/riepilogo/page.tsx`),
il blocco Cassa il taglio delle 6 (righe 67–71). Lo stesso succede a `/cassa/fasce` («2 ordini · 3
pizze · 23,20 €»), ma lì è giusto: è il planner della sera che viene.

C'è anche un secondo effetto: C-74, battuto alle 00:55 con «Oggi 21:00», è finito sulla serata del
25 (giusto per l'ora di consegna), **consegnato e saldato** subito; i suoi 16,80 € sono nel
cassetto stanotte ma il riepilogo di stanotte non li conta, li conterà domani sera. È un caso di
prova (nessuno consegna alle 01:00 un ordine delle 21:00), ma dice che «saldato» e «giornata» non
si parlano.

## I difetti, dal più grave

1. **Dopo mezzanotte il riepilogo mescola due giorni**: in cima e nel ramo «oggi» di calendario
   (2 ordini, 23,20 €), nel blocco Cassa la serata del 24 (221,00 / 87,10). La chiusura di cassa
   si fa proprio a quell'ora.
2. Il resto col **coupon** non si è potuto provare (nessun coupon attivo).
3. A 390 col pannello aperto quattro tasti a 40 (Adesso, Applica, €, %).
4. `/cassa/cliente`: «C-74 · 25 ott · domicilio · · 16,80 €», il «·» vuoto in fondo.
5. `/ordina`: il logo al centro è 87×32, non «grande».

## Voti per pagina

| Pagina | Voto | Perché |
|---|---|---|
| `/cassa/nuovo` a 1024 | **9** (era 8) | Resto giusto, messaggi nel blocco fermo, tutti i tasti a 44 |
| `/cassa/nuovo` a 390 | 8 | Quattro tasti a 40 col pannello aperto |
| `/cassa/riepilogo` | 7 (era 9) | Una schermata col ramo chiuso, ma dopo mezzanotte due giorni nella stessa pagina |
| `/cassa/fasce` | 8 | Uguale a prima |
| `/cassa/capacita` | 8 (era 7) | Uguale, più la frase sul turno ereditato |
| `/cassa/tavoli` | 9 | Uguale |
| `/cassa/cliente` | 8 | Uguale; il «·» in fondo agli ultimi ordini |
| `/cassa/rider` | 9 | Uguale, lo spazio c'è |
| `/rider` | 9 | Uguale, il resto giusto |
| `/ordina` a 390 | 9 | Righe e scheda come l'app; logo piccolo |
| `/totem` | — | Chiuso di notte |

**Giro 19: 8 su 10.** Le tre correzioni del giro 18 passano (col coupon da provare), le pagine
rivestite sono uguali o meglio; il riepilogo dopo mezzanotte è la cosa nuova da sistemare prima
di una chiusura vera.

## Risposta (chat principale, 25/10/2026)

- Riepilogo dopo mezzanotte: la testa e il ramo degli ordini leggono la stessa serata del blocco Cassa (taglio alle 06:00 di Roma, come `giornata_lavorativa` nel database), anche col cambio dell'ora legale; il titolo è «Riepilogo della serata».
- C-74 sulla serata del 25: è giusto per come è stato battuto (dopo mezzanotte «Oggi 21:00» è il 25 sera); il caso vero di un domicilio battuto dopo mezzanotte per subito resta sulla serata prima.
- `/cassa/cliente`: la riga degli ultimi ordini senza separatori vuoti.
- I quattro tasti a 40 a 390 e il logo di `/ordina`: al grafico.
- C-75 annullato.
