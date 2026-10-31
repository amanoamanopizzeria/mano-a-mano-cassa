# Agente di stampa — A Mano A Mano

Gira sul PC della cassa e manda le comande alle stampanti di rete. **Non è ancora acceso in negozio**:
si accende solo il giorno della prova in parallelo, deciso da Edoardo.

## Come funziona

1. Ogni 3 secondi chiede al server della cassa (`/api/stampa/coda`) le comande da stampare, con la
   sua chiave (`STAMPA_KEY`). Non ha credenziali Supabase.
2. Il server gliele manda già pronte in ESC/POS, una copia per stampante. Le copie sono **complete
   e uguali** (righe per reparto, telefono, via, totale, pagamento e resto: Edoardo, 25/10/2026, così
   una comanda persa si ritrova dall'altra); in fondo dicono «copia cucina» o «copia cassa».
3. L'agente le manda alla porta 9100 di ogni stampante di rete, o allo spooler di Windows per quelle USB. Quando tutte le hanno prese, lo dice al server
   (`/api/stampa/fatta`) e l'ordine risulta stampato.
4. Se una stampante è spenta, l'agente lo scrive una volta e riprova da solo; l'altra non ristampa.
5. Una comanda modificata dalla cassa torna in coda da sola ed esce con «MODIFICATA - RISTAMPA», le
   righe NUOVA e le TOLTE. Un preordine esce 30 minuti prima della sua ora.

Il disegno della carta sta in `src/lib/stampa/escpos.ts`: si cambia lì e arriva col deploy, senza
toccare il PC del negozio.

## Provare senza la coda

- `node agente.mjs --stato` legge lo stato di ogni stampante (ESC/POS «DLE EOT») e della fiscale
  (`queryPrinterStatus`) **senza stampare niente**: nessun foglio, nessuno scontrino.
- `node agente.mjs --prova` stampa una pagina PROVA su ogni stampante comande, mai sulla fiscale.

Nessuno dei due chiede la chiave né parla col server. In `windows` va il **nome della stampante** in Windows
(«ASP»), non quello del driver («EPSON TM-T88V Receipt5»). Se la fiscale risponde 401, utente e password
vanno in `"fiscale": { "ip": …, "utente": …, "password": … }`, solo nel `config.json` del PC.

## Le stampanti (Edoardo, 24/10/2026)

Due stampanti comande (una Epson, l'altra forse Ditron) e una fiscale Epson, **tutte in LAN**. La
fiscale NON passa da qui: lo scontrino è un lavoro a parte (serve il modello esatto). Mancano gli
indirizzi IP: si leggono dal foglio di prova della stampante (su molte Epson: tenere premuto FEED
all'accensione) o dal pannello del router.

## Le stampanti vere (PC di cassa, letto il 27/10/2026, REA 27)

- **PIZZERIA**: in rete, `192.168.1.12`, porta 9100 → `"ip": "192.168.1.12"`.
- **ASP**: Epson TM-T88V **via USB** al PC, non in rete → `"windows": "<nome>"`, col nome esatto che ha in
  Windows: il 27/10 era «EPSON TM-T88V Receipt5» (REA 29; ricontrollare con `Get-Printer | Select Name`). L'agente manda i byte allo spooler di Windows in modo
  RAW con `stampa-windows.ps1`: la carta esce uguale a quella della PIZZERIA, e il 2Bit può continuare a
  usarla (lo spooler mette in fila). Niente da installare e nessuna impostazione cambiata.
- Edoardo, 30/10/2026: **la stessa comanda su tutte e due**, una doppia copia. È già così: le due copie sono
  complete e uguali, cambia solo «copia cucina» / «copia cassa» in fondo.

## Accenderlo sul PC (il giorno della prova)

1. Installare Node.js 18 o più nuovo (nodejs.org, versione LTS).
2. Copiare la cartella `agente-stampa` sul PC.
3. Copiare `config.esempio.json` in `config.json` e scrivere gli IP veri. `colonne`: 48 sulle 80 mm
   Epson; se le righe vanno a capo male, 42.
4. Scrivere la chiave in `chiave.txt` (la stessa di `STAMPA_KEY` su Vercel). Mai in chat, mai su GitHub.
5. Prova: `node agente.mjs --prova` → esce un foglio «PROVA» da ogni stampante.
6. Acceso: `node agente.mjs`. Per farlo partire da solo: Utilità di pianificazione di Windows,
   «All'accesso», programma `node`, argomento il percorso di `agente.mjs`.

**Prima di accenderlo in negozio**: spegnere la stampa automatica dal browser in `/cassa` (se no
ogni comanda esce due volte) e controllare la coda: al primo avvio stampa tutto quello che nelle
ultime 18 ore non risulta stampato.

## Prove senza negozio

    npx --yes tsx scripts/prova-stampa.mts          # la carta, in testo
    npx --yes tsx scripts/prova-agente-stampa.mts   # agente vero, due stampanti finte, server finto
