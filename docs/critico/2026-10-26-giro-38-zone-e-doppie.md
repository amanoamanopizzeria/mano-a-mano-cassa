# Giro 38: il colore delle zone e la consegna da abbinare (26/10/2026)

Commit provato: `173f1bc` (righe «In uscita a quarto d'ora» di `/cassa`: colore della zona e «con C36 · 4 min»).
Sul connettore Vercel è **READY** in produzione (`dpl_81Mqqcf6hw4wVdeEUYbTt29dfPKA`, l'ultimo del progetto).
Orario: circa 19:05–19:20 UTC.

**Regole, rispettate:** nessuna scrittura nel database, nessun ordine, nessuna utenza. Supabase
`tnuyeyqwoqhmgpskqtuq` usato solo in SELECT (zone, ordini aperti, conteggi). Browser: Claude in Chrome, una
scheda mia su `/cassa`, chiusa alla fine. L'unico tocco è stato «Ieri e prima» acceso e poi spento: è solo un filtro.
I calcoli sulle zone stanno in `zone.py` e `sim.py` nello scratchpad (`g38/`), non nel repo.

## 1. Cosa c'era stasera in cassa

**Nessuna consegna aperta.** Le righe a quarto d'ora erano vuote («Niente da far uscire»). Con «Ieri e prima»
compare una sola pillola, C-10 (ritiro del 24/10, «in ritardo di 2937 min»): nessuna zona, nessun abbinamento.
Il CSS nuovo è servito (3 regole `lo-p-zona`/`lo-p-doppia` nei fogli caricati), ma **non ho visto la funzione
girare con dati veri**. Il resto si basa sul codice e sui poligoni. Come da regole, non ho creato consegne.

Nota a margine, fuori da questo commit: nel DB ci sono ancora aperti C-5 (domicilio, **pronto, senza zona**),
APP-4, C-7 e C-9 del 23/10, che «Ieri e prima» non mostra (mostra solo C-10).

## 2. Geografia: le famiglie di colore hanno senso?

Ho preso i 16 poligoni veri (`zona.poligono`) e la pizzeria in Via Novara 5 (41.91380, 12.50734), che sta **dentro
Verbano**. Per ogni zona ho calcolato il centro (baricentro dell'area), la distanza e la direzione dalla pizzeria.
Per ogni coppia di zone ho contato i vertici in comune (cioè se confinano) e ho estratto 300 case a caso per zona.
Su queste case ho misurato due cose: quante coppie stanno **entro 8 minuti** con la regola della stima (linea d'aria ×
1,4 a 22 km/h) e **quanta strada si risparmia** facendo un giro solo (P→A→B→P) invece di due andate e ritorni.

| Zona | Colore di oggi | Dal centro alla pizzeria | Direzione |
|---|---|---|---|
| Bologna Spallanzani | blu | 0,66 km | est (84°) |
| Verbano (c'è la pizzeria) | giallo | 0,69 km | nord (1°) |
| Porta Pia Piazza Fiume | viola | 0,89 km | ovest (255°) |
| Porta Pia Termini | viola | 1,17 km | sud (172°) |
| Parioli Alta | verde | 1,28 km | nord-ovest (311°) |
| Bologna Stazione Tiburtina | blu | 1,43 km | est (86°) |
| Nomentana Sant'Angela Merici | **giallo** | 1,81 km | nord-est (50°) |
| Libia Eritrea Nom | arancio | 1,85 km | nord-est (35°) |
| Barberini Via Veneto | viola | 2,05 km | sud-ovest (235°) |
| Parioli Moschea | verde | 2,12 km | nord-ovest (319°) |
| San Giovanni Colosseo | viola | 2,16 km | sud (195°) |
| Bologna Sapienza | blu | 2,16 km | est-sud-est (110°) |
| Libia Eritrea Salaria | arancio | 2,16 km | nord (14°) |
| Parioli Zooparco-Auditorium | verde | 2,37 km | ovest-nord-ovest (296°) |
| Valli Nomentana | arancio | 3,02 km | nord-est (44°) |
| Conca d'Oro Prati Fiscali | arancio | 3,30 km | nord-nord-est (22°) |

Come vanno le famiglie di oggi (coppie dentro la famiglia, «% entro 8 min / % di strada risparmiata»):

- **Blu (Bologna):** Spallanzani–Tiburtina 100/28, Tiburtina–Sapienza 91/31, Spallanzani–Sapienza 73/21. **Regge.**
- **Verde (Parioli):** Alta–Moschea 100/36, Moschea–Zooparco 100/38, Alta–Zooparco 99/33. **Regge.**
- **Arancio (Libia, Conca d'Oro, Valli):** Libia Nom–Libia Salaria 100/37, Valli–Conca 94/40, Salaria–Conca 88/36,
  Libia Nom–Valli 93/36. **Regge.**
- **Giallo (Verbano + Sant'Angela Merici): sbagliato.** Le due zone si toccano in un punto solo e hanno i centri
  a 1,45 km: 92/20. Sant'Angela Merici ha invece il centro a **0,49 km da Libia Nom** (arancio), con **100/40**,
  la coppia migliore di tutta la mappa. Con Valli (arancio) fa 97/36, con Tiburtina (blu) 99/33. Sant'Angela è
  arancio. È proprio il caso di Edoardo («C12 giallo, C36 giallo»): oggi una Sant'Angela e una Libia Nom, che
  andrebbero portate insieme, hanno colori diversi.
- **Viola (Porta Pia, Barberini, San Giovanni): troppo largo.** Copre ovest e sud, da 172° a 255°. Fiume–Termini
  81/16, Fiume–San Giovanni 61/18, Barberini–Termini 59/20: due direzioni diverse con lo stesso colore. Dentro però
  ci sono due coppie buone: Fiume–Barberini 93/28 a ovest, Termini–San Giovanni 86/28 a sud.
- **Coppie che confinano ma hanno colori diversi, e andrebbero bene insieme:** Sant'Angela–Libia Nom (sopra),
  Sant'Angela–Tiburtina 99/33, Libia Nom–Tiburtina 89/27, Termini–Sapienza 54/20 (meno).

### La proposta: 6 famiglie

| Colore | Zone | Direzione | Coppie dentro (entro 8 min / risparmio) |
|---|---|---|---|
| **Giallo, «Sotto casa»** | Verbano | 0,7 km, è la zona della pizzeria | si abbina a tutto quello che sta di strada; da sola non serve abbinarla |
| **Blu, «Bologna»** | Spallanzani, Tiburtina, Sapienza | est, 84–110° | 73–100 / 21–31 |
| **Arancio, «Nomentana–Libia»** | Sant'Angela Merici, Libia Nom, Libia Salaria, Valli, Conca d'Oro | nord-est, 14–50° | 62–100 / 31–40 (la peggiore è Sant'Angela–Conca d'Oro, 62/31) |
| **Verde, «Parioli»** | Alta, Moschea, Zooparco | nord-ovest, 296–319° | 99–100 / 33–38 |
| **Viola, «Porta Pia–Veneto»** | Piazza Fiume, Barberini | ovest, 235–255° | 93 / 28 |
| **Marrone, «Termini–San Giovanni»** | Porta Pia Termini, San Giovanni Colosseo | sud, 172–195° | 86 / 28 |

Se Edoardo preferisce gruppi più piccoli, l'arancio si divide in «Nomentana» (Sant'Angela, Libia Nom, Valli:
coppie 93–100 / 36–40) e «Salaria» (Libia Salaria, Conca d'Oro: 88/36). Il sesto colore non deve essere rosso,
perché il rosso è già il ritardo, e non deve essere arancio chiaro, perché è già il colore delle piattaforme (vedi sotto).

**Da chiedere a Edoardo prima di tutto:** Velocissimo ha un campo **«colore» per ogni zona**
(`docs/rea/13_BACKOFFICE_VOCE_PER_VOCE.md:122`). «C12 giallo, C36 giallo» potrebbe voler dire i colori che lo staff
già vede in 2Bit. Se è così, conviene leggerli dal back-office (solo lettura) e usare quelli, non inventarne di nuovi.

## 3. Codice: i difetti, in ordine di gravità

### G-1. Costi di Google: fino a migliaia di euro al mese (`src/app/cassa/page.tsx:429-452`, `src/lib/indirizzi.ts:163`)

La matrice parte con `routingPreference: "TRAFFIC_AWARE"`, quindi va sullo SKU **Compute Route Matrix Pro**:
10 $ ogni 1.000 elementi, gratis i primi 5.000 al mese
([prezzi](https://developers.google.com/maps/billing-and-pricing/pricing),
[cosa fa scattare Pro](https://developers.google.com/maps/documentation/routes/usage-and-billing)).
Ogni chiamata manda **n×n elementi**, diagonale compresa (i→i, buttati via). Le chiamate partono:

- una volta al minuto, sempre, anche se la vista non è «quarti» (l'effetto non guarda `filtro`) e anche con la
  scheda in secondo piano (il browser la rallenta a 1 al minuto, che è proprio il ritmo scelto);
- in più, una ogni volta che cambia `chiaveAbbina`, cioè a ogni ordine nuovo o uscito;
- **per ogni schermo** che ha `/cassa` aperta: PC di cassa, tablet, telefono di Edoardo.

Il conto per una sera da 40 consegne, 5 ore di servizio, **un solo schermo**:

| Consegne aperte in media | Elementi a sera | Al mese (30 sere) | Costo al mese |
|---|---|---|---|
| 5 (25 a chiamata) | ~9.500 | ~285.000 | **~2.800 $** |
| 8 (64 a chiamata) | ~24.000 | ~730.000 | **~7.300 $** |
| 10, il tetto (100 a chiamata) | ~38.000 | ~1.140.000 | **~11.000 $** |

Con due schermi si raddoppia. Il commento al rigo 423 dice «una volta al minuto», ma il problema è il quadrato
di n. Rimedi possibili, da chiedere a chi sviluppa:

- calcolare solo le coppie nuove quando entra un ordine (2n elementi, non n² ogni minuto);
- tenere in cache sul server la coppia di case (le case non si muovono);
- per le doppie, togliere il traffico (Essentials: 5 $, 10.000 gratis);
- chiamare solo con la vista «quarti» aperta e la scheda visibile.

Con le coppie nuove e senza traffico: ~40 × 2 × 8 = 640 elementi a sera, ~19.000 al mese, circa 45 $.

### G-2. Con più di 10 consegne restano fuori le più urgenti (`page.tsx:425-426`)

`daAbbinare` è `inUscita.filter(…).slice(0, 10)`, e `inUscita` ha l'ordine di `ordini`, cioè per **`creato_il`
discendente** (`page.tsx:164`). Quindi tiene le 10 **inserite per ultime**, non le prime da far uscire. In una sera
piena, le consegne del quarto attuale (prese nel pomeriggio o al telefono un'ora prima) perdono il suggerimento,
e lo prendono quelle delle 22:30. Il taglio è anche muto: nessuna pillola dice «non calcolata». Rimedio: ordinare
per quarto e prendere le prime 10, o meglio fare una matrice per finestra di quarti.

### M-1. «Entro 8 minuti fra le due case» non vuol dire «conviene» (`page.tsx:442-443`)

La regola misura solo A→B e non guarda la pizzeria. Due case possono stare a 6 minuti fra loro ma da due parti
opposte rispetto alla pizzeria, che sta in mezzo alle zone. Sui campioni:

| Coppia | Entro 8 min | Strada risparmiata |
|---|---|---|
| Spallanzani–Piazza Fiume | 84% | **1%** |
| Verbano–Termini | 60% | **1%** |
| Spallanzani–Termini | 88% | 12% |
| Fiume–Termini | 81% | 16% |

Il suggerimento «con C36 · 6 min» uscirebbe anche per queste coppie, dove il secondo cliente aspetta e basta.
La regola giusta è il giro: **minuti in più per il secondo cliente** = P→A + A→B − P→B (con la stessa matrice,
aggiungendo la pizzeria come origine), sotto una soglia (es. 5 min). Così il colore e il suggerimento direbbero
la stessa cosa.

### M-2. I colori che si confondono (`globals.css:1030-1032`, `1212`)

- **Il fondo della zona cancella il fondo «pronto».** `.lo-pillola[style*="--zona"]` (riga 1212) e
  `.lo-pillola.pronto` (riga 1032) hanno lo stesso peso e vince l'ultima: una consegna pronta non è più verde
  chiaro. Resta solo il badge «Pronto». Era il segno che si vedeva da lontano.
- **Giallo = consegna generica.** `#f2c200` è insieme il colore di Verbano/Sant'Angela e quello di
  `.col-consegna` (riga 1030), che resta su ogni domicilio **senza zona**. Esempio vero: C-5 è aperto, pronto,
  senza zona. Si vede col bordo giallo come un Verbano, solo che non ha l'etichetta.
- **Arancio = piattaforma.** `#e8762b` (Libia) e `#f08a5d` (`.col-piattaforma`, riga 1031) hanno un contrasto
  fra loro di 1,2:1, cioè sono lo stesso colore. Un Glovo a domicilio senza zona sembra una Libia.
- **Il rosso del ritardo perde il bordo sinistro.** `borderLeftColor` in linea (riga 570) vince su
  `.ritardo` (riga 1034). Il ritardo resta sugli altri tre lati e nel testo, quindi si vede ancora, ma meno.

### M-3. Il colore come unico segno, a metà (`zone-colori.ts:20-22`, `page.tsx:571`)

Accanto al pallino c'è il **nome della zona** («Bologna Sapienza»), non quello della famiglia («Bologna»):
`famiglia` si calcola e non si mostra mai. Per chi distingue male verde e arancio, o blu e viola, «Libia Eritrea
Nom» e «Nomentana Sant'Angela Merici» non dicono di essere la stessa famiglia. Mostrare la famiglia in grande e
la zona in piccolo.

Contrasti, pallino e bordo (oggetti grafici, servono 3:1) sul fondo colorato:

| Colore | Contrasto |
|---|---|
| giallo | **1,5** |
| grigio | 2,3 |
| arancio | 2,5 |
| verde | 2,8 |
| blu | 3,4 |
| viola | 4,7 |

Il giallo non si vede, sotto una luce da cucina meno ancora. Il **testo** sul fondo è a posto: nero su colore al
12%, da 13,8 a 15,4:1. «Parioli Zooparco - Auditorium» in maiuscolo da 13 px, spaziato, nella pillola da 200 px
va su due righe.

### L-1. Abbinamenti che non si corrispondono (`page.tsx:439-447`)

A dice «con B», ma B può dire «con C». A→B e B→A danno minuti diversi (sensi unici), quindi la stessa coppia
può dire «4 min» da una parte e «7 min» dall'altra. Una cassiera che legge due numeri per la stessa coppia si
ferma. Meglio cercare le coppie una volta sola (le più vicine prima, ogni ordine in una coppia sola) e scrivere
lo stesso numero su tutte e due.

### L-2. Google o la rete che non rispondono (`page.tsx:434-436`)

- Se risponde il server ma Google no, `tempiFra` ripiega sulla linea d'aria con `fonte: "linea"` e la pillola
  scrive «(stima)». **Va bene.**
- Se la `fetch` fallisce o dà errore (401 o 403, rete giù), `leggi` esce senza toccare `vicine`. Restano gli
  abbinamenti di prima, anche verso una consegna che nel frattempo è uscita, finché una chiamata non va a buon
  fine. Su `chiaveAbbina` nuova lo stato non si azzera prima della chiamata.

### L-3. Dati vecchi nel giro a tempo (`page.tsx:429-452`)

L'intervallo usa i `punti` e i `daAbbinare` del momento in cui è nato l'effetto: la chiave sono solo gli id.
Se a un ordine si cambia l'indirizzo o l'ora («Modifica»), l'abbinamento resta quello vecchio finché non entra o
esce un altro ordine. Va bene invece che non richiami a ogni render: la chiave è stabile.

### L-4. Senza coordinate, niente segno (`page.tsx:426`)

Le consegne senza `lat`/`lng` escono in silenzio dagli abbinamenti. Oggi nel DB è così per 1 su 52 (APP del
22/10, senza indirizzo). Le consegne senza zona (C-5) non hanno colore, ma hanno il giallo generico (vedi M-2).
Basta un «senza posizione» in grigio.

### L-5. La finestra «stesso quarto o quello accanto» (`page.tsx:443`)

`|Δ| ≤ 15 min` va bene col ritardo contato dalla fine della mezz'ora (`entroLe`): C12 alle 20:00 e C36 alle 20:15
stanno tutte e due entro le 20:30 e le 20:45. Due cose però:

- entrano nel confronto anche i quarti **già passati** (consegne in ritardo con una del quarto attuale): giusto,
  ma la pillola non lo dice;
- si abbina un ordine «Pronto» con uno appena «Ricevuto», che ha ancora 15 minuti di forno, senza avviso.

## Voti

| Cosa | Funziona | Veloce | Chiaro | Meglio di oggi | Voto |
|---|---|---|---|---|---|
| Colore della zona | B− (famiglie giallo e viola sbagliate, il «pronto» non si vede più, giallo e arancio presi da altri segni) | A | C+ (si legge il nome della zona, non la famiglia; il giallo a 1,5:1) | B (in 2Bit c'è già un colore per zona: sono gli stessi?) | 6 |
| «con C36 · 4 min» | C (8 minuti fra le case ≠ giro conveniente; con più di 10 consegne restano fuori le urgenti) | A | B (coppie che non si corrispondono) | A− (oggi non c'è) | 6 |
| Costi e carico | **D** (n² elementi Pro al minuto per schermo: migliaia di $ al mese) | | | | 4 |

**Giro: 5,5 su 10.** L'idea è quella giusta e chiesta da Edoardo, e il ripiego senza Google è fatto bene. Ma
così com'è, la prima sera piena costa a Google più della consegna. Taglia via le consegne più urgenti oltre la
decima, e suggerisce coppie «a 6 minuti» che non fanno risparmiare strada. Sui colori, due famiglie su cinque
vanno rifatte (Sant'Angela è arancio, il viola va diviso in due). Il colore copre anche il segno «pronto» e
coincide col giallo delle consegne e con l'arancio delle piattaforme. **Non visto dal vivo**: stasera nessuna
consegna aperta.

## In ordine di lavoro

1. G-1: abbinamento solo sulle coppie nuove, senza traffico, in cache, solo con la vista aperta. Prima che
   arrivi la prima sera piena.
2. G-2 + M-1: le prime 10 per quarto, e la regola del giro dalla pizzeria (minuti in più per il secondo cliente).
3. Famiglie: chiedere a Edoardo se usare i colori di Velocissimo; se no, le 6 famiglie qui sopra.
4. M-2 + M-3: il fondo «pronto» non va coperto; niente giallo e arancio già usati; il nome della famiglia in
   grande; un giallo più scuro, o niente giallo.
