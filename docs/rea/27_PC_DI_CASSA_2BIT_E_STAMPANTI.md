# REA 27 — PC di cassa: 2Bit, ordini e stampanti

Data: 27/10/2026. Sessione di sola lettura sul PC di cassa (Windows 11, `DESKTOP-2GE5SUO`, utente `Utente`), collegata con Remote Control. Regole rispettate: solo SELECT sul database, nessuna scrittura, nessuno stop di servizi, nessuna stampa né scontrino, nessuna impostazione cambiata. Le due piccole basi Access locali sono state lette da una copia temporanea, poi cancellata. Password, chiavi e token non sono riportati.

Questo documento risponde a due domande: **dove finiscono gli ordini** di app, sito, totem e Deliverect, e **come sono fatte le stampanti** (comanda e fiscale).

## Tema 1 — Database e percorso degli ordini

### Installazione 2Bit

- Cartella: `C:\2BIT` con `Main` (il gestionale Velocissimo/easyPOS), `AppServer` (`DueBit.WebApiOWINServer`), `AppServerLog`, `Log`, `BackupFolder`, `Backuper`, `2BitAssistenzaRemota`, `SETUP 2BIT` (ping-executer, RestartOnCrash, driver Epson fiscale, POS-Printer-Test).
- Versione client 22.341.0.1; ultimo aggiornamento dell'installer il 27/10/2026 alle 00:06.
- Servizi Windows: `MSSQL$DUEBIT` in esecuzione e automatico; `SQLBrowser` e `SQLWriter` in esecuzione; `SQLAgent$DUEBIT` fermo e disabilitato; `2BitRemote` (assistenza remota) in esecuzione.
- AnyDesk installato, in ascolto sulla porta 7070.
- Processo `DueBit.WebApiOWINServer.exe` sorvegliato da RestartOnCrash, che lo riavvia se va in crash o si blocca.
- Porte in ascolto: **9000** (API del 2Bit, con regola firewall «DueBit AppServer (porta 9000)»), 58788 (SQL Server), 80, 7070 (AnyDesk).
- Attività pianificate: `AutoCheck software 2Bit` (attiva). `ping-executer` è **disabilitata**. Il backup non è un'attività pianificata: lo esegue il programma.

### SQL Server e database

- Istanza `localhost\DUEBIT`, SQL Server 2008 R2 SP3 Express (10.50.6000), porta dinamica 58788. Versione fuori supporto.
- Database **`DD_AMANOAMANOPUGLIESE`**, creato il 06/09/2023, 700 tabelle. Non è `DD_DATABASE` come si ipotizzava dal pacchetto di setup.
- Le app si collegano con l'utente `sa`. La password è in `easyPOSFrontEnd_launcher.ini` e in `web.config`, non riportata qui.
- Configurazione API (`C:\2BIT\AppServer\web.config`): job Quartz ogni minuto per categorie, produzione e SMS; pulizia dati totem alle 3:00; procedure giornaliere alle 7:00; analisi venduto alle 5:00. Log in `C:\2bit\AppServerLog\2bitAppServer.log`, circa 3–4 giorni di storico.
- **Backup**: ogni sera tra le 23:00 e le 23:40, in `C:\2BIT\BackupFolder`, circa 1,08 GB l'uno, una trentina di file. Tutto sullo stesso disco, nessuna copia altrove.

### Tabelle degli ordini

- `PIZ_tabTestateComandeBackup`: 51.550 righe, dal 19/09/2023 al 26/10/2026. È lo storico.
- `PIZ_tabTestateComande`: 104 righe, le comande vive.
- Righe: `PIZ_tabComandeBackup` (296.829), `PIZ_tabComande` (455).
- Altre tabelle utili: `tabClienti` (19.427), `PIZ_tabIndirizzi` (17.537), `PIZ_tabChiamateRicevute` (10.695), `PIZ_tabPagamentiConti` (78.008), `tabFidelity_Tessere` (10.000) e `_Transazioni` (11.885), `tabTestateScontrini` (49.059), `tabDettaglioScontrini` (190.990).
- Campi chiave della testata:
  - `OrigineComanda` rimanda a `PIZ_tabOrigini`: 0 Diretto, 1 App, 2 Web, 3 JustEat, 4 Telefono, 5 Totem, 100 Deliveroo, 101 Ubereat, 199 Glovo.
  - `tipoConsegna`: 0 ritiro/asporto, 1 consegna a domicilio, 2 banco. Ricavato anche dalle note «RITIRO» e «CONSEGNA».
  - `ExtIdOrdine`: positivo = id dell'ordine arrivato dalla webapp; negativo (= −idComanda) = ordine inserito in cassa.
  - `IdExternalOrder` e `IdClienteJustEat` sono sempre vuoti.

### Come si distinguono i canali (il punto chiave)

- **Tutti gli ordini online arrivano con `OrigineComanda = 1` («App»)**, anche quelli di Glovo, Deliveroo e Just Eat. I codici 3, 100 e 199 non sono usati.
- La piattaforma si riconosce solo dal **testo del campo note**:
  - Glovo: «… - RITIRO hh:mm GLOVO nnn Order ID: …»
  - Deliveroo: «… - RITIRO hh:mm DELIVEROO nnnn»
  - Just Eat: «… - CONSEGNA hh:mm JUST_EAT nnnnnnnn»
- Gli ordini dall'app o dal sito propri hanno note tipo «PAGATA CON NEXI» o «DA PAGARE CON BANCOMAT», più il campo «Cit:» per il citofono.
- Negli ultimi 30 giorni non compaiono né «TELEFONATA» né «TOTEM». Le tabelle `PIZ_Totem_StatoRichieste` e `PIZ_tabFasceAttivazioneAppWeb` sono vuote.

### Numeri (27/09–26/10/2026, dal backup, canale ricavato da origine e note)

| Canale | Ordini | Tipo | Totale | Medio |
|---|---|---|---|---|
| Glovo | 476 | tutti ritiro | 11.207 € | 23,5 € |
| Deliveroo | 202 | tutti ritiro | 4.655 € | 23,0 € |
| Just Eat | 111 | tutti consegna nostra | 2.566 € | 23,1 € |
| App/web propria | 438 | 328 consegna, 66 ritiro, 44 banco | 11.560 € | — |
| Telefono | 72 | — | 1.818 € | — |
| Diretto/cassa | 140 | 128 banco | 2.520 € | — |

Primo e ultimo ordine per canale (storico): App/web dal 19/09/2023 (12.809 ordini), Glovo dal 19/01/2024 (11.766), Deliveroo dal 23/09/2023 (5.642), Just Eat dall'08/11/2023 (5.573), Telefono dal 16/10/2023 (3.678), Diretto dal 19/09/2023 (12.082). Tutti gli ultimi ordini sono del 25–26/10/2026.

### Come arrivano gli ordini (dai log)

- Il 2Bit espone l'API su `http://*:9000`. Il cloud del fornitore (`web-app.it`, client «webapp», app «WebAppSelfOrder 1.0», registrato il 17/09/2026) la chiama dall'esterno su `http://93.39.252.83:9000`, cioè l'IP pubblico del locale. Sul router c'è quindi un port forwarding della 9000 verso `192.168.1.18`. Questo port forwarding è dedotto dai log, non verificato sul router.
- Endpoint visti in circa 3,5 giorni di log:
  - `POST /Api/InviaConsegnaAsportoComandaResponse`: inserisce l'ordine (55 il 23/10, 68 il 24/10, 56 il 25/10). Il corpo contiene tipo comanda, dati di asporto (tipo consegna, pagata, origine, ora, note, `ExtOrderId`, importo, zona, spese di trasporto), cliente, righe con porzioni e varianti, pagamenti prenotati. Il PC risponde con l'`idComanda` creato.
  - `GET /Api/StatoAppSelfOrder` (polling continuo), `InformazioniInizialiApp`.
  - Clienti: `ClienteGetCliOrContById`, `ClienteAddOrUpdate`, `ClienteGetClientiByDTOSearch`.
  - Consegne: `OrdineInConsegna`, `OrdineConsegnato`, `DissociaOrdineDaPony`.
  - Fedeltà: `Tessera/*`, `TransazioneTessera/GetBy` (molto frequente).
- Glovo, Deliveroo e Just Eat entrano dallo **stesso endpoint** dell'app propria, con origine «App». Il percorso è confermato da Edoardo: Glovo / Deliveroo / Just Eat → Deliverect → cloud di web-app.it → PC di cassa (porta 9000) → database.
- Gli ordini di Deliverect risultano sempre «PAGATA CON PAYPAL»: è il pagamento predefinito che il cloud assegna, **non** il metodo usato dal cliente.
- Secondo client: il palmare «EasyPosMobile 22.0.12» sulla LAN, `192.168.1.18:9000`.
- `ping-executer` chiama `service.web-app.it/pluto-server/public/api/negozi/ip-address?port=9000` per dichiarare l'IP pubblico. L'ultimo log è del 18/09/2023 (allora l'IP era 93.61.19.81). Oggi è disabilitato, eppure l'IP 93.39.252.83 è sempre quello: probabilmente è fisso o registrato altrove.
- **Deliverect**: nessuna occorrenza di «deliverect» in 9.960 file di testo di `C:\2BIT` né nel database. Sul PC non c'è un'integrazione diretta: Deliverect parla solo con il cloud del fornitore.

## Tema 2 — Stampanti

### Configurazione del 2Bit (tabella `PIZ_tabStampanti`)

- **id 3 «PIZZERIA»**: `192.168.1.12:9100`, tipo 0 = TM-88 in ESC/POS raw. Stampa le comande (`isStampaComande = 1`). Il palmare la vede.
- **id 4 «FP81/90»**: `192.168.1.200:9100`, tipo 4 = fiscale MF/RT, modello FP81/90, protocollo LAN, `isStampaScontrini = 1`. Quasi certamente un Epson FP-81 II RT (nel setup c'è `SetupEpsonFpSuite_2.1.0.exe`, e le matricole RT iniziano con «99IE»). Non verificato sulla stampante. Il collegamento con la cassa (`tabCasse`) è vuoto.
- **id 5 «ASP»**: IP 0.0.0.0, tipo TM-88, stampa fatture e preconti. Il nome coincide con una stampante Windows USB, quindi probabilmente usa il driver di Windows.
- **Centri di produzione**: «Asporto» (predefinito) e «Pizzeria». Nessuno dei due ha stampante associata, e le 23 categorie non hanno un centro. **Di fatto non c'è instradamento per reparto: tutte le comande vanno alla PIZZERIA.** Non esistono reparti cucina o bar separati.
- **Scontrini**: 1.332 negli ultimi 30 giorni, tutti con dati RT (numero, chiusura, matricola). L'ultimo è del 26/10 alle 22:50. Il gestionale emette lo scontrino direttamente sulla fiscale in LAN.
- Dati fiscali in `tabImpostazioni`: partita IVA 12788191000, regime RF01, `idPagamentoJustEat = 1`.
- `setting.rdb` (Access locale) contiene solo vecchi valori (`\\alessandro\prt100`, «PRT100 Paolo», regole disattivate). `POSPrinters.mdb` è vuoto.

### Windows

- **PIZZERIA**: driver «Generic / Text Only», porta RAW `192.168.1.12:9100`.
- **ASPORTO** e **ASP**: driver «EPSON TM-T88V Receipt5», porta USB `ESDPRT001`. È una TM-T88V collegata via USB al PC. Sono presenti anche le utility TM-T88V e un popup coupon Epson che parte all'avvio.
- Altre: Brother QL-810W (etichette, porta WSD), AnyDesk Printer, PDF, XPS, OneNote, Fax.
- Porte RAW orfane, senza stampante: `192.168.1.19:9100` e `192.168.1.20:9100`. C'è anche una porta LPR `PC_0-2979161C4F`.

### Ping (un pacchetto ciascuno)

- `192.168.1.12` (PIZZERIA): risponde, MAC `00-30-b8-2c-b1-00`.
- `192.168.1.200` (fiscale): risponde, MAC `38-1a-52-07-fa-45`. Il prefisso sembra Seiko Epson, non verificato.
- `192.168.1.19`: risponde, MAC `58-9e-c6-68-a8-e5`. Dispositivo sconosciuto.
- `192.168.1.20`: non risponde.

### Rete del PC

- Scheda Realtek GbE con IP statici `192.168.1.18/24` e `192.168.15.2/24` (seconda rete, scopo ignoto). Gateway `192.168.1.253`, DNS `85.18.200.200`, DHCP disattivato.
- `arp -a` di notte: `.2`, `.12`, `.19`, `.200`, `.253` (gateway).

## Cosa resta incerto

1. Il modello esatto della fiscale. Nel database è «FP81/90» con protocollo LAN 9100, ma la stampante non è stata interrogata.
2. Cos'è `192.168.1.19`, che risponde al ping, e cos'è la rete `192.168.15.x`.
3. Se «ASP» (IP 0.0.0.0) stampa davvero sulla TM-T88V USB.
4. Il 2Bit principale era chiuso: non si è vista una stampa in diretta.
5. Il port forwarding della 9000 sul router: dedotto dagli IP nei log, non verificato.

## Rischi da sistemare (non urgenti per il lancio, ma da chiudere)

- La porta **9000** del gestionale è esposta su Internet.
- La password di `sa` sta in chiaro in «Backup SQL datetime-webapp.bat», in `C:\2BIT\SETUP 2BIT\` e in `C:\2BIT\Main\TOOLS\`.
- Il backup sta solo sullo stesso disco.
- SQL Server 2008 R2 è fuori supporto.

## Implicazioni per la cassa nuova

- Gli ordini di app, sito e totem vanno progettati come canali distinti, non ricavati dalle note. La nostra cassa deve avere origine e piattaforma come campi veri.
- La comanda va instradata per reparto, cosa che il 2Bit non fa. Per noi è un'occasione, non un vincolo.
- La fiscale è un Epson in LAN sulla porta 9100: il protocollo va confermato sulla stampante fisica in negozio, con test, prima di inviarle scontrini veri.
- I marketplace passano da Deliverect → cloud del fornitore → cassa. Per spegnere Velocissimo, Deliverect deve puntare alla nostra cassa (il nostro `/api/deliverect/ordine` è pronto). Il canale e l'ID esterno vanno salvati in campi dedicati, non nelle note.
