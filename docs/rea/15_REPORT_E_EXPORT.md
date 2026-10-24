# REA · 15. Report ed export: cosa dà Velocissimo a mano-a-mano-os e cosa deve dare la cassa nuova, campo per campo

*Terzo passaggio del REA, 24/10/2026. Lo scopo: il giorno del cambio **mano-a-mano-os non deve
accorgersene**. Fonti: il CSV vero `fixtures/csv/export_18_REALE_20-06-2026.csv` dell'OS (65
ordini del 20/06/2026, 40 colonne), il parser `src/domain/chiusura/parse-csv-velocissimo.ts`,
l'import `src/app/api/velocissimo/import` con `src/lib/velocissimo.ts` (`RigaVendita`) e la
migrazione OS `112_velocissimo_vendite_righe.sql`; dalla parte nostra `supabase/migrations/0025`
(`v_vendite_giornata`, `vendite_giornata`, `vendite_giornata_totali`) e `src/app/api/vendite`.
Nessun dato personale: solo nomi di colonne e vocabolari.*

## 15.1 Cosa legge oggi mano-a-mano-os, da dove

| Lettore nell'OS | Fonte Velocissimo | Cosa ne fa |
|---|---|---|
| `POST /api/velocissimo/import` (giro notturno) | **Public API `GET /vendite`** (una giornata lavorativa per chiamata, 28 ore) | `vendite_righe` (una riga per articolo e per variazione, chiave `id_elemento`) + `vendite_giorno_riepilogo` (totale, netto, documenti, coperti, importo scontato, pagamenti per metodo) |
| `/chiusura/dalla-cassa` | la stessa API | totale, **contante** (righe con `metodo_pagamento = 'contanti'`), numero scontrini, coperti, ultimo scontrino |
| `controllo-14-giorni` | `vendite_righe` | somma `totale_scontrino` dove `metodo_pagamento` è «contanti» |
| `/chiusura` → carica CSV | **export `/weborder`** del back-office (40 colonne, una riga per ordine, note su più righe) | la **ripartizione per canale**: sala / interno / asporto, Glovo / Deliveroo / Just Eat dal testo della nota, contanti / POS / online, consegne per rider con contanti da riportare, orario, zona, ritardo, coperti |

Quindi la cassa nuova deve dare **due cose**, non una: la riga di vendita per articolo (c'è: 0025)
e **l'export per ordine con le 40 colonne** (manca).

## 15.2 Il CSV `/weborder` colonna per colonna

Vocabolario vero (dal CSV del 20/06 e dalle 389 righe della settimana 17–24/10):
**Tipo** = `Ritiro` / `Domicilio` / `Banco` / `Tavolo` · **Origine** = `Da app` / `Da PC` / `Da
Deliverect` / `da totem` (minuscolo!) / `Da sito web` / `Da backoffice` · **Pagamento** = `Pagamento
online` / `Contanti alla consegna` / `Contanti alla cassa` / `Bancomat alla cassa` / `Bancomat alla
consegna` · **Stato** = `Ritirato dal cliente` / `Consegnato` / `Annullato` / … · **Rider** = `Rider
1` … `Rider 11` (un nome di comodo, non la persona) · **#** = `C-52127` / `APP-52120` / `WEB-…`
(C- anche per Deliverect e totem) · **# Comanda** = progressivo del giorno della cassa (tavoli 0) ·
date `20/06/2026 19:15:13`, ore `19:15:00`, numeri con il punto, separatore virgola, UTF-8.

| # | Colonna CSV | L'OS la usa? | Nella cassa nuova | Stato |
|---|---|---|---|---|
| 1 | `#` | sì (`codice`) | `ordine.numero` con prefisso (0027: C-, TEL-, APP-, W-, T-, G-, D-, J-) | **in parte**: i prefissi sono più di tre; l'OS li tratta come testo, va bene; il Deliverect da noi è G-/D-/J- e non C-: l'OS non guarda il prefisso per il canale, guarda la nota (riga 21) |
| 2 | `# Comanda` | sì (numero in lista) | — | **manca**: progressivo del giorno (1..N, tavoli 0) |
| 3 | `Orario di ritiro` | sì, ma è **sempre vuoto** (cade su «Data ed ora ordine») | — | vuoto va bene |
| 4 | `Orario richiesto` | no | `ora_consegna` | sì |
| 5 | `Negozio` | no | `negozio.nome` | sì |
| 6 | `Stato` | sì (esclude annullati; vuoto = tenuto) | `stato` | **da tradurre**: `consegnato` → `Consegnato`, `ritirato` → `Ritirato dal cliente`, `annullato` → `Annullato` |
| 7 | `Cliente` | no (non va nel documento) | `cliente.nome` | sì (resta fuori dai doc) |
| 8 | `Rider` | **sì**: consegne per rider, contanti da riportare | `rider.nome` | **da decidere**: Velocissimo esporta «Rider N»; l'OS fa la chiusura per rider coi nomi che la sera lo staff abbina a mano. Col nome vero l'abbinamento sparisce: meglio, ma va detto alla Chiusura |
| 9 | `Tipo` | **sì** (sala / interno / asporto) | `tipo` | **da tradurre**: `tavolo` → `Tavolo`, `banco` → `Banco`, `ritiro` → `Ritiro`, `domicilio` → `Domicilio` |
| 10 | `Tavolo` | no | `tavolo.nome` | sì |
| 11 | `Sala` | no | | sì |
| 12 | `Cellulare` | no | | fuori dai doc |
| 13 | `Cliente` (ripetuta) | no | | |
| 14 | `Data creazione` | sì (ripiego per l'orario) | `creato_il` | sì, formato `gg/mm/aaaa hh:mm:ss` |
| 15 | `Data ed ora ordine` | **sì** (l'orario della lista) | `ora_consegna` | sì |
| 16 | `Data ordine` | no | | sì |
| 17 | `Totale` | **sì** (tutte le somme) | `totale` (**con** la consegna dentro, come Velocissimo) | sì; punto decimale |
| 18 | `Costo Consegna` | no (è sempre vuoto) | `costo_consegna` | **meglio**: noi lo scriviamo; l'OS oggi non lo legge, domani può |
| 19 | `Origine` | **sì** (`isOrigineAppSito`: «app», «sito web») | `canale` | **da tradurre**: `app` → `Da app`, `web` → `Da sito web`, `cassa`/`telefono` → `Da PC`, `totem` → `da totem`, `glovo`/`deliveroo`/`justeat` → `Da Deliverect` |
| 20 | `Pagamento` | **sì** (`contanti` / `online` / il resto = POS) | `pagamento` + `pagato_online` + `tipo` | **da tradurre**: online → `Pagamento online`; contanti + domicilio → `Contanti alla consegna`; contanti altro → `Contanti alla cassa`; pos + domicilio → `Bancomat alla consegna`; pos altro → `Bancomat alla cassa`. Le piattaforme → `Pagamento online` |
| 21 | `Note` | **sì**: `GLOVO` / `DELIVEROO` / `JUST_EAT` nel testo decidono la piattaforma | `note` + `canale` | **da fare**: finché l'OS legge così, l'export scrive in testa alla nota `GLOVO <n>` / `DELIVEROO <n>` / `JUST_EAT <n>` per gli ordini delle piattaforme (e volendo «PAGATA CON …[N ORD.]» come oggi); poi l'OS passerà a leggere `Origine` nostra |
| 22 | `Orario associazione rider` | no (sempre vuoto) | `consegna.assegnata_il` | meglio |
| 23 | `Orario di partenza` | no | `consegna.ritirata_il` | sì |
| 24 | `Orario di consegna effettivo` | sì (`orarioConsegna`) | `consegna.consegnata_il` | sì, `hh:mm:ss` |
| 25 | `Distanza percorsa` | sì ma sempre vuota | — | vuoto |
| 26 | `Ritardo consegna (s.)` | sì (`ritardoSec`) | `consegnata_il − ora_consegna` in secondi (negativo = anticipo) | **da calcolare** |
| 27 | `Ritardo consegna` | no | testo «2 m 41 s.» | facoltativo |
| 28 | `Coperti` | sì (`coperti`, asporto) | `coperti` sull'ordine (tavolo) / 1–2 per asporto | **da aggiungere** per gli asporti (Velocissimo li chiede sempre: «coperti asporto» 1–8) |
| 29 | `Telefono` | no | | fuori |
| 30 | `Nazione` | no | | `Italy` o vuoto |
| 31 | `Sconto` | no | `sconto` / coupon | sì (negativo, come loro) |
| 32–34 | `CAP/Città/Provincia Negozio` | no | `negozio` | sì |
| 35–38 | `Città`, `Provincia`, `Indirizzo`, `Civico` | no | `indirizzo` | fuori dai doc |
| 39 | `Zona` | sì (`zona`) | `zona.nome` (**gli stessi 16 nomi**, mig. 0019) | sì |
| 40 | `Gruppo di zone` | sì (`gruppoZone`) | — | costante `LIMITAZIONE` per i domicili, vuoto per il resto |

**Le due trappole del CSV che l'export nostro deve riprodurre finché l'OS non cambia:**
1. la **nota a più righe** (il CSV ha 97 righe fisiche per 65 ordini): l'export deve quotare bene
   il campo, il parser dell'OS lo gestisce;
2. **il canale delle piattaforme sta nella nota**, non in Origine (per Velocissimo sono tutti «Da
   Deliverect»). Scrivere `GLOVO`/`DELIVEROO`/`JUST_EAT` nella nota dell'export è una riga di SQL;
   togliere la regola dall'OS è un cambio alla Chiusura, cioè a una pagina congelata: **si fa
   dopo, d'accordo con la Direzione dell'OS**.

## 15.3 La riga di vendita: `RigaVendita` dell'API contro `v_vendite_giornata`

| Campo API (come lo legge `normalizzaRiga`) | `v_vendite_giornata` (0025) | Stato |
|---|---|---|
| `Id` (ordine) | `"Id"` = `ordine.id` (uuid) | sì (l'OS lo tratta come testo) |
| `cassa` | `'cassa-nuova'` | sì |
| `dataChiusura` | taglio alle 06:00 di Roma | sì |
| `dataScontrino`, `oraScontrino` | da `creato_il` | **da rivedere**: per Velocissimo è l'ora dello **scontrino**; finché non c'è il fiscale va bene la creazione, poi l'ora del documento |
| `totaleScontrino` | `ordine.totale` | sì |
| `metodoPagamento` | `online` / `pos` / `contanti` / `piattaforma` | **attenzione**: l'OS somma il contante dove il testo è esattamente `contanti` (ok); `piattaforma` è un valore nostro che l'API non ha: l'OS non lo conta né come contante né come POS, che è quello che vogliamo |
| `pagamentiScontrino[]` (metodo, importo) | — | **manca**: per lo split (più pagamenti su un documento) e per `vendite_giorno_riepilogo.pagamenti` |
| `venditaTipo` = banco / domicilio / consumazione / ritiro | sì (`tavolo` → `consumazione`) | sì |
| `venditaOrigine` = app / manuale / sito / centralino / totem / deliverect / … | sì | sì; in più `canale` nostro con la piattaforma vera |
| `riderId` | `consegna.id_rider` | sì |
| `idElemento` (DET123 / VAR45) | `DET`/`VAR` + 12 esadecimali dell'id riga | sì (**unico per sempre**: l'OS fa upsert su questo) |
| `idArticolo` (PROD99) | `id_prodotto` (uuid) + `idArticoloVelocissimo` | sì; l'OS può continuare a incrociare col codice Velocissimo finché i prodotti restano quelli |
| `tipoArticolo` | `articolo` / `variazione` (+ `tipoVariazione` aggiunta/rimozione) | sì |
| `idElementoPadre` | sì | sì |
| `idArticoloPadre` | — | **manca** (facile: `id_prodotto` della riga padre) |
| `AliquotaIva` | `prodotto.aliquota_iva` (default 10) | sì — **da verificare** le aliquote vere: bevande 22, pizze 10, asporto vs tavolo (la `Prodotti.csv` del 2Bit ha «Codice IVA» e «Codice Iva Asporto» separati!) |
| `numeroCoperti` | — | **manca** |
| `articolo` | descrizione riga | sì |
| `formato` | — | **manca** (noi non abbiamo formati: va scritto vuoto, non assente, se no `normalizzaRiga` lo vede null e va bene; meglio esplicito) |
| `descrizioneArticoloConFormato` | — | **manca** (= `articolo` quando non c'è formato) |
| `categoria` | `categoria.nome` | sì |
| `prezzoVenduto`, `prezzoVendutoNettoIva`, `prezzoListinoNettoIva` | sì | sì; il «listino» per le righe di menu è quello del pacchetto |
| `quantita` | sì | sì |
| `scontoInRiga` | sempre 0 | **da fare**: coupon e sconto manuale oggi non scendono sulle righe; l'OS somma `importoScontato` dalle `informazioni`, che da noi non c'è |
| `informazioni.numeroDocumenti`, `totale`, `totaleNetto`, `iva` | `vendite_giornata_totali` | sì |
| `informazioni.numeroCoperti`, `importoScontato` | — | **mancano** |
| `informazioni.pagamenti[]` per metodo | — | **manca** (`vendite_giorno_riepilogo.pagamenti`) |
| `informazioni.perTipo`, `perOrigine` | nostri in più | bene |

Le **righe \*GESTIONALE\*** del 2Bit (816 a ottobre, −1.601 €: sconti e servizio come righe
negative) **non esistono da noi**: lo sconto sta sull'ordine. Per l'OS è meglio così, purché
`importoScontato` e `scontoInRiga` arrivino.

## 15.4 La chiusura della sera: cosa non c'è da nessuna parte

Velocissimo **non manda** le chiusure X/Z al cloud (`/day-report` vuoto da sempre) e l'OS non le
ha mai avute: la Chiusura dell'OS la compila lo staff e la verifica col CSV. Quindi la cassa
nuova non deve imitare niente qui; deve dare all'OS, per la giornata lavorativa:

- incassato per metodo (contanti in cassa, POS in cassa, contanti ai rider, POS ai rider, online
  nostro, piattaforme) — `vendite_giornata_totali.pagamenti` (**da aggiungere**);
- per rider: consegne, totale, contanti riportati, saldato — già in `rider_borsello` (0024/0033),
  **da esporre** nell'export;
- quando ci sarà il fiscale: il numero della Z, il totale dei corrispettivi e gli annulli.

## 15.5 I report del back-office che l'OS rifà da sé, se l'export porta i campi

| Report Velocissimo | Campi che servono | Nell'export nostro |
|---|---|---|
| Negozio (ordini, totale, margine, già pagati, da pagare, rifiutati, sconti, medio) | totale, pagato_online, stato, sconto, **food cost per prodotto** | tutto tranne il margine, che l'OS ha col suo food cost |
| Rider (consegnati, contanti, versato, in ritardo, tempo medio) | rider, tipo, pagamento, orari di partenza/consegna, ritardo, saldato | sì con i tre orari della consegna |
| Zone (ordini, €) | zona | sì |
| Sconti (per coupon, manuale) | coupon, sconto | sì quando ci sarà lo sconto manuale |
| Categorie e prodotti (qtà, €, margine) | riga per articolo con categoria e `id_prodotto` | sì (0025) |
| Coperti per fascia | coperti, ora | dopo i coperti sugli asporti |
| Dashboard «persone servite», «spesa a persona» | coperti | idem |

## 15.6 Cosa aggiungere, in ordine (è il lavoro «export» del piano)

1. **`v_ordini_giornata` + `GET /api/ordini-giornata?giornata=…&formato=csv`** con **le stesse 40
   intestazioni** del CSV `/weborder`, nello stesso ordine, con le traduzioni di Tipo / Origine /
   Pagamento / Stato di §15.2, «# Comanda» progressivo del giorno, Ritardo in secondi, Zona e
   Gruppo di zone, e la **nota con `GLOVO` / `DELIVEROO` / `JUST_EAT`** per le piattaforme. Prova
   di accettazione: il parser dell'OS (`parse-csv-velocissimo.ts`) lo legge **senza modifiche** e
   dà gli stessi canali di una serata contata a mano.
2. **Completare `v_vendite_giornata`**: `formato` (vuoto), `descrizioneArticoloConFormato`,
   `numeroCoperti`, `idArticoloPadre`, `scontoInRiga` ripartito, `pagamentiScontrino[]`;
   `informazioni.numeroCoperti`, `importoScontato`, `pagamenti[]`.
3. **Aliquote IVA vere per prodotto** (bevande 22 %, il resto 10 %; tavolo = asporto per
   l'aliquota? la `Prodotti.csv` del 2Bit le teneva separate): domanda n. 12 in `16`.
4. **Coperti sugli asporti** (1–2 di solito, chiesti al telefono come fa Velocissimo).
5. **Per rider nell'export**: consegne, contanti riportati, saldato (da `rider_borsello`).
6. Dopo il fiscale: `dataScontrino`/`oraScontrino` = ora del documento, numero Z, annulli.

Quando l'OS vorrà smettere di leggere il canale dalla nota, il cambio è suo (Chiusura congelata):
l'export nostro avrà già `Origine` e `canale` giusti.
