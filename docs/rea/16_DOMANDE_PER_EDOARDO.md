# REA · 16. Le domande per Edoardo (tutto quello che non si deduce)

*Terzo passaggio del REA, 24/10/2026. Sono le cose che né il back-office, né il pacchetto 2Bit,
né i numeri degli ordini sanno dire. Per ognuna: la domanda e **cosa cambia** a seconda della
risposta. Da fare in una volta, con calma, non in servizio. Le domande già chiuse (listini L1/L2/L3,
«primo rider che rientra», POS alla consegna spento, scontrino scegliendo il pagamento, niente
WhatsApp agli avvisi) non sono ripetute.*

## La cassa fisica

1. **In cassa gira ancora il PC col 2Bit (origine «Da PC»)?** L'abbonamento dice che Enterprise
   (il Velocissimo POS che prende anche gli ordini telefonici) **non è attivo**, quindi crediamo di
   sì. Il PC è lo stesso del 2023 (Windows, SQL Server 2008)? → Se sì, il video del POS nuovo non
   descrive il vostro lavoro e il confronto giusto è `14`; se nel frattempo è stato cambiato,
   vanno rifatte le foto delle schermate vere.
2. **Stampanti**: quali e dove? (a) stampante fiscale: nel pacchetto del 2022 il driver è impostato
   su una **Ditron PrintF via Ethernet** (IP di rete locale, porta 23), ma il 22/10 hai detto
   «Epson». Marca, **modello esatto**, e se è una **RT** telematica già censita all'Agenzia delle
   Entrate; (b) le **due stampanti comanda** (cucina e cassa): marca, modello, collegamento (rete
   con IP, o USB al PC), larghezza carta (80 mm?), e se tagliano da sole. → Decide l'agente di
   stampa (ESC/POS di rete è un pomeriggio; USB vuol dire un PC o un Raspberry in negozio) e
   **l'integrazione fiscale** (Epson: ePOS-Print XML in rete; Ditron: protocollo diverso, forse va
   cambiata la stampante). Una foto delle etichette dietro le stampanti basta.
3. **Chi fa cosa in cassa, in una sera normale**: quante persone stanno al banco; chi risponde al
   telefono; chi batte gli scontrini; chi dà le buste ai rider; chi fa la chiusura. Hanno un'utenza
   a testa sul 2Bit (il modello ha `idUtente_Creazione`) o una sola? → Decide le utenze della
   cassa nuova (una per postazione o una per persona), e se serve il «chi ha fatto cosa» sugli
   stati e sugli sconti.

## Scontrino, soldi, chiusura

4. **Lo scontrino fiscale quando si batte?** Al banco quando il cliente paga, lo sappiamo. E per
   i **domicili** (contanti al rider), per gli **ordini pagati online** (Nexi, PayPal delle
   piattaforme) e per i **ritiri delle piattaforme**: si batte uno scontrino per ognuno (quando:
   all'ordine, alla partenza, a fine serata in blocco?), oppure si registrano i corrispettivi in
   un altro modo (es. documento commerciale cumulativo, o solo per il banco)? → È la domanda più
   pesante del REA: cambia **tutta** l'integrazione fiscale (uno scontrino per ordine automatico
   vs un tasto «scontrino» solo al banco) e il modo in cui l'OS quadra il contante.
5. **X e Z**: chi fa la chiusura Z e a che ora; si fa la X durante il servizio; il fondo cassa si
   conta e si scrive da qualche parte (sul 2Bit no, dal cloud non si vede)? → Decide la pagina di
   chiusura della cassa nuova e cosa deve passare all'OS (`15` §15.4).
6. **POS bancario e Nexi**: il terminale POS del banco di che banca/marca è, e resta scollegato
   dalla cassa anche dopo (si batte l'importo a mano)? Il **Nexi** dell'app è un contratto tuo
   (XPay) o di Velocissimo? → Se il Nexi è tuo, il pagamento online della pagina nostra può usare
   lo stesso contratto; se è di Velocissimo, serve un gateway nuovo (`10` B.8). Il POS collegato
   alla cassa è una comodità, non un'urgenza.
7. **Modifiche e sconti**: quante volte a sera si **modifica una comanda già stampata** e come lo
   capisce la cucina (si ristampa tutta? si urla?). Lo **SCONTO manuale** che il report conta 190
   volte al mese (−1.050 €): chi lo fa, perché (arrotondamento, cliente abituale, ritardo,
   dipendenti?), di quanto di solito? → Decide se «modifica con ristampa» e «sconto» sono tasti di
   prima fila nella cassa nuova e se lo sconto vuole un motivo.

## Il resto della serata

8. **Il totem con il 2Bit**: oggi chi stampa gli ordini del totem (7 a settimana)? Il totem parla
   col POS locale sulla porta 37150 solo nel Velocissimo POS nuovo. → Se li stampa il 2Bit, c'è un
   pezzo che non abbiamo visto; se non li stampa nessuno (li vede il cassiere a video), il nostro
   totem è già meglio.
9. **Punti fidelity**: quanti punti per euro (o per ordine)? Il back-office dice solo i premi
   (BIRRA 10, FRITTI 20, PIZZA SPECIALE 30 punti) e che le card emesse sono 1.570. I punti si
   maturano anche sugli ordini al telefono/banco o solo dall'app? → Decide il motore dei punti
   nella cassa nuova e l'import dei saldi.
10. **Il centralino**: il numero di chi chiama lo legge **il modem USB sul PC** (driver US Robotics
    nel pacchetto) o un **centralino VoIP** che può chiamare un indirizzo web? Che centralino è?
    → Se è solo il modem, per la scheda che si apre da sola serve un centralino VoIP con webhook
    (o un modem letto da un piccolo programma in negozio); se è già VoIP, `/api/telefono/chiamata`
    è pronta.
11. **Stradario e note fisse**: il 2Bit ha uno stradario locale (via → zona) e le note fisse del
    cliente. Si possono **esportare i clienti dal 2Bit** (nome, telefoni, indirizzi, note, punti,
    credito) o solo dal cloud (`/customer`, 19.500 righe con i finti di Deliverect)? Le note fisse
    stanno sul PC o nel cloud? → Decide l'import (`10` B.12) e se le note «citofono rotto» si
    salvano o si riscrivono.
12. **Aliquote IVA**: bevande al 22 % e tutto il resto al 10 %? Il tavolo (consumazione) ha
    l'aliquota dell'asporto? Il 2Bit teneva «Codice IVA» e «Codice IVA asporto» separati per
    prodotto. → Decide `prodotto.aliquota_iva` e i netti che l'OS somma (`15` §15.3).
13. **Coperti sugli asporti**: al telefono chiedete «per quante persone?» (il CSV ha «coperti
    asporto» 1–8 su tutti gli ordini)? → Se sì, la cassa nuova lo chiede; se è un default del 2Bit,
    si mette 1 e basta. Vale per la dashboard «persone servite».
14. **Capacità per giorno della settimana**: il cloud ha 10 pizze a quarto d'ora lun–mer, 18
    gio–ven, 22 sab–dom. È così che lavorate (1 pizzaiolo lun–mer, 2 gio–ven, 3 nel weekend) o è
    vecchio? → Decide i valori di partenza di `/cassa/capacita` quando nessuno inserisce i turni.
15. **Periodi di chiusura**: chi li scrive e quando (Natale, ferie, «problemi tecnici» del
    2/9/2026); i messaggi lunghi con le emoji li vuoi uguali nella pagina nostra? → Una tabella e
    una pagina in `/cassa`.
16. **Prenotazioni**: le 25 degli ultimi due mesi (18 da Google) chi le legge e dove finiscono
    (sul 2Bit a mano? su un foglio?); il tavolo non viene mai assegnato nel cloud. → Decide se la
    cassa nuova ha una pagina prenotazioni subito (`10` C.15) o se basta l'email.
17. **Deliverect**: che piano hai e chi è il referente; l'account è tuo o di Velocissimo; le
    credenziali per `/api/deliverect/ordine` (channel link, HMAC) te le danno loro? → Senza, il 55
    % degli ordini non entra nella cassa nuova.
18. **App e store** (già in `10` E.2–3, restano aperte): il conto Apple dove sta l'app «A Mano A
    Mano Pugliese» è di Vi.Ru? Chiediamo a Velocissimo il trasferimento dell'app Android?
    → Decide se i clienti ricevono la nostra app come aggiornamento (`11` §11.5).
19. **Velocissimo accanto, per quanto**: la scadenza è il 23/06/2027. Quando sarà pronta la
    cassa nuova, teniamo Velocissimo acceso solo per l'app (strada D di `10`) o si spegne tutto
    insieme? → Decide se serve il «ponte» con la capacità divisa in due.
20. **Il giorno del cambio**: una sera di prova in parallelo (2Bit che lavora, cassa nuova che
    riceve gli stessi ordini battuti due volte da una seconda persona) ti va bene, e in quale sera
    (lun–mer, 10 pizze a quarto d'ora)? → Decide il piano di collaudo.

21. **Il minimo d'ordine a domicilio vale anche quando l'ordine lo prendete voi al telefono?** In Velocissimo il minimo (10 € nelle zone vicine) ferma l'app; la cassa nuova oggi lo applica anche dalla cassa («Minimo d'ordine 10,00 €: mancano 2,80 €», critico giro 12). *Cosa cambia:* se al telefono si vuole poter dire di sì lo stesso, il blocco resta solo sull'app e sul sito e in cassa diventa un avviso.

22. **«Modifica ingredienti» e la ricerca nel menù** (grafico, giro 20, confronto con l'app
    vecchia): nell'app il cliente può togliere un ingrediente da una pizza e cercare un prodotto
    per nome; su /ordina nostra oggi non c'è né l'una né l'altra. Le vuoi tutte e due, solo il
    «senza», o nessuna? → Decide se /ordina le aggiunge prima della prova in parallelo.
