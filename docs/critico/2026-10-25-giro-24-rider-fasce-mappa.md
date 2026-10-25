# Giro 24 del critico: le correzioni del giro 23 e le novità della notte (25/10/2026, 02:25–02:35)

Deploy: `994526f` (`ad14754` → `994526f`), `READY`. Migrazioni `consegne_rider3` e `fasce_con_vicine` nel
registro.

**Come ho provato.** In una pagina sola ho messo due riquadri da 390 uno accanto all'altro: a sinistra
cassa, mappa e `/segui`, a destra `/rider`. In `/rider` ho sostituito la vibrazione del telefono con un
contatore. Ho usato solo i miei clienti di prova, tutti in Via Nomentana 120, che ha le coordinate:
- **C-80**: contanti, 21:00;
- **C-81**: POS, 21:15.

Il percorso:
1. C-80 portato a «Pronto» in cassa, poi preso dal rider;
2. C-81 assegnato da `/cassa/mappa`;
3. tutti e due ritirati e consegnati col doppio tocco.

Sono le 02:30, quindi:
- il totem è chiuso e non l'ho provato;
- di Glovo e Deliveroo non c'è nessun ordine: il colore l'ho letto solo nel codice (`#f08a5d`, arancio salmone).

## Esito punto per punto

| # | Cosa | Esito |
|---|---|---|
| 1a | Vibrazione su una consegna nuova | **sì**: una vibrazione `[200,100,200]` quando arriva C-80 e una quando arriva C-81; una anche quando la cassa assegna C-81 da `/cassa/mappa` |
| 1a | …ma anche quando **la prendo io** | **difetto**: «LA PRENDO IO» su C-80 fa vibrare il telefono di chi l'ha appena toccato. Il controllo guarda `id + stato`, e il passaggio da «da assegnare» ad «assegnata» sembra una consegna nuova. È un falso allarme a ogni presa, e insegna a ignorare la vibrazione |
| 1a | Suono | non provabile qui: parte solo dopo il primo tocco sulla pagina (`AudioContext`). Va detto al rider: «tocca lo schermo una volta all'inizio del turno» |
| 1b | «Consegnata» col doppio tocco | **sì**: «SICURO? TOCCA ANCORA», dopo 4 s torna «CONSEGNATA», al secondo tocco chiude |
| 1c | POS e già pagato nel «Da saldare» | **sì**: «C-80 02:32 · Via Nomentana 120 · 15,60 €» e «C-81 02:32 · Via Nomentana 120 · **POS**». Il numero è «C-80», non più «#80» |
| 1d | «pronto in cucina» | **a metà**: su C-80 da assegnare, dopo «Pronto» in cassa, compare «PRONTO IN CUCINA» (vedi sotto) |
| 2 | Striscia delle fasce in `/cassa/nuovo` | **non si vede** (vedi sotto). Nel DOM c'è, e dice il giusto: «21:00 · pieno · C-80 a 0 m», gialla (`rgb(255,243,176)`) e a mezza trasparenza perché piena. Toccata, imposta «Oggi / 21:00» nelle tendine |
| 3 | Carte di `/cassa` | **sì**: fascia gialla a sinistra (`#f2c200`, 7 px) su C-80 e C-81, anche fra i preordini; «rider **Rider di prova**»; «Link per il cliente» (vedi sotto) |
| 4 | `/segui` senza posizione fresca | **sì, quasi**: nessun motorino, nessun «Apri in Google Maps» (vedi sotto per la data) |
| 5 | Righe nuove sotto il rider in `/cassa/mappa` | **sì**, una per ogni stato |

**Punto 1d, «pronto in cucina».** Appena il rider la prende o la cassa la assegna, la scritta sparisce.
`prendi_consegna` e `assegna_consegna` portano l'ordine a `in_consegna`, e il cartellino guarda solo
`stato_ordine = 'pronto'`. Quindi nelle **«Le mie»**, dove al rider servirebbe sapere quando entrare a
prendere, la scritta non c'è mai.

**Punto 2, la striscia.** Il contenitore `.c-vicine` è in una colonna flessibile e si schiaccia a
**2 px** (`height: 2px`, `overflow: auto`): i quarti d'ora restano tagliati dentro. A 390 si vede solo
una riga sottile fra «Oggi / 21:00» e «CONTANTI / POS / GIÀ PAGATO»; a 1024 è uguale (287×2 px sotto
«Giorno… / Ora…»).

**Punto 3, il link.** Nel riquadro il copia-incolla è bloccato, e la cassa mostra il link nella fascia
d'errore: «Link per il cliente: https://mano-a-mano-cassa.vercel.app/segui/…». Sul PC vero lo copierà.
Il tasto c'è sulle carte normali ma **non su quelle dei preordini**, che è dove sta un domicilio per le
21 preso alle 19.

**Punto 4, la data.** La nota dice «Ultima posizione del rider alle 01:41: la mappa si aggiorna appena
il suo telefono la rimanda.», ma la posizione è **del giorno prima** e la riga sopra dice «partito
alle 02:31». Una posizione più vecchia della partenza non andrebbe nominata, o almeno va scritta con
la data.

**Punto 5, le righe in mappa.** Tutte lette dal vivo:
- «posizione del 24/10 alle 01:41 (vecchia)»: la data adesso c'è;
- con C-81 assegnata: «deve ritirare in pizzeria»;
- con C-80 ritirata e nessuna posizione fresca: «in viaggio con C-80», giustamente senza minuti;
- consegnate tutte e due alle 02:32: «consegnato, rientra fra 7 min (02:39)».

## I minuti: sono verosimili per Roma?

- **Il caso che ho visto.** Da Via Nomentana 120 alla pizzeria sono 1,19 km in linea d'aria, 1,67 km
  ×1,4, cioè 4,6 min a 22 km/h più 2: **7 min**. In motorino, la sera, per un tratto così sulla
  Nomentana, è verosimile.
- **Le distanze più lunghe.** A 3 km in linea d'aria la stima dà 13 min, a 5 km 21 min: sono nella
  norma di uno scooter in città, con traffico serale normale. Il fattore 1,4 va bene per le vie
  dritte del quartiere; attraversando la ferrovia o il Policlinico i giri sono più lunghi e la stima
  sta bassa di qualche minuto.
- **Da verificare: il punto della pizzeria.** In `/cassa/mappa` e in `/segui` è
  `[41.9176, 12.5037]`, ma la via «Via Novara 5» geocodificata nel DB (cliente di prova) sta a
  41.9137, 12.5073: **circa 530 m più in là**. Uno dei due è sbagliato. Se lo è la costante:
  - i minuti di rientro sono spostati;
  - il «rientrato» (entro 3 min dalla pizzeria) scatta nel posto sbagliato;
  - il bollino della pizzeria sulla mappa del cliente è fuori posto.

## Cosa resta, in ordine

**Grave per la serata**
1. **La striscia dei quarti d'ora non si vede**, né a 390 né a 1024 (2 px di altezza). La «doppia»
   suggerita da Edoardo oggi non arriva a chi prende la telefonata.
2. **Il giallo cade proprio sul quarto pieno.** Con C-74 già consegnato alle 21:00 e C-80 alle 21:00,
   il quarto delle 21:00 è «pieno» e insieme «C-80 a 0 m». Chi lo tocca e manda riceve: «Quarto d'ora
   pieno per le consegne alle 21:00: scegli un altro orario o un rider in più.»
   - Proprio dove si suggerisce di fare la doppia, la cassa la rifiuta. Due consegne allo stesso
     indirizzo sono un viaggio, ma contano come due posti.
   - Ai quarti vicini (20:45 e 21:15) la consegna vicina non viene segnalata: la doppia vera è spesso
     al quarto dopo.
   - Proposta: la consegna vicina segnalata anche a ±15 min, e la doppia che non conta come un
     viaggio in più.

**Medio**

3. **La vibrazione scatta anche quando il rider prende la consegna da solo.** Falso allarme a ogni presa.
4. **«Pronto in cucina» non si vede mai sulle consegne del rider**, perché presa e assegnazione
   portano l'ordine a «in consegna». Ci vuole uno stato della cucina a parte, oppure non toccare lo
   stato dell'ordine finché non è ritirata.
5. **«Hai in mano 51,00 € · da versare in cassa 15,60 €»** dopo la pulizia del giro 23: C-77 e C-79
   sono annullati ma le loro consegne restano «consegnata» e «saldata», e il deposito di 35,40 € non
   c'è più.
   - Così il borsello conta 35,40 € di contanti fantasma.
   - Un ordine annullato dopo la consegna (succede: reso, errore) non dovrebbe entrare nel borsello.
6. **`/segui` scrive «Ultima posizione del rider alle 01:41»** su una posizione del giorno prima e più
   vecchia della partenza (02:31).
7. **Nessun «Link per il cliente» sulle carte dei preordini.**
8. **Il punto della pizzeria è da verificare** (530 m dalla Via Novara 5 geocodificata).
9. **Il link compare nella fascia rossa dell'errore** quando la copia non riesce: è una cosa giusta
   detta col colore sbagliato (minore).

**Da avere**

10. Il suono parte solo dopo un tocco: una riga in cima, «Tocca qui per attivare il suono», finché non
    è attivo.
11. Lo schermo resta acceso solo con una consegna in corso: mentre il rider aspetta la prossima, il
    telefono si spegne e non arriva né suono né vibrazione.

## Voto

**7 su 10** (il giro 23 era 6,5). Le correzioni del rider e di `/segui` funzionano:
- vibrazione all'arrivo e all'assegnazione;
- doppio tocco, POS e numero «C-80» nel da saldare;
- niente rider finto, data sulla posizione vecchia in mappa;
- righe in mappa e minuti verosimili.

Il pezzo nuovo più importante per Edoardo, i quarti d'ora gialli della doppia, oggi non si vede, e dove
si vedrebbe propone un quarto che la cassa rifiuta.

## Ordini di prova da annullare

- **C-80** (contanti 15,60 €) e **C-81** (POS 16,60 €), «Prova Critico Quattro» e «Prova Critico Dieci»:
  consegnati, **non saldati**. Dalla cassa non si annullano (409 da «consegnato»).
- Restano nel borsello del «Rider di prova» insieme ai 35,40 € fantasma di C-77 e C-79.
