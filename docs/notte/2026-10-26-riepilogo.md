# Notte del 26/10/2026: menù, Deliverect, critico

## Fatto (tutto pubblicato su mano-a-mano-cassa.vercel.app, deploy READY)

- **Il menù si fa dalla cassa** (`/cassa/menu`). Un prodotto nuovo è una scheda sola: nome, categoria,
  prezzi asporto / sala / piattaforme, dove si vende, descrizione, foto, codice, IVA. Velocissimo ne ha
  otto, e dopo bisogna ancora sistemare il catalogo. Appena salvato è il tasto in cassa e la riga su app,
  sito e totem. «Copia» fa una pizza nuova partendo da una simile: nasce solo in cassa e senza foto,
  finché non la controlli.
- **Le categorie**: si cambiano dal nome (colore del tasto, dove si stampa, se conta come pizza nei quarti
  d'ora, app/sito/totem), si aggiungono con «+ categoria» e si spostano con ↑ ↓.
- **La cassa aperta si aggiorna da sola**: rilegge il menù ogni 2 minuti e quando torni sulla sua finestra.
  Un prezzo cambiato arriva anche alle righe già battute; un prodotto spento esce dalla comanda e la
  cassa te lo dice.
- **Il menù per Glovo, Deliveroo e Just Eat** (`/cassa/menu/deliverect`): mostra cosa riceverebbe Deliverect
  da noi (138 prodotti con il prezzo piattaforme, varianti, menu combo). **Non manda niente.**
- **REA del menù e di Deliverect**: `docs/rea/23_MENU_E_DELIVERECT.md`. Ho letto i codici di tutti i 168
  prodotti di Velocissimo, in sola lettura.
- **Critico, giri 31–35**: 7,5 → 7,5 → 7,5 → 6,5 → **8**. Ha trovato e io ho corretto una trentina di
  difetti. Il più grave (giro 34): «Modifica» di un ordine arrivato dall'app si svuotava dopo due minuti.
  È stato preso prima che toccasse un ordine vero ed è corretto.
- **App rider Android**: l'APK è pronto in GitHub → Actions → giro 40264285195 → «a-mano-rider-apk».
  Per installarla: scarica lo zip, aprilo, permetti le «origini sconosciute», e alla posizione rispondi «Sempre».

## Deliverect, in breve

Deliverect prende il menù **solo da un POS partner certificato**. Oggi quel POS è Velocissimo. Per mandargli
il menù dalla nostra cassa bisogna diventare partner: si compila il modulo, si sviluppa sulle chiavi di
prova, e servono un paio di chiamate di certificazione. Il mio consiglio: durante il parallelo Velocissimo
resta il ponte verso Deliverect, e intanto chiedi di diventare partner. L'anteprima del menù è già pronta.

## Domande per te

1. **Che PLU usa Deliverect oggi?** Lo vedi in Deliverect → Menu → Products: guarda la colonna PLU di
   «Menu classico X1» e di una pizza. Non è una curiosità. Su Velocissimo «142» è il codice sia della
   **Finocchiona** sia dell'**Arrabbiata**, e «C072» è sia del **Barattolo nutella** sia della
   **Cheesecake al pistacchio**. Se Deliverect usa quel codice, un ordine Glovo di una delle due può arrivare
   come l'altra.
2. **Il modulo partner di Deliverect**: lo compili tu a nome Vi.Ru, o lo chiedi al tuo referente Deliverect?
3. **La categoria «Menù» sta nel gruppo Pizze, ma nella fila dei tasti viene dopo il Bar.** Se la sposti in un
   gruppo suo, le frecce ↑ ↓ delle pizze non la saltano più.

## Modifiche al database che aspettano il tuo ok (preparate, NON applicate)

- `supabase/da_decidere/menu_piattaforme_e_plu.sql`:
  - una spunta «Piattaforme» per prodotto. Oggi su Glovo va tutto quello che ha il prezzo L3, anche se in
    app è spento;
  - i PLU nel campo codice, quando mi rispondi alla domanda 1.
- `supabase/da_decidere/menu_scrive_solo_la_cassa.sql`: oggi il PC del totem, che sta in sala, può anche
  cambiare i prezzi. Così il menù lo scrivono solo admin e cassa.
- Da decidere a voce: la cassa salva il prezzo che le manda il browser, mentre `/ordina` lo ricalcola sul server.

## Ancora aperto (piccolo)

- Una categoria non si cancella né si spegne: per toglierla dall'app basta togliere le spunte.
- I dati di prova sono tutti spenti: i prodotti «PROVA critico 31» e la categoria vuota «PROVA critico 32».
