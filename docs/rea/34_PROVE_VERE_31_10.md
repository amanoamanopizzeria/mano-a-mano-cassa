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
- **V** RT_numChiusura +1 al giorno fino al 25/10 (2514–2516), **+2 dal 26/10** (2518…2526): non spiegato (cambio
  d'ora del 25/10?). Edoardo guarda le Z di carta del 26–30/10.
- **D** Z verso le 23:30 (OrarioLocale_Chiusura 23:30, KILLPDASVR 23:32), da operatore o programmata: non si sa.
- Regole per noi: la Z non si ripete mai se la risposta si perde, prima si rilegge lo stato; mai scontrini, X o Z
  veri senza prova in negozio e l'ok di Edoardo; due programmi sulla stessa RT staccano i totali del 2Bit.

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
