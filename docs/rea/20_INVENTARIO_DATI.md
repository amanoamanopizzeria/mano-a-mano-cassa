# REA · 20. Inventario dei dati: cosa c'è oggi, dove finisce nella cassa nuova (25/10/2026)

*Richiesta di Edoardo (25/10): «non ti puoi perdere nessun dato, devi essere completo nella ricerca
iniziale». Una riga per ogni tipo di dato del sistema attuale (Velocissimo nel cloud + 2Bit EasyPOS
sul PC). Per ognuno: da dove viene, quanti sono, dove finisce nella cassa nuova (`mano-a-mano-cassa`,
Supabase `tnuyeyqwoqhmgpskqtuq`) e lo stato. I numeri della cassa nuova sono letti dal database il
25/10/2026 alle 23:50 Roma, in sola lettura. Quelli di Velocissimo vengono dai capitoli 01, 06, 13,
19 e dal giro del 25/10 sul back-office.*

Stato: **coperto** = c'è e i numeri tornano · **parziale** = c'è il posto, mancano dati o regole ·
**mancante** = non c'è · **non serve** = Velocissimo l'ha ma noi non lo usiamo.

**Regola:** nessun tipo di dato «parziale» o «mancante» che tocchi un cliente passa al parallelo.

## 1. Clienti, card, punti, coupon (non si può perdere niente)

| Dato | Fonte | Quanti | Nella cassa nuova | Stato |
|---|---|---|---|---|
| Clienti | Velocissimo `/customer` | 19.521, di cui **9.491** veri con telefono (tolti i finti di Deliverect) | `import_cliente_velocissimo` (appoggio): **9.491**; `cliente`: **3.799** importati | **parziale**: 5.692 clienti veri sono ancora solo nell'appoggio |
| Indirizzi dei clienti | Velocissimo (colonna nascosta 14) e stradario del 2Bit | 3.219 con via | `indirizzo`: 3.178 | **parziale**: da riconciliare con i 3.219 |
| **Saldo punti** | Velocissimo `/customer` | **1.385 clienti con punti, 37.908 punti in tutto** (nell'appoggio) | `cliente.punti`: **190 punti in tutto**, su 3 clienti (sono prove) | **mancante**: l'import ha portato i clienti **senza i punti**. 1.371 clienti con punti sono già in `cliente` con saldo 0, altri 14 non sono stati importati |
| Movimenti punti (storico) | Velocissimo, «punti della transazione» | non contati | `cliente_punti_movimento`: 27 (prove) | **mancante**: serve almeno il saldo iniziale come primo movimento |
| **Card fedeltà** | Velocissimo `/customer` (numero, tipologia, scadenza) | **1.576 card** emesse | `cliente.card`: **0** | **mancante**: l'appoggio non ha nemmeno la colonna del numero card |
| Credito prepagato | Velocissimo `/customer` | 0 clienti con credito | `cliente.credito` | **non serve** per ora (domanda 18 del `18`) |
| **Coupon ottenuti e non usati** | Velocissimo `/issuedcoupon` | **465** | `coupon_emesso`: **0** | **mancante** |
| Coupon (le regole) | Velocissimo `/coupon` | 54 | `coupon`: 6 (3 premi + 3 «Lunedì») | **parziale**: mancano 48, e le regole a ore, omaggio, primo ordine, giorno della settimana (`19`) |
| Premi a punti | Velocissimo `/prize` | 3 (birra 10, fritti 20, pizza speciale 30) | `coupon` (3 premi) | **parziale**: ci sono, il riscatto no |
| Regola dei punti | Edoardo, 25/10 | 1 punto ogni 5 € con IVA, coperti sì, consegna no, non scadono | nessun calcolo automatico | **mancante** |
| Porta un amico (codice referral) | Velocissimo `/customer` + coupon | non contati | — | **mancante** |
| Tag sul cliente | Velocissimo `/tag` | 12 (11 «coupon usato», 1 «Black List») | `cliente.tag`, `cliente.black_list` | **parziale**: il tag automatico all'uso del coupon non c'è |
| Consensi (dati, marketing) | Velocissimo `/customer` | non contati | `cliente.consenso_marketing` | **parziale**: solo il marketing |
| Compleanno | Velocissimo `/customer` | non contati | `cliente.nato_il` | **parziale**: da importare |

## 2. Menu e prezzi

| Dato | Fonte | Quanti | Nella cassa nuova | Stato |
|---|---|---|---|---|
| Prodotti | Velocissimo, catalogo | 177 nel back-office, 147 veri | `prodotto`: 204 righe | **da verificare**: più righe di Velocissimo (vecchie prove o disattivati) |
| Listini L1 / L2 / L3 | Velocissimo, prezzi per catalogo | 3 per prodotto | `prodotto.prezzo`, `prezzo_tavolo`, `prezzo_piattaforme` | **coperto** |
| Variazioni con prezzo | Velocissimo, gruppi per categoria | **141** (`06`) | `variazione`: **70** | **parziale**: mancano 71 variazioni, da contare voce per voce |
| Gruppi di variazioni per categoria | Velocissimo | per categoria | `categoria_gruppo_variazione`: 29 | **da verificare** |
| Menu combo | Velocissimo | non contati | `pacchetto_gruppo` 14, `pacchetto_scelta` 243 | **da verificare** |
| Allergeni | Velocissimo, scheda prodotto | non contati | — | **mancante** |
| Prodotti in pausa / fermi | Velocissimo, «pausa per oggi» | variabile | `prodotto.attivo` | **parziale**: manca la pausa «solo per oggi» |
| Foto | CDN di Velocissimo | 147 | link al CDN | **parziale**: vanno copiate nel nostro storage |

## 3. Negozio, orari, zone, capacità

| Dato | Fonte | Quanti | Nella cassa nuova | Stato |
|---|---|---|---|---|
| Orari per tipo (apertura, consegna, ritiro) | Velocissimo | 18:30–22:45, consegna fino 22:30, ritiro fino 22:45 | `orario`: 21 | **coperto** |
| Zone di consegna | Velocissimo, confini veri | **16** | `zona`: **18** (16 vere + «Centro» e «Periferia» di prova) | **parziale**: togliere le 2 di prova; costo per zona da controllare (Conca d'Oro 2 €) |
| Richieste fuori zona | Velocissimo | 809 vere + 228 finte del 25/10 | — | **non serve** per disegnare le zone (regola di Edoardo) |
| Capacità per fascia (pizze, consegne) | Velocissimo | 10 / 18 / 22 pizze a quarto d'ora; consegne 2–5 | `regola_capacita` 3, `fascia_capacita` 3 | **parziale**: mancano le consegne per giorno |
| Tavoli | 2Bit | 10 dentro + 5 fuori | `tavolo`: 15 attivi (20 + 20 posti) | **coperto** |
| Prenotazioni tavoli | X-Reserve | non contate | — | **mancante** |

## 4. Ordini, pagamenti, rider

| Dato | Fonte | Quanti | Nella cassa nuova | Stato |
|---|---|---|---|---|
| Storico ordini | Velocissimo `/weborder` | **55.422** | `ordine`: 92 (prove) | **da decidere**: lo storico serve al cliente («i miei ordini», «ordina di nuovo») e all'OS; non è detto che vada copiato tutto |
| Stati dell'ordine e testi al cliente | Velocissimo, 8 stati | 8 | stati fissi + `notifica_cliente` | **parziale**: mancano i testi per stato |
| Pagamenti | 2Bit + Nexi | per ordine | `pagamento`: 0 | **mancante**: la tabella c'è, la cassa non la usa ancora |
| Rider | Velocissimo «Rider 1..11» | 11 | `rider`: 11 | **coperto** |
| Movimenti contanti dei rider (borsello) | Velocissimo `/borsello-rider` | non usato in Velocissimo | `rider_movimento`: 10 | **parziale** |
| Notifiche automatiche | Velocissimo | 12 eventi (3 accesi) | `notifica_cliente`: 23 | **parziale**: solo «partita»; mancano «rider arrivato», «ordine in ritardo», «carrello abbandonato» |
| Chiusure X / Z | 2Bit (mai nel cloud) | — | — | **mancante**: la chiusura è da progettare (`14`) |

## 5. Stampa, fiscale, telefono

| Dato | Fonte | Quanti | Nella cassa nuova | Stato |
|---|---|---|---|---|
| Stampanti comande | 2Bit | 2 (cucina, cassa per i fritti) | `stampante`: 0 | **mancante**: IP non ancora confermati |
| Stampante fiscale | Epson FP-81II RT, 192.168.1.200 | 1 | — | **mancante**: da provare in negozio |
| Chiamate in arrivo | modem o centralino sul PC | — | `chiamata`: 5 (prove) | **parziale**: manca il collegamento vero |

## 6. Cosa non serve

Campagne push (7 in tutto, ultima nel 2024), liste clienti statiche, dati aggiuntivi, matrici RFM e
report clienti (li fa mano-a-mano-os), form del sito, moduli Velocissimo non attivi (`13` §13.0).

## 7. I tre buchi più gravi, da chiudere per primi

1. **I punti di 1.385 clienti (37.908 punti)** sono nell'appoggio ma non sono passati nella cassa:
   oggi un cliente vero con 34 punti risulta a 0.
2. **Le 1.576 card** non sono nemmeno nell'appoggio: va riletto `/customer` con la colonna del
   numero card.
3. **I 465 coupon ottenuti e non usati** non ci sono: senza, il giorno del passaggio i clienti
   perdono il buono che hanno in tasca.

Per tutti e tre la lettura da Velocissimo è in sola lettura. La scrittura nella cassa passa da una
migrazione nuova e dalla funzione d'import già esistente (`importa_clienti_velocissimo`, mig. 0049),
con un controllo dopo: somma dei punti e numero di card uguali da una parte e dall'altra.
