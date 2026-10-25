# Giro 25 del critico: ricontrollo delle correzioni del giro 24 (25/10/2026, 02:38–02:45)

Deploy `45277d8` `READY`, migrazione `ordine_pronto_il` nel registro. Ho provato con cassa e `/rider`
affiancati a 390, con la vibrazione sostituita da un contatore. Ordini di prova:
- **C-82**: contanti, 21:00, cliente di prova «Tre»;
- **C-83**: POS, 21:15, cliente di prova «Dieci»;

entrambi in Via Nomentana 120. Totem non provato: è notte.

| # | Cosa | Esito |
|---|---|---|
| 1 | Striscia dei quarti a 390 e 1024 | **sì**: alta 65 px, ogni quarto 85×63. A 390 sta fra «Giorno… / Ora…» e «CONTANTI / POS / GIÀ PAGATO»; a 1024 è a 731,370 |
| 1 | Giallo mai su un quarto pieno | **sì**: con C-82 alle 21:00 (pieno con C-74) si legge «20:45 · 0/2 cons. · C-82 a 0 m» in giallo, «21:00 · pieno» grigio, «21:15 · 0/2 cons. · C-82 a 0 m» in giallo. Ho toccato 21:15 ed è partito C-83 «per oggi alle 21:15» |
| 2 | Niente vibrazione su «La prendo io» | **sì**: 0 vibrazioni prendendo C-82 e C-83. Una sola all'arrivo di C-82 |
| 2 | «Pronto in cucina» che resta | **sì** per C-82, segnato pronto in cassa e poi preso: «ASSEGNATA · PRONTO IN CUCINA»; dopo «Ritirata» sparisce |
| 3 | `/segui` con una posizione più vecchia della partenza | **sì**: «La posizione del rider arriva appena il suo telefono la manda.», senza l'ora del giorno prima; niente motorino |
| 4 | «Link per il cliente» sui preordini | **sì**, sulla carta di C-82 fra i preordini (nel riquadro di prova esce nella fascia d'errore perché il copia-incolla è bloccato) |
| 5 | Pizzeria a 41.91380, 12.50734 e rientro | **sì**: «consegnato, rientra fra 6 min (02:47)» alle 02:41. Conto: 1,11 km in linea d'aria, ×1,4 = 1,55 km, a 22 km/h 4,2 min + 2 = **6 min** (prima era 7). Verosimile |
| 6 | Borsello senza i contanti degli annullati | **no del tutto**: il rider legge **«Hai in mano −1,00 €»** (vedi sotto) |

**Punto 6, il borsello.** All'inizio la pagina diceva «Hai in mano −16,60 €».
- **Da dove viene.** Il deposito di 16,60 € di C-23 (alle 06:37 del 24) è ancora nei movimenti della
  serata, ma la sua consegna adesso è «annullata» e non conta più. C-82, 15,60 € in contanti, porta il
  saldo a −1,00 €.
- **La causa.** `rider_borsello` non è cambiata: conta le consegne `consegnata` e non guarda lo stato
  dell'ordine. Il caso si è risolto togliendo i dati a mano, non nella funzione.
- **Cosa serve.** Annullando via SQL, va tolto anche il deposito che la conteneva, oppure la funzione
  non deve mai scendere sotto zero. Un rider che legge «in mano −1,00 €» non sa cosa fare.

## Cosa resta

1. **Borsello negativo** (sopra).
2. **Il pronto arriva solo se la cucina lo segna prima della presa.** C-83, preso dal rider prima del
   pronto, in cassa offre solo «Consegnato» e «Annullato»: da «in consegna» non si torna a «Pronto».
   Se il rider si prende la consegna appena rientra, mentre le pizze sono in forno (il caso normale),
   l'avviso non arriva mai.
3. **Minore.** Sulla carta di un preordine già preso dal rider resta «Modifica».

## Voto

**8 su 10** (il giro 24 era 7). Cinque punti su sei sono a posto, e la doppia oggi si vede e propone
quarti dove la cassa accetta.

## Ordini di prova da annullare

**C-82** (contanti 15,60 €) e **C-83** (POS 16,60 €), dei clienti di prova del critico: consegnati e
non saldati. Dalla cassa non si annullano (409 da «consegnato»).
