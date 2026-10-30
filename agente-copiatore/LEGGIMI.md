# Copiatore del 2Bit — A Mano A Mano

Manda alla cassa nuova una **copia** di ogni ordine che entra nel 2Bit: app iOS/Android, sito, piattaforme, banco.
Parte appena l'ordine entra e riparte ogni volta che cambia (stato, righe). Così vediamo da noi, in tempo reale,
tutto quello che vede il 2Bit, e possiamo confrontare sera per sera. I ragazzi continuano a lavorare solo sul 2Bit.

- **Sola lettura.** Legge con un utente SQL che può solo leggere. Le query in `config.json` devono essere `SELECT`,
  altrimenti l'agente non parte. Non scrive nel 2Bit e non stampa.
- **Sono copie.** Finiscono in `copia_2bit` (mig. 0083), non in `ordine`. Quindi non stampano, non occupano i quarti
  d'ora e non entrano nei conti o nel CSV per l'OS: niente doppioni.
- **La chiave non esce dal PC.** `nuova-chiave.ps1` la crea in `chiave.txt` e stampa solo l'impronta SHA-256, che va
  nel database. La stessa chiave serve all'agente delle chiamate (`agente-chiamate/`), che va bene anche senza
  `TELEFONO_KEY`.
- **Niente dati personali nel registro.** Nomi e telefoni vanno solo alla cassa.

## Accenderlo sul PC

1. **L'utente di sola lettura** su SQL Server (`localhost\DUEBIT`), con `SELECT` solo sulle tabelle degli ordini.
   Lo crea chi ha l'ok di Edoardo, mai con la password di `sa` scritta da qualche parte:

       CREATE LOGIN LETTORE_ORDINI WITH PASSWORD = '…', CHECK_POLICY = ON;
       USE DD_AMANOAMANOPUGLIESE;
       CREATE USER LETTORE_ORDINI FOR LOGIN LETTORE_ORDINI;
       GRANT SELECT ON dbo.PIZ_tabTestateComande TO LETTORE_ORDINI;   -- e le altre tabelle lette dalle query

   (Se c'è già `LETTORE_CHIAMATE`, si può dare a lui il `SELECT` in più.)
2. Copiare la cartella `agente-copiatore` sul PC, poi copiare `config.esempio.json` in `config.json`. Lì vanno la
   password vera e le query con le colonne vere del 2Bit: contano solo gli alias, `AS id_2bit` è obbligatorio.
3. `powershell -ExecutionPolicy Bypass -File nuova-chiave.ps1`: crea `chiave.txt` e stampa l'impronta.
   L'impronta va nel database (`impostazione_riservata`, chiave `agente_pc_key_sha256`). Copiare `chiave.txt`
   anche nella cartella dell'agente delle chiamate.
4. **Prova** (non manda niente): `powershell -ExecutionPolicy Bypass -File copiatore.ps1 -Prova`. Deve dire quanti
   ordini ci sono nelle ultime ore e mostrare l'ultimo come partirebbe, senza nomi né telefoni.
5. **Acceso**: `powershell -ExecutionPolicy Bypass -File copiatore.ps1`. Per farlo partire da solo: Utilità di
   pianificazione di Windows, «All'accesso», con lo stesso comando.

## Spegnerlo

Si chiude la finestra, o si toglie l'attività pianificata. Il 2Bit non se ne accorge.
