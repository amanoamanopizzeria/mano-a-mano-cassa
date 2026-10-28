# Agente delle chiamate — A Mano A Mano

Fa aprire da sola la scheda del cliente nella cassa nuova quando squilla il telefono, **senza togliere
niente al 2Bit**. Il modem USB resta del 2Bit, che continua a lavorare come prima. L'agente legge, in
sola lettura, la tabella dove il 2Bit salva già ogni chiamata (`PIZ_tabChiamateRicevute`).

**Non è acceso.** Si accende solo dopo l'ok di Edoardo per l'utente di sola lettura su SQL Server.

## Perché funziona

Verificato sul PC il 28/10/2026, in sola lettura (REA 30 §30.5, P3):
- la riga nasce **allo squillo**, entro 1 secondo dal «CallerID detected» del modem;
- l'ordine telefonico arriva 11–30 secondi dopo;
- nei giorni guardati non c'erano numeri vuoti o nascosti.

L'agente:
- guarda la tabella ogni 1,5 secondi e manda ogni riga nuova a `/api/telefono/chiamata`, con la chiave `TELEFONO_KEY`;
- non rimanda lo storico, e una chiamata di più di 2 minuti fa non apre la scheda;
- non ha credenziali Supabase;
- non scrive nel registro i numeri di telefono.

## Accenderlo sul PC

1. **L'utente di sola lettura** su SQL Server (`localhost\DUEBIT`), con `SELECT` solo su quella tabella. Lo crea chi ha l'ok di Edoardo, mai con la password di `sa` scritta da qualche parte:

       CREATE LOGIN LETTORE_CHIAMATE WITH PASSWORD = '…', CHECK_POLICY = ON;
       USE DD_AMANOAMANOPUGLIESE;
       CREATE USER LETTORE_CHIAMATE FOR LOGIN LETTORE_CHIAMATE;
       GRANT SELECT ON dbo.PIZ_tabChiamateRicevute TO LETTORE_CHIAMATE;

2. Copiare la cartella `agente-chiamate` sul PC.
3. Copiare `config.esempio.json` in `config.json` e scrivere la password vera **solo lì**.
4. Scrivere la chiave in `chiave.txt`: è la stessa di `TELEFONO_KEY` su Vercel. Mai in chat, mai su GitHub.
5. **Prova** (non manda niente): `powershell -ExecutionPolicy Bypass -File chiamate.ps1 -Prova`. Deve dire quante chiamate ci sono e qual è l'ultima.
6. **Acceso**: `powershell -ExecutionPolicy Bypass -File chiamate.ps1`. Per farlo partire da solo: Utilità di pianificazione di Windows, «All'accesso», con lo stesso comando.

## Spegnerlo

Si chiude la finestra, o si toglie l'attività pianificata. Il 2Bit non se ne accorge.
