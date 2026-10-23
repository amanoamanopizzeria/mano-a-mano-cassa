# REA · 3. La cassa in negozio: 2Bit / DueBit (Velocissimo POS)

*Letto da `SETUP 2BIT.rar` (analisi statica, nessun eseguibile avviato), dal video «NUOVO VELOCISSIMO RISTO» (25/07/2026) e dalle foto della cassa scattate da Edoardo (`/mnt/project-files/analisi-2bit/foto`). Riunito il 23/10/2026.*

## 3.1 Cos'è

Un gestionale Windows per pizzerie, della software house **2Bit srl / DueBit**, venduto col marchio **Velocissimo** da **WEBAPP S.r.l.** (Napoli). Gira sul PC di cassa con **SQL Server 2008 R2** (istanza `LOCALHOST\DUEBIT`, database `DD_DATABASE`). Il cuore è `DueBit.WebApiOWINServer.exe`: un Web API locale sulla **porta 9000** che riceve gli ordini dal cloud e li scrive nel database.

| Pezzo | Cosa fa |
|---|---|
| `WebApp Installer.exe` | installa software, prerequisiti e SQL Server |
| `DueBit.WebApiOWINServer.exe` (`C:\2BIT\AppServer`) | Web API locale, porta 9000: riceve gli ordini |
| `ping-executer` | ogni tanto manda al cloud l'IP pubblico del negozio + porta 9000 (`service.web-app.it/pluto-server/public/api/negozi/ip-address?port=9000`) |
| `RestartOnCrash` | riavvia il Web API se cade |
| `NRG` + `MultiDriver.dll` | driver della stampante fiscale (Ethernet, `10.0.0.222:23`) |
| `USR5637Voice64bit.EXE` | driver TAPI del modem USR: **riconoscimento del numero che chiama** (il «modemino» sul PC) |
| `stats-pack` | ~30 report di vendita (categoria, fattorino, zona, origine) |
| script SQL | anagrafiche, azzeramento punti fidelity, viste statistiche |

## 3.2 Come arriva un ordine dall'app alla cassa

```
App cliente / sito / totem
        ▼
Cloud WebApp (service.web-app.it/pluto-server, url.velocissimo.app, admin.velocissimo.app)
        ▼  cerca «dov'è il negozio» nel registro IP tenuto da ping-executer
POS in pizzeria: Web API locale porta 9000 → SQL Server → cassa → comanda in cucina
        ordine marcato online=1 + ExtIdOrdine → origine «APP» nelle statistiche
```

Il punto debole è tutto qui: la cassa è un **server** che il cloud deve raggiungere a un IP dinamico, con port-forwarding, PC sempre acceso e un supervisore che riavvia il servizio. Nel sistema nostro la cassa è un **client** del cloud (si collega in uscita, come un sito): niente IP, niente port-forwarding, niente riavvii.

Origini ordine riconosciute dalle viste SQL: `APP`, `JUSTEAT`, `FOOD RACER`, `DELIVEROO`, `TELEFONATA`, `PC`.

## 3.3 Il modello dati del POS (ricostruito dalle viste e da `Prodotti.csv`)

Negozio/Magazzino · Prodotto (listino multi-prezzo e multi-formato, multilingua, flag per canale: App Camerieri, Self-Order, Totem, Web, con foto separata per canale) · Categoria/Gruppo · Cliente · Zona/Indirizzo · Comanda (testata `PIZ_tabTestateComandeBackup` + righe + variazioni) · Documento (scontrino, preconto) · Pagamento · Fattorino · Fidelity (tessere, transazioni, punti).

## 3.4 Cosa fa la cassa (dal video e dalle foto)

- **Listino per canale** cambiabile dalla cassa (Negozio, Just Eat, altre piattaforme): è la stessa cosa dei tre listini L1/L2/L3 del back-office.
- **Tavoli**: mappa sala, colore dopo un tempo (es. 1 ora dall'apertura), anteprima con coperti, tempo, storico, preconto.
- **Ordini** divisi per stato con colore del ritardo e tempo alla consegna; storico stati con orari; tasti WhatsApp e chiamata; annullo scontrino dall'ordine; **modifica di un ordine già scontrinato**.
- **Indirizzi** con Google Maps; **mappa rider** in tempo reale, assegnazione manuale del fattorino, percorso negozio → cliente.
- **Fasce a 15 minuti**, capacità separata consegne/produzione, **blocco manuale** di una fascia, **SOLD OUT** mostrato in app invece di nascondere la fascia.
- **Prenotazioni** in cassa e online, «Prenota con Google».
- **Fidelity**: card unica punti + credito prepagato, ricarica in cassa, coupon visibili.
- **Monitor cliente** (scontrino in corso, pubblicità quando è fermo), cassa automatica.
- **Stampante fiscale**: lo scontrino si emette **selezionando il pagamento (POS o contanti)**; il POS bancario non è collegato alla cassa (Edoardo, 22/10/2026).
- **Comande cartacee**: due stampanti (cucina + cassa); la cucina legge tutte le pizze su carta, divise per categoria (classiche, speciali, fritti, dolci). Nessuno schermo in cucina.
- Il video non dice quante pizze entrano in un quarto d'ora: la regola l'ha data Edoardo (1 pizzaiolo 10–12, 2 → 18–20, 3 → 35; una consegna a quarto d'ora per rider disponibile).

Le foto (`cassa-listino-tavolo.jpg`, `cassa-ordine.jpg`, `cassa-varianti.jpg`, `chiamata.jpg`, `scadenzario.jpg`, `totem-*.jpg`) mostrano: la griglia del listino con i tavoli in alto, la schermata dell'ordine con le righe e i totali, la scelta delle varianti a bottoni, la finestra della chiamata in arrivo col cliente riconosciuto, lo scadenzario, e il totem in verticale (avvio, menu a categorie, scheda prodotto).

## 3.5 Cosa prendiamo e cosa no

| Teniamo | Cambiamo |
|---|---|
| fasce a 15 min, SOLD OUT, blocco manuale | capacità contata sulle pizze dai pizzaioli del giorno, non a mano |
| cliente riconosciuto dal telefono, scheda con note fisse | la chiamata arriva dal centralino via webhook al cloud, non dal modem al PC |
| listini per canale | prezzi in una tabella sola per prodotto × listino (vedi 06_DATI) |
| stati ordine con orari | gli stessi stati, più chi li ha cambiati |
| comanda cartacea per reparto | stampa dal browser della cassa (`/cassa/comanda/[id]`), poi agente di stampa |
| scontrino scegliendo POS/contanti | Epson RT via ePOS, passo successivo |
| mappa rider, assegnazione manuale | «primo rider che rientra» come regola di casa (Edoardo) |
| fidelity punti + credito + coupon | stesso modello, vedi 01_BACKOFFICE §coupon |
| cassa come server da raggiungere | cassa come client del cloud |
| SQL Server 2008 e password `sa` nel .bat | Postgres gestito, RLS, chiavi solo su Vercel |
