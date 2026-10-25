# REA · 18. Domande per Edoardo (25/10/2026)

*Solo le domande che il giro di oggi non ha potuto chiudere. Ognuna dice la foto o il minuto che la motiva. Le domande già in `16_DOMANDE_PER_EDOARDO.md` non sono ripetute: dove si sovrappongono, si rimanda al numero.*

## Prima di tutto

0. **Collegare Claude in Chrome alla sessione.** Oggi l'estensione non risponde («Browser extension is not connected», tentato due volte, anche per la sezione menu). Senza, il back-office resta letto dai documenti del 22–24/10 e non dai dati di oggi. *Cosa cambia:* con la connessione si fa il giro di sola lettura su ordini, zone, orari, rider e menu (`17` §2 e §10.4).

## La cassa in negozio

1. **[RISPOSTA GIÀ DATA, 24/10: in cassa gira il PC 2Bit.]** ~~Quale software gira in cassa adesso?~~ Resta da capire solo se il Velocissimo POS nuovo (`52c6b869`) sia un secondo terminale: *cosa cambia:* se sì, il totem parla con la porta 37150 (`16` domanda 1 e 8). Nella schermata del 25/10 alle 02:45 (`8b01d49e-image.png`) la barra e la lista ordini somigliano al 2Bit descritto in `03`, ma il video del POS nuovo (`52c6b869`, 02:41) ha la stessa grafica. *Cosa cambia:* con il 2Bit il confronto giusto è `14`; con il Velocissimo POS nuovo il confronto è `09` e il totem parla con la porta 37150 (`16` domanda 1 e 8).
2. **Che cosa fanno i tasti Annullo, Sposta, Ristampa e Card?** Sono nella barra in basso (`8b01d49e`); l'Annulla di una finestra compare nel video 02:41 (fotogramma ~00:05). *Cosa cambia:* la cassa nuova deve avere lo stesso annullo e lo stesso «sposta», non uno inventato.
3. **«Elimina» nella barra (cestino) annulla un ordine o lo cancella?** (`8b01d49e`, tasto «Elimina» tra «Modifica» e «Info»). *Cosa cambia:* se cancella, va chiesto il permesso prima di replicarlo, perché cancellare non si torna indietro.
4. **L'icona stampante accanto a ogni quarto d'ora (colonna «Ore»)**: stampa la fascia, la lista della fascia o le comande di quel quarto d'ora? (`8b01d49e`, colonna sinistra da 15:15). *Cosa cambia:* decide se la comanda per fascia è una funzione da copiare.
5. **«Brucia documenti» (menu Funzioni, video 02:41 fotogramma ~02:40)**: cosa cancella e chi lo usa? *Cosa cambia:* se è una cancellazione di documenti fiscali, è da tenere fuori dal nuovo sistema senza una procedura scritta.
6. **Ristampa comanda e preconto**: dove si ristampa una comanda già stampata, e qual è la differenza tra «Preconto veloce» e «Preconto definitivo» nel menu Documento (`v2 f004`)? *Cosa cambia:* la pagina nuova deve avere lo stesso preconto e la stessa ristampa.
7. **«Recupero documenti stampati» e «Produzione» nel menu Funzioni**: sono usate a fine serata? Chi le apre? *Cosa cambia:* decide se vanno nel primo giro o dopo.

## Stampanti e fiscale

8. **[RISPOSTA GIÀ DATA, 25/10: la fiscale è l'Epson FP-81II RT a 192.168.1.200, confermata da EpsonFpWizard.]** ~~Che cos'è il dispositivo a 192.168.1.200~~ Da confermare solo l'etichetta, se la vuoi fotografare. *Cosa cambia:* protocollo ePOS-Fiscal (`fpmate.cgi`), da provare solo in negozio. (Seiko Epson per produttore MAC, `b89b9074`)? Modello, e se è la **FP-81II RT** che hai indicato. Hai l'etichetta dietro? *Cosa cambia:* senza il modello non si sa il protocollo (ePOS-Fiscal `fpmate.cgi` non è nel nostro repo) e non si può provare nemmeno in negozio.
9. **[RISPOSTA GIÀ DATA, 25/10: la fiscale è l'Epson. Ditron è forse la seconda stampante delle comande.]** ~~Quale stampante fiscale è davvero in negozio, Epson o Ditron?~~ Da confermare: la Ditron è la stampante comande? *Cosa cambia:* quale IP è la comanda e quale la fiscale. Il pacchetto 2Bit imposta un driver Ditron su `10.0.0.222:23` (`03` §3.1), la rete del 25/10 mostra un'Epson a `.200`. Sono due apparecchi diversi o è la stessa cosa con due nomi? (`16` domanda 2). *Cosa cambia:* se sono due, quale è la fiscale e quale la comanda.
10. **Gli altri dispositivi in rete** (`b89b9074`): 192.168.1.26 Shanghai Sunmi (terminale o stampante?), 192.168.1.253 AETHRA Telecomunicazioni (il modem o il centralino?), 192.168.1.19 Gigaset (telefono fisso?), 192.168.1.8 Ajax (allarme?), 192.168.1.6 AMPAK. Chi sono? *Cosa cambia:* il centralino e la stampa di rete si collegano solo a quelli giusti.
11. **Il Brother P-touch sul desktop del PC** (`b89b9074`, barra in basso: P-touch Address Book, Update Software, Brother Manuals): stampi etichette? Di che cosa (cucina, buste, rider)? *Cosa cambia:* se servono etichette, la cassa nuova deve stamparle; se no, si toglie dal conto.

## Telefono

12. **Nell'elenco chiamate (`52c6b869`, fotogramma ~01:30 e 02:41 finale, schermata del 24/10) la colonna «Gest» e la colonna «Utente» dicono: gestita sì/no e chi ha risposto.** Chi mette «Sì»: lo staff a mano o la chiamata passa per il PC? *Cosa cambia:* definisce lo stato «chiamata gestita» della scheda cliente nuova.
13. **Il modem USB o il centralino VoIP** (`16` domanda 10): con il **AETHRA** al .253 e il **Gigaset** al .19 in rete, la risposta cambia. Quale dei due dà il numero di chi chiama? *Cosa cambia:* il collegamento dei dati del chiamante.

## Menu e disponibilità

14. **Una pausa lunga («non disponibile per un periodo») si riattiva da sola alla data «fino a»?** Il campo esiste (`01` §catalogo), ma non so se alla scadenza torna disponibile da solo o resta fermo. *Cosa cambia:* se resta fermo, la nostra cassa deve avere lo stesso avviso «scaduto, da riattivare».
15. **Un prodotto si può spegnere su un solo canale (es. solo Just Eat, o solo il sito)?** Nei documenti i listini L1/L2/L3 cambiano il prezzo, ma non ho trovato un interruttore per canale (`17` §10.2). *Cosa cambia:* se esiste, va copiato; se no, il menu nuovo fa solo «sì / no» per tutti i canali.
16. **Una variante finita (es. «Bufala» su tutte le pizze) si spegne dove?** Il menu documenta lo stock solo sul prodotto (`17` §10.3). *Cosa cambia:* se la variante si spegne a mano in cucina, la cassa nuova deve avere lo stesso tasto.

## Le foto non riviste

17. **Le otto immagini del 24–25/10 (`242332d1`, `242a8a6c`, `46e3aec0`, `5d030198`, `a4692fc7`, `de18a4c6`, `f030cd98` e `b89b9074`) sono tutte schermate della cassa o dello scanner?** Oggi ho guardato solo `b89b9074` (scanner) e `8b01d49e` (cassa). *Cosa cambia:* le altre possono contenere le schermate di Documento, Preconto o Consegna in dettaglio: è il pezzo che manca alla sezione 1.
18. **I video del 23/10 (`1927466c`, `d1ec04b3`) e i vecchi `IMG_0674`**: quale mostra la cassa e quale il menu? I fotogrammi di `img674/` sono gli stessi? *Cosa cambia:* il REA di oggi usa solo i due video del 25/10.

## Coupon, punti e card (25/10, 03:12: la transizione deve essere completa)

*Il perimetro è in `19_COUPON_PUNTI_CARD.md`. La domanda 9 di `16` (punti per euro) resta la prima: senza quella il motore dei punti non si fa.*

14. **Il coupon «NON CUCINO» (WhatsApp, 50 usi)**: chi lo manda, il tuo WhatsApp marketing o un altro strumento? *Cosa cambia:* se lo manda un altro strumento, la cassa nuova deve riconoscere lo stesso codice senza rompere niente.
15. **Coupon ottenuti ma non usati al giorno del passaggio**: quando il cliente passa al nuovo sistema, il coupon che ha in tasca deve restare valido? Proposta: sì, si sposta una volta sola, e il vecchio lo segna come usato. *Cosa cambia:* senza questa regola un cliente può usarlo due volte.
16. **Punti durante il parallelo**: quale sistema è la fonte del saldo finché non passiamo? Proposta: il vecchio, il nuovo legge e non scrive. *Cosa cambia:* decide se i due saldi possono divergere.
17. **Coupon «Benvenuto da …» per canale**: li mantieni con il canale di acquisizione (volantino, app, sito, centralino, WhatsApp, Instagram, Facebook)? *Cosa cambia:* senza il canale non si misura quale canale porta clienti.
18. **Credito prepagato**: lo usate davvero? L'app ha «Card prepagata» spenta, il back-office ha il saldo credito. *Cosa cambia:* se non si usa, il campo non si importa.
19. **La card fisica**: la date ancora ai clienti, o basta il QR nell'app? *Cosa cambia:* decide se in cassa serve il lettore o basta la ricerca per telefono e numero card.
