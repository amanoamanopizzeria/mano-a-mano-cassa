# REA · 21. Cosa manca ancora alla cassa nuova per sostituire Velocissimo/2Bit (26/10/2026)

*Domanda di Edoardo: «che cosa manca ancora nella cassa nuova per sostituire del tutto Velocissimo e
2Bit?». Questo capitolo prende ogni funzione del sistema vecchio (barra della cassa 2Bit, back-office
Velocissimo, app, sito, totem, rider, stampa e fiscale, telefono, chiusure, export per l'OS, coupon,
punti, card, premi, notifiche, prenotazioni, piattaforme) e la confronta con quello che c'è **oggi**
nella cassa nuova. Lo stato **non è copiato dai REA precedenti**: è riverificato sul codice di `main`
(`b3947d8`, migrazioni fino alla 0068) e sul database vero (`tnuyeyqwoqhmgpskqtuq`, sola lettura, 26/10
mattina). Prende il posto di `10_COSA_MANCA_PER_SOSTITUIRLO.md` (24/10), che resta come storia.*

**Regole rispettate:** solo `SELECT` sul database; nel back-office di Velocissimo (Chrome di Edoardo)
lette quattro pagine (Stati ordini, Coupon, Notifiche automatiche, Report giornata, Periodi di
chiusura) senza toccare nessun tasto; nessun ordine, nessun messaggio, nessun dato di cliente copiato.
Nessuna modifica a codice o database.

Legenda: **fatto** = c'è e fa la stessa cosa, con la prova · **parziale** = c'è un pezzo, la colonna
dice cosa manca · **mancante** = non c'è · **non serve** = Velocissimo l'ha ma A Mano A Mano non lo
usa, o lo fa già mano-a-mano-os. Le domande sono numerate **D1…D19** in fondo.

## 0. In breve

| Stato | Voci |
|---|---|
| fatto | **52** |
| parziale | **36** |
| mancante | **43** |
| non serve | **12** |
| **totale** | **143** |

- **Il banco della sera c'è quasi tutto**: asporto, banco, tavolo, domicilio, cliente dal numero,
  modifica con ristampa, annullo con chi e quando, sposta con la capienza, sconto manuale, coupon a
  codice, rider a tappe, conto del tavolo col coperto, export a 40 colonne per l'OS.
- **Quello che ferma una serata vera è intorno al banco, non sul banco**: la stampa in negozio non
  è accesa (tabella `stampante` vuota, agente non installato), il codice di sicurezza delle
  migrazioni 0063/0064/0066 non è su `main`, nel database c'è **una sola utenza** (la cassa: nessun
  rider ha la sua), non si mette un prodotto «esaurito», non c'è fondo né chiusura di cassa, un
  ordine chiuso non si corregge, e lo scontrino fiscale non esiste.
- **Quello che ferma lo spegnimento di Velocissimo** è tutto ciò che oggi vive nel loro cloud: gli
  ordini di app e piattaforme (Deliverect è uno scheletro con la mappa canali vuota), i punti
  (37.877) e le card (1.578) dei clienti, i coupon (54 contro 6 spenti), il pagamento online Nexi,
  le notifiche automatiche, le **foto del menu** (120 su 138 prodotti attivi stanno sul CDN di
  Velocissimo) e i periodi di chiusura (Natale è fra due mesi).

## 1. Che cosa è cambiato dal 25/10 (verificato oggi)

| Cosa | Prova |
|---|---|
| Ruolo del profilo protetto (non ci si fa admin da soli) | registro Supabase `profilo_ruolo_protetto` (0063), funzione `profilo_campi_protetti` |
| Rider che scrivono solo dalle funzioni | registro `rider_solo_dalle_funzioni` (0064) |
| Punti a 1 ogni 5 € senza la consegna, coperto 1,50 € | 0065; `negozio.punti_per_euro` = 0,20, `prezzo_coperto` = 1,50 |
| Giro e consegne chiuse (annullo non riaperto, togliere il rider non è «pronto») | registro `giro_e_consegne_chiuse` (0066) |
| Sposta che rispetta la capienza, un cliente per telefono | 0067; nel database **0** telefoni doppi su 3.813 clienti |
| Coperti sull'ordine, «Libera» rifiuta un tavolo con ordini aperti, export coperti giusto | 0068; `ordini_giornata` legge `o.coperti` (letto il testo della funzione) |
| **Codice e database fuori passo** | 0063, 0064 e 0066 sono nel database, ma i file e il codice che le accompagna sono solo sul ramo `claude/project-thread-7k15q9` (4 commit davanti a `main`); `/login` di produzione ha ancora «Registrati» (`src/app/login/page.tsx:70`) |
| Velocissimo, notifiche automatiche | **quattro accese**, non tre: carrello abbandonato, ordine in ritardo, **ordine in anticipo**, rider arrivato (pagina `/marketingpushnotification`, 26/10) |
| Velocissimo, chiusure | `/day-report` dal 1 al 26/10: «Nessuna riga» (le Z non salgono mai al cloud, confermato) |

## 2. Cassa 2Bit: la barra in basso e i menu

| Funzione | Oggi in Velocissimo/2Bit | Nella cassa nuova | Stato | Prova |
|---|---|---|---|---|
| Asporto | tasto Asporto, ordine con nome e ora | tipo «asporto» in `/cassa/nuovo`, nome di chi ritira | fatto | `ordine_da_cassa3`, `ordine_nome` (0037) |
| Banco | tasto Banco | tipo «banco», si stampa subito | fatto | `tipo_ordine` = banco; critico giro 26 (C-85) |
| Ai Tavoli | mappa tavoli, preconto aperto | `/cassa/tavoli`: Apri, Conto, Libera, 15 tavoli attivi | fatto | 0009, 0031, 0041, 0068; 15 tavoli attivi nel database |
| Modifica | riapre la comanda e la ristampa | `/cassa/nuovo?modifica=<id>`, carta con NUOVA e TOLTE | fatto | `ordine_modifica` (0038), `righe_prima` (0043) |
| Elimina (cestino) | annulla l'ordine (o lo cancella: D18) | «Annulla» a due tocchi, con chi e quando | fatto | `annullato_da`, `v_annulli_per_persona` (0062) |
| Annullo di un ordine già chiuso / storno | sul 2Bit si annulla il documento | da `ritirato` e `consegnato` nessuna transizione: un conto incassato per sbaglio resta così | mancante | `TRANSIZIONI_ORDINE` in `src/lib/types.ts:160`; critico giro 29 n. 5, giro 28 (409) |
| Info (scheda dell'ordine) | dettaglio con storia degli stati | la storia c'è nel database (218 righe in `ordine_stato_log`) ma nessuna pagina la mostra; la comanda fa da scheda | parziale | nessun file in `src/` legge `ordine_stato_log` |
| Google Maps | apre la mappa dell'indirizzo | `/cassa/mappa` con rider e consegne; «Naviga» nell'app rider | fatto | `src/app/cassa/mappa/page.tsx`, `src/app/rider/page.tsx:354` |
| Comanda (stampa / ristampa) | stampa la comanda sulle due stampanti | «Stampa comanda» / «Ristampa comanda» in `/cassa` | fatto | `ordine_ristampa`, `ordine_stampato` (0027, 0038) |
| Documento → Pagamenti | sceglie il pagamento, emette lo scontrino | contanti o POS sull'ordine, nessuno scontrino | parziale | vincolo `ordine.pagamento in ('contanti','pos')`; tabella `pagamento` con **0 righe** |
| Documento → Apri cassetto | apre il cassetto (dalla fiscale) | — | mancante | nessun comando cassetto in `src/lib/stampa/` |
| Documento → Preconto veloce / definitivo | preconto stampato del tavolo | «Stampa» del conto = stampa del browser, non la stampante della cassa | parziale | `src/app/cassa/tavoli/page.tsx:205`; critico giro 29 «da avere» |
| Documento → Fattura | fattura al cliente con P.IVA | — | mancante | nessuna colonna P.IVA/SDI; D9 |
| Documento → Scontrino veloce | scontrino senza passare dall'ordine | — | mancante | nessun codice fiscale nel repo |
| Consegna (data, ora, «prima possibile», disponibilità per quarto d'ora) | finestra Dati consegna con i quarti d'ora | domicilio con quarto d'ora, fasce vicine, «Adesso» rifiutato fuori orario | fatto | `fasce_con_vicine` (0052), critico giro 29 §3 |
| Card | apre la card del cliente | la scheda mostra il numero card se c'è; non si cerca un cliente per card o QR | parziale | `cerca_cliente(p_telefono)` cerca solo per telefono; `cliente.card` **0** valorizzate |
| Funzioni → Opzioni / Impostazioni | configurazione del POS | si configura dal database (orari, zone, capacità, negozio) | parziale | tabelle `orario`, `zona`, `regola_capacita`, `negozio`; nessuna pagina d'impostazioni |
| Funzioni → Recupero documenti stampati | ritrova o ristampa un documento | ristampa comanda sì; documenti fiscali non esistono | parziale | D18 |
| Funzioni → Produzione | vista di produzione | `/cassa/fasce` (pizze e consegne per quarto d'ora) | parziale | D18: serve sapere cosa mostra la loro |
| Funzioni → Pony: riepilogo e disponibili | i rider e il loro conto | `/cassa/rider` (borsello, fondo, prelievi, depositi, «Salda»), rider del giorno in `/cassa/capacita` | fatto | 0024, 0033, 0046 |
| Funzioni → Stampe e report | 30 report locali | `/cassa/riepilogo` della serata; il resto lo fa l'OS | parziale | §11 |
| Funzioni → Brucia documenti | cancella documenti (fiscali?) | — | non serve | da non copiare senza una procedura scritta; D18 |
| Elenco chiamate | lista del giorno: ora, telefono, cliente, gestita, utente | solo **l'ultima** chiamata nella colonna di `/cassa`; nessuna lista per data, nessun «utente» | parziale | `ColonnaCassa.tsx:29` (`limit(1)`) |
| Colonna dei quarti d'ora con i conteggi | asporto e domicilio per quarto d'ora | colonna di `/cassa` e `/cassa/fasce` | fatto | `ColonnaCassa.tsx`, `fasce_con_vicine` |
| Icona stampante su ogni quarto d'ora | stampa qualcosa della fascia (D18) | — | mancante | D18 |
| Lista ordini con filtri e Sposta | lista con numero, tipo, ora, nome, note, totale, origine, sposta | filtri Da fare / Da preparare / Pronti / In uscita / Chiusi, orologio «Sposta» | fatto | `src/app/cassa/page.tsx:66`, `ordine_sposta` (0059, 0067) |
| Ricerca nella lista (lente) | cerca un ordine | nessuna ricerca per numero o nome | mancante | nessun campo di ricerca in `src/app/cassa/page.tsx` |
| Tastiera a video, monitor touch | tastiera del 2Bit | tasti grandi e tastierino in `/cassa/nuovo` (1024 e 390) | fatto | critico giri 17–18 |

## 3. La serata al banco

| Funzione | Oggi in Velocissimo/2Bit | Nella cassa nuova | Stato | Prova |
|---|---|---|---|---|
| Stati dell'ordine | 8 stati (Ricevuto … Ritirato dal cliente) | 7 stati, stessi passaggi | fatto | enum `stato_ordine`; pagina `/weborderstatus` letta il 26/10 |
| Preordini fino a 7 giorni, stampati all'ora giusta | flag preordine | sezione Preordini, stampa quando è ora | fatto | `negozio.preordini_giorni` = 7, 0022, 0058 |
| Minuti mancanti e ritardo sugli ordini | conto alla rovescia, colore del ritardo | «fra 12 min» / «in ritardo di 5 min» | fatto | `contoAllaRovescia`, `src/app/cassa/page.tsx:36` |
| Capacità per quarto d'ora | per giorno della settimana (10/18/22) | dai pizzaioli del giorno, se mancano dalla tabella per giorno | fatto | 0042, `capacita_giorno` |
| Fascia piena | «SOLD OUT» sulla fascia | piena e non sceglibile in `/ordina`; in cassa lo staff può forzare con un secondo tocco | fatto | `src/app/ordina/page.tsx:402`, `ordine_sposta_forzato` (0067) |
| Minimo d'ordine a domicilio | 10 € per zona | applicato anche dalla cassa | fatto | `zona.minimo_ordine`; D-16 n. 21 resta aperta |
| Nota fissa del cliente in comanda e «[N ORD.]» | nella nota della comanda | nota del cliente e nota per il rider separate; contatore ordini stampato | fatto | 0048 (`ordini_cliente`), 0057, 0060 |
| «PAGO CON 50» e resto | scritto in nota | `paga_con` e resto in cassa e sull'app rider | fatto | `ordine.paga_con`, `ordine_pagamento` |
| Sconto manuale (190 al mese) | riga SCONTO | sconto in € o % con motivo | fatto | `ordine_sconto_manuale` (0039) |
| Coupon a codice in cassa | codice scritto in cassa | verifica e applica, con i motivi di rifiuto | fatto | `coupon_verifica`, `coupon_applica` (0026); ma vedi §9: nessun coupon acceso |
| Segnare «pronto» | nessuno lo segna sul 2Bit | tasto «Pronto», `pronto_il` | fatto | `ordine_segna_pronto` (0054) |
| Più pagamenti su un conto (split, alla romana) | previsto dal modello 2Bit | un solo pagamento per ordine | mancante | vincolo su `ordine.pagamento`; D8 |
| Altri metodi (buoni pasto, Satispay, PayPal al banco) | metodi configurabili | solo contanti / POS / «online» | mancante | D8 |
| Prodotto esaurito «per stasera» | stato locale: non disponibile per un periodo / definitivamente | `/cassa/menu` è in **sola lettura**; `prodotto` ha solo `attivo` | mancante | `src/app/cassa/menu/page.tsx:3`; colonne di `prodotto` lette il 26/10; D6 |
| Ordini di ieri ancora aperti | restano nella lista | «Nascondi ieri e prima» | fatto | `src/app/cassa/page.tsx:341` |
| Conteggi «Chiusi» e lente delle fasce | non contano gli annullati | contano anche gli annullati | parziale | critico giro 29 «da avere» |

## 4. Stampa e scontrino fiscale

| Funzione | Oggi in Velocissimo/2Bit | Nella cassa nuova | Stato | Prova |
|---|---|---|---|---|
| Comanda su due stampanti (cucina + cassa), per reparto | 2Bit sul PC | agente `agente-stampa/agente.mjs`, ESC/POS porta 9100, `/api/stampa/coda` e `/fatta`, carta per reparto | parziale | codice c'è (0047, 0058); **non acceso in negozio** |
| Stampanti configurate | nel database del 2Bit | tabella `stampante` **vuota**; `config.esempio.json` ha IP finti (.50 e .51) | mancante | `select … from stampante` = 0 righe; D3 |
| Stampa automatica all'arrivo dell'ordine | stato «Confermato = Vendita + Stampa» | «Stampa da sola» a blocchi, preordini all'ora giusta | fatto | 0058, critico giro 26 (C-85 stampata in 2 s) |
| Ristampa marcata «RISTAMPA», modifica con NUOVA/TOLTE | sul POS nuovo | sì | fatto | 0038, `src/lib/stampa/escpos.ts` |
| Loghi in testa alla comanda (domicilio, take-away) | `domicilio.2bt`, `take-away.2bt` | testo, niente logo | parziale | servono le foto di una comanda vera |
| Scontrino fiscale (Epson FP-81II RT, 192.168.1.200) | si batte alla scelta del pagamento | nessun codice (`fpmate.cgi` assente) | mancante | grep del repo; D2 |
| Annullo dello scontrino | dall'ordine (video 12:26) | — | mancante | dipende dallo scontrino |
| Chiusura Z / lettura X sulla fiscale | Z serale sulla fiscale | — | mancante | `/day-report` vuoto anche oggi (letto 26/10); D7 |
| Aliquote IVA per prodotto (asporto e sala) | «Codice IVA» e «Codice IVA asporto» | tutte le 204 righe a **10 %** | parziale | `select distinct aliquota_iva` = 10,00; D14 |
| Etichette (Brother P-touch sul PC) | software sul desktop | — | mancante | REA 18 n. 11; D19 |

## 5. Telefono

| Funzione | Oggi in Velocissimo/2Bit | Nella cassa nuova | Stato | Prova |
|---|---|---|---|---|
| Numero di chi chiama → scheda cliente | modem USB US Robotics o centralino | `/api/telefono/chiamata` con chiave, realtime sulla tabella `chiamata`, la scheda si apre da sola | parziale | route e realtime ci sono; nel database **5 chiamate, tutte di prova**: l'apparecchio vero non è collegato; D5 |
| Cliente nuovo con via, zona e costo | stradario locale | ricerca via con Google Maps o OpenStreetMap, zona dal poligono | fatto | `/api/indirizzi/*`, `trg_indirizzo_zona` |
| «Gestita» e «utente» della chiamata | colonne Gest e Utente | `chiamata.gestita` sì, l'utente no | parziale | colonne di `chiamata`: id, numero, origine, ricevuta_il, gestita |
| Lista delle chiamate per giorno | finestra Elenco chiamate | — | mancante | vedi §2 |

## 6. Rider

| Funzione | Oggi in Velocissimo/2Bit | Nella cassa nuova | Stato | Prova |
|---|---|---|---|---|
| App rider: prende la consegna, parte, consegna | Velocissimo RIDER | `/rider`: «La prendo io», «Parto», «Consegnata», giro a tappe | fatto | 0051, 0061, 0066; critico giri 28–29 |
| Utenze dei rider | «Rider 1…11», 8 licenze | 11 rider in anagrafica, **0 utenze**: nel database c'è un solo utente (la cassa) | mancante | `auth.users` = 1; 0055 dice che le crea Edoardo dal pannello; D4 |
| Assegnazione dalla cassa | dalla mappa | tendina sulla mappa | fatto | `assegna_consegna` (0034, 0066) |
| Mappa dei rider in tempo reale | `/riders-map` | `/cassa/mappa` | fatto | `rider_posizione`, `segnala_posizione` |
| Contanti e borsello | non usato (versato 0) | borsello, «Salda» | parziale | «Hai in mano 0,00 €» con una consegna da saldare (critico giri 28–29) |
| Preordine preso e partito prima che la cucina lo abbia | — | il rider può partire con un preordine non stampato | parziale | critico giro 29 n. 6 |
| «Parto con tutte» con consegne senza punto | — | corretto solo sul ramo, non su `main` | parziale | commit `c0e611a` sul ramo `claude/project-thread-7k15q9` |
| Avviso al cliente «è partito, seguilo» | push «In consegna» | link `/segui/<token>` a tappe; **non parte da solo**: 23 avvisi «da inviare», 1 inviato | parziale | `notifica_cliente` per stato, letto il 26/10 |
| «Rider arrivato» (a 200 m) | notifica automatica accesa | — | mancante | `/marketingpushnotification` letto il 26/10 |
| Report rider (consegne, ritardi, tempi) | report del back-office | colonne nel CSV per l'OS | non serve | lo fa l'OS dal CSV (REA 15) |

## 7. Tavoli e sala

| Funzione | Oggi in Velocissimo/2Bit | Nella cassa nuova | Stato | Prova |
|---|---|---|---|---|
| Listino sala (L2) | sì | `prezzo_tavolo` | fatto | 0013 |
| Coperti e coperto nel conto | coperti sul preconto | coperto 1,50 € a persona, coperti sull'ordine e nell'export | fatto | 0065, 0068 |
| Conto con righe, totale, incasso e tavolo libero | preconto → scontrino | `tavolo_conto_chiudi` | fatto | 0041, 0065 |
| «Libera» con ordini aperti | — | rifiutato finché non si incassa o annulla | fatto | `tavolo_libera` (0068) |
| Coperti chiesti senza finestra del browser | — | «Apri» usa `window.prompt` | parziale | critico giro 29 n. 7 |
| «Ritirato» sugli ordini al tavolo (chiude senza conto) | — | il tasto c'è ancora | parziale | critico giro 29 n. 4 |
| Colore a tempo del tavolo, palmare | video POS nuovo | — | non serve | il 2Bit non lo fa; 14 tavoli a settimana |

## 8. Totem, sito, app cliente

| Funzione | Oggi in Velocissimo/2Bit | Nella cassa nuova | Stato | Prova |
|---|---|---|---|---|
| Totem: menu, carrello, nome, contanti/POS | web-app in modalità totem | `/totem` con chiave, prezzi dal server | fatto | `ordine_da_totem_api`, `totem_menu` |
| Totem: pagamento col POS sul totem | POS in cassa | «vai alla cassa e paga» | parziale | `src/app/totem/page.tsx:166` |
| Totem: lingue, mangia qui / porta via | — | — | non serve | 7 ordini a settimana; REA 12 |
| Pagina d'ordine sul sito | web-app Velocissimo `so/?928` | `/ordina`: ritiro e domicilio, quarti d'ora, zona e minimo, varianti | fatto | 0035–0037, `sito_menu`, `ordine_dal_sito` |
| Link «Ordina» di amanoamano.it verso la pagina nostra | punta a Velocissimo | non cambiato | mancante | decisione legata a D1 |
| Pagamento online (Nexi) | Nexi nell'app | `/ordina` solo contanti o POS alla consegna | mancante | `src/app/ordina/page.tsx:27`; D11 |
| Coupon e punti su `/ordina` | nell'app | — | mancante | `/ordina` non chiama `coupon_verifica` |
| Ricerca nel menu e «modifica ingredienti» | nell'app | ricerca sì, togliere un ingrediente no | parziale | REA 16 n. 22 |
| App negli store (iOS a nome Vi.Ru, Android a nome Velocissimo) | app «A Mano A Mano Pugliese» | — | mancante | D13 |
| Accesso cliente, «i miei ordini», ordina di nuovo | nell'app | — | mancante | dopo l'app nostra |
| Pagina «segui l'ordine» | mappa del rider nell'app | `/segui/<token>` | fatto | 0032, 0061 |
| Privacy policy, slider, gallerie dell'app | pagine dell'app | il sito ha le sue | non serve | REA 13 §13.8 |

## 9. Clienti, card, punti, coupon, premi

| Funzione | Oggi in Velocissimo/2Bit | Nella cassa nuova | Stato | Prova |
|---|---|---|---|---|
| Anagrafica clienti richiamabili | 19.543 righe, ~3.835 telefoni veri | 3.813 clienti (3.799 da Velocissimo), 3.178 indirizzi, nessun doppione | fatto | conteggi del 26/10 |
| Note fisse, black list | sul 2Bit e nel cloud | `cliente.note`, `black_list`, note per il rider | fatto | 0026, 0057 |
| Saldo punti | 37.877 punti su 1.387 clienti | 3 clienti con punti, tutti di prova (190 punti col passo vecchio) | mancante | `cliente.punti > 0` = 3; REA 20 §1 |
| Regola dei punti (1 ogni 5 €, senza consegna) | Velocissimo | trigger `punti_da_ordine` a `consegnato`/`ritirato` | fatto | 0065 |
| Card fedeltà (numero, QR dell'app) | 1.578 card | 0 card | mancante | `cliente.card` valorizzata = 0 |
| Premi a punti (birra 10, fritti 20, speciale 30) | `/prize` | 3 coupon «premio» **spenti e senza costo in punti** | parziale | `coupon.costo_punti` vuoto, `attivo` = false |
| Coupon (regole) | 54, i più usati NON CUCINO (67 ordini), Benvenuto 2025 (91), FESTEGGIAMO (38) | 6 coupon, **tutti spenti** | parziale | `coupon` 6 righe, `attivo` = 0; pagina `/coupon` letta il 26/10 |
| Coupon a ore, solo primo ordine, omaggio | sì | colonne `dalle/alle`, `solo_primo_ordine`, `id_prodotto_omaggio` ci sono | parziale | colonne di `coupon` lette il 26/10; regole non riempite e non provate |
| Coupon ottenuti e non usati | 465 | `coupon_emesso` 0 righe | mancante | conteggio del 26/10 |
| Tag automatico all'uso del coupon | sì | — | mancante | REA 19 |
| Consensi (marketing, dati) | export del 26/10 | colonna `consenso_marketing`, non caricata | parziale | REA 20 §1 |
| Compleanno | sì | colonna `nato_il`, non caricata | parziale | REA 20 §1 |
| Credito prepagato | 0 clienti | colonna `credito` | non serve | REA 20 |
| Porta un amico | codice referral | — | mancante | REA 20 §1 |
| Report errori coupon | 1.208 tentativi | — | mancante | REA 13 §13.3 |

## 10. Notifiche, marketing, prenotazioni

| Funzione | Oggi in Velocissimo/2Bit | Nella cassa nuova | Stato | Prova |
|---|---|---|---|---|
| Push per stato dell'ordine | dal cloud a ogni stato | — | mancante | D15 |
| Ordine in ritardo / in anticipo | accese | — | mancante | `/marketingpushnotification` 26/10 |
| Carrello abbandonato | acceso, 4.107 carrelli | — | mancante | serve l'app nostra |
| Coupon assegnato, carico e scarico punti | spente | — | non serve | stessa pagina |
| Campagne push, liste, matrici RFM, report clienti | 7 campagne, l'ultima nel 2024 | l'OS ha WhatsApp e i report | non serve | REA 13 §13.2–13.3 |
| Prenotazioni (X-Reserve, Google) | 25 in due mesi, 18 da Google | — | mancante | D16 |
| Form del sito (Lavora con noi, Dicci la tua) | moduli Velocissimo | il sito nostro (OS mig. 585) | non serve | REA 13 §13.3 |

## 11. Menu, negozio, zone

| Funzione | Oggi in Velocissimo/2Bit | Nella cassa nuova | Stato | Prova |
|---|---|---|---|---|
| Prodotti e categorie | 177 nel back-office | 204 righe, 138 attive | fatto | conteggi del 26/10 |
| Listini L1 / L2 / L3 | sì | `prezzo`, `prezzo_tavolo`, `prezzo_piattaforme` (2 attivi senza L3) | fatto | 0013 |
| Variazioni | 141 in 14 categorie | 70 | parziale | REA 20 §2: da contare voce per voce |
| Menu combo | 7 | pacchetti (0023) | fatto | `pacchetto_gruppo`, `pacchetto_scelta` |
| Visibilità per canale (app, web, totem) | cataloghi | `visibile_app/web/totem` | fatto | colonne di `prodotto` |
| Foto dei prodotti | sul loro CDN | **120 dei 138 attivi puntano a `service.web-app.it`** (Velocissimo), 18 senza foto | parziale | conteggio per dominio del 26/10; spento Velocissimo, spariscono; D17 |
| Allergeni ed etichette (Vegano…) | 14 allergeni, 9 etichette | — | mancante | REA 13 §13.6 |
| Pausa con data «fino a» | stato locale del prodotto | — | mancante | vedi §3; D6 |
| Gestione del menu da una pagina (prezzi, nuovi prodotti) | back-office | solo dal database | mancante | `/cassa/menu` in sola lettura |
| Orari per tipo, attesa minima, preordini 7 giorni | sì | sì | fatto | `orario` 21 righe, `negozio` |
| Zone di consegna, costo, minimo | 16 zone | 16 attive (le 2 di prova spente) | fatto | `zona.attiva` = 16 |
| Periodi di chiusura con messaggio | 10 (Natale 24–25/12, ferie, «problemi tecnici») | solo blocchi di fascia a mano | mancante | pagina `/closing-period` letta il 26/10; `fascia_bloccata` 0 righe |
| Richieste fuori zona | 809 | `/ordina` dice «qui non consegniamo» ma non lo scrive | mancante | REA 13 §13.7 |
| Gruppi di zone, tariffa a km, mezzo «a piedi» | impostati, non usati | — | non serve | REA 13 §13.10 |
| Formati e composizioni (mezza e mezza) | disabilitati | — | non serve | REA 13 §13.6 |

## 12. Piattaforme

| Funzione | Oggi in Velocissimo/2Bit | Nella cassa nuova | Stato | Prova |
|---|---|---|---|---|
| Ordini Glovo, Deliveroo, Just Eat via Deliverect (216 su 389 a settimana) | Deliverect scrive nel cloud | `/api/deliverect/ordine` con HMAC, **mappa canali vuota**: oggi rifiuta tutto | parziale | `CANALI_DELIVERECT = {}` in `src/app/api/deliverect/ordine/route.ts:13`; D12 |
| Annullo da Deliverect, stati restituiti (ACCEPTED, pronto) | sì | non gestiti (`status 100` risponde OK e basta) | mancante | stessa route, riga 69 |
| Prodotti «solo Deliverect» e listino L3 | catalogo SOLO DELIVERECT | `prezzo_piattaforme` | fatto | 0013 |
| Capacità condivisa con gli ordini esterni | — | `accetta_ordine_esterno` rifiuta se la fascia è piena | fatto | 0006 |
| Canale delle piattaforme nella nota per l'OS | nel testo della nota | GLOVO / DELIVEROO / JUST_EAT in nota nell'export | fatto | 0040 |

## 13. Chiusura, report, export per mano-a-mano-os

| Funzione | Oggi in Velocissimo/2Bit | Nella cassa nuova | Stato | Prova |
|---|---|---|---|---|
| Riepilogo della serata (incassato per metodo, ai rider, aperti, per canale) | 2Bit + OS | `/cassa/riepilogo` | fatto | 0044–0046 |
| Fondo cassa e apertura | non registrato | — | mancante | D7 |
| Chiusura di cassa con conteggio e differenza | Z sulla fiscale | — | mancante | D7 |
| Riepilogo di una sera passata | report locali | solo la serata in corso | parziale | `src/app/cassa/riepilogo/page.tsx:23` (`giornataOggi`) |
| Storico ordini per data con filtri | `/weborder` | — | mancante | REA 13 §13.4 |
| CSV per ordine a 40 colonne | `/weborder` → OS | `/api/ordini/csv?giornata=`, provato col parser dell'OS | fatto | `scripts/prova-csv-os.mts`, 0040, 0068 |
| Vendite per articolo come `/vendite` | API Velocissimo → OS | `/api/vendite?giornata=` | parziale | mancano `numeroCoperti`, `scontoInRiga`, `pagamentiScontrino[]` (REA 15 §15.3) |
| L'OS legge la cassa nuova | l'OS legge Velocissimo | l'export c'è, ma in mano-a-mano-os nessun codice lo chiama | mancante | `src/app/api/velocissimo/` dell'OS ha solo `import` e `stato`; D1 |
| Dashboard e 93 report del back-office | sì | li fa l'OS | non serve | REA 13 §13.9 |

## 14. Sicurezza e utenze

| Funzione | Oggi in Velocissimo/2Bit | Nella cassa nuova | Stato | Prova |
|---|---|---|---|---|
| Nessuno si fa admin da solo | — | trigger sul profilo nel database | fatto | 0063 nel registro |
| Niente «Registrati» su `/login` | — | ancora su `main`, tolto solo sul ramo | parziale | `src/app/login/page.tsx:70` su `main` |
| Utenze per postazione e per rider | utenti 2Bit, 8 licenze rider | 1 utenza in tutto | mancante | `auth.users` = 1; D4 |
| Tabella d'appoggio dell'import (9.491 righe) | — | RLS accesa senza regole (chiusa), funzione d'import eseguibile da anon con chiave vuota | parziale | letto il 26/10; ECC n. 15: svuotarla prima di partire |
| Avvisi ECC medi ancora aperti | — | geocodifica che prende il centro di Roma, API indirizzi forse 403 allo staff, link `/segui` senza scadenza, chiave del centralino nell'URL | parziale | controllo ECC del 26/10, punti 11, 12 e «piccoli» |

## 15. L'ordine dei lavori

**Che cosa vuol dire «parallelo».** Il REA 16 (domanda 20) proponeva la doppia battitura: il 2Bit
lavora e una seconda persona ribatte gli stessi ordini nella cassa nuova. Per provare davvero la
cassa nuova serve un passo in più: la cassa nuova **comanda la cucina** per gli ordini presi in
negozio (telefono, banco, asporto, tavoli), mentre il 2Bit resta acceso per lo scontrino e per gli
ordini di app e piattaforme. L'elenco sotto è scritto per questo secondo modo; dove con la sola
doppia battitura una voce non serve, è detto. La scelta è la **D1**.

### A. Blocca il parallelo (lo staff ne ha bisogno in una sera vera)

1. **Accendere la stampa in negozio**: IP e modelli veri delle due stampanti comanda, righe in
   `stampante`, agente installato sul PC di cassa con la sua chiave, una sera di prova di sola
   stampa. Oggi la tabella è vuota e la configurazione ha IP finti. (Con la sola doppia battitura
   non serve: anzi va tenuta spenta, se no la cucina riceve due comande.) **D3**
2. **Portare su `main` il ramo `claude/project-thread-7k15q9`** (0063, 0064, 0066 e il loro
   codice): via «Registrati», «Parto con tutte» che non lascia indietro nessuno. Il database è già
   avanti al codice di produzione.
3. **Le utenze**: oggi nel database c'è un solo utente. Servono le dieci `riderN@…` (si agganciano
   da sole al Rider N, 0055) e una per postazione di cassa. **D4**
4. **La regola dello scontrino nel parallelo**: un ordine preso nella cassa nuova si batte poi sul
   2Bit (doppio lavoro al momento del pagamento) finché la fiscale non è nostra. Senza una regola
   scritta, la sera della prova mancano o raddoppiano gli scontrini. **D2**
5. **«Esaurito per stasera»** su un prodotto, dalla cassa: oggi `/cassa/menu` è in sola lettura e
   il prodotto ha solo «attivo». Serve dal momento in cui `/ordina` o il totem prendono ordini veri.
   **D6**
6. **Correggere un ordine chiuso**: da «ritirato» e «consegnato» non si torna indietro. Un conto
   incassato col metodo sbagliato o una consegna segnata per errore restano così, e il riepilogo
   non torna col 2Bit.
7. **Fondo e chiusura di cassa** almeno come conteggio: fondo a inizio sera, contanti contati a fine
   sera, differenza; e il riepilogo di una sera passata (oggi solo quella in corso). È quello che
   permette di confrontare la sera con il 2Bit. **D7**
8. **Il telefono vero**: collegare il numero di chi chiama (modem USB o centralino) e la lista
   delle chiamate della sera (oggi solo l'ultima). **D5**
9. **Mandare gli ordini della cassa nuova all'OS**: l'export c'è, ma l'OS legge ancora solo
   Velocissimo. Nel parallelo «vero» gli ordini presi nella cassa nuova non sarebbero nella
   chiusura dell'OS. (Con la doppia battitura non serve.) **D1**
10. **I residui del critico, giro 29**: «Ritirato» sugli ordini al tavolo, `window.prompt` dei
    coperti, rider che parte con un preordine non stampato, «Hai in mano 0,00 €» sbagliato,
    «Chiusi» che conta gli annullati.
11. **Punti e coupon durante il parallelo**: una regola sola su chi li tiene, se no un cliente
    prende i punti due volte o usa due volte lo stesso coupon (REA 19 §2.4). Proposta: fino al
    cambio restano solo su Velocissimo, e nella cassa nuova lo sconto di un coupon si batte come
    sconto manuale col nome del coupon. **D10**

### B. Blocca lo spegnimento di Velocissimo

12. **Scontrino fiscale nostro** sull'Epson FP-81II RT: emissione alla scelta del pagamento,
    annullo, X e Z, cassetto, aliquote IVA vere (oggi tutto al 10 %). Da provare solo in negozio,
    con le quattro condizioni del REA 17 §9.3. **D2, D7, D14**
13. **Deliverect** (oltre metà degli ordini): credenziali, mappa dei canali, stati restituiti,
    annullo. **D12**
14. **Punti, card e coupon dei clienti**: 37.877 punti su 1.387 clienti, 1.578 card, 465 coupon
    ottenuti e non usati, da una fotografia sola della lista `/customer` a servizio finito (REA 20
    §8); poi i coupon veri accesi (NON CUCINO, Benvenuto, FESTEGGIAMO…) e i premi con il loro costo
    in punti; ricerca del cliente per card o QR.
15. **Pagamento online** su `/ordina` (Nexi o altro) con conferma prima di stampare. **D11**
16. **Le foto del menu**: 120 dei 138 prodotti attivi le prendono dal CDN di Velocissimo. Vanno
    copiate nello storage nostro prima di spegnere. **D17**
17. **Avvisi al cliente**: oggi gli avvisi «è partito» si creano ma non partono (23 da inviare).
    Velocissimo manda push a ogni stato e quattro notifiche automatiche (ritardo, anticipo, rider a
    200 m, carrello abbandonato). **D15**
18. **L'app negli store** come aggiornamento della stessa app, con «i miei ordini», punti e coupon;
    e il link «Ordina» del sito verso `/ordina`. **D13**
19. **Periodi di chiusura** con il messaggio al cliente, letti da `/ordina`, totem e cassa: il
    prossimo è Natale (24–25/12).
20. **Vendite per articolo** complete per l'OS (`numeroCoperti`, `scontoInRiga`, pagamenti per
    scontrino), più pagamenti su un conto e altri metodi. **D8**
21. **Fattura** dal Documento. **D9**

### C. Da avere (né la sera né lo spegnimento dipendono da questo)

22. Storico ordini per data con filtri, ricerca di un ordine nella lista, scheda «Info» con la
    storia degli stati (che il database ha già).
23. Prenotazioni (25 in due mesi, quasi tutte da Google). **D16**
24. Allergeni ed etichette sul prodotto; pagina per cambiare prezzi e prodotti senza toccare il
    database.
25. Richieste fuori zona registrate; report errori coupon; porta un amico.
26. Variazioni da ricontare (70 contro 141); loghi in comanda; preconto sulla stampante.
27. Avvisi ECC medi rimasti (geocodifica, API indirizzi, link `/segui` senza scadenza, chiave
    nell'URL); svuotare la tabella d'appoggio dell'import.
28. Etichette Brother, solo se servono. **D19**

## 16. Domande per Edoardo

Le domande già aperte nei capitoli 16 e 18 sono richiamate col loro numero; quelle già risposte
(PC 2Bit, fiscale Epson al .200, punti a 1 ogni 5 €, coperto 1,50 €) non sono ripetute.

- **D1. Come facciamo il parallelo?** (a) doppia battitura: il 2Bit comanda tutto, una seconda
  persona ribatte nella cassa nuova; (b) la cassa nuova comanda la cucina per telefono, banco,
  asporto e tavoli, il 2Bit resta per lo scontrino e per app e piattaforme. *Cosa cambia:* con (b)
  diventano urgenti la stampa in negozio (n. 1) e l'OS che legge la cassa nuova (n. 9); con (a) no,
  ma non si prova la cucina. In che sera (lun–mer, 10 pizze a quarto d'ora)? (`16` n. 20)
- **D2. Lo scontrino, nel parallelo e dopo.** Nel parallelo lo ribatte il 2Bit al pagamento? E,
  per sempre: per gli ordini online e i domicili quando si batte? (`16` n. 4)
- **D3. Le stampanti comanda**: modello e IP della stampante di cucina e di quella di cassa (la
  Ditron è una di queste? il Sunmi al .26?), e posso installare l'agente di stampa sul PC di cassa,
  accanto al 2Bit? (`18` n. 9–10)
- **D4. Le utenze**: crei tu dal pannello di Supabase le dieci `riderN@amanoamanopugliese.it` (con
  conferma automatica) e le utenze di cassa, o preferisci un altro modo? Quante postazioni di cassa
  ci saranno?
- **D5. Il numero di chi chiama**: lo dà il modem USB sul PC, l'AETHRA al .253 o il Gigaset al .19?
  E «Gest» / «Utente» nell'elenco chiamate li mette lo staff a mano? (`18` n. 12–13)
- **D6. «Esaurito»**: basta «esaurito per stasera» (torna domani da solo), o serve anche «fino al
  giorno X»? Si spegne mai un prodotto su un solo canale, o una variante (la bufala)? (`18` n. 14–16)
- **D7. Fondo, X e Z**: chi conta il fondo e a che ora, si fa una X durante il servizio, chi fa la
  Z? (`16` n. 5)
- **D8. Pagamenti**: si divide mai un conto (alla romana, metà contanti metà POS)? Prendete buoni
  pasto, Satispay o altro al banco?
- **D9. Fattura**: quante ne fate al mese dal 2Bit, e a chi?
- **D10. Punti e coupon nel parallelo**: va bene che restino solo su Velocissimo fino al giorno
  del cambio, e che nella cassa nuova il coupon si batta come sconto manuale col suo nome?
- **D11. Pagamento online**: il conto Nexi è tuo o passa da Velocissimo? Vuoi tenerlo o un altro?
  (`16` n. 6)
- **D12. Deliverect**: di chi è l'account, chi è il referente, ci danno le credenziali per
  collegare la cassa nuova? (`16` n. 17)
- **D13. App negli store**: il conto Apple dell'app è di Vi.Ru? Chiediamo a Velocissimo il
  trasferimento dell'app Android? (`16` n. 18)
- **D14. IVA**: bevande al 22 % e tutto il resto al 10 %? La sala ha aliquote diverse dall'asporto?
  (`16` n. 12)
- **D15. Avvisi al cliente**: delle quattro notifiche accese (ritardo, anticipo, rider a 200 m,
  carrello abbandonato) quali vuoi tenere, e con che mezzo finché l'app nostra non c'è (WhatsApp,
  SMS, niente)?
- **D16. Prenotazioni**: le tieni (25 in due mesi, 18 da Google)? Se sì, dentro la cassa o su un
  servizio a parte? (`16` n. 16)
- **D17. Le foto del menu**: sono tue (posso copiarle dal CDN di Velocissimo nel nostro storage),
  o le rifacciamo?
- **D18. I tasti del 2Bit ancora senza risposta**: «Elimina» annulla o cancella; «Brucia
  documenti», «Recupero documenti stampati», «Produzione» e l'icona stampante su ogni quarto d'ora
  cosa fanno e chi li usa. (`18` n. 2–7)
- **D19. Il Brother P-touch**: stampate etichette? Di che cosa? (`18` n. 11)
