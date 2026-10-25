# REA · 17. Rapporto completo, 25/10/2026

*Giro del 25/10/2026, su incarico di Edoardo: prima di costruire altro, capire come è fatto il sistema attuale (cassa 2Bit, Velocissimo back-office e API, app, sito, rider, ordini, telefono, report, stampa). Ogni voce ha una riga di stato: **LETTO** = risulta dai documenti e dal codice del REA del 22–24/10, non riverificato oggi; **PROVATO** = verificato oggi su una fonte (foto, fotogrammi, repo, test); **DA CHIEDERE** = non si può dedurre, va a Edoardo (vedi `18_DOMANDE_PER_EDOARDO.md`).*

*Regola rispettata: sola lettura. Nessun ordine, nessun messaggio, nessun secret, nessuna modifica a Velocissimo, nessuna migrazione applicata.*

## Sommario (dieci righe)

1. La cassa del negozio è ancora un PC Windows con un gestionale a barre verdi e una colonna di quarti d'ora a sinistra: lo si vede nelle foto e nei video di oggi (PROVATO). Il nome del software e il modello del PC restano da confermare.
2. La barra in basso ha dodici tasti (Asporto, Banco, Ai Tavoli, Modifica, Elimina, Info, Google Maps, Comanda, Documento, Consegna, Card, Funzioni); tre hanno un menu a tendina (Documento, Consegna, Funzioni) (PROVATO dai fotogrammi).
3. Il menu Documento contiene pagamenti, apri cassetto, preconto veloce, preconto definitivo, fattura, scontrino veloce (PROVATO, lettura da fotogramma piccolo).
4. Il menu Funzioni porta a opzioni, recupero documenti stampati, produzione, Pony (riepilogo e disponibili), stampe e report, impostazioni (PROVATO, lettura parziale).
5. Sulla rete del PC ci sono una Epson al 192.168.1.200 (MAC di produttore Seiko Epson), un dispositivo Sunmi al .26, un'AETHRA Telecomunicazioni al .253 e un Gigaset al .19 (PROVATO, scansione IP). Che cosa sia ciascuno è DA CHIEDERE.
6. La cassa è ancora in uso al 25/10 in orario notturno: le schermate mostrano le fasce da 15 minuti e «Nessuna comanda da visualizzare» (PROVATO), quindi la sessione era vuota e non si vedono ordini veri.
7. Il back-office Velocissimo, gli ordini, le zone di consegna e le API restano LETTI dai documenti del 22–24/10; il giro live con Chrome non è stato possibile perché l'estensione Claude in Chrome non è collegata (vedi sezione 2).
8. Sito, app e totem si appoggiano al cloud Velocissimo: gli ordini nascono lì e non c'è webhook né lista ordini pubblica (LETTO, `08`, `05`).
9. Il telefono: l'elenco chiamate di 2Bit è PROVATO nella struttura (ora, telefono, cliente, gestita sì/no, utente); il modem USR e l'origine del numero sono DA CHIEDERE.
10. La stampa su rete esiste già nel nostro repo (agente con porta 9100, `/api/stampa/coda`, `/api/telefono/chiamata`) (PROVATO); la fiscale Epson FP-81II RT e il protocollo `fpmate.cgi` non compaiono nel repo: vanno provati in negozio, non inviati.

---

## Metodo e fonti

| Fonte | Che cosa contiene | Usata per |
|---|---|---|
| `/root/.claude/uploads/21659818-…/8b01d49e-image.png` | Schermata cassa, 25/10/2026, ore 02:45 | barra in basso, colonna fasce, lista ordini |
| `/root/.claude/uploads/21659818-…/b89b9074-image.jpg` | Advanced IP Scanner sul PC di cassa | IP e produttori in rete |
| `…/f8a1f484-VIDEO-2026-10-25-02-09-47.mov` (89 s, 832×464) | Video cassa | menu Documento, Consegna, Impostazioni, chiamate |
| `…/52c6b869-VIDEO-2026-10-25-02-41-43.mov` (164 s, 832×464) | Video cassa | menu Funzioni, Pony, elenco chiamate |
| `/mnt/project-files/IMG_0674 (2).mov` e `IMG_0674.mov` | Video cassa precedenti (indicati nella richiesta) | fotogrammi già estratti in scratchpad `img674/`, `v2b/`, `menu2/` (non riletti oggi) |
| `/mnt/project-files/SETUP 2BIT.rar` e `analisi-2bit/` | Pacchetto del 2Bit (analisi statica) | non riaperto oggi: il pacchetto è pesante (409 MB) e il REA del 23/10 è già nel `03` |
| `docs/rea/01…16` | REA del 22–24/10 | LETTO |
| Repo `mano-a-mano-cassa` | codice, migrazioni, agente di stampa | PROVATO con grep oggi |

I fotogrammi estratti oggi sono in `/tmp/claude-0/-home-claude/21659818-26da-52be-bf84-054969a027ee/scratchpad/rea25/` (fogli `sheet_v1a/b/c.jpg` dal video 02:09, `sheet_v2a/b/c.jpg` dal video 02:41). Il video 02:09 contiene anche una traccia audio (`v1.wav`): non è stata trascritta, quindi il suo parlato non è usato.

Nota sulle foto dell'upload: le otto immagini da 1512×2016 del 24–25/10 (`242332d1`, `242a8a6c`, `46e3aec0`, `5d030198`, `a4692fc7`, `de18a4c6`, `f030cd98`) e i due video di 2026-10-23 non sono state guardate in questo giro; il loro contenuto è DA CHIEDERE a Edoardo (vedi 18).

---

## 1. Cassa 2Bit (PC del negozio)

Legenda: la schermata è vista di lato nei video, quindi i testi piccoli sono letti con cautela: dove il nome è parziale la riga lo dice.

### 1.1 Barra in basso (PROVATO, 8b01d49e e fotogrammi 02:09/02:41)

| Voce | Stato | Fonte | Nota |
|---|---|---|---|
| Asporto (icona scooter) | PROVATO | 8b01d49e, v1 f01 | primo tasto a sinistra |
| Banco (icona posate) | PROVATO | 8b01d49e | apre la vendita al banco (non provato) |
| Ai Tavoli (icona tavolo) | PROVATO | 8b01d49e | mappa tavoli: non aperta nei video |
| Modifica (icona matita) | PROVATO | 8b01d49e | su un ordine selezionato; non usata |
| Elimina (cestino) | PROVATO | 8b01d49e | annullo o cancellazione: DA CHIEDERE quale |
| Info (i) | PROVATO | 8b01d49e | scheda dell'ordine selezionato: non aperta |
| Google Maps | PROVATO | 8b01d49e | apre la mappa dell'indirizzo |
| Comanda | PROVATO | 8b01d49e | icona stampante: ristampa o stampa comanda, DA CHIEDERE |
| Documento ▾ | PROVATO | 8b01d49e, v2 f004 | menu a tendina, vedi 1.3 |
| Consegna ▾ | PROVATO | 8b01d49e, v2 f005 | menu a tendina, vedi 1.4 |
| Card | PROVATO | 8b01d49e | fidelity/card: menu non aperto |
| Funzioni ▾ | PROVATO | 8b01d49e, v2 f006 | menu a tendina, vedi 1.5 |
| Icone a destra (lente, freccia/filtro) | PROVATO | 8b01d49e | ricerca e filtro della lista ordini; contenuto DA CHIEDERE |
| Freccia su / giù (barra blu, in alto) | PROVATO | 8b01d49e | scorre la lista dei tasti |

### 1.2 Barra in alto e colonna sinistra (PROVATO)

| Voce | Stato | Fonte | Nota |
|---|---|---|---|
| Data e «P.Poss» (orario di posizione) | PROVATO | 8b01d49e | «25/10/2026», «P.Poss 02:45» |
| Icone in alto (accensione, posate, persona, moto, forbici) | PROVATO | 8b01d49e, v1 | l'accensione è il tasto verde in alto a sinistra; le altre DA CHIEDERE |
| Colonna Ore con righe ogni 15 min (15:15 → 23:45) | PROVATO | 8b01d49e, v1 f01–f05 | la colonna scorre; ogni riga ha un'icona stampante |
| Colonna Aspo / DOMICILIO | PROVATO | 8b01d49e | intestazioni: Aspo (asporto) e Domicilio, con i conteggi per fascia |
| Icona stampante per fascia | PROVATO | 8b01d49e | cosa stampa (la fascia, la lista, la comanda) è DA CHIEDERE |
| Lista ordini: Num. comanda, Tipo ordine, Ora, Nominativo, Note, Totale, Origine, Sposta | PROVATO | 8b01d49e | intestazioni leggibili; colonna «Sposta» = spostare l'ordine a un'altra fascia (uso DA CHIEDERE) |
| «Nessuna comanda da visualizzare» | PROVATO | 8b01d49e | stato vuoto a notte (25/10 ore 02) |

### 1.3 Menu Documento (PROVATO, v2 f004 e v2b, lettura da fotogramma)

Voci lette: **Pagamenti**, **Apri cassetto**, **Preconto veloce**, **Preconto definitivo**, **Fattura**, **Scontrino veloce**, più una sesta voce in fondo al menu, illeggibile (probabilmente «Stampa…»). Non provato: nessuna voce è stata scelta, nessuno scontrino emesso.

| Voce | Stato | Nota |
|---|---|---|
| Pagamenti | PROVATO (nome) | apre la scelta del pagamento, DA CHIEDERE il flusso |
| Apri cassetto | PROVATO (nome) | apre il cassetto del contante |
| Preconto veloce / definitivo | PROVATO (nome) | preconto stampabile: differenza tra i due DA CHIEDERE |
| Fattura | PROVATO (nome) | DA CHIEDERE come si usa |
| Scontrino veloce | PROVATO (nome) | scontrino senza passare dal pagamento: DA CHIEDERE |
| Annullo | PROVATO in una schermata: una barra «Annulla» (verde, v2b f001) appare su una finestra; il tasto Annulla dell'ordine non è stato aperto | annullo documento: DA CHIEDERE dove sta e chi lo fa |

### 1.4 Menu Consegna (PROVATO, v2 f005, v2a f003–f005)

Finestra «Dati consegna»: data (25/10/2026), ora consegna, «Prima possibile», tipo consegna (es. «Diretto»), con intestazioni tipo ordine **Ordine / Cliente / Domicilio** e campi per nome, indirizzo, citofono, telefono e note. A sinistra la lista «Disponibilità consegna» per quarto d'ora (02:30, 02:45 … 05:30) con una lente per ogni riga. Tastiera virtuale a schermo.

| Voce | Stato | Nota |
|---|---|---|
| Data e ora consegna, prima possibile | PROVATO | come nel back-office (`13`) |
| Disponibilità per quarto d'ora con lente | PROVATO | la lente apre il dettaglio: DA CHIEDERE |
| Campi cliente e indirizzo | PROVATO (nomi parziali) | i valori in video sono reali: non riportati |
| Tastiera a video | PROVATO | serve al pc a tocco o al monitor touch |

### 1.5 Menu Funzioni (PROVATO, v2b f006, v2 f010–f012)

Voci lette: **Opzioni** (ingranaggio), **Recupero documenti stampati**, **Altro** (sottomenu), **Produzione**, **Pony** (sottomenu: Riepilogo Pony, Pony Disponibili), **Stampe e report**, **Brucia documenti**, altre due voci illeggibili, con sottomenu. Poi la finestra **Impostazioni** con i riquadri Configurazione (con 'programmazione'), Gestione menu, Utilità, Gestione reparti, Generali, Grafica, Selezione lingua, Stampe, Configurazione lingue, Opzioni menu, Autoscontrino (?), e in basso Telecomunicazioni.

| Voce | Stato | Nota |
|---|---|---|
| Opzioni | PROVATO | non aperta |
| Recupero documenti stampati | PROVATO (nome) | recupera o ristampa un documento: DA CHIEDERE |
| Produzione | PROVATO (nome) | schermata produzione (fasce o comande per reparto): DA CHIEDERE |
| Pony / Riepilogo Pony / Pony Disponibili | PROVATO (nome) | «Pony» = i rider; riepilogo e disponibili corrispondono al borsello rider (`04`) |
| Stampe e report | PROVATO (nome) | elenco dei report: DA CHIEDERE quali sono i più usati |
| Impostazioni (Configurazione, Gestione menu, Utilità, Gestione reparti, Generali, Grafica, Lingua, Stampe, Telecomunicazioni) | PROVATO (nomi) | la voce «Telecomunicazioni» è quella che conta per il telefono (sezione 7) |
| Brucia documenti | PROVATO (nome) | operazione distruttiva: non usata, DA CHIEDERE che cosa cancella |

### 1.6 Elenco chiamate (PROVATO, v2 f011–f012 e 8b01d49e)

Due finestre diverse:
- **Nessuna chiamata ricevuta** (23/10/2026): finestra con data, pulsanti di navigazione data;
- **Elenco chiamate** del 24/10/2026: colonne **Ora**, **Telefono**, **Cliente**, **Gest** (sì/no, gestita), **Utente** (es. «Titolare» o nome del turno). Le righe sono in giallo o azzurro a seconda dello stato.

I numeri di telefono e i nomi nelle righe sono dati di clienti reali: non sono riportati in questo REA. Il comportamento di «Gest» e l'associazione dell'utente sono DA CHIEDERE (vedi 18).

Nel pannello di sinistra a 2Bit c'è una seconda riga: **«Nessuna chiamata ricevuta»** con due pulsanti (lista e cestino) e **«Ripristina default»** (PROVATO, 8b01d49e).

### 1.7 Stampe e ristampa comanda (PROVATO parziale, LETTO per il resto)

- La stampante di comanda compare nella barra come tasto «Comanda» e come icona per fascia (PROVATO).
- La ristampa della comanda e lo scontrino sono DA CHIEDERE: nei video di oggi non sono stati aperti.
- Il Brother P-touch (software «P-touch Address Book», «P-touch Update Software», «Brother Manuals» sul desktop, PROVATO in b89b9074) indica una stampante di etichette collegata al PC. Il suo uso (etichette per la cucina o per le buste) è DA CHIEDERE.

### 1.8 Il PC e la rete (PROVATO, b89b9074)

Advanced IP Scanner sul PC di cassa, scansione 192.168.1.1–254: **13 attivi, 10 inattivi, 231 sconosciuti**. Dispositivi riconosciuti dal produttore del MAC:

| IP | Produttore (MAC) | Nota |
|---|---|---|
| 192.168.1.1 | ICANN/IANA (gateway) | router, DA CHIEDERE quale |
| 192.168.1.3 | Intel, nome «Edo_PC-PC» | PC di Edoardo sulla rete |
| 192.168.1.6 | AMPAK Technology | DA CHIEDERE |
| 192.168.1.8 | Ajax Systems | allarme/sensori? DA CHIEDERE |
| 192.168.1.19 | Gigaset Communications | telefono Gigaset (fisso DECT?), DA CHIEDERE |
| 192.168.1.26 | Shanghai Sunmi Technology | terminale o stampante Sunmi, DA CHIEDERE |
| 192.168.1.200 | **Seiko Epson Corporation** | **la stampante fiscale Epson**, come da indicazione di Edoardo (PROVATO per il produttore, non per il modello) |
| 192.168.1.253 | AETHRA Telecomunicazioni | probabile modem/router telefonico, DA CHIEDERE |
| PC_0-… (1.15, 1.22) | nomi PC | altri PC sulla rete, DA CHIEDERE |

Lo scan è di oggi. Non dice quale modello di Epson è, né se è una RT telematica: vedi sezione 9.

### 1.9 Verdetto sulla cassa 2Bit

Chiaro: barra, menu Documento, Consegna e Funzioni, colonna fasce, elenco chiamate, rete locale.
Non chiaro: il nome esatto del software, cosa fanno Annullo, Sposta, Ristampa e Card, i menu che non sono stati aperti, il modello della stampante fiscale.

---

## 2. Velocissimo back-office, ordini e zone (LETTO; giro live NON fatto)

**Motivo.** Edoardo ha chiesto oggi (25/10, 02:34) di studiare a fondo ordini, zone di consegna, orari e fasce, rider e borsello, con Claude in Chrome e le API, in sola lettura. Il tentativo di collegare Chrome ha risposto «Browser extension is not connected»: l'estensione non è collegata alla sessione. Nessuna pagina del back-office è stata aperta. Le informazioni sotto vengono dai documenti del 22–24/10 (`01`, `05`, `08`, `13`, `14`, `15`): **LETTO, non riverificato oggi**.

### 2.1 Gestione ordini nel back-office (LETTO, `01` §ordini, `13`)

| Voce | Stato | Fonte | Nota |
|---|---|---|---|
| Lista ordini con filtri | LETTO | `01`, `13` | filtri per data, stato, tipo, origine |
| Dettaglio ordine con storia degli stati | LETTO | `09` (video 11:50), `01` | storia con orari |
| Stati ordine: Ricevuto → Confermato (stampa) → In lavorazione → Da ritirare → In consegna → Consegnato / Ritirato / Annullato | LETTO | `00`, `01` §stati | 8 stati configurabili con colore e «fase POS», flag preordine |
| Annullo: chi lo fa (cliente da app, staff) | DA CHIEDERE | `08`, `13` | l'annullo dal cliente esiste nell'app; l'annullo dello staff sul documento è nel video 12:26 |
| Ristampa comanda, «sposta» (cambio fascia) | DA CHIEDERE | `13` | non provato |
| Esportazioni (CSV per ordine, API vendite) | LETTO | `15` | 40 colonne per l'OS, `/weborder` |
| Notifiche per stato (email, push, avviso rider) | LETTO | `11` | i testi sono nel back-office e vengono inviati da Velocissimo |

### 2.2 Zone di consegna (LETTO, `00`, `02` §4.2, `05` `/coverage`, `13`)

| Voce | Stato | Fonte | Nota |
|---|---|---|---|
| 16 zone a poligono | LETTO | `00` punto 4 | |
| Costo di consegna 1,00 / 1,50 / 2,00 € per zona | LETTO | `00`, `02`, `13` | dal campo `shippingPrice` della zona |
| Minimo d'ordine 10 € sul subtotale | LETTO | `00`, `02` | campo `minimumOrderAmount` |
| Fuori poligono: non si consegna | LETTO | `02` | |
| Come una zona si assegna a un indirizzo | LETTO | `02` §4.2 (`geocode` poi `stores/delivery`, campo `matchedZone`) | ordine delle chiamate descritto, non verificato oggi |
| `/coverage` | LETTO | `05` | endpoint lettura |
| Giorni e fasce a cui la zona vale (consegna gratis sopra soglia, sconto zona) | LETTO | `13`, `02` | `freeShippingThreshold`, `enableSameZoneDiscount` |

### 2.3 Orari, fasce e capacità (LETTO, `00` punto 3, `13`, `14`)

| Voce | Stato | Nota |
|---|---|---|
| Apertura 18:30–22:45; consegna 19:00–22:30 a finestre di 30 min ogni 15; ritiro 19:00–22:45 | LETTO | |
| Attesa minima 15 min, preordini fino a 7 giorni | LETTO | |
| Capacità per giorno della settimana (10/18/22 pizze per quarto d'ora) | LETTO | `16` domanda 14: chiesto a Edoardo se è ancora vero |
| Blocco fascia e SOLD OUT | LETTO | `09`: in app la fascia piena resta, mostrata come piena |

### 2.4 Rider e borsello (LETTO, `04`, `13` §13.10, `09` §9.2)

| Voce | Stato | Nota |
|---|---|---|
| Il rider si prende la prima comanda da solo | LETTO | app Velocissimo RIDER |
| Borsello: prelievi, depositi, conteggio di fine serata | LETTO | `04`; il borsello non si usa in negozio (`13` §13.10) |
| Mappa e assegnazione manuale dalla cassa | LETTO | video 18:52 |
| Report rider (numero comanda, per pagamento) | LETTO | video 21:36 |

### 2.5 Giro live da fare (DA FARE, quando Chrome è collegato)

Per completare questa sezione servono: la lista ordini della giornata (sola lettura, nessun ordine di prova), un dettaglio ordine, la pagina zone con un poligono aperto senza salvare, la pagina orari e il pannello rider. Per ogni schermata: percorso, cosa mostra, campi, cosa fa il bottone, provato o solo letto. Il secret e il GUID non si leggono mai.

---

## 3. App «A Mano a Mano Pugliese» (LETTO, `02`, `08`, `11`, `12`)

- Stessa web-app di Velocissimo (5.9), in due store: iOS a nome Vi.Ru s.r.l.s., Android a nome Velocissimo (`08` §8.1, App Store e Play).
- Ordine: chiamate al server `pluto-server`, poi checkout con fascia e pagamento (contanti alla consegna, online Nexi). Dettagli in `08` §8.2–8.4.
- Stati: ricevuto, confermato, in lavorazione, in consegna, consegnato (`08`, `09`).
- Notifiche: le push le manda Velocissimo (FCM e APNs, `11` §11.1). La nostra cassa non le può mandare se lo stato non cambia dentro Velocissimo.
- Ordini: nessuna lista ordini pubblica e nessun webhook: il cliente vede i suoi ordini in app, aggiornati ogni 30 secondi (polling).
- Strada di sostituzione scelta nel REA: app e sito che parlano con la nostra cassa (`08` §8.4, strada E). **DA CHIEDERE**: il conto dell'app è di Vi.Ru o di Velocissimo; si può trasferire l'app Android (`10` E.2–3).

## 4. Sito amanoamano.it (LETTO, `02` §9, `08` §8.4)

- Il pulsante «Ordina» apre la web-app Velocissimo: il sito non ha ordini suoi (LETTO).
- Il sito non manda nulla al gestionale nostro: il nostro `/api/ordini` non è ancora collegato al sito (LETTO, `10` n. 6–7).

## 5. Rider (LETTO, `04`; PROVATO per la voce «Pony» nella cassa, sezione 1.5)

- App Velocissimo RIDER: assegnazione automatica, borsello, mappa, report.
- Nella cassa il menu «Pony» (Riepilogo Pony, Pony Disponibili) è visibile (PROVATO), quindi la cassa vede i rider disponibili.
- **DA CHIEDERE**: chi è il rider di turno oggi e come si segna chi rientra (il «primo che rientra» è regola di casa, `00` punto 9).

## 6. Ordini: ciclo di vita (LETTO, `14`, `08`, `09`; annullo DA CHIEDERE)

Ricevuto → confermato (stampa) → in lavorazione → da ritirare / in consegna → consegnato, oppure ritirato dal cliente, oppure annullato. Chi annulla: il cliente dall'app, lo staff dal back-office o dalla cassa. Il cliente vede ogni cambio di stato e il rider sulla mappa (`08` §8.2). Preordini: fino a 7 giorni (`00`). Fasce e capacità: sezione 2.3. **DA CHIEDERE**: chi annulla in negozio, e se l'annullo fa tornare la capacità della fascia.

## 7. Telefono (PROVATO nella struttura, LETTO nel resto)

| Voce | Stato | Fonte | Nota |
|---|---|---|---|
| Elenco chiamate di 2Bit: ora, telefono, cliente, gestita, utente | PROVATO | 1.6 | dati reali non riportati |
| Riquadro «Nessuna chiamata ricevuta» con lista e cestino | PROVATO | 8b01d49e | |
| Modem USB (driver US Robotics `USR5637Voice64bit.EXE` nel pacchetto) che legge il numero | LETTO | `03` §3.1 | confermare che il modem è ancora quello |
| Centralino VoIP con webhook | DA CHIEDERE | `16` domanda 10 | oggi la rete ha un AETHRA al .253 |
| Nostra scheda cliente che si apre da sola | PROVATO nel repo | `src/app/api/telefono/chiamata` | route presente, chiave solo su Vercel |

## 8. Report, chiusura, export CSV, API vendite (LETTO, `15`, `13` §13.4)

- **Export CSV** per l'OS: 40 colonne, per ordine (`/weborder`), con il canale delle piattaforme nel testo della nota (`15` §15.6). Il nostro `/api/ordini/csv?giornata=` è stato provato col parser dell'OS (CLAUDE.md della cassa).
- **API vendite** per articolo (`/vendite`, una giornata per chiamata, 28 ore): il nostro `/api/vendite` ha le stesse colonne di `RigaVendita` (`15` §15.3).
- **Chiusura**: le chiusure X e Z non salgono nel cloud (`13` §13.10). **DA CHIEDERE**: chi fa la Z e a che ora (`16` domanda 5).
- **Report di Velocissimo**: 93 voci nel menu del back-office, di cui 17 coperte dalla cassa nuova e 20 non coperte (`13`).

## 9. Stampa e stampanti (PROVATO nel repo, PROVATO per l'IP in rete; fiscale NON provata)

### 9.1 Comanda (cucina e cassa)

| Voce | Stato | Fonte | Nota |
|---|---|---|---|
| Due stampanti di rete per comanda (cucina e cassa) | LETTO | `03` §3.4, `14` | |
| Modello e larghezza carta | DA CHIEDERE | `16` domanda 2 | foto dell'etichetta dietro la stampante |
| Agente di stampa nel nostro repo: porta 9100, ESC/POS | PROVATO | `agente-stampa/agente.mjs`, `src/app/api/stampa/coda/route.ts`, `src/lib/stampa/escpos.ts` | non ancora acceso in negozio (CLAUDE.md, 24/10) |
| Stampa automatica dell'ordine esterno | LETTO | `09` §9.2 | |

### 9.2 Fiscale Epson FP-81II RT (IP 192.168.1.200)

| Voce | Stato | Fonte | Nota |
|---|---|---|---|
| IP 192.168.1.200 è un Seiko Epson | PROVATO | b89b9074 (MAC di produttore) | il modello non è verificato |
| Endpoint ePOS-Fiscal `fpmate.cgi` | PROVATO assente nel repo | grep del 25/10 | non c'è codice per la fiscale: la lavorazione è da fare |
| Scontrino fiscale quando si batta | DA CHIEDERE | `16` domanda 4 | cambia tutta l'integrazione |
| Ditron nel pacchetto 2Bit (`NRG` + `MultiDriver.dll`, `10.0.0.222:23`) | LETTO | `03` §3.1 | conflitto con Epson: DA CHIEDERE (`16` domanda 2) |

### 9.3 Condizioni per non inviare scontrini veri

Non si inviano scontrini fiscali veri finché non è vero tutto questo:
1. il modello e il firmware della fiscale sono confermati da una foto dell'etichetta e dal manuale;
2. la fiscale è censita come RT e il corrispettivo è stato provato su un registratore di prova, o con la sola stampa non fiscale;
3. c'è una sera di prova in parallelo con la cassa vecchia, con Edoardo presente;
4. la chiusura Z è stata provata e confrontata col totale del 2Bit.

Fino ad allora la stampa fiscale resta spenta. Nessun invio è stato fatto in questo giro.

---

## 10. Menu e disponibilità (LETTO nei documenti 01, 02, 06, 08, 13; giro live NON fatto)

*Richiesta di Edoardo del 25/10, 02:35: come si mette in pausa un prodotto, come lo si blocca più a lungo, come si riattiva; leggere prodotti, categorie, varianti, combo e i flag per tempo, giorno e canale L1/L2/L3. Sola lettura. Chrome non risulta collegato (tentativo del 25/10, due volte): nessuna pagina del back-office è stata aperta, nessun dato di Velocissimo è stato letto oggi con curl. Quello che segue viene dai documenti del REA.*

### 10.1 Stato di un prodotto: pausa, blocco, riattivazione

| Voce | Stato | Fonte | Nota |
|---|---|---|---|
| Stato locale del prodotto: **Disponibile** / **Non disponibile definitivamente** / **Non disponibile per un periodo** | LETTO | `01` §catalogo (riga stato locale) | il periodo ha un campo «indisponibile fino a» |
| Pausa: impostare «non disponibile per un periodo» | LETTO | `01` | il valore preciso del periodo e il comportamento alla scadenza sono DA CHIEDERE |
| Blocco lungo: «non disponibile definitivamente» | LETTO | `01` | per riattivarlo serve tornare su «Disponibile»: procedura DA CHIEDERE |
| Riattivazione: tornare a «Disponibile» | LETTO | `01` | il prodotto riappare in app alla prossima apertura della web-app (LETTO, polling) |
| Disponibilità per giorno: **sempre / solo per oggi / mai** | LETTO | `06` riga Prodotto (campo «disponibile») | «per oggi» vale solo la giornata |
| Visibilità: campo **visibile** | LETTO | `06` riga Prodotto | un prodotto non visibile è escluso dal catalogo, anche se disponibile |
| Stato in app: **SOLD OUT** come etichetta | LETTO | `01` §etichette (9 etichette: SOLD OUT, In esaurimento 2+ «Ultimi {{quantita}}», Ultimo pezzo, A tempo limitato) | l'etichetta non blocca l'ordine da sola |
| Stock per prodotto nel carrello | LETTO | `08` §products (`productStoreConfigurations[{disabled, stock, unavailableUntil}]`) | `enableAddToCart` nella stessa risposta; `02` dice «stock non usato oggi» |
| Fascia piena: SOLD OUT sulla fascia, non sul prodotto | LETTO | `02` §fasce, `09` | la fascia resta visibile ma non si sceglie |

### 10.2 Flag per tempo, per giorno, per canale

| Flag | Stato | Fonte | Nota |
|---|---|---|---|
| Per tempo: `unavailableUntil` (indisponibile fino a) | LETTO | `08` (campo nel prodotto per negozio) | data e ora di riattivazione automatica: DA CHIEDERE se Velocissimo la riattiva da sola |
| Per giorno: sempre / per oggi / mai | LETTO | `06` | per una disponibilità settimanale per giorno non c'è un campo documentato: DA CHIEDERE |
| Per canale: listini **L1** app/sito/banco/asporto, **L2** sala, **L3** piattaforme | LETTO | `00` punto 1, `06` | il listino cambia il prezzo; non è documentato un «disabilita solo su L3» per un prodotto: DA CHIEDERE |
| Canale off per singolo prodotto (es. spento solo su Just Eat) | DA CHIEDERE | — | non trovato nei documenti |
| Negozio: `disabled` per store | LETTO | `08` (`productStoreConfigurations.disabled`) | |

### 10.3 Categorie, varianti, combo

| Voce | Stato | Fonte | Nota |
|---|---|---|---|
| Categorie: pagine catalogo multiple, visibilità in app, `categoria ecommerce` | LETTO | `01` (scheda Generali), `13` | le 11 categorie online sono in `07` §7.2 |
| Varianti: gruppi per categoria (pizze 5, pucce 4, burger 4 + salse), min, max, max gratis | LETTO | `00` punto 2, `06` §6.3 | 141 varianti con prezzo in 14 gruppi |
| Varianti: disponibilità per singola variante (es. «Bufala» finita) | DA CHIEDERE | — | non documentato: lo stock risulta solo sul prodotto |
| Ingredienti togliibili (`variations.ingredients[]`) | LETTO | `08` | sono le varianti «senza» |
| Combo: menu con gruppi a scelta obbligatoria a 0 € | LETTO | `00` punto 2, `01` §menu | combo: Puccia 7,90; Classico 13/24/33; Speciale 15/28/39 (`07`) |
| Combo: disponibilità di un componente (es. una bibita finita) | DA CHIEDERE | — | |

### 10.4 Esempi da fare appena Chrome è collegato (DA FARE, sola lettura)

1. Aprire il catalogo e leggere **un** prodotto a pausa e **uno** a blocco lungo: si vede la data «fino a»? Dove si cambia?
2. Leggere la scheda L1/L2/L3 di un prodotto e il flag «visibile».
3. Leggere un gruppo di varianti e una combo, senza cambiare nulla.
4. Leggere `GET out/selforder/products/{id}` per lo stesso prodotto e confrontare `productStoreConfigurations` con quello che si vede a video.

Nessuna di queste prove cambia un valore. Il secret non si legge mai.

---

## Verdetto complessivo

- **Chiaro**: la struttura della cassa 2Bit (barra, menu, colonna fasce, chiamate, rete), il ciclo degli ordini, il modello dei rider, zone e minimi dal back-office (LETTO).
- **Non chiaro**: i tasti Card, Annullo, Sposta, Ristampa, Brucia documenti e le icone in alto; il modello fiscale; il centralino; chi annulla e chi fa la Z.
- **Non fatto**: il giro live nel back-office con Chrome (estensione non collegata); la lettura delle foto del 23–24/10 non ancora riviste.

Le domande che non si deducono sono in `18_DOMANDE_PER_EDOARDO.md`.
