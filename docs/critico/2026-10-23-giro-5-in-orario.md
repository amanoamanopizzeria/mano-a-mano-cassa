# Giro 5 del critico — in orario, totem aperto (23/10/2026, 19:40–19:55)

> Cucina aperta (18:30–22:45), sito pubblicato: deploy READY su `a77dbe2`
> (lista degli ordini con un solo vino, legenda delle fasce in cima), che
> porta con sé la mig. 0029 (la consegna segue l'ordine), gli errori rossi,
> il riepilogo per sera di consegna, «SOLD OUT col perché», e i giri 3 e 4
> del grafico. Niente Velocissimo, nessuna utenza, nessuna password.
> Ordini di prova creati e **annullati a fine giro**: **T-12** (totem, banco,
> Test, contanti, 23,20 €), **C-13** (domicilio, Prova Critico Tre, contanti
> paga con 20, 15,80 €) e la C-11 del giro 4b. La consegna di C-13 è passata
> da sola ad `annullata` (mig. 0029: verificato nel database).

**Come sono entrato.** Browser già loggiato con l'utenza di Edoardo, finestra
a 1288×925. Il totem era già attivato sullo stesso browser (chiave in
`localStorage`, nome della chiave e basta: `totem:chiave`).

---

## I voti

| Pagina | 4b | Ora | In una riga |
|---|---|---|---|
| `/totem` (aperto) | 8 | **8** | Bollino al posto della lettera, menu a passi con «Inclusi nel menu», varianti coi prezzi, carrello, nome, cassa/POS, «GRAZIE TEST! · 12». Ma nel menu combo la bibita sta sotto 45 pizze e pucce in un'unica lista. |
| `/cassa/nuovo` | 8 | **8** | Errore rosso (coupon: «Codice non trovato.»), «paga con» col resto, conferma verde con zona e consegna. Ma «Dati cliente» butta via la comanda, e dalla scheda del cliente cercata a mano non c'è «Prendi l'ordine». |
| `/cassa/cliente` | 8 | **8** | «Mappa ↗» a pillola, «15,40 €» con la virgola. Resta: dal cliente cercato a mano non si parte con l'ordine. |
| `/cassa/fasce` | 8 | **9** | Legenda in cima con le pillole vere, totale della sera a 15 px in nero, colonna ORDINI, i quarti passati in grigio e il pallino sull'ora corrente. Con la sera vera si legge in un colpo. |
| `/cassa/capacita` | 7 | **8** | «RIDER PIENI» al posto di SOLD OUT: ora si sa cosa manca. I quarti passati non sono in grigio come nelle fasce. |
| `/cassa` (lista) | 8 | **9** | Un solo vino per scheda (la pillola dello stato), l'azione bianca col bordo vino, il prezzo nero: adesso si distingue da lontano. Manca il «paga con 20 · resto 4,20» che il rider deve sapere. |
| `/` | 8 | **9** | «Nuovo ordine» prima porta, in vino, a tutta larghezza. |
| `/cassa/mappa` | 7 | **8** | La #2 non c'è più; «senza indirizzo: da sistemare» in vino; C-8/C-13 coi prefissi. Due consegne allo stesso civico fanno una goccia sola (la 13 copre la 8). |
| `/cassa/rider` | 9 | **9** | Uguale a stamattina, niente da aggiungere. |
| `/cassa/riepilogo` | 7 | **9** | 8 ordini · 21 pizze · 3 consegne · 160,40 €: **gli stessi numeri delle fasce**, C-10 di domani sparita, C-13 e T-12 coi prefissi, canale TOTEM. |
| `/cassa/tavoli` | 7 | **9** | 35 tavoli in una schermata (8 per fila), numero grande, pillola dello stato. |
| `/cassa/menu` | 8 | **9** | I spenti in un ramo chiuso «Spenti (n): non si vendono, restano in anagrafica». |
| `/login` | 8 | **9** | Da loggiati rimanda alla home. |

---

## 1. Il totem aperto, da cliente — 8

**Il giro.** Avvio («ORDINA QUI», «Tocca lo schermo per iniziare») → tocco →
categorie a sinistra con la foto nel tondo e **il bollino** dove la foto non
c'è (Burgeria, Insalate, Friselle: si vede, niente più lettera); anche la
tessera senza foto (Focaccia di Parma) ha il bollino. MENÙ → «Menu classico
X1» → scheda con la foto, «13,00 €», **«Inclusi nel menu: 1 supplì, 1
crocchetta, 3 mozzarelline»**, «SCEGLI LA PIZZA O LA PUCCIA 0/1» → La
margherita → «1/1» col segno; poi «SCEGLI LA BIBITA 0/1» → Coca cola →
«COMPLETA LE SCELTE» si accende → nella barra «1 articolo · 13,00 €».
Pizze classiche → La margherita → «AGGIUNGI INGREDIENTI» per gruppi
(IMPASTO, LATTICINI…) coi prezzi a destra; Impasto alto (+1,00) e Doppia
mozzarella (+2,00): il tasto dice «AGGIUNGI · 10,20 €». VEDI ORDINE →
le due righe con le scelte sotto («La margherita · Coca cola 0,33cl»,
«Impasto alto · Doppia mozzarella»), −/+ per riga, totale 23,20 € → AVANTI
→ «COME TI CHIAMI?» con la tastiera a schermo → TEST → «COME VUOI PAGARE?
Si paga alla cassa, quando ritiri. Totale 23,20 €» → CONTANTI → la scheda
si accende d'oro, sotto il riepilogo, «CONFERMA · 23,20 €» → **«GRAZIE
TEST! · IL TUO ORDINE 12 · Vai alla cassa e paga in contanti»**. In cassa
è arrivato come **T-12 · banco · totem · Test · contanti · 23,20 €**, nel
riepilogo il canale TOTEM conta 1.

**Cosa confonde.**
- **Nel menu combo la bibita è nascosta sotto 45 righe.** Il passo 1 è una
  lista unica di 22 pizze e 23 pucce, mischiate (La marinara, Puccia
  vegetariana, La margherita, Puccia crudo…); scelta la pizza, il tasto
  «COMPLETA LE SCELTE» resta spento e non dice perché: la bibita sta in
  fondo, dopo tre schermate. Un cliente al totem si ferma lì. Riprodurre:
  MENÙ → Menu classico X1 → La margherita → guardare il tasto.
- Le tessere del menù («MENU CLASSICO X1», «MENU SPECIALE X2») non dicono
  cosa c'è dentro: la stessa foto di supplì e Coca cola per sei menu, e
  «Inclusi nel menu» si legge solo dopo averli toccati. Il «Menu puccia»
  7,90 € ha il bollino e nessuna descrizione.
- Fra le bibite del menu c'è «Peroni 33cl»: è una birra. Se è voluto va
  bene, se no è un errore del listino.
- Nella scheda del prodotto il prezzo in alto resta «7,20 €» mentre il
  tasto sotto dice «AGGIUNGI · 10,20 €»: due prezzi sullo stesso schermo.
- Il T-12 nelle fasce è finito nel quarto **19:30**, che alle 19:44 era già
  passato (grigio): «adesso» cade nel quarto in corso, non nel prossimo.

## 2. `/cassa/nuovo`: domicilio con cliente, coupon, contanti e resto — 8

**Il giro.** Da `/cassa/nuovo?telefono=3331234888`: in alto nel pannello
«📞 Prova Critico Tre · 3331234888 · Via Nomentana 120», la tendina
dell'indirizzo con la zona («Via Nomentana 120 · BOLOGNA SPALLANZANI
(1,00 €)»). La diavola + La marinara, Domicilio. COUPON «PROVA10» → Applica
→ **«Codice non trovato.»** in rosso sotto il campo (chiaro, breve, rosso:
giusto). Contanti → compare «paga con…» → 20 → «resto 4,20 €». «Invia in
cucina» (Adesso, in orario) → riquadro verde **«Ordine n. 13 inviato in
cucina · BOLOGNA SPALLANZANI, consegna 1,00 €»**. Nel database:
`pagamento contanti`, `paga_con 20`, `costo_consegna 1,00`.

**Cosa confonde o manca.**
- **«Dati cliente» butta via la comanda.** Avevo già La diavola in comanda;
  tocco «Dati cliente», cerco il cliente, torno: la comanda è vuota. Il
  cassiere che prende il nome a metà ordine rifà tutto. Riprodurre:
  un prodotto → Dati cliente → indietro.
- **Dalla scheda del cliente cercata a mano non si parte con l'ordine.**
  «Prendi l'ordine» compare solo quando arriva una chiamata (`chiamata`);
  cercando il numero a mano la scheda si apre ma non c'è il tasto, e per
  agganciare il cliente all'ordine bisogna sapere l'indirizzo
  `/cassa/nuovo?telefono=…`. Riprodurre: `/cassa/cliente` → 3331234888 →
  Cerca → non c'è «Prendi l'ordine».
- **Il resto è tagliato.** Nel pannello da 250 px la riga «Contanti · POS ·
  Già pagato · paga con… · resto 4,20 €» non ci sta: si legge «20 | esto
  4,20 €», la «r» sta sotto il campo. Riprodurre: Domicilio → Contanti →
  paga con 20.
- **In lista il resto non c'è.** La scheda C-13 in `/cassa` dice
  «contanti» e basta: «paga con 20 · resto 4,20» è l'informazione che serve
  al rider che esce, e sta solo nel database.
- L'ordine «Adesso» a domicilio non ha un'ora: in lista «19:45» senza «per
  le», nel riepilogo «cassa · domicilio» senza ora. Non è sbagliato, ma
  è diverso dagli altri.

## 3. `/cassa/fasce` e `/cassa/capacita` con la sera vera — 9 e 8

Fasce alle 19:45: i quarti passati (18:30–19:30) in grigio chiaro, il
pallino vino e «19:45» in vino sulla riga corrente, 20:30 con «1/1» vino
(rider pieni), le pillole «🔍 2» in vino con l'etichetta in legenda. In
cima: «8 ordini · 21 pizze · 3 consegne · 160,40 €» a 15 px coi numeri in
nero. Si legge in un colpo: **9**.

Capacità: «RIDER PIENI» a 20:30 (consegne 1/1, pizze 5/20): ora dice cosa
manca. Manca il grigio sui quarti passati, che nelle fasce c'è: alle 19:45
le schede 18:30–19:30 sono bianche come le altre. **8**.

## 4. Riepilogo, mappa, lista — 9, 8, 9

- **Riepilogo**: 8 · 21 · 3 · 160,40 € = esattamente le fasce. C-10 (domani)
  non c'è più. Schede coi prefissi (C-13, T-12, APP-4), canale TOTEM. **9**.
- **Mappa**: la #2 (APP-2) non è più «in corso» (nel database la consegna
  è `consegnata`); C-5 dice **«senza indirizzo: da sistemare»** in vino;
  C-8 e C-13 coi prefissi. Un difetto nuovo: C-8 e C-13 sono entrambe a Via
  Nomentana 120 e sulla mappa c'è **una goccia sola, «13»**: la 8 sta
  sotto. Due consegne allo stesso portone capitano (stesso palazzo, due
  piani) e il cassiere ne vede una. **8**.
- **Lista**: un solo vino per scheda (RICEVUTO), «In preparazione» bianco
  col bordo vino, prezzo nero a 22 px, CONSEGNATO verde, ANNULLATO grigio:
  da due metri si distingue cosa è nuovo da cosa è in lavorazione. **9**.
  Manca il resto (sopra). Annullando un ordine non c'è nessuna domanda:
  un tocco su «Annullato» e l'ordine è annullato (a me ha fatto comodo,
  in cassa alle 21 un dito sbagliato è un ordine perso).

## 5. Le altre pagine dopo i giri 3 e 4 del grafico

- `/` **9**: «NUOVO ORDINE» prima porta, vino, a tutta larghezza.
- `/cassa/cliente` **8**: «Mappa ↗» pillola bianca col bordo vino, «15,40 €».
- `/cassa/tavoli` **9**: 8 per fila, 35 tavoli in una schermata, numero a
  26 px e pillola LIBERO; stamattina D1 occupato/conto si leggeva bene.
- `/cassa/menu` **9**: solo gli attivi in lista, sotto «▸ Spenti (4): non si
  vendono, restano in anagrafica» chiuso; aperto, i doppioni barrati.
- `/login` **9**: da loggiati va alla home.
- `/cassa/rider` **9**: invariato.

---

## I tre difetti più gravi

1. **Totem, menu combo: la bibita sta sotto 45 righe e il tasto spento non
   dice perché.** Un cliente sceglie la pizza, vede «COMPLETA LE SCELTE»
   grigio e si blocca. Pizze e pucce in una lista sola, senza divisione.
2. **Cassa: «Dati cliente» cancella la comanda, e dal cliente cercato a mano
   non c'è «Prendi l'ordine».** Il giro «prendo le pizze, poi chiedo il
   nome» non si può fare senza rifare l'ordine o scrivere l'indirizzo a mano.
3. **Il resto non arriva a chi serve**: «paga con 20 · resto 4,20» è
   tagliato nel pannello («esto 4,20 €») e in `/cassa` non c'è; il rider
   esce senza sapere quanto resto portare.

## Cosa resta da provare

- `/rider` con un'utenza rider; la mappa con un rider che manda la posizione.
- Un coupon vero (non ci sono codici attivi).
- La stampa della comanda (`/cassa/comanda/[id]`), mai provata su carta.

## Risposta (23/10/2026 sera, codice)

I tre gravi: nel menù combo del totem ogni passo ha il numero (✓ quando è fatto), le scelte sono divise per categoria (Pizze / Pucce) e il tasto in fondo dice «Manca: bibita ↓» e ci porta, invece di restare spento; la comanda battuta resta anche andando a Dati cliente e tornando (bozza di 30 minuti), e dalla scheda del cliente cercato a mano c'è «Prendi l'ordine»; il resto da portare ha la sua riga in cassa e nella lista /cassa la scheda dice «paga con 20,00 €, resto 4,20 €». Minori rimasti per i prossimi giri: descrizioni e foto dei menù (anagrafica), T-12 nel quarto passato, due consegne allo stesso civico, quarti passati in grigio, conferma su «Annullato».
