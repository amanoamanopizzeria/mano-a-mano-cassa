# REA · 25. Gli ordini dell'app di Velocissimo nella nostra cassa: nel parallelo e dopo

*27/10/2026, domanda di Edoardo: «i clienti ordinano dall'app A Mano A Mano Pugliese, che è di
Velocissimo e gira sui loro server. Prima del mese di prova in parallelo, come facciamo arrivare
nella NOSTRA cassa gli ordini di quell'app (e del sito/web-app di Velocissimo), mentre l'app resta
loro? E come ci stacchiamo del tutto?» Analisi in sola lettura. Non ho fatto ordini, non ho creato
utenze, non ho inserito credenziali, non ho scaricato nulla dal back-office e non ho toccato né
database né codice. Riprende `03`, `05`, `08` §8.4, `14`, `15`, `21` §15, `22`, `23` e aggiunge
quello che lì mancava: Deliverect visto dall'altra parte, il database locale del 2Bit come fonte,
il ritardo di ogni strada e cosa regge un mese.*

## 25.0 In breve

- **Velocissimo non spinge gli ordini dell'app a nessuno, tranne alla sua cassa.** La Public API non
  ha webhook né una lista degli ordini del negozio (`05` §5.2, `08` §8.5), e Deliverect non c'entra:
  per Deliverect Velocissimo è un **POS che riceve** gli ordini, non un canale che li manda (§25.3).
- **Un posto dove gli ordini dell'app arrivano da soli, in pochi secondi, c'è già: il PC di cassa.**
  Il cloud li spinge al 2Bit sulla porta 9000, che li scrive nel suo SQL Server locale
  (`03` §3.2). Un agente nostro sul PC che **legge** quel database (senza scrivere) e li copia
  nella cassa nuova è la strada più rapida e più solida per il mese di parallelo (§25.2, strada 1).
  Va verificata una sera sul PC, insieme a Edoardo.
- **Dentro la cassa nuova l'ordine copiato è una «copia»**: occupa forno e consegne, non stampa
  la comanda (la stampa il 2Bit), e entra anche a quarto pieno, come le piattaforme dalla 0073.
- **La rete di sicurezza è la doppia battitura** (strada 5), e l'API `/vendite` resta la **prova
  dei conti** a fine sera (strada 3), non una fonte per la cucina.
- **Per staccarsi del tutto** la strada è una sola: l'app nostra come **aggiornamento** della stessa
  app iPhone (è già nel conto Vi.Ru) e, su Android, il **trasferimento** da WEBAPP o un'app nuova
  (§25.4). Prima però serve il **pagamento online** su `/ordina`: oggi c'è solo contanti o POS alla
  consegna, e gran parte degli ordini dell'app oggi si paga con Nexi.

## 25.1 Cosa si sa già (le prove)

| Fatto | Dove |
|---|---|
| L'ordine dell'app nasce nel cloud di Velocissimo (`service.web-app.it/pluto-server/public/api/out/selforder/checkout`), non in negozio | `08` §8.3 n. 14 |
| Il cloud lo **spinge al PC di cassa** sulla porta 9000 (`DueBit.WebApiOWINServer.exe`), che lo scrive nel **SQL Server 2008 R2 locale** (`LOCALHOST\DUEBIT`, database `DD_DATABASE`), marcato `online=1` con `ExtIdOrdine`; testata in `PIZ_tabTestateComandeBackup` | `03` §3.1–3.3 |
| In cassa gira ancora il PC col 2Bit (risposta del 24/10) | `18` n. 1 |
| Public API v1 (`api.velocissimo.app/v1`, OAuth client credentials): 15 percorsi, **nessun webhook, nessun evento**; `GET /orders` vuole `phone` o `customer_id` (è «i miei ordini» di un cliente); l'Ordering API serve a **creare** ordini da fuori; `origin` «mai deliverect» | `05` §5.2, `08` §8.5 (spec letta il 23/10) |
| `GET /vendite` dà le righe per **scontrino** (data dello scontrino, non dell'ordine); niente indirizzo, cliente, orario richiesto, note | `mano-a-mano-os/src/app/chiusura/dalla-cassa/route.ts:16-36`; `15` §15.3 |
| Le credenziali OAuth della Public API esistono già, su Vercel dell'OS (`VELOCISSIMO_CLIENT_ID`, `VELOCISSIMO_CLIENT_SECRET`) | `mano-a-mano-os/src/lib/velocissimo.ts:42-43, 59-60` (letti i nomi, non i valori) |
| Back-office `/weborder`: 53 colonne, tabella server-side `POST /weborder/search`; **lo stato si cambia dalla riga** (non è sola lettura) | `24` §24.5, §24.7 |
| Volumi: settimana 17–24/10, 389 ordini: Deliverect 216, **app 95**, PC 70, totem 7, **sito 1**. Settembre in euro: Deliverect 17.142, **App 7.406**, PC 6.676, **Sito web 1.173**, Totem 664 | `13` §13.4, `24` §24.3 (dashboard Vendite) |
| Cassa nuova: `/api/ordini-esterni` (chiave `x-api-key`, canali `app`/`web`/…, idempotente su `id_esterno`) | `src/app/api/ordini-esterni/route.ts:9, 54-69` |
| `accetta_ordine_esterno` rifiuta a quarto pieno tutto ciò che non è piattaforma | `supabase/migrations/0073_ordini_piattaforme_sempre_dentro.sql:19, 35` |
| La coda di stampa prende ogni ordine con `stampato_il is null` | `supabase/migrations/0058_stampa_a_blocchi.sql:9` |
| `/api/deliverect/ordine` c'è ma la mappa dei canali è vuota | `src/app/api/deliverect/ordine/route.ts:13-14, 63-69` |
| Il guscio dell'app nostra c'è: Capacitor 7, `it.webapp.amanoamanopugliese`, 2.0.0, apre `/ordina` | `app-mobile/capacitor.config.json`, `app-mobile/android/app/build.gradle:7,10-11,22`, `app-mobile/ios/App/App.xcodeproj/project.pbxproj:351-376` |
| `/ordina` oggi: pagamento solo contanti o POS al rider | `src/app/ordina/page.tsx:66, 207`; `21` §8 |

**Verificato oggi (27/10) sul web, pagine pubbliche:**

- deliverect.com/en-gb/integrations/velocissimo: «Orders made on a variety of delivery platforms are
  then aggregated directly to your Velocissimo POS system». Velocissimo è il **POS**; gli ordini vanno
  **da** Deliverect **a** Velocissimo; dall'altra parte va solo il menù.
- help.deliverect.com/en/articles/15857585-velocissimo-solve-issues: parla solo di ordini che arrivano
  al POS Velocissimo (ritentarli, batterli a mano sul POS); nessun ordine dell'app verso Deliverect.
- help.deliverect.com/en/articles/15551147-velocissimo-dispatch-configure-for-a-location: «Velocissimo
  Dispatch» è un **partner di consegna** in Deliverect Dispatch: anche lì l'ordine va da Deliverect
  verso Velocissimo (per farlo consegnare), non il contrario.
- Trasferimento di un'app Android fra conti Google Play (guida pubblica GoodBarber, articolo a221):
  lo avvia il **proprietario**; servono i due conti attivi e l'ID di transazione della registrazione
  del conto che riceve; passano utenti, statistiche, voti e recensioni.

**Non verificato oggi:**

- La specifica OpenAPI `admin.velocissimo.app/api-docs/spec` oggi mostra la pagina di accesso
  («Accedi :: Velocissimo Admin»): non ho potuto riconfermare che dal 23/10 non siano comparsi
  webhook. Vale la lettura del 23/10 (`05`, `08`).
- Dal container gli host `url.velocissimo.app`, `service.web-app.it`, `api.velocissimo.app` e
  `amanoamano.it` sono bloccati dal proxy (403 sul tunnel); con WebFetch la web-app torna vuota.
  Non ho riletto il JavaScript di `validita_app.php`: vale `22` §22.2 (letto il 26/10).
- **Lo schema del database 2Bit** (nomi delle tabelle delle righe e delle variazioni, campo dello
  stato, se `PIZ_tabTestateComandeBackup` è la tabella viva o una copia) non l'ho visto: in `03`
  c'è solo quello che si ricava dalle viste del pacchetto di installazione.
- Se WEBAPP firma le app Android con **Play App Signing** (la chiave resta a Google e passa con
  l'app) o con una chiave sua (allora il trasferimento è più difficile).
- Se nel contratto con Velocissimo c'è una clausola sull'accesso al database locale o
  sull'automazione del back-office.

## 25.2 Le strade, una per una

Per ognuna: come funziona · cosa serve (Velocissimo / Edoardo / noi) · costo e rischi · ritardo
per ordine · regge un mese · cosa cambia per i clienti.

### Strada 1 — Leggere il database del 2Bit sul PC di cassa ⭐ (nuova, per il parallelo)

**Come funziona.** Gli ordini dell'app arrivano già al PC in pochi secondi (è così che oggi stampano
in cucina). Un piccolo agente nostro, accanto a `agente-stampa/agente.mjs` e con lo stesso stile
(Node, chiave in `chiave.txt`, niente credenziali Supabase), ogni 5–10 secondi chiede al SQL Server
locale **in sola lettura** «comande con `online=1` nuove dall'ultima volta», le traduce (righe,
variazioni, tipo, orario richiesto, indirizzo, telefono, pagamento, note) e le manda a un endpoint
della cassa nuova con `id_esterno = ExtIdOrdine`. L'idempotenza c'è già (`accetta_ordine_esterno`
riconosce i doppioni). Prende tutto ciò che il cloud manda al PC: **app, web-app/sito e totem**.

**Cosa serve.**
- *Da Velocissimo:* niente.
- *Da Edoardo:* l'ok a far girare l'agente sul PC 2Bit; una sera (o un pomeriggio a cassa aperta) per
  guardare insieme lo schema in sola lettura; un utente SQL di sola lettura (o la conferma che si può
  usare quello che c'è già, che **non scrivo qui**); risposta sul contratto (D25-3).
- *Da noi:* l'agente lettore; un endpoint «copia» (vedi §25.5): canale `app`/`web`/`totem`, entra
  anche a quarto pieno, **nasce già stampato** (se no la nostra stampante rifà la comanda che il 2Bit
  ha già fatto), segnato «da Velocissimo» in cassa; la mappa prodotti (`id_velocissimo` c'è già sul
  `prodotto`, 0013); gli annulli e i cambi di stato riletti ogni giro.

**Costo e rischi.** Pochi giorni di lavoro, nessun costo fisso. Rischi: lo schema è da scoprire e può
avere sorprese (variazioni, menu combo, nota «PAGO CON»); SQL Server 2008 R2 è vecchio (driver per
Node: va provato); se il PC è spento o internet è giù l'agente si ferma, **ma in quel caso si ferma
anche il 2Bit** (`14` 18:00), quindi non peggiora niente. Il 2Bit **non si tocca**: si legge e basta;
se l'agente si rompe, la serata va avanti come oggi. Rischio contrattuale da chiarire (D25-3).

**Ritardo.** Quello del cloud verso il PC (secondi) più il giro dell'agente: **10–20 secondi**.

**Regge un mese.** Sì: non dipende da sessioni web né da pagine che cambiano. L'unica cosa che lo
rompe è un aggiornamento del 2Bit che cambi lo schema (il pacchetto è del 2022 e il PC è lo stesso
del 2023: improbabile in un mese).

**Clienti.** Niente cambia: usano l'app di sempre.

### Strada 2 — API o webhook di Velocissimo/2Bit verso un POS esterno

**Come funziona.** Oggi **non esiste** (letto il 23/10, `05` §5.2; da riconfermare, la spec ora è
dietro login). L'unico «spingere» che Velocissimo fa è verso il proprio POS: il 2Bit sulla 9000 o il
Velocissimo POS nuovo. Fingersi il 2Bit sulla 9000 (`08` §8.4 strada A) vuol dire **staccare** il
2Bit dagli ordini: nel parallelo no.

**Cosa serve.** Chiedere a WEBAPP (Edoardo, per iscritto) se hanno un webhook, un'esportazione
continua o un «secondo POS» per lo stesso negozio. Il Velocissimo POS nuovo esiste (app Windows,
iPad, Android, `09` §9.1): se si potesse attivare **un secondo terminale** del loro POS, gli ordini
arriverebbero a due casse loro, non alla nostra.

**Costo e rischi.** Sconosciuti (moduli a pagamento, come l'Ordering API). Dire a Velocissimo che
stiamo costruendo la cassa per lasciarli può peggiorare il rapporto proprio nel mese in cui serve
che tutto funzioni.

**Ritardo.** Se esistesse: secondi. **Un mese:** sì. **Clienti:** niente.

### Strada 3 — Leggere da Velocissimo: Public API `/vendite` o export `/weborder`

**3a. Public API `GET /vendite` (lecita, documentata, credenziali già sull'OS).** Si può chiamare ogni
2–5 minuti durante la serata e prendere le righe con `venditaOrigine` = `app`, `webapp`, `sito`.
Ma `/vendite` conta **gli scontrini**: l'ordine compare solo quando è stato battuto, e non porta
indirizzo, cliente, orario richiesto né note (`mano-a-mano-os/src/app/chiusura/dalla-cassa/route.ts:16-36`).
- *Ritardo:* da minuti a ore (fino allo scontrino). **Inutile per la cucina e per le fasce.**
- *Serve per:* il **controllo di fine sera**: «gli ordini dell'app copiati nella cassa nuova sono
  tutti? i totali tornano?». Le credenziali vanno messe anche su Vercel della cassa (Edoardo) o la
  cassa chiede all'OS.
- *Un mese:* sì. *Clienti:* niente.

**3b. Back-office `/weborder` letto da un robot con le credenziali di Edoardo su Vercel.** Tecnicamente
ha tutto (53 colonne, stati, storia). Ma:
- è una sessione da browser (login, token CSRF, forse un secondo fattore): un robot che entra con
  la password di Edoardo è proprio quello che le regole del progetto vogliono evitare, e i termini
  d'uso di Velocissimo non lo prevedono (da verificare, D25-3);
- la stessa sessione **può cambiare lo stato degli ordini** (tendina nella riga, «Cambia stato» in
  blocco, `24` §24.5): un errore del robot finisce in cucina e al cliente;
- la pagina cambia quando la cambiano loro, senza avviso: in un mese è probabile almeno un intoppo;
- se Velocissimo vede accessi automatici può bloccare l'utenza di Edoardo, cioè il suo back-office.
- *Ritardo:* il giro del robot, **1–2 minuti**. *Un mese:* fragile. *Clienti:* niente.
- **Giudizio: no**, salvo come ripiego di una sera se la strada 1 si rompe e la 5 non basta.

### Strada 4 — Velocissimo manda gli ordini dell'app a Deliverect, noi li prendiamo da Deliverect

**Non esiste.** In Deliverect, Velocissimo è un **POS** (riceve gli ordini delle piattaforme e manda
il menù) e, come «Velocissimo Dispatch», un **servizio di consegna** (riceve gli ordini da
consegnare). In nessuna delle due integrazioni Velocissimo è un **canale** che genera ordini verso
Deliverect (pagine Deliverect citate in §25.1). Anche dall'altra parte: l'Ordering API dice che
`origin` non è mai `deliverect` (`05` §5.2). E anche se esistesse, un POS nuovo collegato a
Deliverect deve essere partner certificato (`23` §23.4).

Deliverect resta la strada giusta **per Glovo, Deliveroo e Just Eat** (`23` §23.4, strade A/C), non
per l'app.

### Strada 5 — Doppia battitura in cassa

**Come funziona.** Quando il 2Bit stampa un ordine dell'app, una persona lo ribatte nella cassa nuova
(`/cassa/nuovo`, tipo domicilio o asporto, orario e indirizzo dalla comanda), senza stampare.

**Cosa serve.** Una persona in più o un cassiere con tempo; una regola scritta (chi ribatte, quando,
come si segna che è una copia). Niente da Velocissimo.

**Costo e rischi.** Zero sviluppo; costa ore di lavoro. Circa **14 ordini dell'app a sera** (95 a
settimana) più qualche totem e sito: nelle sere piene arriva tutto insieme, ed è lì che si sbaglia
(un ordine dimenticato, un orario sbagliato). Gli errori falsano proprio quello che il parallelo
deve misurare (fasce piene, tempi).

**Ritardo.** 1–5 minuti, di più nel picco. **Un mese:** regge, ma stanca. **Clienti:** niente.

**Giudizio:** la **rete di sicurezza** dalla prima sera e il ripiego se la strada 1 si ferma.

### Strada 6 — Il sito: «Ordina» verso `/ordina`

Il sito amanoamano.it è nostro: il bottone «Ordina» oggi apre `url.velocissimo.app/so/?928` (`08`
§8.1). Puntarlo a `/ordina` porta **subito** gli ordini del sito nella nostra cassa, senza copie.
Pesa poco (1 ordine a settimana, 1.173 € a settembre). Nel parallelo però quegli ordini **non
arrivano al 2Bit**: o la cassa nuova comanda la cucina (stampa accesa, `21` D1 b) o vanno ribattuti
nel 2Bit. Senza pagamento online, chi pagava con Nexi trova solo contanti/POS. Il link vecchio
resta vivo per chi l'ha salvato. **Ritardo:** zero. **Un mese:** sì.

### Strada 7 — La stampante «ponte» (scartata)

Far stampare al 2Bit la comanda verso un nostro agente, che la gira alla stampante vera e ne legge
il testo. Ritardo di secondi, ma: si cambia la configurazione del 2Bit, se l'agente cade **la cucina
non riceve le comande**, e il testo di una comanda è più povero del database (niente id, prezzi
spesso assenti). **No**: la strada 1 legge gli stessi dati senza mettersi in mezzo.

## 25.3 Le strade in ordine

| # | Strada | Ritardo | Regge un mese | Rompe qualcosa | Serve da Velocissimo | Giudizio |
|---|---|---|---|---|---|---|
| 1 | **Database del 2Bit, letto dal PC** | 10–20 s | sì | no (sola lettura) | niente | **la strada per il parallelo**, da provare una sera |
| 5 | **Doppia battitura** | 1–5 min | sì, con fatica | no | niente | **rete di sicurezza** dalla prima sera |
| 3a | **`/vendite` dell'API** | fino allo scontrino | sì | no | niente (credenziali già sull'OS) | **controllo di fine sera**, non per la cucina |
| 6 | Sito → `/ordina` | 0 | sì | il sito perde Nexi | niente | quando c'è il pagamento online, o se la cassa nuova comanda la cucina |
| 2 | Webhook/«secondo POS» di Velocissimo | secondi | sì | no | tutto | chiedere solo se la 1 non si può fare |
| 3b | Robot sul back-office | 1–2 min | fragile | può cambiare stati | niente, ma contro le regole | no |
| 4 | Velocissimo → Deliverect → noi | — | — | — | — | **non esiste** |
| 7 | Stampante ponte | secondi | sì | se cade, la cucina non stampa | niente | no |

## 25.4 Staccarsi del tutto

L'ordine dei passi conta per via del **tasto di spegnimento** di Velocissimo (`validita_app.php`,
`22` §22.2): le app nostre vanno pronte e approvate **prima** di disdire.

**Prima di tutto (blocca il passaggio, non il parallelo).**
1. **Pagamento online su `/ordina`** (Nexi o altro, D11 di `21`): oggi `/ordina` accetta solo contanti
   o POS al rider (`src/app/ordina/page.tsx:66, 207`). Un'app nuova senza pagamento online è un passo
   indietro per i clienti.
2. **Area cliente minima** (`22` §22.4): accesso col telefono e un codice, i miei ordini, punti/coupon
   almeno in lettura, e le push.

**iPhone (id6453763774, conto Vi.Ru).**
3. Edoardo entra in App Store Connect e controlla chi ha accesso (se WEBAPP è utente del conto, va
   saputo e poi tolto **dopo** il taglio), l'abbonamento (99 $/anno) e i certificati (`22` §22.6).
4. Si costruisce la 2.0.0 da `app-mobile/` (serve un Mac o un giro GitHub su macOS), TestFlight,
   revisione Apple (1–3 giorni) con **rilascio manuale**: approvata e ferma.
5. Il giorno del taglio si pubblica. Chi ha l'app la riceve come aggiornamento, con le notifiche già
   permesse (`08` §8.6). Variante possibile: «rilascio graduale» di Apple (7 giorni) per avere pochi
   clienti veri sull'app nostra prima di tutti, **solo** se in quei giorni la cassa nuova comanda la
   cucina; chi aggiorna a mano lo prende subito comunque.

**Android (`it.webapp.amanoamanopugliese`, conto WEBAPP SRL).**
6. Edoardo apre il conto Google Play **di Vi.Ru come società** (25 $, D-U-N-S), `22` §22.6 n. 3.
7. **Trasferimento**: lo avvia solo WEBAPP; al conto che riceve serve l'ID di transazione della sua
   registrazione; passano utenti, voti, recensioni. Va chiesto **dopo** che l'app nostra è pronta e
   l'iPhone è approvato. Da verificare come firma WEBAPP (Play App Signing o chiave propria: D25-7).
8. **Se WEBAPP dice no** (o tarda): app nuova nel conto Vi.Ru con un identificativo nostro, approvata
   prima del taglio; i 500+ clienti Android vanno portati a scaricarla mentre la vecchia funziona
   (avviso nell'ordine, QR sui cartoni, messaggio a chi ha dato il consenso, coupon di benvenuto).
   Ripiego immediato senza store: `/ordina` nel browser con «Aggiungi a schermata Home».

**Il giorno del taglio.**
9. Sito → `/ordina`; iPhone pubblicato; Android trasferito o nuovo già in giro da settimane;
   Deliverect passato alla cassa nuova (`23` §23.4); centralino e fiscale pronti (`21` §15 B).
10. Si chiede a Velocissimo di spegnere l'app vecchia **dopo** il taglio, con un messaggio che dica
    dove andare (meglio il loro avviso che un'app oscurata senza spiegazioni).
11. La strada 1 (agente lettore) si spegne con il 2Bit.

## 25.5 Cosa servirebbe da noi per la strada 1 (da approvare, niente è stato fatto)

1. **Una sera di ricognizione** sul PC, con Edoardo: elenco tabelle e colonne di `DD_DATABASE` (sola
   lettura), un ordine dell'app di quella sera guardato nel 2Bit e nelle tabelle, per fare la mappa.
2. **L'agente lettore** (`agente-stampa/` come modello): giro ogni 5–10 s, «ultimo id visto» salvato
   su file, invio con chiave (`x-api-key`) a un endpoint nuovo, log in chiaro, nessuna scrittura sul
   SQL Server.
3. **Un endpoint e una funzione «copia»** (migrazione nuova, da approvare): stessa logica di
   `accetta_ordine_esterno`, ma
   - entra anche a quarto pieno o fuori dai quarti, con l'avviso in nota (come le piattaforme, 0073):
     l'ordine è già stato accettato da Velocissimo, rifiutarlo vuol dire solo perderlo dai conti;
   - `stampato_il` valorizzato alla nascita, così `coda_stampa()` non lo stampa (0058 riga 9);
   - un segno «copia da Velocissimo» visibile in cassa e nell'export, e **fuori** da `/api/vendite`
     e `/api/ordini/csv` verso l'OS, finché l'OS legge Velocissimo (se no la serata conta doppio);
   - annullo e cambio d'orario riletti dal 2Bit e riportati.
4. **Il controllo di fine sera** con `/vendite` (strada 3a): ordini app in Velocissimo contro copie in
   cassa, la differenza scritta.

## 25.6 Domande per Edoardo

- **D25-1. Il parallelo, per gli ordini dell'app**: va bene la strada 1 (un agente che **legge** il
  database del 2Bit sul PC di cassa e copia gli ordini dell'app nella cassa nuova, senza stamparli),
  con la doppia battitura come riserva? *Cosa cambia:* se no, resta la doppia battitura per tutto il
  mese.
- **D25-2. Una sera di ricognizione sul PC**: quando possiamo guardare insieme, in sola lettura, le
  tabelle del 2Bit con un ordine dell'app vero davanti? Serve l'accesso al PC (di persona o col
  controllo remoto).
- **D25-3. Il contratto con Velocissimo**: c'è qualcosa che vieta di leggere il database del PC o di
  automatizzare il back-office? Puoi mandarmi le condizioni (senza credenziali)?
- **D25-4. Chiedere a Velocissimo un webhook o un secondo POS?** Preferisci non dirgli niente finché
  non siamo pronti (consiglio), o chiedere per iscritto se esiste un'esportazione continua degli ordini?
- **D25-5. Il sito durante il parallelo**: «Ordina» resta su Velocissimo fino al taglio (consiglio,
  finché `/ordina` non ha il pagamento online), o lo spostiamo subito su `/ordina`?
- **D25-6. App Store Connect**: chi ha accesso al conto Vi.Ru (c'è qualcuno di WEBAPP?), fino a quando
  è pagato l'abbonamento, e chi ha caricato la 1.0.0 nel 2023?
- **D25-7. Android**: apri il conto Google Play di Vi.Ru come società? E quando l'app nostra è pronta,
  chiediamo a WEBAPP il trasferimento (e come firmano: Play App Signing?) o andiamo diretti con
  un'app nuova?
- **D25-8. Pagamento online** (è la D11 del `21`): il conto Nexi è tuo o passa da Velocissimo? Senza
  pagamento online l'app nostra non può sostituire la loro.
- **D25-9. Il controllo di fine sera**: posso usare le credenziali della Public API che l'OS ha già
  (le metti tu anche su Vercel della cassa, oppure la cassa chiede all'OS)?

## Fonti

- Repo `cassa-dev`: `docs/rea/03`, `05`, `08`, `13`, `14`, `15`, `16`, `18`, `21`, `22`, `23`, `24`;
  `src/app/api/ordini-esterni/route.ts`, `src/app/api/deliverect/ordine/route.ts`,
  `src/app/api/vendite/route.ts`, `src/app/ordina/page.tsx`; migrazioni 0006, 0058, 0073;
  `app-mobile/`, `.github/workflows/app-android.yml`, `agente-stampa/agente.mjs`.
- Repo `mano-a-mano-os`: `src/lib/velocissimo.ts`, `src/app/chiusura/dalla-cassa/route.ts`.
- Web (27/10/2026): deliverect.com/en-gb/integrations/velocissimo ·
  help.deliverect.com/en/articles/15857585-velocissimo-solve-issues ·
  help.deliverect.com/en/articles/15551147-velocissimo-dispatch-configure-for-a-location ·
  goodbarber.com/help/manage-developer-accounts-apple-google-r97/android-transfer-an-app-to-a-different-google-play-account-a221/ ·
  admin.velocissimo.app/api-docs/spec (oggi mostra il login: non riletta).
