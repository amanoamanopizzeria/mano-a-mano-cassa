# Giro 12 — Modifica con ristampa, banco fuori orario, pagamento su /ordina (deploy `170af86`, mig. 0038)

*Critico, 24/10/2026, 07:10–07:20 e poi 11:25–11:35 (ora vera; in mezzo la sessione si è
azzerata). Deploy `170af86` aspettato READY sul connettore Vercel, poi provato. Cassa a 1040 px dal
browser; `/ordina` a 390×844 nel riquadro. Utenze di prova dei giri precedenti; nomi «Prova Critico
…», telefoni finti. Niente ordini su Velocissimo, niente «Salva» nel suo back-office, niente
messaggi mandati, niente riparazioni.*

**Limite di oggi:** il totem è chiuso a quest'ora («apre alle 18:30»), non provato. Il tavolo
fuori orario non l'ho rifatto: la prova chiesta era il banco, e passa.

## Da annullare (ordini di prova): **C-34** (banco, modificato, ricevuto, 28,50 €), **W-36** (ritiro 20:30, POS, 16,60 €), **W-37** (ritiro 21:00, contanti, 14,80 €). **C-35** (domicilio per Prova Critico Tre) l'ho annullato io dalla cassa per la prova dei punti. Lasciati come trovati: APP-4, C-5, C-7, C-9, C-10, C-28.

## Le quattro prove chieste

| # | Prova | Esito | Com'è andata |
|---|---|---|---|
| a | Banco adesso (07:12, fuori dai quarti d'ora) | ✓ **passa** | `/cassa/nuovo` → Banco → La margherita → INVIA IN CUCINA → «Ordine n. 34 inviato in cucina.» Banco non ha la riga Contanti/POS (`pagamento` nullo nel database). Pagina caricata in 804 ms |
| b | Modifica con ristampa su C-34 | ✓ **funziona** | `/cassa` → «Modifica» sulla carta di C-34 → `/cassa/nuovo?modifica=…` col banner «MODIFICA C-34 · le righe qui sotto sostituiscono la comanda, che si ristampa · Lascia stare», i tipi bloccati, la margherita già in riga. Aggiunto Coca cola 0,33cl (2,50) e Menu classico X1 (pacchetto: La diavola + Fanta; sotto «+ 1 supplì, 1 crocchetta, 3 mozzarelline»), quantità del menu portata a 2 (riga + «+»), tolta La margherita (riga + «Togli»). Totale a video 28,50 €. «SALVA E RISTAMPA» → la comanda si apre con `?stampa=1` e parte la stampa del browser. Database: totale 28,50, `modificato_il` scritto, `stampato_il` azzerato; righe 1× Coca, 2× Menu classico X1 con figli 2× La diavola e 2× Fanta. Comanda (riaperta senza `?stampa=1`): «C-34 · MODIFICATA · RISTAMPA 07:14 · AL BANCO · subito · ricevuto 07:12 · Cassa · BEVANDE 1 COCA COLA 0,33CL · MENÙ 2 MENU CLASSICO X1 · 2× LA DIAVOLA · 2× FANTA 0,33CL · + 1 SUPPLÌ… · 2 pezzi in cucina · Totale 28,50 €». In `/cassa`: «C-34 · RICEVUTO · in ritardo di 227 min · banco · cassa · 07:12 · 28,50 € · **non stampata** · Comanda · Stampa · Modifica · In preparazione · Annullato» |
| b | Modifica di un consegnato / annullato | ✓ **dice di no** | `?modifica=` di C-28 → «L'ordine C-28 è consegnato: non si modifica più, si annulla e si rifà.»; di C-29 → «…è annullato: non si modifica più…». Vedi il medio n. 2: dopo il no la pagina resta una cassa normale |
| c | Due ordini di fila su `/ordina`, pagamento chiesto tutte e due le volte | ✓ **chiesto tutte e due** | W-36: ritiro 20:30, diavola + funghi, su «I tuoi dati» «Contanti alla cassa» e «Bancomat o carta alla cassa» tutte e due vuote; scelto il POS → «W-36 · Ti aspettiamo oggi alle 20:30 in Via Novara 5/7. Paghi col POS in pizzeria.» «Nuovo ordine» → ritiro, marinara + napoli, 21:00 → «I tuoi dati» con nome e telefono già scritti e **le due caselle del pagamento di nuovo vuote**; toccato «Conferma» senza scegliere: resta lì (non passa); scelto Contanti → «W-37 · Paghi in contanti in pizzeria.» Database: W-36 `pos`, W-37 `contanti` |
| d | Totem | — | chiuso (apre alle 18:30), non provato |
| + | Punti tolti con l'annullo | 🟡 **letto, non visto** | Prova Critico Tre ha «★ 44 punti» (12 + 16 di C-23 + 16 di C-28). Fatto C-35 a domicilio per lui (16,60 €, 21:30, contanti), annullato dalla cassa con i due tocchi («C-35 · ANNULLATO · 11:28»): i punti restano 44, giusto, perché C-35 non era mai arrivato a consegnato. Il caso vero (consegnato → annullato) dalla cassa non si fa: un ordine consegnato non ha più «Annullato». Il trigger `punti_da_ordine()` della 0038 lo toglie, letto nel file; i 16 di C-23 (annullato prima della 0038) restano regalati |

## I difetti, dal più grave

1. **`?stampa=1` blocca la pagina finché non si chiude la finestra di stampa**: dopo «SALVA E
   RISTAMPA» la cassa resta dietro alla finestra del browser. Su una cassa vera con la stampante
   che risponde va bene; su un telefono o un PC senza stampante il cassiere deve premere Annulla
   prima di tornare a `/cassa`. Non è un errore, è da sapere: a me ha bloccato la scheda.
2. **Dopo il «non si modifica più» la pagina resta aperta come cassa normale**, senza banner e
   con tutti i tipi liberi: «L'ordine C-28 è consegnato: non si modifica più, si annulla e si
   rifà.» e sotto il menù pronto. Un tocco su INVIA fa un ordine nuovo al banco senza che il
   cassiere abbia scelto di rifarlo. Meglio tornare a `/cassa` o lasciare solo il messaggio.
3. **Il banner della modifica non dice cosa c'era prima**: le righe vecchie sono caricate ma non
   distinte dalle nuove; chi toglie per sbaglio la riga sbagliata non lo vede fino alla comanda.
   «Lascia stare» riporta a `/cassa` senza chiedere.
4. **«In ritardo di 227 min» su un ordine al banco «subito» fatto alle 07:12**: vero e inutile
   fuori orario (la cucina è chiusa); di sera invece è utile. Da tenere, ma a cucina chiusa
   spaventa.
5. **La comanda modificata non dice cosa è cambiato**: «MODIFICATA · RISTAMPA 07:14» va bene per
   la cucina, che rifà tutto; un «tolta: 1 La margherita» aiuterebbe chi ha già infornato.
6. **Il messaggio verde del banco resta «Ordine n. 34 inviato in cucina.»**: niente totale, come
   per l'asporto senza nome (giro 11, n. 5).
7. **«Minimo d'ordine 10,00 €: mancano 2,80 €»** compare in cassa per un domicilio da 7,20 €:
   nuovo e giusto, ma blocca anche il cassiere al telefono che vuole prendere l'ordine lo stesso.
   Da decidere con Edoardo se il minimo vale anche dalla cassa.
8. Restano dai giri 10 e 11, non toccati: nota fissa del cliente assente in comanda; formula del
   borsello; «Conto» del tavolo; «+» delle fasce; «#16» vs «W-16»; «salvato» in capacità; secondo
   «Consegna a casa» senza il passo dell'indirizzo (scelto apposta, va bene).

## Voti

| Pagina | Giro 11 | Giro 12 | Perché |
|---|---|---|---|
| `/cassa/nuovo` | 7 | 8 | banco fuori orario ✓, modifica con pacchetti e quantità ✓; dopo il no resta una cassa aperta (n. 2) |
| `/cassa` | 8 | 9 | «Modifica» su ogni ordine e preordine, «non stampata» dopo la modifica ✓, ritardo in minuti |
| `/cassa/comanda` | — | 8 | «MODIFICATA · RISTAMPA hh:mm» chiaro; non dice cosa è cambiato (n. 5); `?stampa=1` blocca (n. 1) |
| `/ordina` | 7 | 8 | pagamento chiesto tutte e due le volte ✓, non passa senza scegliere ✓ |
| `/cassa/cliente` | 9 | 9 | punti: il trigger c'è, il caso vero non si prova dalla cassa |
| `/totem` | — | — | chiuso |
| **Il giro** | **7** | **8** | le quattro cose del giro 11 fatte e provate; resta il blocco della stampa e la pagina che resta aperta dopo il no |

## Risposta (sviluppo, 24/10 mattina)

- (2) **Dopo «non si modifica più» la pagina resta bloccata**: il fascione resta («non si modifica più: torna alla cassa, annulla e rifai») e il tasto Invia è spento, così un tocco non fa un ordine nuovo.
- (4) **Banco e tavolo «subito»**: niente «in ritardo di 227 min»; si legge «da X min» senza il rosso, perché non c'è un'ora promessa.
- (6) **Il messaggio verde dice il totale** e come paga («Ordine n. 34 inviato in cucina · 7,20 € contanti»).
- (7) **Minimo d'ordine dalla cassa**: è una scelta di Edoardo, messa fra le domande (`docs/rea/16`, n. 21). Finché non risponde, il minimo vale anche al telefono come in Velocissimo.
- (1) `?stampa=1` dietro la finestra di stampa: sulla cassa vera il Chrome è in `--kiosk-printing` e la finestra non c'è; dal telefono la pagina ha comunque «Torna alla cassa».
- (3) e (5): la comanda modificata non distingue il vecchio dal nuovo. Da fare con le righe di prima salvate accanto (lavoro a sé), non in questo giro.
- In più, dalla REA 13: senza nessun turno inserito la capacità parte dalla tabella di Velocissimo per giorno della settimana (10 / 18 / 22 pizze a quarto d'ora, mig. 0042), invece di 0 posti.
- Ordini di prova C-34, W-36, W-37 annullati.
