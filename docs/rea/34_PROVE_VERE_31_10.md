# REA 34 — Le prime prove sulle macchine vere e cosa manca (31/10/2026, notte)

Fatto sul PC di cassa con l'ok di Edoardo (00:27–00:30Z), 2Bit solo in lettura. V = verificato, D = dedotto.

## Le macchine
- **V** PIZZERIA 192.168.1.12:9100 risponde «pronta» allo stato ESC/POS (DLE EOT).
- **V** ASP (stampante Windows «ASP», non il nome del driver): Windows dice «Normal».
- **V** Fiscale Epson FP-81 II RT 192.168.1.200: `POST /cgi-bin/fpmate.cgi` sulla porta 80 con l'accesso Basic
  (utente e password solo nel config.json del PC) risponde `success` a `queryPrinterStatus`.
  Stato letto: rtMainStatus 02, rtSubStatus 08, rtDailyOpen 0 (Z già fatta), rtFileToSend 0000,
  rtOldFileToSend 0000, **rtFileRejected 0008**, rtTrainingMode 0, rtExpiryCD 28/12/2028.
  Il significato di rtFileRejected non è nelle pagine pubbliche Epson lette (le guide fpMate/ePOS sono zip su
  scontrinosmart.it): **da chiedere al tecnico**, può voler dire 8 file di corrispettivi rifiutati.
- **V** `agente.mjs --prova`: pagina PROVA inviata a PIZZERIA e ASP alle 01:33 (ora del PC). Esito sulla carta: si
  aspetta la foto di Edoardo.

## Comande nel 2Bit
- **V** PIZ_tabRegole: 21 categorie su 23 hanno centro 2 (Asporto) + copia su centro 3 (Pizzeria), tutti i giorni;
  COPERTO e *GESTIONALE* senza regola. Righe 30 giorni: 6.151 con copia, 1.657 senza.
- **D** CDP 2 = ASP, CDP 3 = PIZZERIA (idStampante vuoto: lo conferma la foto).
- **V** PIZ_Messaggi è solo un segnale (ORDER_EXT, STAMPAOK, KILLPDASVR 23:32): il server di stampa VB6 rilegge dal DB.
- Mancano: disegno della comanda e codepage (servono le foto di una comanda vera, cucina e asporto).
- La regola dei tempi di stampa è di Edoardo (00:30Z) ed è già in `coda_stampa` (mig. 0058): Glovo, Deliveroo,
  banco e tavoli subito; domicili, ritiri nostri e Just Eat mezz'ora prima del loro quarto d'ora.

## Scontrino e Z
- **V** Gli scontrini veri li fa la cassa VB6 (EpsonFP2.ocx, socket TCP), non la via Totem .NET letta prima: quella
  via non è una specifica provata. 44 scontrini su 44 del 30/10 hanno i campi RT salvati in TabTestateScontrini.
- **V** EpsonParametri.ini: IVA 10 → reparto 2. Il 30/10 tutte le 162 righe al 10 %.
- **V** RT_numChiusura +2 al giorno **spiegato** (01:25Z, letto nella cartella della stampante): il 2Bit lancia
  **due Z** a 64 s di distanza, la seconda vuota (0 documenti, 0,00 €), il 15, 16, 17, 21 e dal 25 al 30/10; una
  sola il 18, 19, 20, 22, 23, 24. Non è il cambio d'ora: orologio della stampante = orologio del PC. Ipotesi: la
  cassa VB6 riprova PrintZReport dopo un timeout di ~60 s (da verificare con Ghidra). Gli **8 file rifiutati**
  sono di febbraio–marzo 2022 (FAIL-406/403): niente di recente, tutti gli invii OK.
- **V** La Z del 30/10 (n. 2526, 23:30): 1.075,73 € in 44 documenti, contanti 81,20, elettronico 994,53, IVA 10 %
  su 977,94 = 97,79, esito Agenzia OK. Torna con gli scontrini del database.
- **V** La stampante pubblica da sola in HTTP (GET): `www/dati-rt/<AAAAMMGG>/`, elenco «Index of» con tre file
  per Z, `<matricola>-<AAAAMMGG>T<hhmmss>-<numero Z>-{CORRISP.xml, ESITO-<id>.xml, ZREPORT.txt}`; `ZREPORT.txt`
  è la Z com'è stampata (46 colonne, importi all'italiana); `www/logs/rt_log.txt` registra solo le trasmissioni
  («Trasmissione Dati (…-2522-CORRISP.xml)… Esito OK»), è corto e ruota: non è uno storico. L'agente di stampa
  la legge con `--z` (`agente-stampa/zreport.mjs`). ⚠️ Risponde **anche senza utente e password**: chiunque in
  LAN legge i corrispettivi. Da dire a Edoardo come rischio minore della rete del negozio.
- **V** Z lanciata dallo staff fra le 22:54 e le 23:30, nessuna attività pianificata.
- Regole per noi: la Z non si ripete mai se la risposta si perde, prima si rilegge lo stato (`src/lib/fiscale/
  stato-rt.ts`); mai scontrini, X o Z veri senza prova in negozio e l'ok di Edoardo; due programmi sulla stessa
  RT staccano i totali del 2Bit.
- Preconto o scontrino lo **sceglie chi sta in cassa** (Edoardo, 01:29Z): due tasti normali, nessuna logica
  automatica in nessuna direzione.

## Conti del 30/10 (V)
Carta online 423,42 ritiri + 333,81 domicili; POS tavoli 79,50, ritiri 87,60, banco 70,20; contanti ritiri 33,20,
banco 48,00; preconti domicili in contanti 281,07. Totale 1.356,80. Nel CSV «Contanti alla consegna» 329,07 =
281,07 (10 domicili) + 48,00 (3 banco).

## Tavoli
- **V** PIZ_tabTavoliUniti: coppie «unito → principale» (7→6, 9→8, 10→9); coperti obbligatori (16/16).
- Da noi (mig. 0086, 2a3fdad): si trascina un tavolo sull'altro o «Unisci», il gruppo sta sul tavolo aperto, i
  coperti si chiedono sempre, anche da /cassa/nuovo.

## Copiatore e analisi
- Impronta della chiave nel database (00:35Z); `-Prova` legge 55 ordini delle ultime 12 ore.
- Il PC ferma l'invio vero perché porterebbe fuori i dati dei clienti: da b0d22e8 senza `"datiClienti": true`
  escono solo gli ordini. La scelta è di Edoardo.
- Ghidra 12.2 + JDK 21 sul PC (fonti ufficiali, solo a negozio chiuso, solo copie): i cinque binari VB6 sono
  compilati in nativo, quindi leggibili. Il lancio lo fa Edoardo a mano.
