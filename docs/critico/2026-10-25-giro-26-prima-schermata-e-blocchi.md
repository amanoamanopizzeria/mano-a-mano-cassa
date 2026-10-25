# Giro 26 del critico: prima schermata, ✕ sulle righe, cliente nuovo, stampa a blocchi, orologio

Deploy `52f49a2`, poi `e01cba9` per l'orologio (entrambi READY). 25/10/2026, 02:15–02:35 (ora solare).
Cassa a 1024×768 e a 390×844 affiancate. Cliente di prova mio: «Prova Critico Ventisei», 0009990026,
Via Novara 9 (la via della pizzeria, nessun dato vero). Ordini di prova: C-84 (domicilio per le 19:00),
C-85 (banco subito), C-86 (domicilio per le 20:00). **Tutti e tre annullati** alla fine (controllato
sul database). C-82 e C-83 del giro 25 risultano già annullati. «Stampa da sola» rispenta alla fine.

**Voto: 7,5 su 10.** Le cinque cose chieste ci sono e funzionano; quello che manca è la nota di
consegna dove serve davvero (sulla carta) e la stampa dei preordini presi il giorno prima.

## Cosa va

1. **/cassa, prima schermata.** A 1024: colonna a sinistra «+ NUOVO ORDINE», «Nessuna chiamata
   ricevuta», ORA / PIZZE / CONSEGNE da 18:30 a 22:45; la colonna scorre da sola (941 px dentro 768),
   la pagina no. Filtri «Da fare 1 · Da preparare 1 · Pronti 0 · In uscita 0 · Chiusi 69», alti 48 px.
   I numeri tornano con `/cassa/fasce` a ogni passo: 19:00 «4/35» e «1/2» con C-84, poi 20:00 «4/35» e
   «1/2» dopo lo spostamento, 19:15 «1/35» con C-85. Con C-86 il quarto delle 20:00 diventa «2/2» in
   **rosso** (`rgb(198,40,40)`). A 390 i quarti diventano una fila di caselle 76×97 che scorre di lato,
   niente scorrimento orizzontale della pagina, nessun tasto sotto 44 px, nessun testo sotto 13 px.
   «Prova chiamata» col mio numero: in 3 s la colonna mostra «Chiamata delle 02:21 · 0009990026 · Apri
   la scheda» (44 px).
2. **✕ sulle righe** di `/cassa/nuovo`: 44×44, col mouse vero toglie la riga al primo clic. Scorrere a
   sinistra mostra «Elimina» (110×44, rosso) e il clic su «Elimina» toglie la riga giusta.
3. **«+ Nuovo cliente» senza cercare**: telefono, nome, «Note del cliente», via (scelta dalla lista
   «Via Novara, Roma, RM»), civico, «Note di consegna (citofono, scala, piano…)». Mostra «0,2 km dalla
   pizzeria · Zona VERBANO · consegna 1,00 € · minimo 10 €». «Salva e prendi l'ordine» apre
   `/cassa/nuovo` con «Prova Critico Ventisei · 0009990026», Domicilio scelto e «Via Novara 9 · VERBANO
   (1,00 €)». Nella scheda, sotto INDIRIZZI: «Via Novara 9 00198 Roma · PROVA citofono Critico, scala B».
   Le note del cliente e quelle di consegna adesso sono separate (era il resto del giro 22).
4. **Stampa a blocchi** con «Stampa da sola» accesa: C-85 banco esce subito (`stampato_il` 2 s dopo);
   C-84 domicilio per le 19:00 non esce, la carta dice «stampa alle 18:30». Il domicilio «fra 20
   minuti» di notte non si può fare (le consegne vanno 19:00–22:30): letto nel codice, `stampaAlle`
   = quarto − 30 min è già passato e quindi esce subito, in `/cassa` e in `coda_stampa()`.
5. **Orologio 🕒** (48×48) su ogni carta aperta, preordini compresi: «Sposta C-84 alle…», 18 quarti
   con «4/35 pizze 1/2 cons.», il quarto attuale spento. Un tocco su 20:00: la carta passa a «per le
   20:00» e «stampa alle 19:30», la colonna a sinistra passa 19:00 «0/35 0/2» → 20:00 «4/35 1/2»
   insieme, e `/cassa/fasce` uguale. Il conto alla rovescia di notte non si vede (oltre 180 minuti non
   si mostra): non verificato.
6. **Categorie a 1024**: 174×84, testo 20 px; prodotti 174×88, 18 px. Si toccano bene.

## Cosa non va

**Grave per la serata**

- **La nota di consegna non arriva sulla carta.** La comanda di C-84 (`/cassa/comanda/…`) dice «Via
  Novara 9 · 00198 Roma · zona VERBANO» ma non «PROVA citofono Critico, scala B»; non c'è nemmeno sulla
  carta del preordine in `/cassa` né accanto all'indirizzo in `/cassa/nuovo`. La si salva e la vede
  solo chi apre la scheda: il rider che ha in mano la carta non la legge.
- **I preordini presi il giorno prima non li stampa l'agente.** `coda_stampa()` (mig. 0058) prende
  solo `creato_il > now() - 18 ore`: un ordine preso oggi a pranzo per domani sera, o la sera prima,
  non entra mai nella coda. Si vede già: C-10 (creato il 23/10 alle 07:28, per «sab 24 alle 20:30»)
  è ancora «non stampata» e «in ritardo di 416 min».

**Medio**

- **L'orologio sposta sempre a oggi.** `apriSposta` e `sposta` usano la data di oggi (Roma), non quella
  dell'ordine: un preordine di domani, o C-10 del 24, toccato col 🕒 finisce sul quarto di oggi. Non
  l'ho provato su C-10, che non è mio.
- **Spostato dopo la stampa, la cucina ha l'ora vecchia.** C-85 era «stampata 02:26»; spostato alle
  19:15 dice «stampa alle 18:45 · già stampata» e non si ristampa (voluto, mig. 0059). Un domicilio
  stampato per le 20:00 e spostato alle 20:30 resta in mano con «20:00».
- **Col mouse lo scorrere a sinistra riesce 1 volta su 4.** Dopo il trascinamento il browser manda un
  clic sulla stessa riga, e il clic sulla riga «scorsa» la richiude (`scorsa === r.chiave ?
  setScorsa(null)`). Al dito di solito non c'è il clic dopo lo scorrimento: col tablet va provato in
  negozio. La ✕ funziona sempre.
- **A 1024×768 la comanda si vede a due righe.** Con 6 pizze, la lista è alta 90 px e se ne vedono 2;
  le categorie grandi prendono metà altezza e dei prodotti se ne vedono 3 file e mezza su 6.
- **Il cliente resta attaccato dopo l'invio.** Dopo C-84 la comanda nuova aveva ancora «Prova Critico
  Ventisei · 0009990026»: il banco successivo C-85 è uscito a suo nome, con la sua nota «⚠ PROVA
  critico giro 26». Se è voluto va detto; se no il prossimo cliente eredita nome e note.

**Da avere**

- In `/cassa/fasce` la legenda dice «0/20 posti liberi · 14/20 quasi piena · 20/20 sold out» con il
  massimo a 35; e la 🔍 conta anche gli annullati (19:00 «1 ordine» è W-19 annullato, 20:00 «3 ordini»
  con due annullati).
- La chiamata nella colonna apre `/cassa/cliente` ma non ha «Prendi l'ordine» diretto, che invece c'è
  nella scheda.
- Nell'orologio un banco mostra solo le pizze (giusto) e ci sono anche 18:30 e 18:45 per un domicilio,
  prima che si consegni.

## Pulizia

C-84, C-85, C-86 annullati da `/api/ordini/<id>/stato` (200). Il cliente di prova 0009990026 resta in
anagrafica con l'indirizzo Via Novara 9: si può togliere. C-10 non è mio ed è ancora «ricevuto».
