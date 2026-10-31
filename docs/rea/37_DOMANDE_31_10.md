# 37 — Le domande per Edoardo, a fine delle 12 ore (31/10/2026)

Raccolte durante lo studio di REA 36. Ognuna ha scritto cosa si sblocca con la risposta. Le decisioni
restano sue; qui non si decide niente.

## A. Un sì solo sul database (una migrazione, tutta insieme)

1. **Chiudere `accetta_ordine_esterno` a `anon`** (36.6): oggi chiunque abbia la chiave pubblica del sito
   può far entrare un ordine Glovo/Deliveroo finto. La chiamano solo le route server con `service_role`.
2. **`cruscotto` solo all'admin** (36.4): oggi lo staff con ruolo `cassa` può leggerlo via API anche se la
   pagina non la vede.
3. **`v_vendite_giornata` in `security_invoker`** (36.6, l'unico ERRORE del linter).
4. **`tavolo_conto_chiudi2`** (conto diviso, buoni pasto, Satispay: `supabase/da_decidere/pagamenti_divisi.sql`).
5. **«Coperti asporto» = pizze** nel CSV a 40 colonne (`ordini_giornata`), come fa Velocissimo (36.4).
6. Le 8 migrazioni che stanno solo nel registro e non in cartella (36.1): si scrivono i file per avere la
   storia completa. Non cambia niente nel database.

## B. In negozio, con Edoardo davanti alle macchine

7. **Password sul web server della fiscale** (36.6): oggi chiunque sul Wi-Fi legge gli incassi del giorno
   e può mandare comandi. Si mette dal menu della stampante e si scrive solo nel `config.json` del PC.
8. **Prima stampa fiscale nostra**: un documento NON fiscale via `fpmate.cgi` (porta 80, convive col 2Bit
   sul 9100), poi uno scontrino vero da 0,01 € e il suo annullo, poi niente altro fino alla Z letta.
   Quando? Serve mezz'ora a negozio chiuso.
9. **Foto della comanda di PROVA** stampata stanotte (PIZZERIA e ASP): per controllare il byte dell'euro
   (PC858, 213), il taglio parziale e le 42 colonne (36.5).
10. **pktmon dalla finestra amministratore** («Ascolto stampanti» sulla Scrivania): una sera di ascolto
    trasforma in V la trama della Z doppia e il formato grezzo della comanda.

## C. Decisioni di mestiere

11. **L'agente delle chiamate** (il numero di chi chiama esce dal PC verso la cassa nostra): sì o no?
    Il 28/10 era «per ora no». Senza, la scheda cliente non si apre da sola in parallelo.
12. **Il copiatore e i dati personali**: oggi copia gli ordini del 2Bit senza nome, telefono e indirizzo.
    Per far vedere in cassa «chi» ha ordinato (e per il rider) servono. Si accende quando lo dice lui.
13. **Il dispositivo in negozio di Velocissimo** (36.2): i 42 ordini «banco» da un account fisso sono un
    tablet/totem loro? Chi lo usa e dove sta?
14. **Nexi**: il contratto dei pagamenti online dell'app è intestato alla pizzeria o a WEBAPP? Decide se i
    pagamenti online della nostra app possono restare su Nexi o vanno rifatti.
15. **App Store Connect e Google Play**: l'account dell'app «A Mano A Mano Pugliese» è della pizzeria o di
    WEBAPP? Decide se la nostra app può prendere il posto della loro nello stesso store.
16. **Deliverect**: il modulo partner (webhook verso di noi) lo compila la pizzeria o serve WEBAPP? Oggi
    gli ordini Deliverect entrano dal loro gateway.
17. **Manuali Epson FP-81 II RT** (Operatore + protocollo ePOS/XML): da scaricare dal sito Epson e
    caricare qui, il container non lo raggiunge.
18. **Il canale sulla comanda**: il 2Bit in cucina stampa zona e pagato, ma non da dove arriva l'ordine
    (app, Glovo, telefono). La nostra lo stampa piccolo sotto l'ora. Serve ai pizzaioli o si toglie?
19. **Tre stati dei tavoli sulla piantina** (come il 2Bit): «preconto portato», «conto chiesto» e «seduti
    da troppo senza ordine». Solo colori, nessun passo in più per il cameriere. Li vuoi?
20. **La chiusura serata avvisa se ci sono tavoli o ordini aperti** prima di scaricare il CSV. Il 30/10 il
    primo CSV (23:27) era senza il tavolo da 59,50 € chiuso alle 23:33, e l'hanno riscaricato. Lo metto?
21. **I prezzi delle piattaforme**: su Glovo, Deliveroo e Just Eat la Margherita costa 8,40 e non 7,90 come nel
    listino 3 di Velocissimo. Rifaccio il nostro listino piattaforme dai prezzi veri degli ordini (stessi su tutte
    e tre)? E i doppioni del menù (stessa pizza due volte, una a 0 €) li tolgo dalla vista della cassa?

## D. Cose che non servono a Edoardo ma vanno dette

- La Z doppia ogni sera **non è dello staff**: è il driver del 2Bit che rimanda la chiusura dopo 60 s senza
  risposta (36.5, D forte). Non sono vendite in più e l'Agenzia accetta tutto.
- La copia del 2Bit (`copia_2bit`) è oggi l'unico backup fuori dal PC degli ordini della sera (36.6).
