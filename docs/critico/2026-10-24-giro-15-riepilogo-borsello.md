# Giro 15 — il riepilogo rifatto, il borsello raccontato, la mappa e il rider, le carte di /cassa, sul deploy `9f6c92f` (mig. 0045)

*Critico, 24/10/2026, 12:08–12:17 (ora vera; la serata è recitata come nel giro 14). Deploy
`9f6c92f` («Critico giro 14 (8/10)») letto READY sul connettore Vercel prima di cominciare. Cassa a
1040×813 dal browser; `/rider` a 390×844 nel riquadro, col `window.open` intercettato (nessun
Naviga e nessuna chiamata partiti). Niente Velocissimo, niente account, niente password, niente
messaggi mandati, niente riparazioni. Il checkout è condiviso col grafico: non ho toccato i suoi
file. Nomi «Prova Critico …», telefono finto 3331234888 (la scheda di prova dei giri prima).*

## Da annullare (ordini di prova)

**C-54** (ritiro 20:45, POS, «Prova Critico Aperto», modificato: funghi + coca, 10,70 €): è
l'«ancora aperto» del conto. Consegnati, non si annullano più: **C-50** (domicilio 20:30, 16,60
contanti, **saldato** dal rider) e **C-51** (domicilio 21:00, 16,40 contanti, **non saldato**: è
«ai rider»). Ritirati col conto del tavolo: **C-52** (D5, 7,50 contanti) e **C-53** (D6, 8,50 POS).
D5 e D6 sono tornati liberi. Lasciati come trovati: APP-4, C-5, C-7, C-9, C-10, C-15, C-28, C-34,
C-38, C-39, C-44, C-46, C-47, W-36, W-37, W-49.

## 1. Il riepilogo: attesi e letti

Il conto del giro 14, rifatto da capo sopra quello che c'era già alle 12:08 (letto dal database
prima di cominciare: contanti già in cassa 84,30 = C-15 12,70 + C-28 16,60 + C-44 14,60 + W-49
16,40 saldati dal rider + tavolo D4 C-46 11,00 + C-47 13,00; POS 34,50 = C-38 11,00 + C-39 23,50;
aperto C-10 7,20; ai rider 0).

| Passo | Pagina | Com'è andata |
|---|---|---|
| Due consegne in contanti allo stesso cliente | `/cassa/nuovo?telefono=3331234888` | «Ordine n. 50 inviato in cucina per oggi alle 20:30 · 16,60 € contanti · BOLOGNA SPALLANZANI, consegna 1,00 €.» e «Ordine n. 51 … alle 21:00 · 16,40 € contanti …». Il cliente resta scelto dopo il primo invio ✓ |
| Tavolo D5, una marinara | `/cassa/nuovo` | **«Ordine n. 52 · tavolo D5 inviato in cucina · 7,50 €.»** — il tavolo adesso c'è ✓ |
| Tavolo D6, una margherita | `/cassa/nuovo` | **«Ordine n. 53 · tavolo D6 inviato in cucina · 8,50 €.»** ✓ (8,50 è il listino sala) |
| Asporto POS col nome, resta aperto | `/cassa/nuovo` | **«Ordine n. 54 · Prova Critico Aperto inviato in cucina per oggi alle 20:45 · 8,20 € POS.»** — il nome adesso c'è ✓ |
| Conto D5 contanti, conto D6 POS | `/cassa/tavoli` | «TAVOLO D5 · 2 coperti · 2 min · 1× La marinara 7,50 · TOTALE 7,50 · Stampa · CONTANTI · POS» → CONTANTI → «D5 · LIBERO · Apri». Stesso per D6 con POS. Nessun messaggio «chiuso»: lo capisci solo dal tavolo che torna libero |
| Rider: assegna, ritira e consegna #50, salda; ritira e consegna #51 | mappa, `/rider`, `/cassa/rider` | sotto, al punto 2 e 3 |

Il blocco **CASSA** di `/cassa/riepilogo` letto alle 12:15, **prima** della modifica di C-54:

| Voce | Atteso | Letto | |
|---|---|---|---|
| In cassa · contanti | 84,30 + D5 7,50 + C-50 saldato 16,60 = **108,40** | **108,40 €** «quello che conti a fine serata» | ✓ |
| In cassa · POS | 34,50 + D6 8,50 = **43,00** | **43,00 €** | ✓ |
| Ai rider · contanti | C-51 consegnato e non saldato = **16,40** | **16,40 €** | ✓ |
| Ai rider · POS | **0,00** | 0,00 € | ✓ |
| Online nostro | **0,00** | 0,00 € | ✓ |
| Ancora aperti | C-10 7,20 + C-54 8,20 = **15,40** | **15,40 €** | ✓ |
| In mano ai rider | Rider di prova **16,40** | Rider di prova 16,40 € | ✓ |
| Venduto | 108,40 + 43,00 + 16,40 + 15,40 = **183,20** | 183,20 € | ✓ (gli aperti stanno dentro il venduto: giusto, è quello che si è ordinato) |

Nessun doppio conteggio: C-50 sta solo in cassa, C-51 solo ai rider, C-54 solo negli aperti, i
tavoli solo nel loro metodo. Letto anche sul database (stato, pagamento, `consegna.saldata_il`):
torna riga per riga. **Il grave n. 1 del giro 14 è chiuso.** Dopo la modifica di C-54 (10,70) gli
aperti diventano 17,90: non riletto, è aritmetica.

Il limite di sempre: l'asporto POS non può diventare «ritirato» (i preordini non hanno il tasto),
quindi il «POS chiuso» del conto è il tavolo D6 e non un asporto.

## 2. Il borsello del rider, raccontato

Quello che dicono le due pagine, nel giro di oggi (prelievi e depositi letti su `rider_movimento`:
ieri un prelievo di 20,00 «prova critico giro 4» e il suo storno di 20,00; oggi cinque depositi,
tutti «n consegne saldate»: 12,70 · 16,60 · 16,60 · 31,00 · 16,60):

| Momento | `/rider` (il ragazzo) | `/cassa/rider` (il cassiere) |
|---|---|---|
| #50 e #51 assegnate, nessuna fatta | «DA SALDARE ALLA CASSA (0) · Hai in mano 0,00 €. A fine serata si fa il dare-avere in cassa e queste spariscono. · Niente da saldare.» | «1 IN CORSO … 0,00 € IN MANO» (letto al giro 14) |
| #50 consegnata (16,60 contanti) | «DA SALDARE ALLA CASSA (1) · **Hai in mano 16,60 € · di cui 16,60 € delle consegne fatte** … · #50 12:13 · Via Nomentana 120 · 16,60 €» | «RIDER DI PROVA · 1 IN CORSO · **16,60 € IN MANO** · 1 in corso · 1 da saldare 16,60 € · **prelievi 20,00 € · depositi 96,90 €** · SALDA 16,60 € · LE CONSEGNE FATTE TORNANO IN CASSA» |
| Salda | — | «Rider di prova: saldate 1 consegne, versati 16,60 €.» → «0,00 € IN MANO · 0 da saldare 0,00 € · prelievi 20,00 € · **depositi 113,50 €**»; in MOVIMENTI DI OGGI «12:14 · deposito (dal rider alla cassa) · 1 consegne saldate · + 16,60 €» |
| #51 consegnata (16,40 contanti) | «LE MIE (0) · Nessuna consegna in corso … DA SALDARE ALLA CASSA (1) · Hai in mano 16,40 € · di cui 16,40 € delle consegne fatte … · #51 12:14 · Via Nomentana 120 · 16,40 €» | (riletto nel riepilogo: «In mano ai rider · Rider di prova 16,40 €») |

I numeri **tornano**, e tornano anche con la formula vera della funzione (mig. 0033): in mano =
prelievi − depositi + contanti di **tutte** le consegne fatte, saldate comprese: 20 − 96,90 +
93,50 = 16,60 ✓. Quello che non torna è **la frase in cima a `/cassa/rider`**: «In mano = prelievi
− depositi + contanti delle consegne fatte **e non ancora saldate**». Con i numeri scritti sotto
fa 20 − 96,90 + 16,60 = **−60,30**, e la pagina dice 16,60. Un cassiere che prova a rifare il
conto a mano con la frase della pagina non ci arriva mai: la frase conta le saldate due volte
(una come deposito, una come «non ancora saldate» che toglie).

Un esempio che lo fa vedere, come lo chiede la Direzione — tre consegne in contanti da 10 € e un
versamento di 20 € a metà serata:

| Fatto | Cosa dovrebbe dire `/rider` | Cosa dovrebbe dire `/cassa/rider` | Cosa dice oggi |
|---|---|---|---|
| Consegna 1, 2, 3 | «Hai in mano 30,00 € · 3 da saldare» | «30,00 € IN MANO · 3 da saldare 30,00 €» | Lo stesso ✓ |
| Salda (versa 30) | «Hai in mano 0,00 €» | «0,00 € IN MANO · depositi 30,00 €» | Lo stesso ✓ — ma Salda **versa sempre tutto**: non si può versare 20 e tenere 10 di resto, perciò la riga «prelievi − depositi» del borsello serve solo al tasto «Fondo / prelievo / deposito», che non ho provato (fa un movimento vero e non ha un annulla) |
| Prelievo di 20 per il resto, poi 3 consegne | «Hai in mano 50,00 € · di cui 30,00 € delle consegne fatte» | «50,00 € IN MANO · 3 da saldare 30,00 € · prelievi 20,00» | Giusto per la funzione; la frase della pagina direbbe 20 − 0 + 30 = 50 ✓ (qui per caso torna, perché non c'è ancora nessun saldo) |
| Salda (versa 30) | «Hai in mano 20,00 €» (il fondo) | «20,00 € IN MANO · 0 da saldare · prelievi 20 · depositi 30» | La funzione dice 20 − 30 + 30 = 20 ✓; **la frase della pagina** dice 20 − 30 + 0 = −10 ✗ |

Due cose più piccole, lette oggi:

- «prelievi 20,00 € · depositi 113,50 €» sono **da sempre**, non di oggi (il prelievo è del 23/10
  ed è già stornato), e dentro i depositi ci sono i saldi delle consegne (93,50 su 113,50). Sotto
  c'è «MOVIMENTI DI OGGI», che invece sono di oggi: due righe vicine con due finestre diverse.
  A un cassiere «depositi 113,50» a fianco di un «in mano 0,00» sembra un buco.
- In `/rider` il «di cui 16,40 € delle consegne fatte» è sempre uguale al totale finché il rider
  non prende un fondo: non è un errore, è una riga che oggi non dice niente in più.
- Nella lista «DA SALDARE» la riga dice «#50 12:13 · Via Nomentana 120»: 12:13 è l'ora in cui ha
  consegnato, non «per le 20:30». Va bene, ma non è scritto cos'è.

## 3. `/cassa/mappa` e `/rider`

**Mappa** (1040×813): «CASSA — RIDER IN MAPPA · 1 rider · 2 consegne in corso». Scheda del rider
«RD · Rider di prova · 0 consegne in corso · posizione delle 01:41 · FERMO» (la posizione è di
dieci ore fa e lo dice: bene). Le due schede: «50 · C-50 · per le 20:30 · Via Nomentana 120 ·
Assegna a… · DA ASSEGNARE» e la 51 uguale. Assegnate dalla tendina → «Via Nomentana 120 · Rider
di prova · Togli il rider · Rider di prova (2 in corso) · ASSEGNATA» e il rider «2 consegne in
corso». L'ordine delle consegne è per ora di consegna (20:30 poi 21:00) ✓. **In inglese** resta
solo quello di Leaflet: i titoli dei tasti «Zoom in» / «Zoom out» e «Leaflet | © OpenStreetMap»
in basso. Il resto è tutto in italiano. Nessun testo del GPS in pagina sulla mappa.

**Rider** (390×844, 1342 px di altezza, nessuno scorrimento orizzontale): «RIDER — CONSEGNE ·
**GPS non disponibile: User denied Geolocation**» — questa è la frase in inglese: è il messaggio
grezzo del browser, mostrato così com'è al ragazzo. Dovrebbe dire «Il telefono non dà la posizione:
apri le impostazioni e permettila a questo sito», e basta.

Con due consegne insieme vede «LE MIE (2)» e due schede intere, una sotto l'altra, uguali in
forma: «#50 · ASSEGNATA · BOLOGNA SPALLANZANI · per le 20:30 · Via Nomentana 120 00161 Roma ·
Prova Critico Tre · ⚠ citofono rotto, chiamare al cancello · 16,60 € in contanti · 1× La
margherita · 1× La napoli · RITIRATA · Naviga · Chiama», poi «#51 … per le 21:00 … 16,40 € in
contanti …». C'è tutto quello che serve al cancello (zona, ora, via, nome, nota, quanto incassare
in contanti, cosa c'è nel sacchetto). Due cose che mancano con due consegne in mano:

- **sono allo stesso indirizzo e nessuno lo dice**: due schede identiche a venti righe di
  distanza, e il ragazzo fa due viaggi o se ne accorge da solo. Un «stesso indirizzo di #50» o una
  scheda sola con due ordini risparmia un giro;
- **nessun totale**: «16,60» e «16,40» su due schede, e in fondo «Hai in mano 0,00 €» finché non
  le segna consegnate. Prima di partire vuole sapere «porto 33,00 € di contanti da incassare».

RITIRATA → la scheda passa a «RITIRATA» col tasto «CONSEGNATA»; CONSEGNATA → la scheda sparisce da
LE MIE e compare in DA SALDARE. Tutto in un tocco per passo ✓. «Naviga» e «Chiama» aprono
(intercettati) un'altra app: non misurati.

## 4. `/cassa`: tavolo, modificata, sconto, messaggio verde

| Cosa | Atteso | Letto | |
|---|---|---|---|
| Carta del tavolo | «tavolo D5» | «C-52 · RITIRATO · **tavolo D5** · cassa · 12:10 · · contanti · 7,50 €» e «C-53 · RITIRATO · tavolo D6 · cassa · 12:10 · · POS · 8,50 €» | ✓ (resta un «· ·» doppio prima del pagamento: un separatore vuoto dove non c'è il nome) |
| Messaggio verde col tavolo | «Ordine n. 52 · tavolo D5 …» | «Ordine n. 52 · tavolo D5 inviato in cucina · 7,50 €.» | ✓ |
| Messaggio verde col nome | «Ordine n. 54 · Prova Critico Aperto …» | «Ordine n. 54 · Prova Critico Aperto inviato in cucina per oggi alle 20:45 · 8,20 € POS.» | ✓ |
| «modificata hh:mm» sulla carta | «modificata 12:16» | nella griglia C-45 dice «ritiro · cassa · 11:55 · **modificata 12:01** · per le 20:15» ✓; ma C-54, che sta in **PREORDINI**, dice «ritiro · **modificata** · POS» **senza l'ora** | metà |
| Comanda modificata | NUOVA sulla riga aggiunta | «C-54 · MODIFICATA · RISTAMPA 12:16 · RITIRO · per le 20:45 … 1 LA FUNGHI · BEVANDE · 1 NUOVA COCA COLA 0,33CL · 1 pezzo in cucina · Totale 10,70 € · POS» | ✓ |
| Sconto sulla carta | «(sconto −2,00 €)» su C-44 | **C-44 non è in pagina** (vedi sotto); la comanda dice «SCONTO −2,00 € · Totale 14,60 € · CONTANTI» ✓ | non verificabile |

**Il difetto nuovo, che vale più degli altri di questo punto**: in `/cassa` **mancano C-50, C-51,
W-49 e C-44**, cioè tutte le consegne fatte di oggi (e C-15, C-28). La griglia tiene fuori i
preordini (ora di consegna a più di 30 minuti) e l'area PREORDINI tiene fuori consegnati e
ritirati: un ordine consegnato prima della sua ora **non sta da nessuna parte** finché non passa
l'ora. Alle 20:35 ricomparirà. Di sera succede quando il rider arriva in anticipo, e il cassiere
che cerca «il 50 l'abbiamo consegnato?» non lo trova né in cassa né nei preordini: lo trova solo
nel riepilogo. (Le carte «tavolo D5» le ho lette perché i tavoli non hanno ora di consegna.)

In fondo alla pagina ci sono ancora gli ordini di ieri sera «RICEVUTO · in ritardo di 930 min ·
ven 23 alle 20:45» (APP-4 e gli altri lasciati come trovati): già scritto nei giri prima.

## I tre difetti più gravi, dal più grave

1. **`/cassa` perde le consegne fatte in anticipo**: C-50 e C-51 consegnati alle 12:13 «per le
   20:30/21:00» non stanno né nella griglia né nei preordini. Chi cerca un ordine lo cerca lì.
2. **La frase del borsello in `/cassa/rider` non è la formula che fa il numero**: «prelievi −
   depositi + consegne non ancora saldate» con i numeri in pagina dà −60,30 e la pagina dice
   16,60 (giusto). E «prelievi · depositi» sono da sempre mentre i «MOVIMENTI» sono di oggi.
3. **Il rider legge l'inglese del browser**: «GPS non disponibile: User denied Geolocation». E con
   due consegne allo stesso indirizzo nessuno glielo dice, né quanto contante porta in tutto.

## Voti per pagina

| Pagina | Voto | Perché |
|---|---|---|
| `/cassa/riepilogo` | **9** (era 5) | Tutte e otto le voci tornano col cassetto vero e col database, senza doppi conteggi. Manca solo una riga che dica da quali ordini viene ogni numero |
| `/cassa/nuovo` | **9** (era 8) | Tavolo e nome nel messaggio verde; il cliente resta scelto fra due consegne. Resta la lista delle righe su PC (160 px: tre righe, meglio di una) |
| `/cassa/tavoli` | 8 | Conto in due tocchi; nessun «chiuso» a video, lo dice il tavolo che torna libero |
| `/cassa/mappa` | 8 | Tutto in italiano tranne i due titoli di Leaflet; la posizione vecchia lo dice |
| `/rider` | 7 | Scheda completa e tre tocchi per consegna; inglese del GPS, nessun totale, stesso indirizzo non segnalato |
| `/cassa/rider` | 6 | I numeri sono giusti, la frase che li spiega no; prelievi/depositi di sempre accanto ai movimenti di oggi |
| `/cassa` | 7 (era 7) | Tavolo e «modificata hh:mm» ci sono nella griglia; nei preordini «modificata» è senza ora; le consegne fatte in anticipo spariscono |

**Giro 15: 8 su 10.** Il riepilogo è a posto; quello che resta è di lettura, non di soldi.

## Risposta (chat principale, 24/10/2026)

- (a) `/cassa`: un preordine consegnato, ritirato o annullato esce dall'area Preordini e sta nella griglia (prima C-50, C-51, W-49 e C-44 non stavano da nessuna parte fino alla loro ora).
- (b) Borsello della serata (mig. 0046 `borsello_della_serata`): fondo, prelievi, depositi e consegne contano dalle 6 di mattina (ora di Roma), come il riepilogo; la frase in cima a `/cassa/rider` è la formula vera; «Movimenti di stasera» con lo stesso inizio. `/rider`: «da versare in cassa X» al posto di «di cui».
- (c) `/rider`: il GPS parla italiano (negato / non trovato / lento); con due consegne allo stesso indirizzo la scheda dice «Stesso indirizzo di #N: portale insieme» e sopra la lista c'è «In tutto da incassare in contanti».
- C-54 annullato.
- Restano aperti, per i giri dopo: l'asporto che non può diventare «ritirato», il «·» doppio nelle carte, l'ora della modifica nell'area Preordini.
