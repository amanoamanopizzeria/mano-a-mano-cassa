# Giro 9 — `/ordina` dopo le correzioni del giro 8, e il conto dei tocchi

*Critico, 24/10/2026, 02:15–02:35. Deploy `cf504af` (mig. 0036) aspettato da BUILDING a READY, poi
provato. Telefono a 390×844 (pagina montata in un riquadro di 390 px, come sempre). Nome «Prova
Critico», telefono finto +39 000 222 3344, **nessuna sostituzione nel browser**: la bozza salvata
è stata cancellata prima di cominciare, così il conto parte da zero.*

## Ordini da annullare: **W-21** (domicilio POS, Viale Regina Margherita 100, 14,60 €, oggi 19:00) e **W-22** (ritiro, una margherita, 7,20 €, oggi 19:00).

## I cinque del giro 8, riprovati

| # | Prova | Esito |
|---|---|---|
| 1 | Via Novara 5 senza trucchi | ✓ la zona c'è: «Consegna 1,00 € · ordine minimo 10,00 €» e si va al menù. Il nome VERBANO però non si legge da nessuna parte: nel carrello compare «Consegna · verbano» solo in minuscolo; sulla scheda dell'indirizzo c'è il costo e basta |
| 2 | «Viale Regina Margherita» senza numero | ✓ fermato prima del menù: «Manca il numero civico: scrivilo qui.», casella «Civico», «Avanti» spento finché è vuota. Scritto 100 → «Viale Regina Margherita 100, Roma» e menù. Il punto sulla mappa resta però quello del viale (41.9141, 12.5051: il civico scritto non viene ricercato), e la zona è quella del centro del viale (PORTA PIA PIAZZA FIUME) |
| 3 | Ordine POS → `/rider` | ✓ «#21 · 14,60 € col POS · niente contanti», nota visibile; `consegna.contanti_da_incassare = 0,00`; «Hai in mano 0,00 €». `rider_borsello` somma i contanti delle consegne fatte, quindi col POS a zero non c'è niente da sommare (anche W-19 di ieri è stata messa a 0) |
| 4 | Conferma | ✓ «1× La margherita 7,20 € · 1× La marinara 6,40 € · Consegna 1,00 € · Totale 14,60 €», e per il ritiro «1× La margherita 7,20 € · Totale 7,20 €» |
| 5 | Cassa, preordine | ✓ «W-21 · per le 19:00 · domicilio · Prova Critico · Viale Regina Margherita 100 · 14,60 € · PORTA PIA PIAZZA FIUME (consegna 1,00 €) · POS · stampa alle 18:30 · Note: prova critico giro 9 POS»; W-22 «ritiro · 7,20 € · contanti» |
| + | Telefono corto | ✓ sotto il campo: «Il numero è corto: servono almeno 9 cifre.» |
| + | Impasto | ✓ «Impasto alto» e «Impasto normale» si escludono |

## I tocchi, contati dall'apertura alla conferma

Un tocco = un dito sullo schermo; la scrittura col tastierino è segnata a parte («+ scrivere»).

**Ordine semplice: una margherita da ritirare — 12 tocchi + 2 scritture (W-22).**

| # | Tocco | Nota |
|---|---|---|
| 1 | Ritiro in pizzeria | apre il menù da solo: bene |
| 2 | categoria «Pizze classiche» | il menù si apre su «Le novità estive»: chi vuole una margherita deve cercare la categoria |
| 3 | la carta «La margherita» | |
| 4 | «Aggiungi al carrello» | |
| 5 | barra «Vedi ordine» | **di troppo**: il carrello è una sosta obbligata anche con una pizza sola |
| 6 | barra «Scegli quando» | |
| 7 | il quarto d'ora «19:00» | |
| 8 | barra «Alle 19:00 · avanti» | **di troppo**: scelto il quarto d'ora si potrebbe andare avanti da soli |
| 9 | campo Nome + scrivere | |
| 10 | campo Telefono + scrivere | |
| 11 | «Contanti alla cassa» | **di troppo**: nessuna scelta precompilata, e per il ritiro si paga comunque al banco |
| 12 | «Conferma · 7,20 €» | |

Al secondo ordine nome e telefono sono già scritti: 10 tocchi.

**Domicilio con indirizzo nuovo: 14 tocchi + 4 scritture (W-21, due pizze).** Con una pizza sola
sarebbero 12 + 4. I tre tocchi dell'indirizzo (Consegna a casa → campo + scrivere → il
suggerimento) sono giusti e portano dritto al menù; il civico, quando manca, ne aggiunge due
(campo + scrivere, «Avanti»). Poi lo stesso giro del ritiro, con la stessa sosta al carrello e
lo stesso «avanti» dopo il quarto d'ora. Chi ha pagato col POS tocca «Bancomat o carta» perché
«Contanti» non è preselezionato: qui la scelta ha senso, ma andrebbe fatta in un tocco solo senza
scorrere.

**Dove mi sono fermato a capire:**
- all'indirizzo, dopo il suggerimento la pagina salta al menù: non ho fatto in tempo a leggere
  «Consegna 1,00 €». La zona la leggo solo nel carrello («porta pia piazza fiume»), in minuscolo;
- nel menù, per trovare la margherita: «Le novità estive» è la prima categoria e la striscia
  delle categorie va scorsa a destra (14 voci);
- in «Quando»: 16 quarti d'ora tutti uguali e nessun «il prima possibile»: la prima sera che si
  ordina non si sa quale scegliere. Per un ordine di sera il primo libero dovrebbe essere già
  proposto;
- nei dati: tre campi, una nota e due tasti di pagamento in una schermata che va scorsa prima
  di vedere «Conferma».

## Voti per passo

| Passo | Voto | Perché |
|---|---|---|
| Come lo vuoi | 9 | Un tocco e sei nel menù (ritiro) o all'indirizzo (casa) |
| Indirizzo | 8 | Zona vera, civico chiesto, suggerimenti rapidi. Il civico scritto a mano non sposta il punto sulla mappa; il nome della zona non si vede |
| Menù | 7 | Si apre sulle novità estive; striscia da scorrere; le carte dei menù combinati senza descrizione |
| Scheda prodotto | 8 | Chiara; i «+» degli ingredienti sono piccoli a 390 px e la lista è lunga (40 voci) |
| Carrello | 8 | Giusto, ma è una sosta obbligata anche con una pizza |
| Quando | 7 | Nessun orario proposto; tocco «avanti» in più |
| Dati | 7 | Il telefono corto ora si spiega; pagamento senza preselezione; schermata da scorrere |
| Conferma | 9 | Righe, consegna, totale, numero, «Segui la consegna» |
| Cassa | 9 | Zona, consegna, pagamento, nota: c'è tutto |

## Difetti, dal più grave

1. **Tre tocchi di troppo su dodici** nell'ordine più semplice: la sosta al carrello, l'«avanti»
   dopo il quarto d'ora, il pagamento da scegliere ogni volta. Edoardo: «ogni passaggio deve
   essere semplificato, deve essere una cosa veloce».
2. **Nessun orario proposto in «Quando»**: sedici tasti uguali e nessun «il prima possibile».
3. **Il civico scritto a mano non viene cercato**: il punto resta quello del viale (W-21 ha le
   coordinate del centro di Viale Regina Margherita, non del 100), quindi la zona, il «Naviga»
   del rider e la mappa del cliente guardano un punto sbagliato di qualche centinaio di metri.
4. **La zona non si vede mai col suo nome** prima del carrello, e lì in minuscolo («porta pia
   piazza fiume»); sulla scheda dell'indirizzo solo «Consegna 1,00 €».
5. Il menù si apre su «Le novità estive» (24 ottobre) e la striscia delle 14 categorie va
   scorsa: chi vuole una classica cerca.
6. Le carte dei menù combinati restano senza descrizione.
7. Barra dei dati: il totale scritto due volte («Conferma · 14,60 €» e «14,60 €»).
8. Per il ritiro la pagina chiede comunque «Contanti alla cassa / Bancomat o carta alla cassa»:
   al banco si decide lì, è un tocco che non serve.

## Risposta (direzione, 24/10/2026)

- **Tocchi di troppo**: dal menù «Avanti» va dritto a «Quando» (il carrello resta dietro il tasto in alto e nel riepilogo dei dati); il primo quarto d'ora libero è **già scelto** («Il prima possibile · 19:00») e un tocco su un altro porta subito ai dati; **contanti già scelto**, si cambia se si vuole. Ritiro di una pizza: da 12 tocchi a 9.
- **Civico scritto a mano**: si ricerca via + civico e si prendono le coordinate del portone; se la ricerca non trova il numero restano quelle della via.
- **Zona col nome**: «Zona Verbano · consegna 1,00 €» sulla scheda dell'indirizzo e nel carrello.
- **Menù** si apre sulle Pizze classiche; i menù combinati senza descrizione dicono «Con …» (quello che c'è dentro).
- Restano: l'ordine delle categorie (è quello del back-office, lo decide Edoardo); il totale doppio nella barra dei dati (è la forma dell'app: articoli · azione · totale).
- W-21 e W-22 annullati.
