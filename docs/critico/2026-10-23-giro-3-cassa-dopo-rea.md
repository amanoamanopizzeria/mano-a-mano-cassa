# Giro 3 del critico — la cassa nuova dopo il REA (23/10/2026, 03:00–07:30)

> Solo la cassa nuova (https://mano-a-mano-cassa.vercel.app), come un cliente al
> totem e come un cassiere. Niente Velocissimo, niente back-office. Ordini di
> prova sulla cassa nuova: sì, quanti ne servivano (#7, #8, #9 di oggi).

**Cosa c'era in produzione mentre provavo.** Deploy Vercel `READY` dei commit
`f9efd41` (mig. 0021, varianti vere), `45157e8` (mig. 0022, orari e preordini) e,
dalle 07:00, `4959e15` (mig. 0023, menu combo). La mig. 0024 (consegne che nascono
da sole, borsello rider) **non era ancora in produzione**: la pagina `/rider` l'ho
guardata com'era.

**Come sono entrato.** Il browser (Claude in Chrome) aveva già la sessione aperta
con l'utenza di Edoardo (si legge in alto a destra in ogni pagina). Non ho usato
né creato password. Il totem era già attivato in un'altra scheda e la chiave sta
in `localStorage` (`totem:chiave`), che è per origine: la mia scheda nuova sullo
stesso dominio l'ha trovata attivata. **Vale la pena saperlo**: chiunque apra
`/totem` dallo stesso browser del cassiere è dentro senza chiave.

**Il browser era a 640 px di larghezza** (come nel giro 1): è stretto per la
cassa e lo dico dove conta. Orario di Roma durante le prove: 03:04 → 07:20,
quindi «Adesso» era sempre fuori orario, e questo ha fatto comodo.

L'ordine di prova, uguale al giro 1: **2× La Margherita, una CON bufala, 1 Supplì,
1 Coca cola 0,33cl**. Online costa 24,10 € con la bufala su tutte e due; con la
bufala su una sola, 21,60 €.

---

## 1. I 12 lavori del giro 1 — a che punto sono

| # | Lavoro | Esito | La prova |
|---|---|---|---|
| 1 | Ingredienti in più a 0 € | **Risolto** | Pizze classiche → «2» + La margherita → Varianti → LATTICINI: ogni bottone ha il prezzo («Mozzarella di bufala DOP + 2,50 €», «Brie de Meaux + 2,50 €», «Stracciatella al tartufo + 3,50 €»). Tocco la bufala: la riga da 2 si sdoppia, quella con la bufala segna **9,70 €** e sotto «+ Mozzarella di bufala DOP (2,50 €)»; totale **16,90 €**, poi **21,60 €** con supplì e Coca. Al tavolo 11,00 € (8,50 + 2,50). In comanda (#7) la riga dice «CON Mozzarella di bufala DOP». |
| 2 | Civico ignorato dal geocoding | **Risolto** | `/cassa/cliente`: «via nomen» → «Via Nomentana, Roma» → 4,9 km, «Fuori dalle zone» (è il punto della via) → scrivo **120** → il campo via diventa «Via Nomentana, 120, 00161 Roma», **1,2 km**, «**Zona BOLOGNA SPALLANZANI · consegna 1,00 € · minimo 10 €**». Il link «mappa» ora è del civico. |
| 3 | Domicilio senza cliente, zona, orario | **Risolto** | Domicilio senza telefono → «Invia» → riquadro rosso «Serve l'indirizzo: apri Dati cliente», l'ordine non parte. Da «Prendi l'ordine» la comanda ha il cliente, il menu a tendina dell'indirizzo con la zona, «+ consegna 1,00 €» nel totale, «Minimo d'ordine 10,00 €: mancano 2,80 €» con una sola pizza. Giorno (Oggi … gio 29 ott, 7 giorni) e quarto d'ora (19:00–22:45 ritiro; domicilio fino alle 22:30) ci sono. **Ma vedi il nuovo n. 1**: il preordine per domani viene rifiutato. |
| 4 | Errore tecnico scritto piccolo | **Risolto (con una stonatura)** | Asporto «Adesso» alle 03:04 → riquadro rosso grande sopra «Invia in cucina»: «A quest'ora non si ritira (ritiro 19:00–22:45): scegli giorno e ora qui sotto.» Ma i menù Giorno/Ora stanno **sopra** il riquadro, non «qui sotto». E il messaggio del minimo d'ordine sta in un altro posto (in alto sotto l'indirizzo, piccolo, rosso): due posti per gli errori. |
| 5 | Totem: impasto alto sulle bibite | **Risolto** | Totem → Fritti → Supplì di riso: solo quantità, nessun «AGGIUNGI INGREDIENTI». Bevande → Coca cola 0,33cl: idem. In cassa, «Varianti» sulla Coca apre un pannello con soltanto CON/SENZA e niente sotto (bottone da spegnere, vedi n. 9). |
| 6 | Totem invia al tocco su «Contanti» | **Risolto** | Dopo il nome: «COME VUOI PAGARE?» con CONTANTI / CARTA·POS, sotto «IL TUO ORDINE · TEST» riga per riga e il bottone «SCEGLI COME PAGHI» spento; tocco Contanti e diventa «CONFERMA · 28,70 €». Solo lì parte. |
| 7 | Menù della cassa non è quello di oggi | **Aperto** | Le categorie sono ancora LE NOVITÀ ESTIVE (prima scheda, su cassa e totem), BURGERIA, INSALATE, FRISELLE; niente VETRINA NAPOLI. Il gap del REA lo mette nel punto 2 (pulizia del catalogo): non è ancora arrivato. |
| 8 | A 640 px la barra delle categorie è coperta | **Aperto** | Misurato di nuovo: «Fritti» a x=378, «Bevande» a x=307, «Birre» a x=378 con il pannello dell'ordine che parte da x=300: `elementFromPoint` non li restituisce, non si toccano. Anche la griglia dei prodotti e dei bottoni delle varianti perde la quarta colonna (si vede «CHEDDAR» a metà). Il titolo in alto («MENU CLASSICO X2 · SCEGLI LE 2 PIZZE…») va a capo una lettera per riga. Li ho dovuti cliccare via script, come nel giro 1. |
| 9 | Tavoli in ordine alfabetico | **Risolto** | Il menu «Scegli il tavolo» è D1, D2, …, D20, F1, …, F15, ognuno con «· libero». |
| 10 | Fasce dalle 11:00 (52 righe) | **Risolto** | `/cassa/fasce` e `/cassa/capacita`: 18 quarti d'ora, 18:30 → 22:45. In cima «5 ordini · 14 pizze · 2 consegne · 107,00 €». |
| 11 | Note fisse del cliente non in comanda | **Aperto** | Ho salvato «citofono rotto, chiamare al cancello» sulla scheda del 3331234888; nella comanda stampata dell'ordine #8 c'è nome, telefono, via, zona, la nota dell'ordine («prova critico giro 3») ma **non la nota fissa**. Neanche il banner in `/cassa/nuovo` la mostra. (La mig. 0024 dice di portarla al rider: non era ancora in produzione.) |
| 12 | Da provare al giro dopo | **Fatto a metà** | 90 s del totem: **sì, torna all'avvio** (fermo nel menù, a 128 s era di nuovo su «ORDINA QUI»; il timer in codice è 90 s). `/rider` e `/cassa/mappa`: aperti, vedi §5. Fascia piena da `/api/ordini-esterni`: non provato (chiave solo su Vercel). Flusso dopo «Ordina» di Velocissimo: non fatto, serve il permesso di Edoardo. |

**Conto: 8 risolti, 1 risolto a metà (il 4), 3 aperti (7, 8, 11), il 12 fatto a metà.**

### I quattro punti nuovi di oggi, uno per uno

1. **Varianti con i prezzi (0021)** — sì. Bufala 2,50 sul bottone, nella riga e nel totale; Impasto alto + 1,00; i gruppi sono quelli della categoria: la pizza ha IMPASTO, LATTICINI, SALUMI E PESCE (+ altri due fuori schermo), il supplì e la Coca nessuno.
2. **Orari e preordini (0022)** — fasce 18:30–22:45 sì; «Adesso» + Giorno + Ora sì; orari del tipo sì (ritiro fino alle 22:45, domicilio fino alle 22:30); errore in italiano grande sì; tavoli in ordine sì. **Il preordine però passa solo se il giorno ha i pizzaioli** (nuovo n. 1).
3. **Cliente: 20 km e civico** — civico sì (è il lavoro 2). I 20 km **a metà**: «via tusc» propone ancora «Via Tuscolana Vecchia, Frascati» e «Via Tuscolo, Monte Porzio Catone»; «via nomen» propone ancora «Via Nomentana, Monterotondo» e «Vicolo Nomentana, Mentana». È il raggio come *preferenza* di Google, non come confine: Mentana e Monte Porzio stanno proprio sul bordo dei 20 km e passano.
4. **Totem: pagamento, riepilogo, conferma; niente varianti su supplì e Coca** — tutto sì.

### I menu combo (0023, provati alle 07:00)

- **Cassa**: Menù → «Menu classico X2» apre i passi «SCEGLI LE 2 PIZZE O PUCCE 0/2» → «SCEGLI LA BIBITA GRANDE 0/1» → «IN COMANDA · 24,00 €». Il bottone «In comanda» è **spento** finché manca la bibita (`disabled: true` prima, `false` dopo). Scelte La marinara e La napoli, Coca 1,5lt: in comanda una riga «1× Menu classico X2 24,00 €» con sotto «└ La marinara · └ La napoli · └ Coca 1,5lt · + 2 supplì, 2 crocchette, 3 mozzarelline».
- **Varianti su una pizza del menu**: «Varianti» → riga «Su quale: La marinara | La napoli | Coca 1,5lt» → La napoli → LATTICINI → bufala. La riga diventa «└ La napoli + Mozzarella di bufala DOP (2,50 €)», totale **26,50 €**. Giusto. (La Coca è offerta in «Su quale» anche se non ha varianti: tocco inutile.)
- **Comanda stampata (#9)**: «MENÙ · 1 MENU CLASSICO X2 · LA MARINARA · LA NAPOLI CON Mozzarella di bufala DOP · COCA 1,5LT · [+ 2 SUPPLÌ, 2 CROCCHETTE, 3 MOZZARELLINE] in riquadro · 2 pezzi in cucina · Totale 26,50 €». È quello che serviva.
- **Forno**: in `/cassa/fasce` le 21:00 segnano 2/20 (le due pizze del menu), e le 20:30 sono scese da 6 a 5 perché il supplì **non conta più** come pizza (0023, `impegna_forno`). Prima della 0023 lo contava: ordine #7 alle 20:30 (2 pizze + 1 supplì) faceva 6/20 con 3 già presenti.
- **Totem**: Menù → «Menu classico X2» apre la scheda con «Inclusi nel menu: 2 supplì, 2 crocchette, 3 mozzarelline», la lista con i cerchietti e il bottone «COMPLETA LE SCELTE» **spento** (`disabled: true`); dopo due pizze resta spento; dopo la bibita diventa «AGGIUNGI · 24,00 €». Nel carrello: «MENU CLASSICO X2 · La marinara · La margherita · Coca 1,5lt · 24,00 €». **Sul totem le pizze del menu non accettano extra** (nessun «AGGIUNGI INGREDIENTI» nella scheda del menu), in cassa sì: online sì.

---

## 2. Il giro completo — cosa non va, per importanza

1. **Un preordine per domani viene rifiutato: «Quarto d'ora pieno in cucina alle 20:30: ci stanno ancora 0 pizze».** Domani non ha ancora i pizzaioli in `/cassa/capacita` (0 pizzaioli → 0/0 su ogni quarto d'ora), quindi `capacita_giorno` dice «pieno» e il telefono di oggi «per domani sera alle 20:30» non si può prendere, che era proprio il lavoro 3. E la frase è sbagliata due volte: dice «pieno» quando è «vuoto», e «ci stanno ancora 0 pizze». Serve una capacità di default per i giorni senza turno (lo standard del giorno della settimana) oppure, almeno, «Domani non hai ancora messo i pizzaioli: vai in Capacità».
   *Riprodurre:* `/cassa/nuovo` → Asporto → una pizza → Giorno «Domani» → Ora 20:30 → Invia in cucina. Poi `/cassa/capacita` con la data di domani: Pizzaioli 0, Rider 0, «fino a 0 pizze».
2. **Dopo «Invia in cucina» il cassiere non vede nessuna conferma.** La comanda si svuota e basta. Il messaggio esiste («Ordine n. 8 inviato in cucina…», `esito` a riga 316) ma sta nella barra in alto a sinistra, nello spazio fra «Sala» e il pannello dell'ordine: a 640 px è coperto, e quando compare la barra si alza di ~90 px e sposta giù tutte le categorie (si vede nelle foto dopo ogni invio). Stesso difetto del lavoro 4 del giro 1, solo che adesso è il messaggio buono a essere nascosto. Va nel riquadro grande vicino al bottone, come l'errore.
   *Riprodurre:* qualunque ordine → Invia → guarda a destra: niente. Guarda a sinistra: le categorie sono scese.
3. **I suggerimenti fuori Roma ci sono ancora** (Frascati, Monte Porzio Catone, Monterotondo, Mentana), e nella lista **non ci sono i km**: si vedono solo dopo la scelta. Nel giro 1 l'avevo chiesto; il REA (gap n. 4) pure. In più, prima del civico la scheda dice in rosso «Fuori dalle zone di consegna: non consegniamo qui.» sul punto della *via*: un cassiere che legge quello dice «no» al cliente prima di aver scritto il numero civico. Meglio «scrivi il civico» finché il civico manca.
   *Riprodurre:* `/cassa/cliente` → via «via nomen» → lista; scegli Roma → rosso «Fuori dalle zone» → civico 120 → verde.
4. **Le note fisse del cliente non arrivano in comanda** (lavoro 11, ancora aperto, vedi tabella). Il citofono rotto lo sa solo chi apre la scheda.
5. **A 640 px la cassa non si usa con il dito** (lavoro 8, ancora aperto): Fritti, Bevande, Birre sotto il pannello; quarta colonna di prodotti e di varianti tagliata; il titolo del menu combo in cima va a capo una lettera per riga. Serve la misura a 768 e a 1024 px prima di metterla su un tablet.
6. **Il totem dice «la cucina è chiusa» solo alla fine**, dopo 20 tocchi, nome e pagamento: alle 07:20 ho fatto tutto l'ordine (28,70 €) e dopo «CONFERMA» è arrivato «OPS · A quest'ora la cucina è chiusa». Il totem conosce l'orario (`orario`, tipo apertura): può dirlo sull'avvio («Si riapre alle 18:30») e non far nemmeno cominciare.
   *Riprodurre:* totem fuori orario → ordine completo → Conferma.
7. **Il menù è ancora quello estivo** (lavoro 7): LE NOVITÀ ESTIVE prima scheda a fine ottobre su cassa e totem, BURGERIA / INSALATE / FRISELLE, niente VETRINA NAPOLI. Un cliente che ha visto il sito al totem trova un altro menù.
8. **Sul totem tre categorie hanno una lettera davanti al nome**: «CBurgeria», «SInsalate», «CFriselle» (si legge anche nel testo dei bottoni; nella barra compaiono come «C / BURGERIA»). È l'iniziale usata al posto dell'icona che manca: va tolta o va messa un'icona.
   *Riprodurre:* totem → barra delle categorie.
9. **In cassa «Varianti» su una bibita o un fritto apre un pannello con soltanto CON/SENZA e niente sotto.** Il bottone va spento per le categorie senza gruppi, oppure il pannello deve dire «niente varianti per le bevande».
   *Riprodurre:* Bevande → Coca cola 0,33cl → riga selezionata → Varianti.
10. **Gli errori stanno in due posti**: «fuori orario» e «quarto d'ora pieno» nel riquadro grande sopra «Invia», «Minimo d'ordine 10 €: mancano 2,80 €» e «Serve l'indirizzo» in alto nel pannello, piccoli. E il riquadro di «fuori orario» resta lì anche dopo aver scelto giorno e ora: va tolto quando il cassiere corregge. E dice «qui sotto» con i menù che stanno sopra.
11. **Nel menu combo «Su quale» offre anche la bibita** (Coca 1,5lt), che non ha varianti; e dopo aver messo la bufala l'ordine dei figli cambia (La napoli finisce dopo la Coca): in comanda poi è giusto, ma in cassa confonde.
12. **Sul totem le pizze del menu non prendono extra**, in cassa sì e online sì (le pizze del menu accettano gli extra a pagamento, dice la 0023). Al totem o si accettano o si dice che non si può.
13. **La lista degli ordini (`/cassa`) non dice chi è il cliente né dove va**: la card #8 dice «domicilio · cassa · 03:09 · per le 20:45 · 15.40 € · Note: prova critico giro 3», ma non «Prova Critico Tre · Via Nomentana 120». Per sapere dove va bisogna aprire la comanda. E il prezzo è scritto «15.40 €» col punto, mentre tutto il resto dell'app usa la virgola.
14. **Il totale della comanda vuota a domicilio dice «1,00 €»** (la consegna, prima di toccare un prodotto). Piccolo, ma un cassiere lo legge come un errore.
15. **I prodotti cambiano ordine cambiando tipo**: in Bevande con Banco la prima tessera è «Coca cola 0,33cl», con Tavolo e Domicilio è «Chinotto Neri». Di sera la mano va a memoria.
16. **La scheda cliente salvata non ripete zona e costo** accanto all'indirizzo («Via Nomentana 120 00161 Roma · mappa»): la riga verde si vede solo mentre si scrive. Un cliente vecchio che richiama non si sa se è in zona finché non si apre la comanda.
17. **Chiunque apra `/totem` dallo stesso browser è dentro senza chiave** (la chiave sta in `localStorage`): sul totem vero va bene, sul PC della cassa vuol dire che il totem è a un indirizzo di distanza. Non è urgente, è da sapere.

---

## 3. `/cassa/nuovo` — il giro del cassiere

Banco: «2» + La margherita → «2× La margherita 14,40 €» (2 tocchi). Varianti → LATTICINI → bufala: la riga si sdoppia 1 + 1, 7,20 + 9,70. Supplì e Coca (cliccati via script, lavoro 8). **Totale 21,60 €**. Tavolo: «Scegli il tavolo» ordinato, prezzi L2 (8,50 / 11,00 / 2,50 / 3,50 = 25,50 €), e i menù Giorno/Ora spariscono (giusto: il tavolo è adesso). Domicilio senza cliente: bloccato con la frase giusta. Asporto «Adesso» alle 03:04: riquadro rosso con gli orari. Asporto «Oggi 20:30»: passa, comanda #7 giusta riga per riga, in `/cassa/fasce` finisce alle 20:30. Asporto «Domani 20:30»: **rifiutato** (nuovo n. 1).

Domicilio da chiamata (`/cassa/cliente` → Prendi l'ordine): banner col nome e il telefono, menu a tendina «Via Nomentana 120 · BOLOGNA SPALLANZANI», «+ consegna 1,00 €» sotto il totale. Una pizza: «Minimo d'ordine 10,00 €: mancano 2,80 €» (il minimo è calcolato sul cibo, 7,20 €, non sugli 8,20 € con la consegna). Due pizze, nota, «Oggi 20:45»: passa, **#8, 15,40 €**, comanda con cliente, via, zona, nota dell'ordine, «consegna 1,00 €». Ma nessuna conferma a video (nuovo n. 2) e niente note fisse (lavoro 11).

**Voto `/cassa/nuovo`:** funziona B (preordine per domani, conferma invisibile) · veloce A · chiaro B (errori in due posti) · meglio di oggi: A (varianti con prezzo, CON su una sola, giorno e ora, cliente con zona: il Velocissimo in cassa non fa niente di tutto questo).

## 4. `/cassa/cliente`

Numero nuovo 3331234888 → «Prova chiamata» → «Sta chiamando 3331234888 · 03:06 · prova» con «Prendi l'ordine». Via scritta a metà: suggerimenti in un secondo, ma ancora con Mentana e Frascati e senza km. Via + civico: km e zona del civico, verde, «consegna 1,00 € · minimo 10 €». Salvataggio: scheda con nome, telefono, **«Note fisse: citofono rotto…» in un riquadro bordato** (bene), indirizzo con «mappa», «Ultimi ordini: Nessun ordine».

**Voto:** funziona A · veloce A · chiaro B (il rosso «fuori zona» prima del civico, zona che sparisce dopo il salvataggio) · meglio di oggi: A.

## 5. Fasce, capacità, rider, mappa, cucina

- `/cassa/fasce`: 18 righe 18:30–22:45, i miei ordini al posto giusto, 20:30 rosso «1/1» sui rider (sold out) e la lente con il numero degli ordini. **Voto: funziona A · veloce A · chiaro B · meglio di oggi A.**
- `/cassa/capacita`: oggi Pizzaioli 2 / Rider 2 → «fino a 20 pizze e 2 consegne»; **domani 0 / 0 → «fino a 0 pizze e 0 consegne»** e tutti i quarti d'ora «0 / 0»: è la causa del nuovo n. 1. Niente «copia da oggi» o standard della settimana. **Voto: funziona B · veloce A · chiaro B · meglio di oggi A.**
- `/rider` (con l'utenza di Edoardo, non un rider): «GPS spento · Le mie (0) · Disponibili (0) · Da saldare alla cassa (0) · Hai in mano 0,00 €». Gli ordini a domicilio #5 e #8 non compaiono fra i disponibili perché le righe di `consegna` nascono con la 0024, che non era in produzione: **da riprovare al giro dopo** con un'utenza rider. La pagina è già nella forma dell'app Velocissimo RIDER (le mie, libere, da saldare). **Voto: non votabile oggi.**
- `/cassa/mappa`: la mappa di Roma (Leaflet/OSM) e sotto «Rider di prova · 0 consegne in corso · nessuna posizione». Senza il segnaposto della pizzeria e senza le consegne in corso: con un rider in giro non si sa dove deve andare. **Voto: funziona B · chiaro C.**
- Cucina: la comanda per reparto (`/cassa/comanda/[id]`) ha le righe giuste: pizze sotto PIZZE CLASSICHE, supplì sotto FRITTI, Coca sotto BEVANDE, e «3 pezzi in cucina» (#7, prima della 0023; dopo la 0023 la Coca e il supplì non dovrebbero contare: #9 dice «2 pezzi in cucina» con due pizze di menu + una Coca 1,5lt, giusto). Il menu combo con i fritti inclusi in riquadro. Non c'è una pagina «cucina» a video: la comanda è di carta. **Voto comanda: A.**

## 6. `/totem`

Avvio → Ordina qui → Fritti → Supplì (solo quantità) → Aggiungi → Bevande → Coca (solo quantità) → Aggiungi → Menù → Menu classico X2 (bottone spento finché non scelgo 2 pizze e la bibita) → Aggiungi → Vedi ordine (3 articoli, 28,70 €) → Avanti → nome con la tastiera a schermo → Avanti → Contanti → riepilogo riga per riga → **CONFERMA · 28,70 €** → «OPS · A quest'ora la cucina è chiusa · NUOVO ORDINE» (erano le 07:20), che dopo 12 s torna da solo all'avvio. Fermo 90 s nel menù: torna all'avvio.

**Voto `/totem`:** funziona A (fuori orario a parte) · veloce B (la cucina chiusa si scopre alla fine; il menu combo chiede di scorrere una lista di 20 pizze con i cerchietti) · chiaro A · meglio di oggi: A.

---

## Voti per pagina (1–10, come chiede Edoardo: obiettivo 8)

| Pagina | Giro 1 | Giro 3 | Perché |
|---|---|---|---|
| `/cassa/nuovo` | 5 | **7** | varianti, tavoli, orari, domicilio, errori: tutto arrivato; manca il preordine su un giorno senza turno, la conferma visibile e i 640 px |
| `/cassa/cliente` | 5 | **8** | civico e zona giusti; restano i suggerimenti fuori Roma e i km in lista |
| `/cassa/fasce` + `/capacita` | 6 | **7** | 18 righe giuste; la capacità dei giorni senza turno è 0 e blocca i preordini |
| `/cassa` (lista ordini) | — | **6** | manca cliente e indirizzo sulla card, prezzo col punto |
| `/cassa/comanda/[id]` | — | **9** | riga per riga giusta, menu con i fritti inclusi; manca la nota fissa |
| `/totem` | 5 | **8** | varianti giuste, conferma, 90 s; la chiusura detta alla fine |
| `/rider` | — | n.v. | serve la 0024 in produzione e un'utenza rider |
| `/cassa/mappa` | — | **5** | manca la pizzeria e le consegne |

Sotto l'8: `/cassa/nuovo`, fasce/capacità, `/cassa`, `/cassa/mappa`. I lavori sono i numeri 1, 2, 3, 5, 13 e la mappa.

## Cose da sapere per rispondere a Edoardo

- I quattro cambi di oggi (0021, 0022, cliente, totem) **fanno quello che dicono**: 8 dei 12 lavori del giro 1 sono chiusi. I tre aperti sono il menù estivo, i 640 px e le note fisse — tutti già nel gap del REA.
- Il difetto più grosso di oggi è nuovo e nasce dalla 0022: **un preordine su un giorno senza pizzaioli è «pieno»**. Finché `/cassa/capacita` non ha uno standard per i giorni futuri, il telefono «per domani» non si prende.
- La mig. 0024 (rider) era sul repo ma non in produzione durante il giro: `/rider` va riprovata.
- Non ho toccato Velocissimo, non ho creato utenze, non ho scritto password. Gli ordini di prova sono #7, #8, #9 di oggi (ritiro 20:30, domicilio 20:45, ritiro 21:00) e il cliente 3331234888 «Prova Critico Tre»: si possono annullare.
