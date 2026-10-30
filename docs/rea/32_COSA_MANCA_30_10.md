# REA · 32. Cosa manca per essere bravi quanto Velocissimo, e meglio (30/10/2026, bozza delle 09:30)

*Edoardo, 30/10/2026 02:36–02:43Z: «REA di tutto il sistema sul PC cassa: collegamenti, stampante fiscale,
stampante delle comande, come prendere gli ordini, come avere il numero dei clienti… andiamo per step»;
«devi essere almeno bravo quanto Velocissimo; sostituirlo è un passo successivo». Questo capitolo **aggiorna il
REA 30** (28/10). Il PC di cassa si studia oggi in sola lettura (report sul PC in
`C:\Users\Utente\Desktop\REA-2bit\REA-2bit.md`). I capitoli del PC (§32.4–32.8) si riempiono man mano che il
lavoro sul PC finisce.*

> **Regole del lavoro di oggi.** Il 2Bit resta in sola lettura: niente scritture, niente servizi fermati,
> nessun exe avviato, nessuna stampa né scontrino, nessuna X o Z. Nessun segreto nei documenti, clean-room
> (si descrive, non si copia il codice di 2Bit o Velocissimo). L'interfaccia della cassa non si tocca finché
> non la rifacciamo insieme (decisione del 30/10 03:38Z).

## 32.0 In breve

- **Il parallelo vero è a un passo:** il copiatore degli ordini del 2Bit è pronto, e così le chiamate e la stampa
  USB. Manca una sola cosa, sul PC: un **utente SQL che possa solo leggere** gli ordini (scelta chiesta a Edoardo
  il 30/10 alle 09:08).
- **Dal 28/10 sono pronte, e spente finché il database non le accende**, le risposte di Edoardo del 30/10:
  - correggere un ordine chiuso (solo admin, con motivo);
  - il conto diviso, i buoni pasto e Satispay;
  - l'accesso col PIN;
  - le foto del menù nel nostro spazio.

  Serve **un solo ok** per tutte le bozze in `supabase/da_decidere/`.
- **Per spegnere Velocissimo** restano quelle del REA 30 §30.9 B: scontrino fiscale, Deliverect, punti e coupon,
  pagamento online, avvisi e push, app negli store, l'OS che legge la cassa.
- **Sull'interfaccia** il 30/10 notte Edoardo ha chiesto Home, Dashboard e sala; poi ha fatto annullare tutto per
  rifarlo con calma insieme (memoria `home-e-dashboard-30-10`). Restano solo i tasti Home/Indietro e il salvataggio
  ritardato dei −/+.

## 32.1 Cosa è cambiato dal REA 30

| Voce del REA 30 | Era | Adesso | Dove |
|---|---|---|---|
| C1 Correggere un ordine chiuso | mancante | **pronto, spento** | tasto «Correggi» in `/cassa` (solo admin); `da_decidere/correzione_ordine_chiuso.sql` (fa admin Edoardo) |
| C2 Ricerca nella lista ordini | mancante | **fatto** | la lente in `/cassa` (`ab83b54`) |
| C3 Lista delle chiamate | parziale | **fatto** | `/cassa/chiamate` |
| C4 Più pagamenti, buoni pasto, Satispay | mancante | **pronto, spento** | sala → «Diviso o altro»; `da_decidere/pagamenti_divisi.sql` |
| C5 «Chiusi» senza annullati | parziale | **fatto** | `ab83b54` |
| D4 Utenze rider e postazioni | mancante | **PIN pronto, spento**; le utenze le crea Edoardo | `/login` «Con il PIN», `/cassa/pin`; `da_decidere/accesso_pin.sql` |
| P2 La ASP è USB | mancante | **fatto nel codice** | `agente-stampa/stampa-windows.ps1` (stampa grezza su una stampante di Windows) |
| P3 Numero di chi chiama | codice spento, serviva `TELEFONO_KEY` sul PC | **più semplice**: la chiave la crea il PC e non esce dal PC | mig. 0083 `segna_chiamata_pc`; `agente-copiatore/nuova-chiave.ps1` |
| P5 Agente lettore (copiatore) | da costruire | **pronto**: database, API, agente | mig. 0083 `copia_2bit`; `/api/copia-2bit`; `agente-copiatore/` |
| K4 Foto del menù | D17 | **sì di Edoardo**; script pronto, 120 foto copiate sul Mac (commit locale `e81ba35`, da portare su GitHub) | `scripts/copia-foto-menu.sh`, `da_decidere/foto_menu_nostre.sql` |
| K5 IVA | D14 | **risposta: tutto al 10 %**, ed è già così su tutti i 206 prodotti | — |

Risposte di Edoardo del 30/10 che chiudono domande del REA 30:
- **D1:** i ragazzi usano solo il 2Bit; la cassa nuova guarda in parallelo (chiamate e copia degli ordini), senza doppia battitura;
- **D4:** PIN di 4 cifre;
- **D8:** contanti, POS e conto diviso, più buoni pasto e Satispay;
- **D14:** IVA al 10 %;
- **D17:** le foto si possono copiare;
- **D20:** la stessa comanda su PIZZERIA e ASP;
- **D25-1 / D26-6:** il programma in sola lettura sul PC va bene («tu lo puoi già accendere»).

## 32.2 Il copiatore degli ordini (come funziona)

1. Sul PC, `copiatore.ps1` fa ogni 5 secondi una `SELECT` degli ordini delle ultime 12 ore, con l'utente di sola
   lettura. Le query stanno in `config.json` e devono essere `SELECT`, altrimenti l'agente non parte.
2. Ogni ordine diventa una copia: le colonne principali (origine, tipo, numero, stato, totale, cliente, telefono,
   indirizzo, ora di consegna) più la riga intera e, se c'è la seconda query, le righe dell'ordine.
3. Si manda solo se l'ordine è nuovo o è cambiato (impronta dell'ultima copia), a gruppi di 100, a
   `/api/copia-2bit` con la chiave del PC.
4. Il database (`copia_2bit_salva`) controlla l'impronta della chiave e salva in `copia_2bit`: una riga per ordine
   del 2Bit, con il numero delle versioni. **Non è un ordine della cassa**: niente stampa, niente quarti d'ora,
   niente conti, niente OS.
5. Provato nel database il 30/10, in una transazione annullata: 2 nuove, poi 1 cambiata, chiave sbagliata
   rifiutata, serata col taglio delle 06.

**Per accenderlo (passi):**
1. l'utente SQL di sola lettura (scelta di Edoardo);
2. le due `SELECT` con le colonne vere del 2Bit (dal REA del PC, §32.4);
3. `nuova-chiave.ps1` e l'impronta nel database;
4. la prova con `-Prova`;
5. l'accensione;
6. stasera, il confronto.

**Ancora da fare:**
- dove vederle: una pagina «copie dal 2Bit» o un segno in `/cassa`. È interfaccia, quindi si decide con Edoardo;
- il confronto sera per sera (REA 30 D-3).

## 32.3 Le chiamate

Lo stesso PC, la stessa chiave. `agente-chiamate/chiamate.ps1` legge `PIZ_tabChiamateRicevute` (la riga nasce
allo squillo) e manda il numero a `/api/telefono/chiamata`. Il server ora accetta anche la chiave del PC, quindi
non serve copiare `TELEFONO_KEY` da Vercel. Serve il `SELECT` su quella tabella: oggi c'è `lettore_chiamate`, ma
la sua password non è sul PC in un file. Con l'utente nuovo di sola lettura si coprono anche le chiamate.

## 32.4 Ordini nel database del 2Bit — *in corso sul PC*

Istanza `.\DUEBIT` (SQL Server 2008 R2 Express), database `DD_AMANOAMANOPUGLIESE`. Login presenti: `sa`, l'utente
Windows `Utente` (sysadmin), `BUILTIN\Users`, `lettore_chiamate`. Le tabelle degli ordini **non sono ancora state
aperte**: con l'utente Windows (sysadmin) la sola lettura sarebbe una promessa, non un blocco. Si aspetta la scelta
di Edoardo.

Dal **modello dati** dentro `AppServer\bin\DueBit.ORM.dll` (nomi ed enum, non il database vivo, nessuna riga letta):
- `PIZ_tabTestateComande`: la testata degli ordini da asporto, domicilio e banco. Chiave `idConsegna`, numero
  `idComanda`, `DataCreaz`, `OrigineComanda`, `tipoConsegna`, `importoComanda`, `ragioneSociale`, `oraConsegna`,
  `idPony` (il rider). Gli stati si leggono da `IsEliminata`, `Consegnata`, `isSospesa`; c'è anche `StatoConsegna`,
  da capire.
- `PIZ_tabComande`: le righe. Chiave `ID`, legate per `idComanda`; telefono e indirizzo sono qui
  (`telefonoAsporto`, `indirizzoAsporto`, `CivicoAsporto`). **I tavoli** sembrano stare solo qui (`idTipoComanda=0`,
  `idTavolo`).
- **OrigineComanda:**

  | Codice | Origine |
  |---|---|
  | 0 | FrontendSpeedy (la cassa) |
  | 1 | App |
  | 2 | Web |
  | 3 | Just Eat |
  | 4 | Telefono |
  | 5 | Totem |
  | 100 | Deliveroo |
  | 101 | Uber Eats |
  | 199 | Glovo |

  **Deliverect non compare** come origine: da capire.
- **tipoConsegna:** 0 ritiro, 1 domicilio, 2 banco.

Le due `SELECT` del copiatore sono in `agente-copiatore/config.esempio.json`. **Non sono ancora provate**. Da
verificare con `-Prova`:
- se `idComanda` si riusa nel tempo;
- cosa vuol dire `StatoConsegna`;
- come prendere anche i tavoli.

## 32.5 AppServer (porta 9000) e il flusso web-app.it / Deliverect → 2Bit — *in corso sul PC*

`ComandaService.InserisciComanda` dell'AppServer è il metodo che scrive le testate in `PIZ_tabTestateComande`: gli
ordini da fuori passano tutti da lì. Chi lo chiama, e da quale indirizzo, si vede solo col decompilatore.

## 32.6 Lo scontrino fiscale (Epson FP-81 II RT, 192.168.1.200) e la chiusura giornaliera — *in corso, solo studio*

Dai testi dentro i metodi dell'AppServer: solo metadati, senza decompilatore e senza eseguire niente.
- **Il canale è confermato.** Il 2Bit fa una `POST` a `http://{ip}/cgi-bin/fpmate.cgi`, `text/xml`, in SOAP. Il corpo è
  uno di tre: `printerFiscalReceipt` (scontrino), `printerFiscalReport` (rapporti X/Z), `printerNonFiscal`.
- **Prima di ogni stampa** chiede `queryPrinterStatus` e si ferma se la stampante è «in periodo inattivo».
- **L'annullo** controlla prima con il comando `directIO` 9205.
- Nel metodo dell'annullo c'è un valore fisso per l'accesso alla stampante: è un segreto, non si riporta.
- **Chi fa partire la Z non è nell'AppServer.** L'AppServer ha solo la strada del totem; la Z parte quasi certamente
  dal programma di cassa (VB6). Da capire con il decompilatore (scelta di Edoardo del 30/10).
- **La capacità per quarto d'ora** nel 2Bit la calcolano due stored procedure: `Speedy_ElencoFasceInfornataConZoneECarico`
  e `Speedy_ElencoFasceInfornataConCarico`.

## 32.7 Le comande (PIZZERIA 192.168.1.12:9100 e ASP USB «EPSON TM-T88V Receipt5») — *in corso sul PC*

## 32.8 Velocissimo: CSV del Sales Export Tool, dashboard web, rider — *in corso sul PC*

**Correzione importante:** il «Velocissimo Sales Export Tool» **non fa un CSV**. Manda le vendite in JSON a
`service.web-app.it` (sync-speedy-sales), ogni 5 minuti e una volta al giorno. La dashboard di Velocissimo sta su
web-app.it, non sul PC. Per confrontare il formato del CSV di fine serata serve un CSV d'esempio scaricato da
Edoardo. Il nostro export a 40 colonne è stato fatto sull'export «/weborder» di Velocissimo (REA 15).

## 32.9 L'ordine dei lavori, per step

1. **Utente SQL di sola lettura** sul PC (scelta di Edoardo, 30/10).
2. **Copiatore e chiamate accesi**, confronto stasera: ogni ordine di app, sito e piattaforme deve entrare anche
   da noi, anche con più ordini insieme.
3. **Un ok per le bozze del database**: correzione ordine chiuso (e Edoardo admin), pagamenti divisi, PIN, foto.
4. **Stampa in negozio** (P1): IP della PIZZERIA già noto; `STAMPA_KEY` su Vercel e sul PC, o la chiave del PC
   anche per la stampa.
5. **Interfaccia con Edoardo, con calma:** Home a quarti d'ora, Dashboard analitica, sala con tavoli 1–15 uniti
   (bozza da proporre, non da costruire da soli).
6. **Scontrino fiscale:** dallo studio di oggi a una prova in negozio con Edoardo.
7. Poi REA 30 §30.9 B: Deliverect, punti e coupon, pagamento online, push, app, l'OS.

## Fonti

- Codice: ramo `claude/project-thread-9z7krm` e `main` a `3e31369`; migrazione 0083; `agente-copiatore/`, `agente-chiamate/`, `agente-stampa/`.
- Database (`tnuyeyqwoqhmgpskqtuq`): prova di `copia_2bit_salva` in una transazione annullata, 30/10.
- PC di cassa (sola lettura, 30/10 mattina): identità, login e database di SQL Server.
- REA 27, 29, 30; memoria del progetto (decisioni di Edoardo del 30/10).
