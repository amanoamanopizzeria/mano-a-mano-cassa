# Giro 23 del critico: l'app dei rider e il cliente che segue la consegna (25/10/2026, 02:00–02:20)

Deploy: main `841ebce`. La domanda di Edoardo (25/10): «va sviluppata l'app dei rider dove trovano le
comande, se le assegnano e poi premono consegnate; collegata a Google Maps per tracciarli in tempo
reale e permettere al cliente di controllare lo stato di avanzamento».

**Il paragone.** Ho confrontato `/rider`, `/cassa/mappa`, `/cassa/rider` e `/segui/[token]` con
l'app Velocissimo Rider come la descrive il REA (`docs/rea/04_RIDER.md`, `11_PUSH_E_AVVISI_AL_CLIENTE.md`).

**La serata.** L'ho fatta tutta a 390 px, sulla cassa nuova, con i miei clienti di prova (nessun cliente vero):
- **C-77**: contanti, «paga con 50», per le 21:00;
- **C-78**: POS, stesso indirizzo di C-77, per le 21:15;
- **C-79**: contanti, per le 21:30.

C-77 e C-78 me le sono prese io dall'app rider; C-79 l'ha assegnata la cassa. Poi ritirata, consegnata
e saldo in cassa. Intanto guardavo `/segui` del cliente, a ogni passo e con due finestre affiancate.

Sono le due di notte, quindi gli orari di consegna sono quelli di stasera e gli orari veri dei
passaggi sono le 02:0x. La posizione non l'ho mossa: il riquadro di prova non ha il permesso
della posizione («GPS negato: consenti la posizione…»). Sotto dico come reagiscono la mappa e il
cliente con la posizione che c'è.

## Come è andata, passo per passo

| Passo | App rider (390) | Cliente `/segui` |
|---|---|---|
| 3 ordini mandati | «DISPONIBILI (3)», la prima scheda col tasto «LA PRENDO IO», le altre «PRENDI»; «16,60 € in contanti · paga con 50,00 € → resto 33,40 €»; «⚠ citofono rotto, chiamare al cancello»; Naviga apre Google Maps sulle coordinate, Chiama è un `tel:` | «ORDINE RICEVUTO · previsto per le 21:00», mappa con pizzeria e casa |
| Prendo C-77 | «LE MIE (1) · #77 · ASSEGNATA · … · RITIRATA» | «IN PREPARAZIONE, IL RIDER È PRONTO» |
| Prendo C-78 | «Stesso indirizzo di #77: portale insieme» su tutte e due; «In tutto da incassare in contanti 16,60 €» | — |
| La cassa assegna C-79 da `/cassa/mappa` (tendina «Assegna a…») | compare fra le mie quando ricarico (nessun avviso) | — |
| Ritirata | un tasto per consegna, non «parto con tutte» | «🛵 IN VIAGGIO VERSO DI TE CON RIDER · partito alle 02:08», il motorino sulla mappa, «Apri in Google Maps» |
| Consegnata C-78 | sparisce dalle mie, va in «Da saldare» | **in meno di 7 secondi**, senza ricaricare: «CONSEGNATO. BUON APPETITO! alle 02:09», il motorino sparisce |
| Consegnate C-77 e C-79 | «Hai in mano 35,40 € · da versare in cassa 35,40 €» · «#77 16,60 € · #78 0,00 € · #79 18,80 €» | — |
| Salda in `/cassa/rider` | «Rider di prova: saldate 3 consegne, versati 35,40 €.»; la lista del rider si svuota | — |

**Cosa funziona già.**
- Il rider si prende da solo la prima consegna, come Velocissimo.
- Stesso indirizzo: «portale insieme».
- Il resto è giusto (50 − 16,60 = 33,40).
- Note fisse del cliente in vista, Naviga sulle coordinate, Chiama.
- La cassa assegna e toglie il rider.
- Il cliente vede lo stato cambiare da solo (rilegge ogni 5 s).
- Il saldo torna al centesimo.
- Su tutte e quattro le pagine a 390: nessun testo sotto 13 px, nessuno scorrimento orizzontale,
  nessun tasto sotto 44.

## Cosa manca o sbaglia

### Grave per la serata

1. **Il cliente il link non lo riceve mai, tranne chi ordina dal sito.**
   - Quando il rider ritira, nasce l'avviso `notifica_cliente` «partita». Dopo la serata è rimasto
     `da_inviare` su tutti e tre gli ordini: nessuno lo manda, perché il WhatsApp è escluso e la
     push non c'è (REA 11).
   - La funzione `link_consegna`, pensata per dare il link «a chi chiama dov'è?», non la usa nessuna
     pagina: in `/cassa` la scheda di C-77 ha solo «Comanda» e «Stampa».
   - Il link si vede solo sulla pagina «Grazie» di `/ordina`.
   - Quindi chi ordina al telefono, cioè quasi tutti i domicili, non può «controllare lo stato di
     avanzamento», che è metà di quello che chiede Edoardo.
   - Il minimo per stasera: il tasto «Copia link per il cliente» sulla scheda in `/cassa` e in
     `/cassa/mappa`. Poi la push o l'SMS.
2. **Al cliente si mostra come viva una posizione vecchia di un giorno.**
   - L'unica posizione del rider è del 24/10 alle 01:41. Su C-78 «in viaggio» il cliente vede
     «🛵 IN VIAGGIO VERSO DI TE» con il motorino lì, senza un'ora né un «aggiornato X minuti fa».
   - In `/cassa/mappa` c'è «posizione delle 01:41 · FERMO», senza la data, e sembra di stanotte.
   - `segui_consegna` manda la posizione qualunque sia la sua età.
   - Se il telefono del rider smette di mandarla, il cliente vede un rider fermo, e chiama.
   - Proposta: oltre 2–3 minuti, niente motorino e «posizione in aggiornamento»; in cassa
     «ieri 01:41» o «da 25 ore».
3. **La posizione parte solo con la pagina `/rider` aperta e accesa.** È il `watchPosition` di una
   pagina web. Velocissimo Rider la manda anche in background (REA 4.2).
   - Col telefono in tasca a schermo spento la posizione si ferma, e si ricade nel punto 2.
   - Non l'ho potuto provare dal vivo, è nel codice.
   - Per «tracciarli in tempo reale» serve un'app installata, o almeno la PWA a schermo sempre
     acceso con un avviso chiaro «non chiudere questa pagina».
4. **Il rider non viene avvisato di niente.**
   - Una consegna nuova o assegnata dalla cassa compare solo se `/rider` è aperta (realtime) o
     quando ricarica: niente suono, niente vibrazione, niente push.
   - Quando la cassa ha assegnato C-79 il rider non l'ha saputo.
   - Velocissimo manda la push (con il difetto noto: «non arriva la notifica, devo ricaricare»).
5. **Un rider solo, e dentro l'utenza della cassa.**
   - In anagrafica c'è solo «Rider di prova», collegato all'utenza della cassa: in cima all'app
     rider c'è l'email della pizzeria e «Esci», e il titolo dice solo «Rider — consegne».
   - Per una serata servono le utenze dei rider veri, con il nome in cima, come il login di
     Velocissimo («così la cassa tiene traccia delle consegne di ciascuno»).
   - Non è codice, è anagrafica, ma senza questo la serata non parte.

### Medio

6. **Due numeri per la stessa consegna.** Il rider vede «#77», la cassa, la carta e il cliente «C-77».
   Al banco «la 77» va bene, ma un ordine dal sito è «W-…»: il rider dovrebbe vedere il numero com'è.
7. **«In preparazione, il rider è pronto».**
   - Appena il rider prende la consegna il cliente legge questo, e l'ordine passa a «in consegna»
     (`prendi_consegna`) anche se le pizze non sono ancora in forno.
   - Il rider non vede se la comanda è pronta.
   - Velocissimo separa In lavorazione, Pronto e In consegna (REA 11.3).
8. **Due consegne insieme.**
   - Al primo tentativo la cassa ha rifiutato la seconda consegna allo stesso indirizzo e nello stesso
     quarto d'ora: «Quarto d'ora pieno per le consegne alle 21:00: scegli un altro orario o un rider in più.»
     Con un rider solo il posto è una consegna, non un viaggio.
   - Nell'app servono due «Ritirata» e due «Consegnata»: manca «parto con tutte e due».
   - Naviga apre una consegna per volta.
9. **Il POS alla consegna si perde.**
   - In «Da saldare» c'è «#78 … 0,00 €» senza dire POS 15,60 €.
   - Il saldo non lo nomina; sulla scheda c'è solo «col POS · niente contanti», nessun «porta il POS».
   - Il dare-avere deve contare anche gli scontrini del POS.
10. **Il resto da portare in tutto non c'è.** «In tutto da incassare in contanti» c'è, ma chi parte con
    C-77 deve avere 33,40 € di resto, e nessuno lo dice prima di uscire. Il fondo esiste in
    `/cassa/rider` ma non è collegato.
11. **Né conferma né modo di tornare indietro.**
    - «CONSEGNATA» chiude al primo tocco, senza conferma e senza «annulla».
    - Una consegna presa non si restituisce: «rilascia» c'è solo in cassa («Togli il rider»).
    - Un consegnato non si annulla più nemmeno dalla cassa. L'API risponde
      `Da "consegnato" non si può passare a "annullato"`, e per questo non ho potuto annullare i miei
      ordini di prova.
12. **«Salda» non chiede quanto è arrivato.** Registra il deposito pieno (35,40 €) senza un «contati X»
    e senza conferma; si legge anche «1 consegne saldate».
13. **In cassa non si vede chi porta.** Sulla scheda di `/cassa` («C-77 · CONSEGNATO · domicilio…»)
    il rider non c'è: si trova solo in `/cassa/mappa`.
14. **Il cliente non sa quando arriva.**
    - C'è «previsto per le 21:15», ma niente «arriva fra 6 minuti».
    - Non c'è il tasto per chiamare la pizzeria: con l'ordine annullato dice «chiamaci» senza numero.
    - Il rider si chiama per nome di battesimo: «CON RIDER».

### Da avere

15. **«Sono arrivato»**: un tasto che avvisa il cliente, come la push «Rider arrivato» di Velocissimo
    (REA 11.3).
16. **Una mappa dentro l'app del rider** con le sue consegne e il giro in Google Maps con più tappe.
17. **Il report dei rider** (REA 4.4): consegne, tempi, ritardi, km, contanti versati, per serata e per mese.
18. **Schede più corte.** Una scheda è alta 483 px: con tre consegne libere la lista fa 2,2
    schermate. Chiusa basterebbero numero, zona, ora, soldi e il tasto; il resto aperto a richiesta.
19. **La push al cliente a ogni stato** (REA 11.6), con dentro il link `/segui`.

## Voti

- `/rider`: **7 su 10**. Fa il mestiere della sera, ma non avvisa, si ferma a schermo spento e non ha
  il POS né il resto da portare.
- `/segui`: **6 su 10**. Bella e reattiva, ma il link non arriva a chi ordina al telefono e la
  posizione vecchia sembra viva.
- `/cassa/mappa`: **7 su 10**. Assegna bene, ma la posizione è senza data.
- `/cassa/rider`: **8 su 10**.
- **Complessivo giro 23: 6,5 su 10** rispetto a quello che chiede Edoardo. Il giro delle consegne
  c'è; manca il «tempo reale» per il cliente.

## Ordini di prova da annullare

**C-77, C-78, C-79**: consegnati e saldati (deposito di 35,40 € alle 02:10 su «Rider di prova»). Dalla
cassa non si possono annullare (409 «Da "consegnato" non si può passare a "annullato"»): vanno
annullati, e va tolto il deposito, da chi ha accesso. Sono dei clienti di prova del critico
(«Prova Critico Tre», «Prova Critico Quattro», «Prova Critico»).
