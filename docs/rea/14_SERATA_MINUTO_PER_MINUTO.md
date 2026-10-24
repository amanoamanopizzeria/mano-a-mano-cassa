# REA · 14. Una serata vera sul 2Bit, minuto per minuto, e cosa farebbe la cassa nuova

*Terzo passaggio del REA, 24/10/2026. Ricostruita **senza toccare la cassa**: dagli orari veri di
389 ordini della settimana 17–24/10 e dei 65 del CSV del 20/06/2026 (creazione, orario richiesto,
partenza e consegna effettiva del rider, note), dal pacchetto `SETUP 2BIT.rar` (configurazioni e
viste SQL del POS: `03` §3.1 e §14.6 qui), dalle risposte di Edoardo (22–23/10), dal video del
Velocissimo POS (`09`, solo dove la funzione esiste anche sul 2Bit) e dall'abbonamento (`13` §13.0:
**Enterprise non attivo → in cassa gira il PC 2Bit**). Il confronto con la cassa nuova usa la
serata recitata dal critico il 24/10 (`docs/critico/2026-10-24-giro-10-serata.md`) e la risposta
della direzione (mig. 0037). Dove una cosa non si può dedurre, è scritto «da chiedere» e sta in `16`.*

## 14.0 La forma della serata (dai numeri)

- **Quando entrano gli ordini** (65 ordini del 20/06, ora di creazione): 14:xx 1 (un preordine),
  18:xx 3, **19:xx 20, 20:xx 25, 21:xx 14**, 22:xx 2. Il grosso sta fra le 19:15 e le 21:30; alle
  22:00 è finita.
- **Quanto prima si ordina**: dalla creazione all'orario richiesto passano di solito **17–30
  minuti**; al banco 0; i preordini veri 39–359 minuti. Il ritiro vuole orari puntuali a passo di
  15, il domicilio finestre di 30 (`01` §1.1).
- **Che cosa entra**, in una settimana: 216 ordini da Deliverect (Glovo, Deliveroo, Just Eat), 95
  dall'app, **70 battuti sul PC** (telefono e banco), 7 dal totem, 1 dal sito; 203 ritiri (i rider
  delle piattaforme ritirano al banco), 132 domicili nostri, 40 banco, 14 tavoli.
- **Come si paga**: 264 online (piattaforme + Nexi dell'app), 61 contanti alla consegna, 49
  bancomat alla cassa, 14 contanti alla cassa, 1 bancomat alla consegna. Il «già pagato» di
  ottobre è il 67 % del venduto (18.857 su 28.264 €).
- **La consegna**: 131 domicili su 132 hanno **orario di partenza e di consegna effettiva**
  (lo segna il rider dall'app RIDER), nessuno ha l'orario di assegnazione; il ritardo va da −22 a
  +46 minuti, con il rider «5» a 41 consegne a settimana.
- **La cucina**: la capacità in Velocissimo è **per giorno della settimana** (dom 22, lun–mer 10,
  gio–ven 18, sab 22 pizze a quarto d'ora, `13` §13.7); Edoardo la racconta per pizzaioli (1 → 10–12,
  2 → 18–20, 3 → 35).

## 14.1 La serata, passo per passo

Colonne: **Velocissimo/2Bit oggi** = come succede davvero (fonte fra parentesi) · **Cassa nuova** =
com'è al 24/10 dopo la mig. 0037, con il voto del critico dove c'è.

| Ora | Passo | Velocissimo / 2Bit oggi | Cassa nuova |
|---|---|---|---|
| 18:00 | **Il PC si accende** | il PC di cassa con SQL Server, il Web API locale sulla 9000 e `ping-executer` che dice al cloud «sono qui»; `RestartOnCrash` lo riavvia se cade. **Se il PC è spento o internet è giù l'app non prende ordini** (`03` §3.2, `09` §9.1) | nessun server in negozio: la cassa è una pagina web; l'app/sito/totem ordinano nel cloud anche a cassa spenta |
| 18:00 | **Apertura cassa, fondo** | la stampante fiscale si accende; il fondo cassa **non si registra nel 2Bit** per quanto si vede (nessuna traccia nel cloud; `/day-report` vuoto). **Da chiedere**: si fa l'apertura X? chi conta il fondo? | `/cassa/riepilogo` non ha né fondo né apertura; il fondo oggi lo scrive lo staff in `/chiusura` dell'OS. **Manca** (`15` §15.4) |
| 18:30 | **Pizzaioli e rider del giorno** | non si inserisce niente: la capacità è quella del giorno della settimana nel cloud; se serve, **un ordine finto** o un blocco di fascia (video 14:34) | `/cassa/capacita`: 3 tocchi → «fino a 35 pizze e 2 consegne a quarto d'ora» (critico 7/10: manca «salvato») |
| 18:40 | **Squilla il telefono, cliente nuovo** | il modem USB sul PC (driver `USR5637Voice`) legge il numero; il 2Bit cerca il cliente; se non c'è il cassiere scrive nome, telefono, via (dallo **stradario** locale, `INDIRIZZI.csv`: via → CAP → zona; dal 2023 Google Maps nel POS nuovo, video 12:50) | `/cassa/cliente`: il centralino chiama `/api/telefono/chiamata`, la scheda si apre da sola; via da Google → «1,2 km · Zona BOLOGNA SPALLANZANI · consegna 1,00 € · minimo 10 €» (critico **9/10**). **Da chiedere**: il centralino di oggi sa chiamare un webhook o il numero lo legge solo il modem del PC? |
| 18:45 | **Cliente conosciuto** | la scheda con nome, via, **note fisse** («citofono rotto»), e il contatore «[N ORD.]» che finisce nella nota di comanda | scheda con punti, note fisse, indirizzi, ultimi ordini; il contatore ordini c'è nel dato ma non si stampa |
| 18:46 | **Comanda telefonica a domicilio** | tipo Domicilio (`tipoAsporto = 1`), prodotti dalla griglia con le varianti «CON …» a bottoni, orario richiesto a quarto d'ora, **«PAGO CON 50»** scritto in nota per il resto, poi **stampa**: due stampanti, **cucina + cassa**, le righe raggruppate per gruppo di prodotti (classiche, speciali, fritti, dolci: `01` §1.4); in cucina nessuno schermo (Edoardo) | `/cassa/nuovo` da «Prendi l'ordine»: domicilio e indirizzo già scelti, 2 pizze, «Oggi 20:00», contanti, nota, «INVIA IN CUCINA» → 16,60 € giusti con la consegna (critico 7/10). **La nota fissa del cliente non compare in comanda** (aperto). «Paga con» c'è (`paga_con`). Stampa: `/cassa/comanda/[id]?stampa=1` dal browser, per reparto; **l'agente di stampa manca** (`10` A.1) |
| 18:50 | **Asporto telefonico** | tipo Ritiro (`tipoAsporto = 0`), **nome e telefono sempre** (ogni carrello ha il cliente), orario puntuale, «DA PAGARE CON BANCOMAT» in nota se lo dice | asporto con nome di chi ritira (`ordine_nome`, 0037) e ora; il pagamento previsto si sceglie (contanti/POS) |
| 19:00 | **Ordine dall'app** (il primo dei 95 della settimana) | il cloud lo spinge al PC sulla 9000 → SQL Server → **stampa automatica** (stato 2 = Vendita + Stampa) → push «Confermato» al cliente dal cloud (`11`); in nota «PAGATA CON NEXI[47 ORD.]» | finché l'app è quella di Velocissimo l'ordine **non arriva da noi** (`08` §8.4); dal sito nostro `/ordina` arriva in `/cassa` e si stampa; push no |
| 19:05 | **Tavolo, due coperti** | il tavolo nel 2Bit (Easypos) è un **preconto** (`tabTestatePreconti`), si apre, si aggiungono righe nel tempo, si chiude con lo scontrino; nel cloud finisce come «Tavolo» con comanda 0 e ora 00:00 (14 a settimana) | `/cassa/tavoli` apre/occupa; la comanda si batte da `/cassa/nuovo` → Tavolo (prezzi L2, Margherita 8,50); a qualunque ora (0037). **«Conto» senza righe né totale** (critico 4/10): aperto |
| 19:15 | **Deliverect: entra un Glovo** | Deliverect scrive nel cloud come ordine **Ritiro** con nota «RITIRO 19:45 GLOVO 609 Order ID … / Pickup code …» e «PAGATA CON PAYPAL»; il cloud lo spinge al PC, stampa, stati Ricevuto → Ritirato dal cliente (lo stato di mezzo non si usa) | `/api/deliverect/ordine` c'è ma senza credenziali né mappa prodotti (`10` B.11): **oggi non entra** |
| 19:30 | **Il totem** | la web-app in modalità totem chiama il POS locale (porta 37150 del Velocissimo POS: `12` §12.4). **Da chiedere**: col 2Bit, chi stampa gli ordini del totem? (7 a settimana, in cloud risultano «da totem» con prefisso C-) | `/totem` ordina nel cloud come la cassa; chiuso fuori orario (giusto), senza preordine |
| 19:40 | **Modifica di una comanda già stampata** («aggiungi una coca») | sul 2Bit si riapre la comanda e si ristampa; sul POS nuovo la ristampa è marcata «RISTAMPA» (`08` §8.5). **Da chiedere**: in cucina come capiscono che è una modifica e non un ordine nuovo? | **non si può** (critico, grave 4: «Modifica con ristampa resta da fare») |
| 19:45 | **Un cliente annulla** | stato Annullato (7 rifiutati in ottobre su 1.149); se già scontrinato, **annullo del documento** fiscale dall'ordine (video 12:26) | «Annullato» a due tocchi anche sui preordini (0037); l'annullo fiscale non esiste perché lo scontrino non esiste |
| 20:00 | **La cucina legge la carta** | il reparto PIZZE stampa le pizze; fritti, dolci e bevande sono sulla stessa comanda per gruppo; **nessuno segna «in preparazione» o «pronto»** sul 2Bit (per le piattaforme gli stati di mezzo non compaiono nella storia) | la cassa ha «In preparazione» e «Ritirato» come tasti; nessuno li toccherà in servizio se non servono a qualcosa: vanno tenuti **facoltativi** |
| 20:05 | **Il rider parte** | **il primo rider che rientra** prende le buste (Edoardo); dall'app RIDER si **assegna da solo** la comanda e segna **partenza** (131 su 132 ce l'hanno); l'avviso «Il fattorino è a 200 metri» parte dal geofence dell'app; il borsello **non si usa** (versato 0 in ottobre) | `/rider`: «PRENDI» → «RITIRATA» → «CONSEGNATA», 3 tocchi; la cassa può assegnare dalla mappa (0034); solo le consegne di stasera (0037); `/segui/[token]` per il cliente c'è, **l'avviso non parte** da solo (`11`) |
| 20:15 | **Rider al citofono: contanti e resto** | il rider porta il resto di «PAGO CON 50»; il POS alla consegna è configurato ma **spento** (Edoardo); 1 solo bancomat alla consegna in una settimana | il rider vede «16,60 € in contanti» e «paga con»; POS al rider → contanti 0 (0036) |
| 20:30 | **Il rider torna, consegna segnata** | segna **consegna effettiva** dall'app; il ritardo si calcola rispetto all'orario richiesto; i contanti restano in tasca al rider fino a fine serata | «CONSEGNATA» → «da saldare alla cassa», «hai in mano 16,60 €» |
| 20:45 | **Scontrino fiscale** | si emette **quando il cliente paga al banco, scegliendo il pagamento (POS o contanti)** sulla stampante fiscale (Edoardo, 22/10). **Da chiedere**: per i domicili e gli ordini online pagati con Nexi/PayPal lo scontrino si batte comunque (quando? a fine serata, in blocco?) o si fa il corrispettivo in altro modo? Dipende da questa risposta mezza integrazione fiscale | **niente** (`10` A.2); è il lavoro più grande che resta |
| 20:50 | **Conto al tavolo e split** | preconto dal tavolo, poi scontrino; i pagamenti di uno scontrino sono righe in `tabPagamentiScontriniBackOffice` (idPagamento, importo): **più pagamenti su uno scontrino** sono previsti dal modello. **Da chiedere**: alla romana si fa (quante volte)? | **no** conto, no split |
| 21:00 | **Sconto manuale** | «SCONTO» 190 volte in ottobre, −1.050 €: riga di sconto del gruppo \*GESTIONALE\* sulla comanda (`13` §13.7). **Da chiedere**: chi lo fa e perché (arrotondamento? cliente abituale? ritardo?) | **no** sconto manuale; coupon sì |
| 21:10 | **Coupon al telefono** («ho il NON CUCINO») | il coupon statico si scrive in cassa; i settimanali a ore (GIOVEDÌ SONO FRITTO) li genera l'app | coupon % / € con minimo (0026); omaggio e validità a ore **no** (`13` §13.3) |
| 21:30 | **La fascia è piena** | l'app mostra **SOLD OUT** sulla fascia e il cliente ne sceglie un'altra; dal telefono il cassiere forza (è lui che decide); la capacità di oggi (gio 18 / sab 22) non la cambia nessuno in servizio | `/ordina` e `/totem` tolgono la fascia piena (`10` A.5: va mostrata piena); la cassa forza con avviso; «+» cambia il massimo al primo tocco (critico 11) |
| 22:30 | **Ultima consegna, ultimo ritiro** | consegna fino alle 22:30, ritiro fino alle 22:45, apertura fino alle 22:45 | `orario` (0022) uguale |
| 22:50 | **I rider versano i contanti** | a mano, fuori dal sistema (versato 0 nel report) | `/cassa/rider` → «SALDA 16,60 €» → 0 in mano (0033; formula e numero da riallineare, critico 9) |
| 23:00 | **Chiusura: X, Z, riepilogo** | la **Z** sulla stampante fiscale (è lei il corrispettivo telematico all'Agenzia); **nel cloud non arriva niente** (`/day-report` 0 righe da sempre); il totale della sera lo legge Edoardo in `/chiusura` dell'OS **dall'API `/vendite`** e dal CSV `/weborder` esportato a mano. **Da chiedere**: chi fa la Z e a che ora; si fa anche la X durante il servizio? | `/cassa/riepilogo` con la sezione «Cassa» (0037): incassato sui chiusi, contanti / POS / online, aperti, in mano a ogni rider. Niente Z (niente fiscale) e niente «invia all'OS»: l'OS legge `/api/vendite` (`15`) |
| 23:10 | **Il PC si spegne** | fine; gli ordini dell'app dopo la chiusura restano nel cloud fino a domani | niente da spegnere |

## 14.2 Cosa succede «dietro» a ogni passo nel 2Bit (dal pacchetto SETUP)

Dalle viste SQL dello `stats-pack` si legge il modello che il POS usa per la serata:

- **Documenti**: `tabTestateScontrini` (scontrini) e `tabTestatePreconti` (preconti = tavoli e
  conti aperti), uniti in `TestateDocumenti_Webapp` con `TipoDocumento` SCO / PRE, `idPony`
  (il rider), `idComanda`, `idZona`, `OraConsegna`, `idUtente_Creazione` (**chi ha battuto**).
- **Tipo comanda**: `tipoAsporto = 1` → Domicilio, `0` → Ritiro, altrimenti Banco. Il tavolo è
  un preconto.
- **Origine**: `online = 1` se `ExtIdOrdine > 0` (ordine arrivato dal cloud) → «APP»; altrimenti
  la **nota** decide: `JUST` → JUSTEAT, `FOOD RACER`, `DELIVEROO`, `TELEFONATA`, se no «PC». È la
  stessa regola che mano-a-mano-os applica al CSV (`15` §15.2): **il canale vive nel testo della
  nota**, da sempre.
- **Pagamenti**: `tabPagamentiScontriniBackOffice` (idTestata, idPagamento, importo, data) +
  `tabPagamenti.TipoPagamento`; i preconti si pagano «Contanti». **Più righe di pagamento per
  scontrino** = split previsto dal modello.
- **Righe**: `PIZ_tabComandeBackup` (con `cat`, `IsEliminata`), `PIZ_tabTestateComandeBackup`,
  categorie e gruppi di categorie; **cliente ricorrente** = ha documenti precedenti.
- **Rider**: `PIZ_tabPony` con `UsaPerBanco` (il «rider» finto del banco si esclude dai report);
  la vista `Speedy_ElencoConsegneConPesoPerPony` fa consegne per fattorino.
- **I 30 report locali** (statistiche del 2Bit, che Edoardo può aprire sul PC): venduto per
  categoria/gruppo (€ e quantità), per fascia oraria, per giorno della settimana, per mese, per
  zona (ordini, €, scontrino medio), per origine, per tipo comanda, per pietanza (con e senza
  variazioni), per variazione, **numero ordini per numero di pizze**, scontrino medio, consegne
  totali e medie per fattorino, **ordini consegnati in orario**, pietanze impegnate.

## 14.3 Il bancone: cosa c'è fisicamente (dal pacchetto, da confermare con Edoardo)

| Pezzo | Nel pacchetto | Da chiedere |
|---|---|---|
| **PC Windows** con SQL Server 2008 R2 (installer da 382 MB nel pacchetto), HeidiSQL, `RestartOnCrash` | sì | è ancora quello? sistema operativo? |
| **Stampante fiscale** | driver NRG 1.00.11 impostato su modello **PRINTF** (famiglia **Ditron** PrintF / Zero5 / Zero55 / Duck / FlyXT), **Ethernet**, IP di rete locale, porta 23, file del 2022 | Edoardo ha detto «**Epson**» (`Progetto`, 22/10): la stampante è stata cambiata? modello esatto e IP (`16` n. 2) |
| **Due stampanti comanda** (cucina + cassa) | nessuna configurazione nel pacchetto (sta nel DB) | marca/modello, IP o USB, larghezza carta (`16` n. 2) |
| **Modem USB US Robotics 5637** | driver `USR5637Voice64bit` | serve ancora per il numero che chiama? o il centralino è VoIP (`centralino` è un'origine delle vendite) |
| **Totem** | — | come stampa col 2Bit |
| **POS bancario** | non collegato alla cassa (Edoardo) | marca; resta scollegato anche dopo? |
| **Loghi di stampa** `domicilio.2bt`, `take-away.2bt` | immagini in testa alla comanda per tipo | se li vogliamo uguali, servono le stampe di una comanda vera (foto) |

## 14.4 Cose che la serata del 2Bit fa e la cassa nuova no (riassunto per il piano)

1. **Scontrino fiscale** alla scelta del pagamento, annullo, Z serale — e la domanda aperta su
   quando si batte per online e domicili.
2. **Modifica di una comanda già stampata** con ristampa marcata.
3. **Sconto manuale** sulla comanda (190 al mese).
4. **Conto del tavolo** con righe, totale, pagamento (e split) — i tavoli sono 14 a settimana,
   non è urgente ma oggi è un cronometro.
5. **Stampa automatica** all'arrivo, su due stampanti, raggruppata per gruppo di prodotti, con la
   **nota fissa del cliente** e il **contatore ordini** in comanda.
6. **Fondo cassa e apertura**, perché la chiusura della sera torni con l'OS.
7. **Il canale nella nota** per le piattaforme, finché l'OS legge così (`15`).

Cose che la cassa nuova fa **già meglio**: la scheda cliente dal numero (9/10), la via con zona e
costo in una riga, «Prendi l'ordine» col tipo e l'indirizzo già scelti, la capacità dai pizzaioli
del giorno, il rider che vede la nota fissa, il borsello che torna a zero, le consegne di domani
che non si mischiano con stasera, tavolo e banco a qualunque ora, niente PC da tenere acceso.

## 14.5 Le domande che questa ricostruzione non sa chiudere

Sono in `16_DOMANDE_PER_EDOARDO.md`: n. 1 (2Bit o POS nuovo), 2 (stampanti), 3 (chi fa cosa in
cassa), 4 (scontrino quando), 5 (X e Z), 6 (POS bancario e Nexi), 7 (modifica e sconto), 8
(totem col 2Bit), 10 (centralino), 11 (stradario e note fisse).
