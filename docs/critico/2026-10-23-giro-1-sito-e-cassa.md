# Giro 1 del critico — il sito, l'ordine online Velocissimo e la cassa nuova (23/10/2026)

> «Il critico deve utilizzare l'app come se fosse un cliente dal sito e dall'app
> iOS e Android, e tu devi saper rispondere.» — Edoardo, 23/10/2026

Cosa ho fatto, in ordine: ho aperto amanoamano.it come un cliente, ho seguito
«Ordina» fino all'ordine online Velocissimo (ritiro, poi domicilio) e mi sono
fermato **alla schermata prima di confermare** (nessun ordine vero, nessun
pagamento, nessun account). Poi ho rifatto lo stesso ordine sulla cassa nuova:
`/cassa/nuovo` (banco, tavolo, domicilio), `/cassa/cliente`, `/cassa/fasce`,
`/cassa/capacita` e `/totem` (in un riquadro 540×960). Il browser era a 640 px
di larghezza: è stretto per la cassa, e lo dico dove conta.

L'ordine di prova, uguale dappertutto: **2× La Margherita CON Mozzarella di
bufala DOP, 1 Supplì di riso, 1 Coca cola 0,33cl**. Domicilio: Via Nomentana
120, Roma.

Le foto le ho guardate una per una mentre provavo; le descrivo nel testo
(il riquadro `lettura/` di questo repo non c'è ancora, e le foto del browser
restano nella sessione).

---

## 1. Il sito amanoamano.it

**Cosa ho fatto.** Home → «Ordina» (in alto, nella barra in fondo e tre volte
nella pagina), «Prenota un tavolo», «Tutte le zone», «Come funziona».

**Cosa c'è.**
- «Ordina» → `url.velocissimo.app/so/?928` → l'ordine online Velocissimo
  (`service.web-app.it/pluto_3.0/…/webapp.php?area_clienti=amanoamanopugliese`,
  ver. 5.9). Stessa web-app dell'app iOS/Android: le schermate sono quelle.
- «Prenota un tavolo» → `url.velocissimo.app/pr/928-17/` → **X-Reserve**, tre
  passi. Il primo passo chiede **nome, cognome, telefono, email** PRIMA di
  chiedere giorno, ora e persone: è l'ordine sbagliato (prima si chiede «quando
  e in quanti», poi chi sei). La pagina ha come titolo «GOOGLE» (svista).
- «Scarica l'app» → `wbpp.it/q/?928`.
- La pagina «Pizza a domicilio» elenca **8 zone** con le vie, ma **non dice il
  costo di consegna né l'ordine minimo**: «se il tuo indirizzo è fuori, lo vedi
  quando ordini». Il cliente scopre il costo solo alla fine.
- La home dice «Stasera si apre alle 19. Ordini fino alle 22:30», orari
  coerenti con l'ordine online (ritiro 19:00–22:45).
- Coupon, punti, promozioni: **sul sito non ce n'è traccia**. Nessuna pagina,
  nessun banner «dal lunedì al giovedì». Chi non lo sa già, non lo scopre.

**Voto sito (come porta verso l'ordine):** funziona A · veloce A · chiaro B
(manca il costo di consegna e manca ogni parola sui coupon) · meglio di oggi: è oggi.

---

## 2. L'ordine online Velocissimo (sito = app iOS/Android)

### 2a. Ritiro al locale — 14 tocchi fino alla schermata prima di «Ordina»

| # | Tocco | Cosa succede |
|---|---|---|
| 1 | «Ordina subito» (home: solo «Ordina subito» e «I miei ordini») | scelta del servizio |
| 2 | «Ritiro al locale» (l'altra scelta è «Consegna a domicilio») | si apre il menù con sopra un **avviso «Preordina»**: «Al momento non accettiamo ritiri, ma puoi comunque effettuare un preordine» + gli orari (Lun–Dom 19:00–22:45) |
| 3 | «OK» sull'avviso | menù a schede orizzontali: NOVITA', PIZZE SPECIALI, PIZZE CLASSICHE, VETRINA NAPOLI, PUCCE PUGLIESI, MENU, FRITTI, DOLCI, LA NOSTRA CANTINA, BIRRE, BEVANDE; ogni riga ha nome, ingredienti, prezzo, foto e un bollino («Novità», «Più venduto», «Eccellenza»); lente di ricerca in basso a destra |
| 4 | «LA MARGHERITA» 7,20 € | scheda «Dettagli»: foto, ingredienti, **Quantità − 1 +**, poi «Aggiungi ingredienti» a gruppi (IMPASTO, LATTICINI, SALUMI E PESCE, SPEZIE E ALTRO, VERDURE), ogni voce con un «+» |
| 5 | «+» quantità → 2 | il bottone in fondo diventa «Aggiungi 2 al carrello · 14,40 €» |
| 6 | «+» su «Mozzarella di Bufala DOP» | la voce si spunta e **solo adesso** compare «2,50 €»; il bottone diventa «19,40 €» ((7,20 + 2,50) × 2) |
| 7 | «Aggiungi 2 al carrello» | torna al menù, bollino «2» sulla Margherita, barra in fondo «2 · Vai a carrello · 19,40 €» |
| 8–9 | «SUPPLÌ DI RISO» → «Aggiungi 1 al carrello» | la scheda del supplì ha solo la quantità, niente ingredienti (giusto) |
| 10–11 | «Coca cola 0,33cl» → «Aggiungi 1 al carrello» | |
| 12 | «Vai a carrello» | **Carrello**: Giorno (Ven 23 … Gio 29, 7 giorni), Orario (19:00 … 22:45, ogni quarto d'ora), le righe con «CON Mozzarella di Bufala DOP (2,50 €)» e «Rimuovi», «Aggiungi una nota», «Hai un codice sconto? Inseriscilo» + «Applica», «Seleziona un coupon da utilizzare», Pagamento: **Contanti alla cassa / Bancomat alla cassa / Pagamento online**, in fondo «4 · Ordina · 24,10 €» |
| 13 | un orario | |
| 14 | un pagamento | e qui mi fermo: il tocco 15 è «Ordina» |

Totale online: **24,10 €** (19,40 + 2,20 + 2,50).

**Cosa chiede e cosa non chiede.**
- Giorno e quarto d'ora: sì, fino a 7 giorni avanti, bene.
- Nota: sì, una sola per tutto l'ordine («Modifica note», un riquadro di testo).
  Non c'è una nota per singola pizza.
- Coupon: due porte diverse per la stessa cosa. «Hai un codice sconto?» con
  «Applica» e, subito sotto, «Seleziona un coupon da utilizzare» che apre una
  pagina «Riscatta coupon» con… un altro campo per il codice. **Nessuna lista
  dei coupon disponibili**, nessun «dal lunedì al giovedì −X%». Un cliente che
  non ha un codice in mano non vede nessuna promozione.
- Punti / fedeltà: niente.
- Minimo d'ordine e costo di consegna: **non compaiono prima di «Ordina»**,
  neanche a domicilio. Ho messo 24,10 € quindi non ho visto il blocco sotto i
  10 €.
- Login / dati: «I miei ordini» dice «Non hai ancora effettuato nessun ordine»
  senza chiedere chi sono. I dati (nome, telefono, indirizzo) li chiede dopo
  «Ordina», che non ho toccato; il browser lo ha anche bloccato come «transazione
  reale», giusto così.

**Cosa fa bene.** Menù con foto e ingredienti; i bollini; la quantità nella
scheda; «Aggiungi 2 al carrello · 19,40 €» che dice sempre quanto stai per
aggiungere; il carrello che ripete «CON … (2,50 €)»; i 7 giorni di preordine.

**Cosa fa arrabbiare.**
1. **Il prezzo dell'ingrediente in più non si vede prima di toccarlo**: la lista
   dei 60 ingredienti è senza prezzo, il «2,50 €» compare solo dopo la spunta.
2. L'avviso «Preordina» a ogni ingresso fuori orario, con la tabella degli orari:
   è un tocco in più ogni volta, e lo dice anche a chi vuole ordinare per domani.
3. Due campi coupon uno sotto l'altro, nessuna promozione visibile.
4. Niente costo di consegna, niente minimo, prima della fine.
5. Dati del menù sporchi: «OLIVE ASCOLANE» ha come descrizione «Chips di patate
   prodotto surgelato»; «CIAUSCOLO» dice «ciascuno»; «Mozzarella di Bufala DOP»
   e «… a strappi» sono due voci (quale prendo?).
6. Il carrello resta aperto cambiando servizio: passando a «Consegna a
   domicilio» chiede «Carrello aperto: continui o ricominci?». Utile, ma la
   consegna **non chiede l'indirizzo subito**: il menù è identico, e si scopre
   se si è in zona solo alla fine.

### 2b. Consegna a domicilio

Stessi tocchi del ritiro: «Ordina subito» → «Consegna a domicilio» → menù → carrello.
**Nessuna differenza visibile** fino al carrello: niente indirizzo, niente zona,
niente costo di consegna, niente «minimo 10 €». Tutto rimandato a dopo «Ordina».
Il sito dice che consegna in 8 zone; le **16 zone vere con il costo (1,00 / 1,50 /
2,00 €) e il minimo 10 €** stanno nel back-office Velocissimo e le abbiamo già
nella cassa nuova (mig. 0019/0020), ma il cliente online non le vede mai prima.

**Voto ordine online Velocissimo:** funziona A · veloce B (14 tocchi + avviso)
· chiaro C (coupon, consegna, prezzi degli extra) · meglio di oggi: è oggi.

---

## 3. La cassa nuova — `/cassa/nuovo`

**Cosa ho fatto.** Banco: ho digitato «2» sul tastierino e toccato «La
margherita»; «Varianti» → LATTICINI → «Mozzarella di bufala DOP»; poi Fritti →
Supplì, Bevande → Coca cola 0,33cl. Poi «Tavolo», poi «Domicilio», poi «Invia in
cucina».

**Cosa mi aspettavo.** Due Margherite, una CON bufala a +2,50 €, totale 24,10 €
come online; al tavolo i prezzi L2; a domicilio l'indirizzo, la zona, il costo
di consegna e il minimo.

**Cosa è successo.**
- «2» + tocco sulla pizza → **«2× La margherita 14,40 €»**: funziona, 2 tocchi.
- «Varianti» apre a sinistra CON/SENZA e i gruppi (IMPASTO, LATTICINI, SALUMI E
  PESCE, SPEZIE E ALTRO, VERDURE). Toccando la bufala la riga da 2 si **sdoppia
  in 1 + 1** e solo una prende «+ Mozzarella di bufala DOP»: è quello che vuole
  il cassiere («CON su una sola di tre»), bene.
- **Ma il prezzo non cambia: la Margherita con bufala costa 7,20 €, totale 14,40 €
  invece di 16,90**. Online la stessa cosa costa 2,50 € in più. Causa: in
  `supabase/migrations/0012_menu_dal_video_e_varianti.sql` tutte le varianti
  sono inserite a **prezzo 0** tranne «Impasto alto» (1,00). Sulla cassa e sul
  totem **ogni ingrediente in più è gratis**. Totale della cassa: **19,10 €**
  contro 24,10 € online: **5 € persi su un ordine da 24**.
- I bottoni delle varianti **non mostrano il prezzo** (solo Impasto alto ha
  «+ 1,00 €»); online il prezzo compare almeno dopo la spunta.
- **Tavolo**: compare «Scegli il tavolo» e i prezzi passano a L2 (Margherita
  8,50 €, Supplì 2,50 €, Coca 3,50 €, totale 23,00 €). Giusto. La lista dei
  tavoli è però in ordine alfabetico: **D1, D10, D11, …, D19, D2, D20, D3**;
  F1, F10, F11… Di sera uno cerca «D2» e lo trova dopo D19.
- **Domicilio**: toccando «Domicilio» **non chiede nessun cliente**: il totale
  resta 19,10 €, niente indirizzo, niente zona, niente costo di consegna, niente
  minimo, niente orario. «Invia in cucina» parte lo stesso e la risposta è
  **«Ordine non inserito: fuori_orario»**, scritta piccola in alto a sinistra
  sotto il titolo della categoria, con il codice tecnico al posto di una frase
  («A quest'ora la cucina è chiusa», come dice il totem). Un cassiere alle 23
  non la vede e ripreme il bottone.
- **Un ordine telefonico per domani non si può prendere**: la cassa manda tutto
  «adesso», mentre online il cliente sceglie giorno e quarto d'ora fino a 7
  giorni avanti. Se telefona «per domani alle 20:30» oggi il cassiere non ha
  dove metterlo.
- A 640 px **la barra delle categorie è tagliata**: FRITTI, PUCCE, BEVANDE,
  BIRRE finiscono sotto il pannello dell'ordine (misurato: il bottone «Fritti»
  sta a x=378 con il pannello che parte da x=300) e **non si possono toccare**.
  Ho dovuto cliccarli via script. Su un tablet largo non succede, su un iPad in
  verticale o uno schermo piccolo sì. Il titolo della categoria in alto («LE
  NOVITÀ ESTIVE») va a capo e sborda a tre righe.
- Toccando la riga già selezionata dell'ordine si riapre «Varianti» anche
  quando volevo solo cambiare categoria: due volte mi sono ritrovato nei
  latticini senza volerlo (da verificare con un dito vero, a 640 px i bersagli
  sono vicini).
- Il menù della cassa **non è quello di oggi**: categorie «LE NOVITÀ ESTIVE»,
  «BURGERIA», «INSALATE», «FRISELLE» (a fine ottobre), manca «VETRINA NAPOLI»
  (le sue pizze stanno in Pizze classiche), le NOVITÀ online (Aglio olio e
  baccalà, L'arrabbiata, Cacio e cicoria, La lardo, Variazione di zucchine)
  sono sotto «NOVITÀ» ma la prima scheda del totem è «LE NOVITÀ ESTIVE» con La
  tre pachino, I fiori e il datterino… Un cliente che ha visto il sito al
  totem trova un altro menù.
- La nota è una sola per tutto l'ordine (come online). Manca «chi ordina» per
  banco/asporto (il nome da chiamare), che il totem invece chiede.

**Voto `/cassa/nuovo`:** funziona C (prezzo delle varianti, domicilio senza
cliente, errore illeggibile) · veloce A (2 tocchi per due pizze, 4 per una
variante) · chiaro B · meglio di oggi: B (CON/SENZA e il tastierino sì; il
preordine e il cliente a domicilio no).

---

## 4. La scheda cliente — `/cassa/cliente`

**Cosa ho fatto.** Numero nuovo 3331234999 → «Prova chiamata» → è comparso
«📞 Sta chiamando 3331234999 · 02:05 · prova» con «Prendi l'ordine». Ho
scritto «via nomen», scelto «Via Nomentana, Roma, RM», civico 120, «Salva
scheda», poi «Prendi l'ordine».

**Cosa mi aspettavo.** I suggerimenti con i km, la zona con costo e minimo
(come promette il codice: «Zona X · consegna Y € · minimo 10 €»), e poi la
comanda con quella consegna addosso.

**Cosa è successo.**
- I suggerimenti arrivano in un secondo da Google Maps: «Via Nomentana, Roma»,
  «Via Nomentana Nuova, Roma», «Via Nomentum», poi **Monterotondo e Mentana**
  (fuori da ogni zona: rumore). **Nella lista non ci sono i km**: compaiono
  solo dopo la scelta («Via Nomentana Roma · 4,9 km dalla pizzeria»).
- **I km sono della via, non del civico.** Via Nomentana è lunga 6 km; il
  punto scelto è 41.9414, 12.5533 (verso Monte Sacro), e il civico 120 — a
  1,3 km da Via Novara, dentro le zone — **non viene ricalcolato**: il campo
  «Civico» cambia solo il testo. Risultato: **nessuna zona** (il punto è fuori
  dai 16 poligoni), quindi niente «consegna 1,50 € · minimo 10 €», e il link
  «mappa» della scheda porta il rider nel posto sbagliato. Passi: scrivi
  «via nomen» → scegli «Via Nomentana, Roma» → scrivi 120 → guarda i km (non
  cambiano) → salva → «mappa».
- La scheda si salva (nome, telefono, indirizzo «Via Nomentana 120 Roma»,
  «Ultimi ordini: Nessun ordine») e «Prendi l'ordine» apre `/cassa/nuovo?telefono=…`
  con il banner «Prova Critico · 3331234999 · Via Nomentana 120» e Domicilio
  già selezionato. Bene.
- Nella comanda il banner non dice la zona né il costo (perché la zona non c'è)
  e non c'è modo di correggere l'indirizzo da lì.
- Le «Note fisse» ci sono (citofono rotto…) ma nella comanda non si vedono.

**Voto `/cassa/cliente`:** funziona C (civico ignorato dal geocoding → zona
sbagliata) · veloce A · chiaro B · meglio di oggi: B (il riconoscimento del
chiamante e la via da Maps sono un passo avanti sulla 2Bit).

---

## 5. Scadenzario e capacità — `/cassa/fasce`, `/cassa/capacita`

- `/cassa/fasce`: tabella ORA / PIZZE / RIDER dalle **11:00 alle 23:45**, 52
  righe, con 0/20 e 0/2 dappertutto; la pizzeria apre alle 19, quindi le prime
  32 righe sono vuote per definizione e il cassiere scorre due schermate per
  arrivare a stasera. Le due fasce vere (20:30: 3/20 pizze, 1/1 rider; 20:45:
  3/20) si vedono e la 20:30 in `/cassa/capacita` dice **SOLD OUT** perché le
  consegne sono 1/1. Giusto.
- La riga in cima «2 ordini · 6 pizze · 1 consegne · 43,50 €» è la sola
  informazione di sintesi: bene, è quello che serve.
- `/cassa/capacita`: Pizzaioli 2, Rider 2 → «fino a 20 pizze e 2 consegne» a
  quarto d'ora, con «Blocca pizze / Blocca consegne» per ogni quarto. Stesso
  problema delle 52 righe. Non ho provato un ordine da `/api/ordini-esterni` su
  una fascia piena (serve la chiave, che sta solo su Vercel).

**Voto:** funziona B · veloce C (52 righe) · chiaro B · meglio di oggi: A
(Velocissimo non ha uno scadenzario per quarto d'ora con i rider).

---

## 6. Il totem — `/totem` (540×960)

**Cosa ho fatto.** Avvio → «Ordina qui» → PIZZE CLASSICHE → La margherita →
bufala → quantità 2 → Aggiungi → FRITTI → Supplì → Aggiungi → BEVANDE → Coca →
Aggiungi → Vedi ordine → Avanti → nome «HEH» con la tastiera a schermo → Avanti
→ «Contanti». **19 tocchi** fino all'invio (online 14 + i dati del cliente).

**Cosa è successo.**
- La veste è quella giusta: schede con la foto grande, «Tocca per aggiungere»,
  bollino «NOVITÀ», prezzo in evidenza, la scheda del prodotto con foto
  piena, QUANTITÀ − 1 +, «AGGIUNGI · 14,40 €» che si aggiorna. Il prodotto
  senza foto (Focaccia di Parma) mostra una «F» grande: accettabile.
- **Stessa cosa della cassa: la bufala è gratis.** «AGGIUNGI · 14,40 €» con 2
  Margherite CON bufala; online 19,40. Nel carrello la riga dice «Mozzarella di
  bufala DOP» senza «CON» e senza prezzo.
- **Il Supplì e la Coca cola hanno «AGGIUNGI INGREDIENTI · IMPASTO · Impasto
  alto + 1,00 €» e tutti i latticini**: le varianti con `id_categoria` nullo
  «valgono per tutte le pizze» (mig. 0012) ma il totem le mostra su tutto, anche
  su una lattina. Online il supplì ha solo la quantità.
- Checkout: «COME TI CHIAMI?» con tastiera QWERTY a schermo (bene, è la cosa
  che manca online), poi «COME VUOI PAGARE? Si paga alla cassa, quando ritiri»
  con CONTANTI / CARTA·POS. **Toccando «Contanti» l'ordine parte subito**:
  non c'è un riepilogo finale con «Conferma». Un tocco sbagliato è un ordine
  in cucina (quando sarà in orario). Online c'è un «Ordina» esplicito con il
  totale accanto.
- Fuori orario: «OPS · A quest'ora la cucina è chiusa. Chiedi alla cassa. ·
  NUOVO ORDINE». Chiaro, e la cassa dovrebbe copiarlo.
- La prima scheda del totem è «LE NOVITÀ ESTIVE» a fine ottobre (vedi §3).
- Non ho misurato i 90 s di inattività (torna all'avvio?): resta da fare.

**Voto `/totem`:** funziona C (varianti gratis, varianti sulle bibite, niente
conferma) · veloce B (19 tocchi; manca un «Aggiungi» diretto dalla scheda
senza aprire il dettaglio — il «+» sulla card c'è ma apre comunque la scheda)
· chiaro A · meglio di oggi: B (è più bello del Velocissimo, ma oggi il
Velocissimo fa pagare la bufala).

---

## Tabella: oggi (Velocissimo) vs cassa nuova

| Cosa | Oggi (sito/app Velocissimo) | Cassa nuova | Chi vince |
|---|---|---|---|
| Ingrediente in più | +2,50 € (bufala), visibile dopo la spunta | **0 €**, prezzo mai mostrato (solo impasto alto) | oggi |
| Totale dell'ordine di prova | 24,10 € | 19,10 € (banco/asporto/domicilio), 23,00 € tavolo | oggi |
| Quantità | − 1 + nella scheda | tastierino «2» + tocco (cassa); − 1 + (totem) | cassa |
| CON/SENZA su una sola pizza di due | no (la variante vale su tutte le 2) | sì, la riga si sdoppia | cassa |
| Prezzi sala (L2) | n/d (il QR ha il suo menù) | sì, cambiano col tocco su «Tavolo» | cassa |
| Giorno e orario | 7 giorni, quarti d'ora 19:00–22:45 | **niente**: solo «adesso» | oggi |
| Indirizzo a domicilio | chiesto dopo «Ordina» (non visto) | scheda cliente con Google Maps, chi chiama si apre da sola | cassa |
| Km e zona | mai mostrati | km della via, **civico ignorato**, zona non trovata | nessuno |
| Costo consegna / minimo 10 € | non visibili prima di «Ordina» | nel codice (16 zone, 1–2 €, minimo 10) ma non arrivano in comanda | nessuno |
| Coupon | due campi codice, nessuna lista | niente | nessuno |
| Nota | una per ordine | una per ordine (cassa), nessuna (totem) | pari |
| Nome del cliente al banco | n/d | totem sì (tastiera), cassa no | totem |
| Conferma finale | «Ordina» esplicito | totem: parte al tocco su «Contanti» | oggi |
| Fuori orario | avviso «Preordina» e si va avanti | totem «OPS, cucina chiusa»; cassa «fuori_orario» piccolo | oggi |
| Menù | quello di oggi (NOVITÀ d'autunno, Vetrina Napoli) | categorie estive, Burgeria, Insalate, Friselle | oggi |
| Varianti sulle bibite/fritti | no | totem sì (sbagliato) | oggi |
| Scadenzario per quarto d'ora | no | sì, con rider e SOLD OUT | cassa |

---

## Voti per pagina

| Pagina | Funziona | Veloce | Chiaro | Meglio di oggi |
|---|---|---|---|---|
| Sito amanoamano.it (porta all'ordine) | A | A | B | — |
| Ordine online Velocissimo | A | B | C | — |
| `/cassa/nuovo` | **C** | A | B | B |
| `/cassa/cliente` | **C** | A | B | B |
| `/cassa/fasce` + `/capacita` | B | **C** | B | A |
| `/totem` | **C** | B | A | B |

Sotto la C si apre un lavoro: sono i numeri 1, 2, 3, 4 e 6 qui sotto.

---

## LISTA DEI LAVORI (per importanza)

1. **Gli ingredienti in più costano 0 € su cassa e totem.** `0012_menu_dal_video_e_varianti.sql`
   inserisce tutte le varianti a prezzo 0 tranne Impasto alto. Online la bufala
   è 2,50 €. Serve il listino vero delle varianti da Velocissimo (come fatto
   per i prodotti nella 0013) e il prezzo stampato sul bottone della variante
   e nella riga dell'ordine («+ Mozzarella di bufala DOP · 2,50 €»).
   *Riprodurre:* `/cassa/nuovo` → Pizze classiche → La margherita → Varianti →
   Latticini → Mozzarella di bufala DOP → la riga resta 7,20 €. Stesso sul
   totem: «AGGIUNGI · 7,20 €».
2. **Il civico non sposta il punto sulla mappa: zona, km e costo di consegna
   sbagliati.** `/cassa/cliente`: scegliendo «Via Nomentana, Roma» il dettaglio
   è della via (4,9 km, fuori zona); scrivere «120» non ri-geocodifica. Serve
   cercare «via + civico» (o rifare il dettaglio quando il civico cambia) e
   mostrare i km già nella lista dei suggerimenti; e tagliare i suggerimenti
   fuori Roma (Monterotondo, Mentana).
   *Riprodurre:* «via nomen» → «Via Nomentana, Roma, RM» → civico 120 → km fermi
   a 4,9, nessuna «Zona … · consegna … · minimo 10 €» → Salva → «mappa» apre
   un punto a 5 km.
3. **Domicilio senza cliente, senza zona e senza orario in comanda.** Toccando
   «Domicilio» in `/cassa/nuovo` senza telefono la comanda parte lo stesso; con
   il cliente il banner non dice zona/costo/minimo. Serve: Domicilio → chiedi il
   cliente (o il telefono) prima di «Invia», il costo di consegna in riga,
   il blocco sotto 10 €, e **giorno + quarto d'ora** per i preordini telefonici
   (online si prenota fino a 7 giorni avanti).
   *Riprodurre:* `/cassa/nuovo` → una pizza → Domicilio → Invia in cucina.
4. **L'errore della cassa è un codice tecnico scritto piccolo.** «Ordine non
   inserito: fuori_orario» sotto il titolo della categoria. Serve una frase
   («A quest'ora la cucina è chiusa», «Fascia 20:30 piena: prossima libera
   20:45», «Sotto il minimo: mancano 2,30 €») grande, vicino al bottone.
5. **Il totem offre «Impasto alto» e i latticini anche a Supplì e Coca cola.**
   Le varianti con categoria nulla vanno limitate alle categorie pizza (o le
   categorie fritti/bevande/birre/cantina vanno segnate «senza varianti»).
   *Riprodurre:* totem → Bevande → Coca cola 0,33cl → scorri.
6. **Il totem invia al tocco su «Contanti»/«Carta», senza riepilogo.** Serve
   una schermata finale «Il tuo ordine · 19,10 € · Conferma» (come «Ordina» online).
7. **Il menù della cassa non è quello di oggi.** «LE NOVITÀ ESTIVE», Burgeria,
   Insalate, Friselle; manca Vetrina Napoli; La crostino pugliese sta in
   Pizze classiche. Allineare categorie e ordine a quelle online (NOVITA',
   PIZZE SPECIALI, PIZZE CLASSICHE, VETRINA NAPOLI, PUCCE, MENU, FRITTI, DOLCI,
   CANTINA, BIRRE, BEVANDE) o leggerle da Velocissimo come i prodotti.
8. **A 640 px la barra delle categorie è coperta dal pannello dell'ordine**
   (Fritti, Pucce, Bevande, Birre irraggiungibili) e il titolo va su tre
   righe. Serve scorrimento orizzontale o righe a capo, e una misura a 768 e a
   1024 px.
9. **Tavoli in ordine alfabetico** (D1, D10, D11…, D2). Ordinare per numero.
10. **Fasce e capacità mostrano 52 quarti d'ora dalle 11:00**: partire dall'apertura
    (o dall'ora attuale) e lasciare un «mostra tutto».
11. Le «Note fisse» del cliente (citofono rotto) non arrivano nella comanda né
    sulla comanda del rider.
12. Da provare al prossimo giro: i 90 s di inattività del totem; un ordine da
    `/api/ordini-esterni` su una fascia piena; `/rider` e `/cassa/mappa`; il
    flusso dopo «Ordina» di Velocissimo (i dati che chiede) con il permesso di
    Edoardo.

### Cose da sapere per rispondere a Edoardo (dal giro di oggi)

- Il sito e l'app usano la **stessa** web-app Velocissimo (`webapp.php`, ver.
  5.9): quello che ho visto dal sito è quello che vede chi apre l'app.
- Coupon: **non ho trovato** nessun coupon «lun–gio» visibile al cliente, né sul
  sito né nell'ordine online (solo i due campi per inserire un codice). Se
  esiste, vive nel back-office e il cliente deve conoscerlo già.
- Il minimo da 10 € e il costo per zona (1,00 / 1,50 / 2,00 €) sono nel
  back-office (mig. 0019) ma online non si vedono prima di «Ordina».
- Prenotazione tavolo: X-Reserve, chiede nome/cognome/telefono/email al primo
  passo, prima di giorno e ora.
