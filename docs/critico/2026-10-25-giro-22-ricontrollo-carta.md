# Giro 22 del critico: ricontrollo delle risposte al giro 21 (25/10/2026, 01:30–01:50)

Deploy: main `8978a23` («Comanda stampata: allergie sopra le pizze…»), `READY` su Vercel. Prima di lui
`1afc3d4` e `433199d` (grafico giro 22). Nessun ordine nuovo: sulla cassa ho messo righe nel
pannello e le ho svuotate, senza mai mandare. Totem chiuso (notte), quindi il totem aperto non è
provato.

## 1. La carta

Letta da `npx --yes tsx scripts/prova-stampa.mts` (tutte le prove passano, cucina 48 e cassa 42) e
dai cinque casi resi con `comandaEscPos`. Il mio lettore dei byte segna `[2x2]` doppia, `[H2]` alta,
`▓` fascia nera, `*` grassetto.

La comanda della prova (cucina, 48 colonne):

```
[2x2]  * C-57
         - copia cucina -
      ▓* MODIFICATA - RISTAMPA 20:52
[2x2] ▓* DOMICILIO
[H2]   * per le 21:30
         ricevuto 20:40 · Telefono
[H2]   * Prova Critico [4 ORD.]
         333 000 0000
[H2]   * Via Novara 5
         00198 Roma
[H2]   * ZONA CENTRO
       * NOTE: Citofono rotto, chiamare al numero
[H2]  ▓* !! Senza glutine: attenzione
      ▓* PIZZE CLASSICHE
      ▓* IN PIÙ
[H2]   * +1  MARGHERITA
              (in tutto 2, 1 già fatta)
      ▓* NUOVA
[H2]   *  1  DIAVOLA …
       *      CON bufala
       *      SENZA basilico
       …      · Würstel e patatine
      ▓* TOLTE - NON FARE
       * 1 x COCA COLA
…
[H2]   * TOTALE  31,30 €
      ▓* CONTANTI
       * PAGA CON 50,00 € -> RESTO 18,70 €
         - copia cucina -
```

| Cosa chiedevo | Com'è adesso | Esito |
|---|---|---|
| Allergia sopra le pizze | «!! Senza glutine: attenzione» in fascia nera **alta**, subito sopra la prima fascia di reparto | fatto |
| Nota dell'ordine sopra le pizze | «NOTE: Citofono rotto…» è sopra le pizze, ma in **grassetto a misura normale, senza fascia**. La Risposta dice «escono in una fascia alta» per tutte e due: per la nota dell'ordine non è così | a metà |
| Riga cresciuta | fascia «IN PIÙ», poi alto «+1  MARGHERITA», sotto piccolo «(in tutto 2, 1 già fatta)» | fatto, molto chiaro |
| Ora sempre grande | «per le 21:30», «SUBITO», «DOMANI alle 20:00» tutte alte; «ricevuto 20:40 · Telefono» sotto in piccolo | fatto |
| Domicilio riconoscibile | «DOMICILIO» in fascia nera **2x2** su tutta la larghezza; RITIRO, AL BANCO e TAVOLO D5 in 2x2 senza fascia | fatto: sul filo si distingue |
| «·» nei menu | «· Würstel e patatine» | fatto |
| ANNULLATO anche in fondo | fascia alta «ANNULLATO - NON FARE» in cima e in fondo, e le righe non sono più alte (« 1  LA FUNGHI» in grassetto normale) | fatto, meglio di quanto chiesto |
| Tavolo | fascia «SI PAGA AL CONTO». I coperti no (la Risposta spiega che l'ordine non ha il campo) | fatto; i coperti restano aperti |
| «[N ORD.]» | «Prova Critico [4 ORD.]» alto accanto al nome; nel preordine «Prova [12 ORD.]» | fatto (vedi i conti sotto) |
| Zona | «ZONA CENTRO» / «ZONA BOLOGNA SPALLANZANI» alta, su una riga sua | fatto |
| Copia cucina/cassa | «- copia cucina -» anche in cima, sotto il numero | fatto |

**I cinque casi:**
- **Tavolo D5:** «TAVOLO D5» 2x2, «SUBITO», pizze, TOTALE, fascia «SI PAGA AL CONTO». Pulito.
- **Banco senza nome:** «AL BANCO», «SUBITO», nessun blocco cliente, fascia «CONTANTI». Giusto.
- **Sito già pagato:** «RITIRO», «per le 20:15», «ricevuto 19:40 · Sito», fascia «GIÀ PAGATO» (adesso con la À), nessun resto. Giusto.
- **Preordine di domani a domicilio:** fascia «DOMICILIO», «DOMANI alle 20:00» alta, «ZONA BOLOGNA SPALLANZANI» alta, «PAGA CON 20,00 € -> RESTO 3,20 €».
  - Qui la nota fissa del cliente era «citofono rotto, chiamare al cancello». Adesso esce in fascia nera alta **sopra le pizze**, come un'allergia. Il pizzaiolo la legge come un allarme che non lo riguarda. Il rischio è che si abitui a saltare la fascia «!!», anche il giorno che c'è scritto «senza glutine».
- **Annullato:** detto sopra. Buono.

**«[N ORD.]», i conti.** La funzione `comanda_per_stampa` gira solo come `service_role`, quindi dal
connettore torna vuota. Ho rifatto a mano lo stesso conto: ordini dello stesso cliente, non
annullati, fino a questo compreso.
- Sul cliente con più ordini (15 in tutto, 5 annullati) i dieci validi escono da `[1 ORD.]` a
  `[10 ORD.]`, in ordine di tempo. La ristampa di un ordine modificato tiene lo stesso numero,
  perché conta sulla data di creazione. Torna.
- Due casi limite:
  - **L'ordine annullato non conta sé stesso.** La ristampa di un annullato dice un ordine in meno; se il cliente non ne ha altri validi, il numero non esce (è 0, e `escpos.ts` stampa solo se diverso da zero). Innocuo.
  - **Il primo ordine esce «[1 ORD.]».** 2Bit lo diceva uguale, ma «PRIMO ORDINE» si nota di più (proposta piccola).

**Proposte rimaste, in ordine:**
1. **Separare l'allergia dalle istruzioni per il rider.**
   - La fascia nera alta sopra le pizze andrebbe solo alle note che riguardano la cucina.
   - Il citofono, il cancello e il piano andrebbero sotto la via, in grassetto.
   - Oggi `cliente_note` è un campo solo: o lo si divide in «allergie/cucina» e «per il rider» nella scheda cliente, o la cassa sceglie dove va.
   - Finché resta un campo solo, una fascia «!!» per un citofono insegna al pizzaiolo a non leggerla.
2. **La nota dell'ordine in fascia come dice la Risposta.** Oppure, se è per il rider, sotto la via. Oggi esce in grassetto normale, fra la zona e l'allergia.
3. **Coperti al tavolo**, quando Edoardo decide come contarli.
4. **«PRIMO ORDINE» al posto di «[1 ORD.]»** (minore).

## 2. `/cassa/nuovo`: INVIA col pannello aperto

| Schermo | Righe | INVIA | Note |
|---|---|---|---|
| 390×844 | 1 (La barona) | 784–838, **in vista**, e ci resta con il pannello scorso a 0, 200 e in fondo (290) | il fondo fermo (`.c-fondo`, 687–844) ha «Al banco si paga subito: scegli Contanti o POS. · Svuota · 8,50 € · INVIA IN CUCINA» |
| 390×844 | 10 (due categorie) | 784–838, **in vista** a ogni scorrimento | le righe scorrono dentro la loro lista; totale 86,10 € nel fondo |
| 1024×768 | 1, banco e domicilio | 706–768, in vista; il fondo è `sticky` a 582–768, il pannello scorre 940/768 | come nel giro 18/19: niente cambiato |

- Nessun tasto sotto 44 nel pannello, a 390 e a 1024. Nessuno scorrimento orizzontale.
- Il fondo fermo a 390 si prende 157 px dei 741 del pannello: per le righe e le scelte restano 586 px. Si lavora.
- Svuotato ogni volta; riaperta la pagina, la comanda era vuota («Tocca un prodotto per iniziare la comanda.»).

Il grave del giro 21 a 390 è chiuso.

## 3. Grafico giro 22

**Avvio del totem chiuso** («SIAMO CHIUSI · La cucina apre alle 18:30 · TORNA A TROVARCI»):

| Schermo | Fascia sabbia | Bollino | Sovrapposizione |
|---|---|---|---|
| 1080×1920 | 0–96 in cima | 360,957 360×360 | **0** (era 976–1072 sopra il bollino) |
| 390×844 | 0–60 | 109,378 172×172 | 0 |
| 1024×768 | 0–96 | 374,129 276×276 | 0 |

Il difetto del giro 20 è chiuso. Su nessuno dei tre c'è scorrimento.

- **Carrello del totem:** non provato. Sono le 01:30 e il totem è chiuso fino alle 18:30, quindi al carrello non si arriva. Va rifatto con il totem aperto.
- **Logo di `/ordina` a 390:** la scritta «A MANO A MANO» è 258×36 in testata (era 87×32) e si legge. In testata a destra c'è anche il bollino piccolo (34×34), e sotto «Ordina» il bollino grande (150×150). Tre segni del marchio nel primo terzo di schermo: è abbondante ma non sbagliato (minore).

## Voti

- Carta della comanda: **8,5 su 10** (era 7). Fatto quasi tutto. Restano la nota fissa che mescola allergie e citofono, e la nota dell'ordine non in fascia.
- `/cassa/nuovo` a 390 col pannello: **9 su 10** (era 7).
- Totem chiuso e `/ordina`: **9 su 10**.
- **Complessivo giro 22: 8,5 su 10.**

## Ordini da annullare

Nessuno: in questo giro non è partito nessun ordine.
