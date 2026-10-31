# REA 33 — I canali degli ordini e il codice del 2Bit (notte 30–31/10/2026)

Letto sul PC di cassa: solo SELECT con l'utente Windows, i log solo per percorsi e conteggi, ILSpy sulle DLL .NET.
Nessun programma del 2Bit avviato, nessuna scrittura. V = visto, D = dedotto. Il report completo, con l'inventario,
è sul PC (`Desktop\REA-2bit\REA-2bit.md`). Qui c'è quello che serve per decidere.

## La scoperta: web-app.it è il centralino

**Tutto arriva da web-app.it (V):**
- l'AppServer del 2Bit ha un solo client esterno, «webapp»;
- il 30/10 ci sono stati 42 POST `Api/InviaConsegnaAsportoComandaResponse`, cioè i 42 ordini con `OrigineComanda=1`;
- da web-app.it arrivano anche i 22 `OrdineInConsegna` e i 22 `OrdineConsegnato`. Quindi l'app rider attuale passa da
  web-app.it (D).

**Cosa vuol dire:** app, sito, Glovo, Deliveroo e Just Eat (via Deliverect) entrano nel 2Bit tutti dalla stessa porta.
Per staccarsi da Velocissimo, il collegamento da sostituire è web-app.it, non il 2Bit.

## Capitolo per canale

1. **App iOS/Android e sito:**
   - stessa strada: prima `ClienteGetCliOrContById` / `ClienteAddOrUpdate`, poi il POST dell'ordine, poi il
     messaggio `ORDER_EXT` al server di stampa (V);
   - il # del CSV di Velocissimo è `ExtIdOrdine − 1` (V);
   - il pagamento Nexi è scritto nelle note, con `isPagata=1` (V);
   - fedeltà: `Api/TransazioneTessera`, con 1.597 GET e 1 POST il 30/10 (V); i coupon vengono da pluto-server;
   - **app e sito nel 2Bit non si distinguono:** lo sa solo web-app.it (D).
2. **Deliverect (Glovo, Deliveroo, Just Eat):**
   - passa da web-app.it: stesso client, stessa origine, stessa numerazione `ExtIdOrdine` (D forte);
   - piattaforma, pickup code e PayPal stanno solo nelle note (V);
   - sconti in `ExternalTipoSconto` / `ExternalSconto` (V);
   - l'annullo da una piattaforma non è stato osservato.
3. **Telefono:**
   - il percorso è modem COM4 → `GestoreChiamate.ocx` → `PIZ_tabChiamateRicevute` (V);
   - `Processed=1` sono le chiamate seguite da un ordine entro 5 minuti (4 su 6 il 30/10);
   - origine 4, `ExtIdOrdine` 0.
4. **Banco e cassa:** sono VB6, quindi non decompilabili. Nel database risultano origine 0, tipo 2, `ExtIdOrdine` 0 (V).
5. **Tavoli:**
   - 16 tavoli, coperti obbligatori su tutti, coperto come riga normale (V);
   - `PIZ_tabTavoliUniti` esiste (3 righe) e la planimetria è vuota;
   - i conti separati non sono stati osservati.
6. **Totem:** 0 ordini con origine 5 in tutto lo storico. Il codice c'è, ma non è mai stato usato dal 2Bit (V).

## Il sistema (V)

**Porte in ascolto:** 80, 9000 (AppServer), 7070 (AnyDesk), 2291, 135/139/445.

**Accesso remoto:** AnyDesk e RustDesk sono attivi.

**Job dell'AppServer:** ogni minuto categorie, SMS e produzione; altri di notte alle 3, 4, 5, 6 e 7.

⚠️ **Rischio da segnalare al tecnico, non nostro da cambiare:** l'AppServer è raggiungibile da internet sulla
porta 9000 in HTTP non cifrato, con token validi 365 giorni (`AllowInsecureHttp`).

## Ultimi 30 giorni, per canale (V; app e sito uniti)

1.492 voci per 36.449,53 €, tavoli compresi.

| canale | ordini | € | medio |
|---|---|---|---|
| Glovo | 460 | 10.586,58 | 23,01 |
| Deliveroo | 206 | 4.714,80 | 22,89 |
| Just Eat | 121 | 2.803,70 | 23,17 |
| App + sito | 449 | 12.108,00 | |
| Cassa | 134 | 2.288,85 | |
| Telefono | 69 | 1.741,70 | |
| Tavoli | 49 | 2.205,90 | |

**Le piattaforme** fanno 787 ordini e 18.105,08 €, circa metà dell'incasso.

**I tempi:**
- picchi alle 20:00, 20:30 e 20:45;
- i giorni più forti sono sabato, venerdì e domenica;
- il viaggio del rider dura 12–15 minuti;
- l'arrivo è 11–17 minuti dopo l'orario promesso.

**Dubbi:**
- 42 ordini app/sito risultano di tipo banco;
- Glovo e Deliveroo risultano tutti ritiri: torna col CSV, ma va confermato.

## Cosa cambia per la cassa nuova (Edoardo, 31/10 00:14Z)

Si resta in parallelo «finché non siamo abbastanza sicuri… quindi tra parecchio tempo». Si sviluppa:

1. **Fatto:**
   - la home dello staff è «Cassa — ordini» (`src/lib/home.ts`);
   - l'elenco delle pagine e il cruscotto sono solo per l'admin.
   - Il cruscotto è chiuso solo nella pagina: la funzione `cruscotto()` risponde ancora anche al ruolo cassa.
     Chiuderla anche nel database è una migrazione, da fare col suo ok.
2. **A fine serata, allo staff:** solo il CSV uguale a quello di Velocissimo, a 40 colonne. Il formato vero, visto
   sul file del 30/10, è questo:
   - virgola come separatore, tutti i campi fra virgolette;
   - UTF-8 senza BOM, righe che finiscono con LF, a capo anche dentro le note;
   - decimale col punto, data dd/MM/yyyy;
   - «Cliente» compare due volte, e c'è «Coperti asporto».
   Il nostro `export-ordini.ts` scrive «Coperti» e chiude le righe con CRLF: va allineato, provando prima col
   parser dell'OS.
3. **In cassa lo staff vede:** le prossime consegne e dove sono i rider.
4. **L'app rider:** il 2Bit non ha la posizione GPS, quindi «dove sono i ragazzi» arriva dalla nostra app rider
   (`/rider`, e `app-rider/` per Android).
   Le regole del 2Bit da rispettare (V):
   - si assegna solo un domicilio, senza un rider già assegnato, in una zona coperta dal rider
     (`PIZ_tabPony_ZoneCoperte`);
   - il rider in consegna è nello stato 2;
   - quando non ha più ordini aperti nelle ultime 3 ore passa a «rientro» (stato 3);
   - il pony «banco» non è un rider.

## Il CSV di fine serata, allineato al file vero (31/10)

Il nostro `export-ordini.ts` ora scrive «Coperti asporto», la colonna che il parser dell'OS legge davvero (prima i
coperti si perdevano), e chiude le righe con LF come Velocissimo.

La prova è `scripts/prova-csv-formato.mts <file vero>`: confronta intestazione, BOM e a capo, e passa il file al parser
vero di mano-a-mano-os. Il file vero non sta nel repo perché ha dati dei clienti.

Col file del 30/10 il parser dell'OS dà:
- 54 ordini, 1.356,80 €;
- sala 79,50, Glovo 268,02, Deliveroo 168,30, Just Eat 87,70;
- POS 237,30, contanti 362,27;
- 114 coperti.

Sono i numeri che la nostra serata copiata dovrà ridare. `scripts/prova-csv-os.mts` dà ancora l'esito del 24/10.
