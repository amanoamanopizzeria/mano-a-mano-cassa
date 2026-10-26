# Giro 29 del critico: il coperto al tavolo, i punti, il rider con le regole chiuse

Main a `ec8a1ae` (deploy di produzione READY). Migrazioni nel registro di Supabase: `profilo_ruolo_protetto`
(0063), `rider_solo_dalle_funzioni` (0064), `punti_e_coperto` (0065), `giro_e_consegne_chiuse` (0066),
tutte del 26/10 fra le 00:27 e le 01:12 UTC. Attenzione: **0063, 0064 e 0066 sono già applicate al
database ma il loro codice è solo sul ramo `claude/project-thread-7k15q9`** (deploy di anteprima `4a42e31`
READY, non in produzione). In produzione quindi gira il codice di `main` sopra le regole nuove.

26/10/2026, 02:20–02:45 ora di Roma, Chrome a 1316×902, utenza della cassa (ruolo `cassa`).
Ordini di prova: C-99 (tavolo D9), C-100 e C-101 (tavolo D10), C-102 (domicilio, cliente 0009990027).
Tutti con la nota «PROVA CRITICO», **tutti annullati**, tutti i tavoli di nuovo liberi.

**Voto: 6,5 su 10.** Il coperto si vede ed è giusto quando tutto va dritto, ma il tavolo ha tre strade
per perderlo o farlo pagare alla persona sbagliata, e una di queste fa pagare a un tavolo il conto di
quello prima.

## 1. Il coperto nel conto del tavolo (mig. 0065)

**Prova A, il caso dritto.** `/cassa/tavoli` → «Apri» su D9 → coperti 3 → `/cassa/nuovo` Tavolo, D9,
2 × Margherita (8,50 €, listino L2 giusto) → Invia: C-99, 17,00 €. Su D9 «Conto»:

> 2× La margherita 17,00 € · 3× Coperto 4,50 € · TOTALE 21,50 €

✓ Giusto: 3 × 1,50 €. Non ho toccato «Contanti» né «POS»: un ordine chiuso al tavolo diventa `ritirato`,
e da `ritirato` non si torna indietro (vedi difetto 5), quindi non avrei potuto annullarlo. La riga del
database l'ho controllata leggendo la funzione: `tavolo_conto_chiudi` in produzione contiene il blocco
«Coperto» del file 0065, e la pagina calcola la stessa cifra con la stessa regola.

**Prova B, il tavolo che nessuno ha «aperto».** `/cassa/nuovo` Tavolo, D10 (libero), 1 × Marinara →
C-100. `/cassa/tavoli`: D10 «occ. · **0 cop.**». Il conto non avrebbe nessun coperto: `ordine_da_cassa`
mette il tavolo occupato ma lascia `coperti` a 0, e `tavolo_conto_chiudi` aggiunge il coperto solo se
`coperti > 0`. Nella pagina dei tavoli non c'è un modo di correggere il numero dei coperti su un tavolo
già occupato.

**Prova C, «Libera» con un ordine aperto.** `/cassa/nuovo` Tavolo, D10, 1 × Marinara → C-101 (7,50 €).
In `/cassa/tavoli` «Libera» su D10: il tavolo torna libero **subito, senza domanda**, C-101 resta aperto
e attaccato a D10. «Apri» su D10 con 2 coperti (la tavolata dopo), «Conto»:

> ORDINE C-101 · 1× La marinara 7,50 € · 2× Coperto 3,00 € · TOTALE 10,50 €

La tavolata nuova si trova nel conto la pizza di quella prima, e il coperto calcolato sui suoi due posti.

## 2. I punti a 1 ogni 5 € senza la consegna (mig. 0065)

- `negozio.punti_per_euro` = 0,20 ✓; `punti_da_ordine` in produzione toglie `costo_consegna` ✓.
- Prova dal vivo non fatta: i punti nascono solo a `consegnato`/`ritirato`, e un ordine così non si
  annulla più. C-102 (3 × Marinara 19,20 € + 1,00 € di consegna) avrebbe dovuto dare 3 punti
  (19,20 × 0,2 = 3,84). Annullato prima: nessun movimento, giusto.
- **I saldi fatti col vecchio passo restano**: la scheda di 0009990027 dice «★ 15 punti» per C-92 da
  15,60 € (col passo nuovo sarebbero 2). Oggi hanno punti solo tre clienti di prova (190 in tutto),
  quindi non tocca nessuno vero; da azzerare prima di partire.
- Nessun premio ha `costo_punti` (tutti i coupon «premio» sono spenti e senza soglia): il passo nuovo
  non ha ancora un premio contro cui misurarsi.

## 3. Rider con le regole chiuse (0064, 0066 applicate, codice del ramo non in produzione)

`/cassa/cliente` → 0009990027 → «Prendi l'ordine» → Domicilio, 3 + Marinara (ne entrano 3 ✓, 19,20 €),
Contanti, «Adesso» → «A quest'ora non si consegna (consegna 19:00–22:30)» ✓ → quarto 19:00 → C-102.

- `/rider`: «LA PRENDO IO» → assegnata; «Parto» → ritirata, in viaggio. Funziona con le regole di
  scrittura chiuse dalla 0064: l'app passa solo dalle funzioni ✓.
- Annullata dalla cassa mentre era in viaggio: consegna `annullata` ✓ (0066). Sul telefono del rider
  sparisce senza avviso (già scritto al giro 27).
- `aggiorna_consegna`, `consegna_da_ordine` e `assegna_consegna` in produzione sono quelle della 0066
  (letto il testo). Il caso «schermo vecchio che tocca Consegnata» non l'ho rifatto dal vivo.
- **Il rider è partito alle 02:30 con un preordine delle 19:00 mai stampato in cucina**: `in_viaggio_il`
  01:30 UTC, `pronto_il` vuoto; la carta in `/cassa` diceva «Stampa ora», cioè la cucina non l'aveva.
- «Hai in mano 0,00 €» con C-92 da 15,60 € ancora da saldare: come al giro 28, non cambiato.
- `/login` in produzione ha ancora «Registrati» (il ramo lo toglie). Con la 0063 chi si registra non
  si alza più il ruolo (trigger presente, default `cliente`), quindi il buco grave è chiuso; resta
  la porta aperta finché il ramo non arriva su `main`.

## 4. Il resto del giro

- `/cassa/fasce`: 19:00, 20:00 e 20:30 mostrano «🔍 1 ordine» con tutti i conti a 0: sono ordini
  annullati, segnati «ANNULLATO» in grigio. Corretto, ma il numero sulla lente conta anche gli annullati.
- `/cassa`: dopo tre annulli il filtro «Chiusi» è passato da 24 a 27: «Chiusi» conta anche gli annullati.
- `/cassa/mappa`: 11 rider, 0 in corso, mappa e legenda a posto.
- `/totem`: non provato, l'utenza di Chrome ha il ruolo `cassa` e non `totem`.
- Ordine dall'app vecchia e dal sito: non rifatto in questo giro (stesso flusso dei giri 8 e 9).

## Cosa non va

**Grave**
1. **«Libera» lascia gli ordini aperti attaccati al tavolo, e la tavolata dopo li paga.** `/cassa/tavoli`,
   D10 con C-101 aperto → «Libera» → «Apri» con 2 → «Conto»: C-101 (7,50 €) + 2 coperti = 10,50 €.
   Atteso: «Libera» con ordini aperti chiede «ci sono 7,50 € non pagati: incassi o annulli?», oppure
   non si può; e il conto prende solo gli ordini nati dopo `aperto_il`.
2. **Il coperto si perde se il tavolo nasce da `/cassa/nuovo`.** D10 scelto da libero in `/cassa/nuovo`
   → occupato con «0 cop.» → conto senza coperto. In sala è il caso normale (si ordina e basta).
   Atteso: scelto un tavolo libero, la cassa chiede i coperti (o li mette di base dai posti), e nella
   pagina dei tavoli si possono correggere su un tavolo già occupato.
3. **Nell'export per l'OS la colonna «Coperti» è sempre 0 per i tavoli chiusi.** `ordini_giornata('2026-10-24')`:
   tutte le righe «Tavolo» hanno «Coperti» = 0, perché la colonna legge `tavolo.coperti`, che
   `tavolo_conto_chiudi` rimette a 0 alla chiusura. L'ordine non tiene i suoi coperti. Atteso: i coperti
   salvati sull'ordine (o dalla riga «Coperto») e letti da lì.

**Medio**
4. **Il bottone «Ritirato» in `/cassa` c'è anche sugli ordini al tavolo** (C-99 lo mostrava): chiude
   l'ordine senza passare dal conto, quindi senza coperto e senza pagamento, e il tavolo resta occupato.
   Atteso: sugli ordini al tavolo niente «Ritirato», si chiude dal conto.
5. **Un conto chiuso non si storna.** Da `ritirato` nessuna transizione (`src/lib/types.ts`): un tavolo
   incassato per sbaglio (contanti invece di POS, il tavolo vicino) resta così. Per lo stesso motivo il
   coperto non l'ho incassato dal vivo.
6. **Il rider parte con un preordine che la cucina non ha ancora.** C-102 per le 19:00, preso e
   «Parto» alle 02:30, `pronto_il` vuoto, comanda «non stampata». Atteso: un preordine si prende solo
   nella sua finestra, o almeno «Parto» chiede conferma se l'ordine non è pronto.
7. **«Apri» in `/cassa/tavoli` usa la finestra del browser (`window.prompt`)** per i coperti: blocca la
   pagina finché non si risponde (Chrome dell'agente è rimasto bloccato 30 s), e sul totem o su un
   iPad in modalità app quella finestra è brutta o non c'è. Atteso: un tastierino nella pagina, come
   in `/cassa/nuovo`.
8. **Codice e database fuori passo**: 0063, 0064 e 0066 sono nel database di produzione, il codice che
   va con loro (via «Registrati», «Parto con tutte» con le consegne senza punto) è solo sul ramo.
   Il rider di `main` funziona lo stesso (passa dalle funzioni), ma va portato su `main`.
9. **«Hai in mano 0,00 €»** con C-92 da 15,60 € da saldare: invariato dal giro 28.

**Da avere**
- In `/cassa/nuovo`, scegliendo «Tavolo», il totale non mostra il coperto che arriverà (C-99: 17,00 €
  in cassa, 21,50 € al conto).
- «Stampa» del conto è `window.print()` del browser, non la stampante della cassa.
- «Sicuro? Tocca ancora» scade in pochi secondi: al primo tentativo il secondo tocco non ha annullato.
- I saldi punti col vecchio passo (15, 16, 159 sui clienti di prova) da azzerare.
- La lente di `/cassa/fasce` e il filtro «Chiusi» contano anche gli annullati.

## Pulizia

- C-99, C-100, C-101 (tavolo) e C-102 (domicilio): annullati dalla cassa. Nessun punto mosso.
- D9 e D10 liberati: 0 tavoli occupati.
- C-92 (giro 28) resta consegnata e da saldare, come prima.
