# REA 28 · Cosa manca rispetto al 2Bit, dopo la lettura del PC di cassa (27/10/2026)

*Domanda di Edoardo (27/10, 01:19Z): «adesso che hai accesso al PC e controlli le stampanti, fai un'altra analisi stracompleta per capire cosa ci manca di tutte le cose loro».*

Questo capitolo **aggiorna** il REA 21 (26/10, 143 voci) con quello che si vede solo sul PC di cassa, cioè il lato 2Bit com'è davvero installato. Il REA 21 resta la tabella completa del lato nostro; qui ci sono le **correzioni** a quello che i REA 03, 13 e 14 davano per scontato, le **voci nuove** e le **letture che restano da fare**. Dove una voce del REA 21 non cambia, non viene ripetuta.

**Regole rispettate:** sola lettura sul PC (nessuna scrittura nel database, nessuno stop di servizi, nessuna stampa, nessuno scontrino, nessuna impostazione toccata). Password, chiavi e token non sono riportati. Le letture di REA 27 sono quelle da cui partono queste conclusioni.

**Fonti:** REA 27 (PC di cassa, 27/10), REA 21 (stato nostro, 26/10, `main` `b3947d8`), `origin/main` a `d813db9` (migrazioni fino alla 0080, storico Velocissimo: tabelle create e vuote, pagina `/cassa/importa`).

## 0. In breve

- **Tre cose del REA 21 vanno corrette con il PC.** (1) Le comande sono **due**, non una: la PIZZERIA (192.168.1.12) e l'ASP (TM-T88V USB, centro Asporto). L'instradamento c'è, in `PIZ_tabBalancingCDP`: ogni ordine esce completo sull'ASP, e sulla PIZZERIA escono le pietanze del centro Pizzeria. Non esiste una stampante «cucina» per nome. (2) La fiscale è un Epson FP-81 II RT in LAN, non una Ditron. (3) Il database 2Bit si chiama `DD_AMANOAMANOPUGLIESE`, non `DD_DATABASE`.
- **Gli ordini esterni si distinguono solo dal testo delle note**, e il pagamento «PAGATA CON PAYPAL» è un default del cloud: il nostro modello deve avere campi propri per canale, ID esterno e metodo di pagamento.
- **Il 2Bit fa più di quello che il REA 21 contava** in tre punti: 49.059 scontrini salvati in locale, 10.000 tessere fedeltà e 11.885 movimenti punti (contro le 1.578 card e i 37.877 punti del cloud), 30 report di vendita (`stats-pack`). Sono i dati da importare, e vanno confrontati prima di spegnere.
- **Il totem non lascia traccia nel 2Bit**: nei 30 giorni letti non c'è nessun ordine con «TOTEM» nella nota, e la tabella di stato delle richieste totem è vuota. Non sappiamo ancora se il totem sia in uso o come invii gli ordini. È la domanda più importante fra quelle aperte.
- **Il rischio di sicurezza più grave è del 2Bit stesso**: la porta 9000 è raggiungibile da Internet e la password di `sa` sta in chiaro in un file `.bat`. Non blocca la nostra cassa, ma va chiuso prima che il 2Bit si spenga, perché fino ad allora è aperto.

## 1. Correzioni al REA 21 e ai REA 03, 13, 14

| Cosa dicevano i REA | Cosa dice il PC | Effetto sul piano |
|---|---|---|
| Comande su **due stampanti**, cucina e cassa, con instradamento per reparto (REA 13 §13.10, REA 21 §4) | Confermato nella seconda verifica: due stampanti di comanda. **PIZZERIA** (192.168.1.12:9100, ESC/POS raw, centro Pizzeria) e **ASP** (driver Windows «EPSON TM-T88V Receipt5», USB, centro Asporto, stampante predefinita per comande d'asporto, fatture e preconti). L'instradamento sta in `PIZ_tabBalancingCDP`, non in `PIZ_tabCentriProduzione.idStampante` (che è NULL). Le 23 categorie non hanno centro, ma le righe di comanda sì: 239.241 righe escono su entrambi i centri, 50.257 solo sull'Asporto, 1 solo sulla Pizzeria. | L'instradamento per reparto esiste già nel 2Bit. Da noi va replicato come «centro di produzione → stampante» (D20). |
| Fiscale **Ditron PrintF** via Ethernet (REA 13 §13.10, REA 14 §14.3, domanda 2) | `PIZ_tabStampanti` id 4 «FP81/90»: 192.168.1.200:9100, tipo «Fiscale MF/RT», modello FP81/90, protocollo LAN, RT versione 2. Le matricole degli scontrini (99IE…) sono Epson. Il driver `NRG`/`MultiDriver` nel pacchetto è più vecchio (10.0.0.222:23). | Fiscale = **Epson FP-81 II RT** in LAN. La domanda 2 è chiusa dal PC, ma il protocollo va confermato sulla stampante fisica con un test in negozio. |
| Database `DD_DATABASE`, istanza `LOCALHOST\DUEBIT` (REA 03) | Database `DD_AMANOAMANOPUGLIESE`, istanza `localhost\DUEBIT`, SQL Server 2008 R2 SP3 Express, porta 58788, creato il 06/09/2023, 700 tabelle | Da aggiornare in tutti i documenti che citano il nome. |
| Ordini app e piattaforme riconoscibili dal canale (REA 13) | Tutti con `OrigineComanda = 1` («App»), anche Glovo, Deliveroo e Just Eat. Il canale sta solo nel testo delle note. | Confermato. Il nostro modello deve avere `canale` ed `id_esterno` come campi veri. |
| Marketplace via Deliverect (REA 26, REA 21 §12) | Confermato da Edoardo (27/10, 01:15Z): Glovo / Deliveroo / Just Eat → **Deliverect** → cloud di web-app.it → PC di cassa (porta 9000) → database. Sul PC non c'è nulla di Deliverect. | Per spegnere Velocissimo, Deliverect va puntato sulla nostra cassa. |
| Pagamento degli ordini online (REA 21 §3) | Gli ordini Deliverect risultano sempre «PAGATA CON PAYPAL»: è il pagamento predefinito del cloud, **non** il metodo del cliente. | Il nostro mapping dei pagamenti per piattaforma non deve leggere quella dicitura come incasso reale. |

## 2. Cosa c'è sul PC e nel 2Bit che il REA 21 non contava

### 2.1 Dati da importare e da confrontare

| Dato | Nel 2Bit (PC, 27/10) | Nel cloud di Velocissimo (REA 21 e 26) | Nostro stato | Da fare |
|---|---|---|---|---|
| Testate ordini | 51.550 storiche (dal 19/09/2023 al 26/10/2026) + 104 vive | 55.592 dal 2023 (REA 26) | import in `0079/0080`, tabelle vuote; pagina `/cassa/importa` | Confrontare il numero con il cloud: 51.550 contro 55.592 è una differenza da spiegare |
| Righe ordini | 296.829 storiche + 455 vive | — | non importate | Serve solo per le statistiche per prodotto |
| Clienti | 19.427 in `tabClienti`, 17.537 indirizzi in `PIZ_tabIndirizzi` | 19.028 nel file con consensi (REA 26), 4.813 veri clienti (REA 21) | 3.813 nel database nostro, 0 telefoni doppi | Il 2Bit ha più clienti del cloud: capire quali sono duplicati o vecchi |
| Tessere fedeltà | **10.000** in `tabFidelity_Tessere`, 11.885 movimenti in `_Transazioni` | 1.578 card, 37.877 punti (REA 21, 26) | 0 card | **Differenza grande.** Prima di importare, sapere se le 10.000 sono card reali o numeri generati (D21) |
| Scontrini | 49.059 testate, 190.990 righe (`tabTestateScontrini`, `tabDettaglioScontrini`) | non nel cloud | non importati | Storico fiscale: va tenuto per dimostrazione, non sostituito |
| Pagamenti dei conti | 78.008 righe (`PIZ_tabPagamentiConti`) | — | 0 righe in `pagamento` | Serve per un export dei pagamenti per metodo (REA 15) |
| Report di vendita | ~30 `stats-pack` (categoria, fattorino, zona, origine) | 93 report nel back-office (REA 21 §13) | li fa l'OS | Confermare che l'OS copra gli stessi report con i dati nostri |
| Copia di sicurezza | ogni sera, circa 1,08 GB, sullo stesso disco | — | Supabase (copie gestite) | Nessuna azione sul nostro lato; sul 2Bit è un rischio (§3) |

### 2.2 Funzioni che esistono sul 2Bit e che non ho ancora verificato

Queste sono **letture da fare**, non ancora certezze. Il REA 27 non le ha coperte.

| Funzione | Dove si cerca sul PC | Perché conta |
|---|---|---|
| Chiusura giornaliera (Z) e fondo cassa | tabelle di chiusura e di fondo del 2Bit (`PIZ_` o `tab` con «chiusura», «fondo») | È la voce 13 del REA 21 «mancante»: serve sapere come il 2Bit la salva |
| Metodi di pagamento e IVA per prodotto | tabelle delle aliquote e dei metodi, `tabImpostazioni` | Il REA 21 dice che tutte le nostre 204 righe sono al 10 %: il 2Bit ha «Codice IVA» e «Codice IVA asporto» |
| Prodotto esaurito | campi di disponibilità sui prodotti | È la voce «esaurito per stasera», oggi mancante da noi |
| Centri di produzione e ordine di stampa | `PIZ_tabCentriProduzione` e collegamenti categoria–centro | Per capire se ha senso il nostro instradamento per reparto |
| Totem | `PIZ_Totem_*` e la tabella del totem | Vedi §3: non si sa ancora come il totem invii gli ordini |
| Modem USB e riconoscimento del numero | driver `USR5637Voice` nel pacchetto; sul PC **non ancora verificato** se il modem è installato | Il telefono è una voce «parziale» da noi (REA 21 §5) |
| Fatture e P.IVA del cliente | colonne fiscali di `PIZ_tabIndirizzi` o clienti | La voce «fattura» è mancante da noi (D9) |
| Orari e zone del negozio | `tabOrari` e zone | Per confrontare con le nostre fasce e il poligono delle zone |

## 3. Rischi del 2Bit che restano aperti fino allo spegnimento

Non sono funzioni da copiare. Sono cose da sapere prima di toccare il PC, e cose da chiudere se il 2Bit resta in servizio durante il parallelo.

| Rischio | Dove | Azione proposta |
|---|---|---|
| Porta **9000** raggiungibile da Internet (port forwarding 93.39.252.83 → 192.168.1.18, dedotto dai log) | router e regola firewall «DueBit AppServer» | Non toccare finché il cloud di Velocissimo serve gli ordini. Verificare il port forwarding sul router. (D22) |
| Password di `sa` in chiaro | «Backup SQL datetime-webapp.bat» in `C:\2BIT\SETUP 2BIT\` e `C:\2BIT\Main\TOOLS\` | Cambiarla dopo lo spegnimento. Non va riportata da nessuna parte. |
| SQL Server 2008 R2, fuori supporto | istanza `DUEBIT` | Nessun intervento: il 2Bit si spegne. |
| AnyDesk sempre in ascolto (porta 7070) | servizio dell'assistenza remota | Non chiudere senza che Edoardo lo decida: serve al fornitore. |
| Backup solo sullo stesso disco | `C:\2BIT\BackupFolder` | Prima dello spegnimento, copia dell'ultimo backup fuori dal PC. |
| `ping-executer` disabilitato, IP pubblico 93.39.252.83 sempre uguale | attività pianificata disabilitata | Capire chi aggiorna il registro IP del cloud (D23). |

## 4. Stampanti: cosa serve per l'agente di stampa

| Stampante | Indirizzo | Protocollo | Uso | Per l'agente |
|---|---|---|---|---|
| PIZZERIA (comanda) | 192.168.1.12:9100 | ESC/POS raw (TM-88), MAC 00-30-B8-2C-B1-00 | pietanze del centro Pizzeria (CDP 3) | IP da mettere in `stampante`, al posto del .50 finto nel `config.esempio.json` |
| Fiscale FP-81 II RT | 192.168.1.200:9100 | protocollo Epson LAN (`fpmate.cgi` sulla porta web, da verificare) | scontrini | Protocollo da confermare con un test in negozio, con la stampante in stato RT leggibile |
| ASP (comanda d'asporto, fatture, preconti) | USB `ESDPRT001` (TM-T88V), driver Windows «ASP» | driver Epson Windows (non ESC/POS di rete) | comanda completa dell'asporto (CDP 2), fatture, preconti | Non è in rete: l'agente di stampa la raggiunge solo dal PC in cassa, oppure va collegata in rete. Da decidere (D20). |
| Porte orfane | 192.168.1.19:9100 (risponde al ping, MAC 58-9E-C6-68-A8-E5, nessun nome DNS, non in nessuna configurazione del 2Bit), 192.168.1.20:9100 (non risponde) | — | nessuna | Il .19 è l'unica candidata a una «cucina» in rete, ma non è configurata. Da verificare sul posto con l'autotest o l'etichetta (D24) |
| Brother QL-810W | WSD | — | etichette | Fuori dal primo passaggio (voce 19 del REA 21) |

Il ping del PC mostra la fiscale e la PIZZERIA raggiungibili. Il PC non ha stampato nulla, quindi **non sappiamo ancora se la fiscale risponde al protocollo dei comandi**: va provato con il test già previsto nel REA 21, da fare in negozio.

## 5. Voci che passano da mancanti a parziali o fatte

Con le correzioni del §1, queste voci del REA 21 cambiano stato:

- **Comanda su due stampanti per reparto** (REA 21 §4, parziale): il 2Bit le usa già, con instradamento per centro di produzione in `PIZ_tabBalancingCDP`. Da noi va replicato: centro → stampante, con una stampante per centro (D20).
- **Stampanti configurate** (REA 21 §4, mancante): sono note (.12 per la PIZZERIA, .200 per la fiscale, ASP via USB). Resta da decidere come portare l'ASP in rete.
- **Scontrino fiscale** (REA 21 §4, mancante): il modello è noto (Epson FP-81 II RT), il protocollo no. Resta mancante finché non c'è un test.
- **Telefono** (REA 21 §5): nessuna modifica di stato, ma il 2Bit ha 72 ordini telefonici in 30 giorni: la cifra va usata per dimensionare il centralino.

## 6. Domande per Edoardo

Quelle nuove, in fondo alla 18 (che resta valida):

- **D20.** Le due comande oggi sono PIZZERIA (pietanze di pizzeria) e ASP (comanda completa dell'asporto, più fatture e preconti). Vuoi tenere la stessa divisione? E la ASP, che è collegata via USB al PC di cassa, la portiamo in rete con un IP?
- **D21.** Le 10.000 tessere in `tabFidelity_Tessere` sono clienti reali? Il cloud ne ha 1.578. Prima di importare vogliamo sapere quali sono valide.
- **D22.** La porta 9000 è davvero aperta dal router verso Internet? Se sì, possiamo chiuderla quando il cloud non serve più, oppure prima?
- **D23.** Chi aggiorna il registro IP del cloud, visto che l'attività `ping-executer` è disabilitata e l'IP non è cambiato dal 2023?
- **D24.** Sai cos'è il dispositivo su 192.168.1.19? Risponde al ping, non è configurato nel 2Bit, e potrebbe essere la «cucina» che hai nominato. Basta l'autotest o l'etichetta della stampante.
- **D25.** Il totem è acceso in negozio? Non ci sono suoi ordini nel 2Bit negli ultimi 30 giorni: o non si usa, o invia gli ordini in un altro modo.

## 7. Letture da fare sul PC (seconda passata, sola lettura)

Servono per chiudere le voci del §2.2. Con il tuo ok, si lancia una nuova sessione di sola lettura sul PC di cassa, con le stesse regole di REA 27.

1. Tabelle di chiusura, fondo cassa e metodi di pagamento: come sono salvati, con conteggi e nessun dato personale.
2. Aliquote IVA per prodotto (asporto e sala), per confrontarle con le nostre 204 righe al 10 %.
3. Stato del prodotto «esaurito» e dei centri di produzione.
4. Configurazione del totem e ultimi invii dal totem, senza dati di clienti.
5. Presenza del modem USB e del riconoscimento del numero (driver e dispositivo).
6. Confronto del numero di testate fra il 2Bit e il cloud (51.550 contro 55.592).

## 8. Stato

- Il REA 21 resta la tabella completa del lato nostro; questo capitolo lo corregge e lo completa dal lato 2Bit.
- Le correzioni del §1 non richiedono cambi di codice, ma vanno riportate nei documenti che citano Ditron, due stampanti per reparto e `DD_DATABASE`.
- Nessuna modifica al database né al codice in questo capitolo.
