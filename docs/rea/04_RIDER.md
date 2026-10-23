# REA · 4. I rider: app Velocissimo RIDER, borsello, mappa, report

*Letto il 23/10/2026 dalla scheda App Store di «Velocissimo RIDER» (id1311304274, WEBAPP s.r.l., versione 2.0.10 dell'8/9/2026, iOS 13+, 9,7 MB, solo inglese, 3,7 su 6 voti), dal back-office (`/riders-map`, `/riderreport`, `/deliveryzonegroup`, colonne degli ordini) e dalla Public API (`/borsello-rider`, `getRider`). Più le risposte di Edoardo sul mestiere.*

## 4.1 Come lavora la consegna oggi (Edoardo, 23/10/2026)

- La porta **il primo rider che rientra**: nessuna assegnazione a priori dalla cassa.
- Minimo d'ordine **10 €**, costo di consegna **per zona** (1,00 / 1,50 / 2,00 €), 16 zone a poligono.
- Il gruppo di zone LIMITAZIONE ammette **10 consegne contemporanee per fattorino** (è un tetto, non un vincolo reale).
- Pagamento alla consegna: contanti (il cliente dice con quanto paga, il rider porta il resto); il POS alla consegna è configurato ma spento.
- I rider delle **piattaforme** (Glovo, Deliveroo, Just Eat) ritirano al banco: per Velocissimo sono ordini «Ritiro». Il Just Eat consegnato da noi è «Domicilio».

## 4.2 L'app Velocissimo RIDER (dalla scheda ufficiale)

Il fattorino:
1. fa **login con username e password** (utente rider di Velocissimo; così la cassa tiene traccia delle consegne di ciascuno);
2. vede le **comande da assegnare** e **si assegna da solo la prima disponibile** (è esattamente il «primo che rientra»); dentro ha nome del cliente, telefono con tasto **CHIAMA**, indirizzo con tasto **NAVIGA**, punto vendita dove ritirare, dettaglio dell'ordine;
3. vede lo **storico delle comande in attesa di essere saldate alla cassa**: dopo il «dare-avere» in cassa le comande saldate spariscono dallo storico.

Permessi: posizione **anche in background** (da qui la mappa rider). Notifica push al nuovo ordine (recensione del 2020: «non arriva la notifica, devo ricaricare»). Il cliente in app vede il **tracciamento del rider** e riceve la push «Rider arrivato».

## 4.3 Il borsello (contanti in mano al rider)

Nella cassa 2Bit ogni rider ha un borsello: a fine serata fa il dare-avere. Nell'API `GET /borsello-rider` i movimenti sono:
- `tipo 1` **deposito**: il rider versa contanti in cassa;
- `tipo 2` **prelievo**: il rider ritira contanti dalla cassa (il resto da portare, il fondo);
- `fondoCassa` 0/1, `importo` sempre positivo, `cassa`, `riderId`, nome e cognome, note.

Contanti in mano al rider = prelievi − depositi. È lo stesso calcolo che mano-a-mano-os fa nella Chiusura (consegne, valore, già pagato online/POS, **contanti riportati = totale − già pagato**).

## 4.4 Cosa misura Velocissimo sui rider

**Report rider** (`/riderreport`), per rider e periodo: numero ordini consegnati, totale ordini consegnati, totale ordini già pagati, totale contanti, contante versato, totale costo consegna degli ordini consegnati, ordini annullati, scontrino medio, **numero ordini in ritardo**, **tempo medio**, ordini sotto il minuto, **distanza percorsa**.

**Report zone** (`/delivery-zone-report`): per zona numero ordini, importo, scontrino medio, margine, distanza media, tempo di consegna medio, costo medio consegna.

**Sugli ordini**: colonna rider, «ritardo consegna» in secondi (anche negativo = in anticipo) e in testo. Nelle vendite API `getRider=1` aggiunge `riderId` a ogni riga.

**Mappa rider** (`/riders-map`): la posizione dei rider in tempo reale dall'app (pagina solo grafica).

**Sul prodotto**: il flag «mostra in app rider» decide quali righe vede il fattorino.

## 4.5 Cosa ne esce per la cassa nuova

La cassa nuova ha già `rider`, `consegna` (`da_assegnare → assegnata → ritirata → consegnata`), `rider_posizione` con realtime e `/rider` (migrazioni 0001, 0004). Per essere alla pari:

| Velocissimo | Nostro stato | Da fare |
|---|---|---|
| si assegna da solo la prima comanda | `consegna.da_assegnare` esiste, l'assegnazione la fa la cassa | tasto «la prendo io» nella PWA rider, in ordine di orario |
| CHIAMA e NAVIGA | — | `tel:` e link mappe sull'indirizzo geocodificato |
| borsello: prelievi e depositi | — | tabella `rider_movimento` (tipo, importo, fondo) + dare-avere a fine serata; la stessa forma dell'API, così l'OS la legge uguale |
| storico «da saldare» | — | consegne consegnate e non ancora saldate |
| posizione in background + mappa | `rider_posizione` + `/cassa/mappa` | c'è |
| push al nuovo ordine, «Rider arrivato» al cliente | — | push dalla PWA (poi) |
| ritardo in secondi, tempo medio, distanza | — | `consegna` ha gli orari: il report viene da lì |
| 10 consegne contemporanee per rider | — | non serve (tetto mai raggiunto) |
| ordini delle piattaforme = Ritiro | `ordine.tipo` | tenerlo uguale: il rider della piattaforma non è un nostro rider |
