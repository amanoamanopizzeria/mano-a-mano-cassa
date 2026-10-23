# REA · 9. La cassa Velocissimo a fondo: cosa fa che la nostra non fa ancora

*Scritto il 24/10/2026. Fonti: il video ufficiale «NUOVO VELOCISSIMO RISTO» (YouTube
`ruyU1g0XgnU`, 25:30, pubblicato il 25/07/2026, presentato da Vincenzo Pignatiello),
**ascoltato per intero** dai sottotitoli automatici (minutaggi sotto = dove se ne parla nel video); il back-office
`admin.velocissimo.app` in sola lettura (stati ordine, negozio, menu); la scheda App Store di
«Velocissimo POS» (id6443659325); l'analisi del pacchetto `SETUP 2BIT.rar`
(`/mnt/project-files/analisi-2bit/Analisi SETUP 2BIT.md`) e quella del video
(`…/Video - NUOVO VELOCISSIMO RISTO (analisi).md`). Completa `03_CASSA_2BIT.md`.*

## 9.1 Due casse, non una

| | Vecchia (2Bit / DueBit) | Nuova («Velocissimo POS», quella del video) |
|---|---|---|
| Dove gira | PC Windows, SQL Server 2008 R2 locale, `DueBit.WebApiOWINServer.exe` sulla porta 9000, `ping-executer` che dice al cloud l'IP del negozio | app per Windows, iPad/iPhone (App Store: WEBAPP s.r.l., v2.2.79, iOS 15+, 39,7 MB) e Android; dati e configurazione **in cloud** |
| Ordini dall'app | il cloud li spinge al PC: **PC spento o internet giù = l'app non prende ordini** (video 2:30–3:30) | restano nel cloud; senza internet in negozio l'app continua a ordinare, si leggono dal back-office o da un telefono in 4G |
| Configurazione | sul PC | solo dal cloud; la cassa «scarica le configurazioni» con un tasto (fine del video, 22:32–24:38) |
| Novità 2.2.79 | — | cassa e tavoli anche come **palmare dei camerieri** o cassa mobile |

Quale gira oggi in pizzeria non lo dice il back-office; il totem usa già l'indirizzo locale
del Velocissimo POS nuovo (`http://<ip>:37150/upsert-order`, vedi `12_TOTEM.md`). **Domanda
per Edoardo**: in cassa c'è ancora il PC col 2Bit o il Velocissimo POS nuovo?

## 9.2 Le funzioni, una per una, contro la nostra cassa

Legenda: ✅ c'è · 🟡 in parte · ❌ manca. «Nostra» = repo `mano-a-mano-cassa` al commit
`fb68ca1`, migrazioni 0001–0033.

### Fasce e capacità (il punto che Edoardo ha chiesto)

| Velocissimo | Fonte | Nostra |
|---|---|---|
| **Planner a quarti d'ora**: righe = fasce di 15 min, colonne = reparti (Pizze, …) e **rider**; ogni cella «occupate/massimo», arancione vicino al pieno | video 14:11, la slide «Modifica planner» | ✅ `/cassa/fasce` (scadenzario) + `fascia_capacita` (mig. 0016) |
| **Si cambia il massimo di una sola fascia**: tocco sulla cella → finestra «rider 17:45 — 3 / 2», −/+, «1 cons», ANNULLA/OK | video 14:11 | ✅ eccezione per fascia in `fascia_capacita` |
| **Blocco di una fascia** «per impegno di consegne o di prodotti» (prima si facevano ordini finti) | video 14:11–14:34 | ✅ `fascia_bloccata` (mig. 0005) |
| Capacità che nasce dal personale del giorno | — (Velocissimo la scrive a mano) | ✅ meglio: `/cassa/capacita`, pizzaioli → pizze, rider → consegne |
| **Fascia piena mostrata «SOLD OUT»** invece di sparire, nell'app | video 22:31; checkout `parsedTimeslots[].soldOut` | 🟡 l'app è ancora la loro; il nostro totem e la futura pagina d'ordine devono mostrarla piena, non toglierla |
| Attese minime per tipo (domicilio 15, ritiro 15, totem vuota), ampiezza fascia domicilio +30 «in aggiunta», ritiro 0 | negozio → Selforder | ✅ `orario` (mig. 0022) |
| Orari per tipo di carrello (apertura, consegna, ritiro, banco) e periodi di chiusura | negozio → Orari | ✅ mig. 0022 · 🟡 periodi di chiusura col messaggio |

### Ordini

| Velocissimo | Fonte | Nostra |
|---|---|---|
| Lista per **stato** (in corso / in consegna / completati), colori, **minuti di ritardo o mancanti** | video 8:48 | 🟡 lista c'è; manca il conto alla rovescia sul minuto e il colore del ritardo |
| **Storia degli stati** con l'ora (creato, in lavorazione, ritirato dal fattorino, consegnato) | video 11:50 | ✅ `ordine_stato_log` (mig. 0027) |
| 8 stati configurabili con colore e «fase POS» (Creazione, Vendita, Stampa, In preparazione, Preparata, In consegna, Consegnato, Annullato, Ritirato, Banco, Associazione rider, Da confermare) e flag **preordine** (va nell'area preordini e non si stampa da solo) | `/weborderstatus` | 🟡 i nostri stati sono fissi; manca l'area preordini che non stampa |
| Per ogni stato: **email** e **push al cliente** (titolo, testo coi segnaposto, ritardo, azione) e **avviso ai rider** | `/weborderstatus/{id}/edit` | ❌ → `11_PUSH_E_AVVISI_AL_CLIENTE.md` |
| Tasti WhatsApp Web e telefono sull'ordine | video 12:10 | 🟡 telefono sì; WhatsApp no (Edoardo: avvisi dentro l'app) |
| **Annullo del documento** dall'ordine completato; **più scontrini su un ordine**; modifica di un ordine già scontrinato | video 12:26, 20:32 | ❌ niente scontrino fiscale ancora |
| Giorni passati consultabili | video 15:24 | 🟡 riepilogo del giorno; manca lo storico per data |
| Indirizzi con Google Maps (prima: stradario Excel) | video 12:50 | ✅ `/api/indirizzi`, zona a poligono |
| Modifica ordine dall'API con **ristampa** marcata | spec `PUT /orders/{id}` | ❌ ristampa con la scritta «RISTAMPA» |

### Rider

| Velocissimo | Fonte | Nostra |
|---|---|---|
| Il rider **si prende da solo** la prima comanda dall'app | `04_RIDER`, app RIDER | ✅ `prendi_consegna` (mig. 0032) |
| **Assegnazione manuale** dalla cassa, con mappa e stato del rider, posizione suggerita | video 18:52 | ❌ la mappa (`/cassa/mappa`) mostra, non assegna |
| Mappa rider in tempo reale nella stessa schermata degli ordini, «rientra fra X min» | video 14:06 | 🟡 mappa sì, ETA di rientro no |
| Percorso negozio → cliente su ogni domicilio | video 19:52 | ❌ |
| Report rider (numero comanda, per pagamento) + **borsello** (prelievi, depositi, conto finale) anche nell'app rider | video 21:36, `/borsello-rider` | ✅ `rider_movimento`, `rider_borsello`, `rider_salda`, `/cassa/rider` (mig. 0024, 0033) |
| Cliente che segue il rider sulla mappa (ogni 10 s) | JS `ordine_recupera_posizione.php` | ✅ `/segui/[token]` (mig. 0032) — manca come mandarlo: `11_…` |
| Notifica ai rider per stato (a tutti del gruppo di zona / solo oggi / all'assegnato) | `/weborderstatus` | ❌ |

### Sala, tavoli, prenotazioni

| Velocissimo | Fonte | Nostra |
|---|---|---|
| Mappa sala facile da disegnare; **tavolo che cambia colore** dopo un tempo (es. 1 h) | video 8:32 | 🟡 `/cassa/tavoli` (10 dentro + 5 fuori, mig. 0031), senza colori a tempo |
| Anteprima tavolo: storico, coperti, da quanto è aperto, **preconto** | video 9:26 | 🟡 manca preconto e tempo |
| Palmare camerieri (anche iPhone) | video 11:36, App Store 2.2.79 | 🟡 la cassa è web e gira sul telefono, ma non c'è una vista «palmare» |
| Prenotazioni in cassa (tavolo, coperti, fascia, turni) + modulo online + Reserve with Google | video 13:28 | ❌ |

### Cassa e soldi

| Velocissimo | Fonte | Nostra |
|---|---|---|
| Scontrino fiscale (Epson RT, fine carta gestita, errori a video) | video 4:14 | ❌ il passo successivo grande |
| **Monitor cliente** (pubblicità a riposo, scontrino in corso) e **cassa automatica** (inserito, manca, resto) | video 16:14 | ❌ (non chiesto) |
| Card unica punti + credito; ricarica prepagata in cassa, per operatore | video 17:18 | 🟡 punti e credito (mig. 0026); ricarica in cassa no |
| Coupon in cassa: codici, €/%, prodotto omaggio, 3×2, consegna gratis; si vedono ottenuti e ottenibili | video 19:34 | 🟡 `coupon_verifica/applica` (mig. 0026); 3×2 e consegna gratis no |
| Menu combo guidato | video 20:50 | ✅ mig. 0023 |
| Listini illimitati, cambio per canale | video 18:26 | ✅ L1/L2/L3 per canale |
| Lista documenti con filtri | video 15:52 | ❌ |
| Statistiche in cloud | video 22:32–24:38 | — le fa `mano-a-mano-os` |

### Stampa

| Velocissimo | Fonte | Nostra |
|---|---|---|
| Stampa comanda e scontrino «immediate»; comanda per reparto (un reparto solo: PIZZE; il resto per gruppo) | video 1:28, `01_BACKOFFICE` §1.4 | 🟡 `/cassa/comanda/[id]?stampa=1` (Chrome in kiosk-printing, 80 mm); manca un agente di stampa vero (ESC/POS) e la stampa automatica all'arrivo di un ordine esterno |
| Stampa dal totem sulla stampante della cassa (`tallonSettings.printType 2`) | JS totem | ❌ vedi `12_TOTEM.md` |

## 9.3 Cosa ne esce

Le cinque mancanze della cassa che contano di più, nell'ordine in cui le metterei:
1. **Stampa automatica** di ogni ordine che arriva (app, sito, totem, Deliverect) — senza,
   un ordine esterno di sera non lo vede nessuno.
2. **Avvisi al cliente per stato** dentro l'app (push) — `11_…`.
3. **Assegnazione del rider dalla cassa** sulla mappa, accanto all'auto-assegnazione.
4. **Fascia piena mostrata come piena** e **area preordini** che non stampa finché non è ora.
5. **Scontrino fiscale** (Epson RT) e annullo dall'ordine.
