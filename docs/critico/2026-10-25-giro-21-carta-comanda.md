# Giro 21 del critico — la carta delle stampanti comande (25/10/2026, 01:25–01:45)

Deploy letto: main `1afc3d4` (con `ca2aaed` «DOMANI sul calendario di Roma, e l'annullato lo dice»).
Le stampanti di rete non sono ancora accese: la carta è letta dal testo di
`npx --yes tsx scripts/prova-stampa.mts` (cucina 48 colonne, cassa 42) e da cinque casi in più
resi con lo stesso `comandaEscPos` da uno script mio nello scratchpad (tavolo, banco senza nome,
sito già pagato, preordine di domani a domicilio, annullato). Nessun ordine nuovo.
Poi un giro corto a 390 su `/cassa/nuovo` e `/cassa`.

Confronto con la comanda di Velocissimo/2Bit dai giri passati e dal REA
(`docs/rea/14_SERATA_MINUTO_PER_MINUTO.md` righe 44–47, 103, 114; `docs/rea/09_CASSA_2BIT_A_FONDO.md` riga 93).

## La prova come esce (copia cucina, 48 colonne)

```
C-57                                  [2x2 grassetto]
MODIFICATA - RISTAMPA 20:52           [fascia nera]
DOMICILIO                             [alto, grassetto]
per le 21:30 · ricevuto 20:40 · Telefono
================================================
Prova Critico                         [alto, grassetto]
333 000 0000
!! Senza glutine: attenzione          [grassetto, misura normale]
Via Novara 5                          [grassetto]
00198 Roma · zona Centro
------------------------------------------------
PIZZE CLASSICHE                       [fascia nera]
+1 (ora 2)                            [riga a rovescio]
 2  MARGHERITA                        [alto, grassetto]
NUOVA
 1  DIAVOLA CON UNA DESCRIZIONE LUNGHISSIMA CHE
    DEVE ANDARE A CAPO
     CON bufala
     SENZA basilico                   [grassetto]
MENÙ
NUOVA
 1  MENÙ BIMBO
     ben cotta
     - Würstel e patatine
     + BIBITA
FRITTI
NUOVA
 3  SUPPLÌ
     piccante - molto
TOLTE                                 [fascia nera]
1 x COCA COLA (NON FARE)
------------------------------------------------
NOTE: Citofono rotto, chiamare al numero   [grassetto]
================================================
7 pezzi in cucina
consegna                                  1,50 €
sconto BENVENUTO                         -2,00 €
TOTALE                                   31,30 €   [alto, grassetto]
CONTANTI                              [fascia nera]
PAGA CON 50,00 € -> RESTO 18,70 €     [grassetto]
- copia cucina -
```

La copia cassa a 42 colonne è identica riga per riga (solo l'a capo cambia). Tutte le prove
dello script passano: nessuna riga oltre le colonne, ore di Roma, accenti, «€», taglio in fondo.

**Quello che Edoardo voleva c'è**: tutte e due le copie hanno via, telefono, totale, pagamento e
resto. Il numero 2x2 in cima si vede da lontano, le fasce nere dei reparti dividono bene la carta,
la quantità in colonna con la descrizione rientrata è leggibile, «TOLTE … (NON FARE)» è chiaro,
«DOMANI alle 20:00» esce grande, l'annullato ora esce con «ANNULLATO - NON FARE».

## Letta da un pizzaiolo alle 21 di sabato

Cosa vede per primo, in ordine: **C-57** (enorme) → la fascia **MODIFICATA - RISTAMPA** → **DOMICILIO**
→ il nome del cliente (alto) → le fasce dei reparti e le righe alte **2 MARGHERITA**, **1 DIAVOLA…**.
L'ora («per le 21:30») è in piccolo, dentro una riga con «ricevuto 20:40 · Telefono».
L'allergia «!! Senza glutine» è in piccolo nel blocco dell'indirizzo, cioè nella parte che il
pizzaiolo salta perché è roba del rider.

## Letta da chi prepara la busta del domicilio

Cerca: numero, via, zona, pagamento, resto, cosa ci va dentro. Numero e via ci sono; la **zona**
(«zona Centro») è in piccolo in coda al CAP; il pagamento è in fondo in fascia nera, bene; il resto
in grassetto, bene. La nota del citofono sta **in fondo, dopo le TOLTE**, staccata dall'indirizzo:
chi prepara la busta e il rider la trovano dopo le pizze.

## Proposte, in ordine di importanza

1. **L'allergia non è vicina alle pizze.** «!! Senza glutine: attenzione» (la nota fissa del cliente)
   esce in grassetto ma a misura normale, fra il telefono e la via. Il pizzaiolo legge le righe alte e
   non la vede. Proposta: la nota fissa del cliente in **fascia nera alta subito sopra la prima riga
   da fare**, e ripetuta nel blocco del cliente solo se riguarda il rider. (In 2Bit la nota fissa
   in comanda non usciva: REA 14 riga 45. Qui c'è, ed è un passo avanti, ma nel posto sbagliato.)
2. **La riga cresciuta dice la cifra sbagliata in grande.** «+1 (ora 2)» sta su una riga a parte, a
   misura normale, e sotto esce alto « 2  MARGHERITA». Su una ristampa il pizzaiolo che ne ha già
   fatta una legge «2» e ne fa due. Proposta: in grande la cosa da fare, «**+1** MARGHERITA», e
   piccolo accanto «(in tutto 2)».
3. **La nota dell'ordine sta in fondo, dopo le TOLTE.** «NOTE: Citofono rotto, chiamare al numero»
   esce in grassetto dopo l'ultima riga e dopo le tolte. Se la nota è per la cucina («tagliata a
   spicchi», «ben cotta tutto») arriva quando le pizze sono già in forno; se è per il rider, sta
   lontana dall'indirizzo. Proposta: nota dell'ordine sopra le righe (sotto l'allergia), o vicino
   alla via quando è un domicilio.
4. **L'ora di oggi è piccola.** Solo «DOMANI alle 20:00» esce alta; «per le 21:30» è a misura normale
   in mezzo a «ricevuto 20:40 · Telefono». Alle 21 di sabato l'ora di consegna è la seconda cosa che
   serve dopo il numero. Proposta: «per le 21:30» sempre alta in grassetto, su una riga sua; «ricevuto
   20:40 · Telefono» sotto, piccolo.
5. **Domicilio e ritiro si somigliano.** «DOMICILIO», «RITIRO», «AL BANCO», «TAVOLO D5» sono tutti la
   stessa riga alta in grassetto. 2Bit metteva in cima il logo del tipo (`domicilio.2bt`,
   `take-away.2bt`, REA 14 riga 103): la carta del domicilio si riconosceva sul filo senza leggerla.
   Proposta: il tipo in **fascia nera piena** (o un segno grande fisso, es. «>> DOMICILIO <<»)
   almeno per il domicilio.
6. **«- Würstel e patatine» sembra un SENZA.** La figlia del menù esce col trattino davanti; sulla
   stessa carta il «togli» è «SENZA», ma un trattino davanti a un nome si legge «meno». Sulla pagina
   web la figlia ha «· ». Proposta: «> Würstel e patatine» o «· », mai «-».
7. **Annullato: lo dice solo in cima.** La fascia «ANNULLATO - NON FARE» esce sopra, poi tutte le righe
   escono alte come in una comanda vera. Se la carta si strappa o si legge dal basso, è una comanda da
   fare. Proposta: ripetere la fascia in fondo (e dopo ogni reparto), oppure righe non alte.
8. **Tavolo: «PAGAMENTO DA CHIEDERE».** Sul caso tavolo D5 esce la fascia nera «PAGAMENTO DA CHIEDERE»:
   al tavolo si paga al conto, non si chiede niente al pass; in fascia nera sembra un allarme. I
   coperti non escono. Proposta: per il tavolo niente fascia di pagamento (o «AL CONTO» piccolo) e
   i coperti accanto a «TAVOLO D5».
9. **Manca il contatore ordini del cliente.** 2Bit metteva «[N ORD.]» (REA 14 righe 44, 47, 114):
   chi chiama per la prima volta e chi è al trentesimo ordine si distinguono a colpo. Proposta:
   «Prova Critico [12 ord.]» o «PRIMO ORDINE» quando lo è.
10. **Zona piccola.** «00198 Roma · zona Centro» è a misura normale in coda: chi raggruppa le buste per
    rider cerca la zona. Proposta: zona in grassetto su riga sua (o accanto a DOMICILIO).
11. **Minori.** «CON bufala» non è in grassetto mentre «SENZA basilico» sì (l'aggiunta si dimentica
    quanto il togli); «GIA' PAGATO» con l'apostrofo quando la tabella PC858 ha la «À»; «- copia
    cucina -» / «- copia cassa -» solo in fondo e piccolo (con due carte uguali sul banco serve in cima);
    sulla copia cassa «7 pezzi in cucina» non serve ma non disturba.

## I casi che la prova non copre (resi da `escpos.ts`)

| Caso | Come esce | Giudizio |
|---|---|---|
| Tavolo D5 | `C-80` · alto «TAVOLO D5» · «subito · ricevuto 19:40 · Cassa» · fascia PIZZE CLASSICHE · alto «2 LA MARGHERITA» · «2 pezzi» · TOTALE 17,00 € · fascia «PAGAMENTO DA CHIEDERE» | pulito, ma la fascia di pagamento è fuori posto e mancano i coperti (proposta 8) |
| Banco senza nome | niente blocco cliente, fascia «CONTANTI» | giusto |
| Sito già pagato | «per le 20:15 · ricevuto 19:40 · Sito» … fascia «GIA' PAGATO», nessun resto | giusto (apostrofo a parte) |
| Preordine domani a domicilio | alto «DOMANI alle 20:00», «!! citofono rotto» nel blocco cliente, «Via Nomentana 120 / 00161 Roma · zona BOLOGNA SPALLANZANI», «PAGA CON 20,00 € -> RESTO 3,20 €» | DOMANI si vede; qui la nota fissa era del citofono e sta bene vicino alla via, che è il caso opposto della proposta 1: serve distinguere allergia/cucina da indirizzo |
| Annullato | fascia alta «ANNULLATO - NON FARE» in cima, poi righe alte normali | proposta 7 |

## Giro corto a 390 (deploy `1afc3d4`)

- **`/cassa/nuovo`**, una riga (La barona) e pannello aperto: **0 tasti sotto 44** (tastierino 48,
  Svuota 44: chiuso il «Adesso, Applica, €, % a 40» del giro 19), nessun testo sotto 13 px, niente
  scorrimento orizzontale. Ma **INVIA IN CUCINA non si vede senza scorrere**: il pannello
  (`aside.cassa-comanda`, fisso, `overflow: auto`, alto 741) contiene 1027 px e il fondo
  (`.c-fondo`, `position: static`) parte a 977, INVIA a 981–1035 su uno schermo di 844. A 1024 il
  fondo è fisso (giro 18); a 390 no. Con una riga sola bisogna scorrere ~190 px per mandare.
  Svuotata dopo, nessun ordine mandato.
- **`/cassa`**: nessun testo piccolo né tasto sotto 44, «Ieri e prima (11)» a y 183. C-76 risulta già
  «ANNULLATO». La pagina è alta 17.390 px (≈ 20 schermate) perché tiene tutte le comande di ieri
  aperte sotto: di notte si scorre molto per arrivare a quelle di oggi (minore).

## Voti

- Carta della comanda (cucina e cassa): **7 su 10** — completa e pulita, ma l'allergia e la nota non
  sono dove guarda il pizzaiolo, e la riga cresciuta mostra in grande la cifra sbagliata.
- `/cassa/nuovo` a 390: **7 su 10** (tasti a posto, INVIA sotto lo schermo col pannello aperto).
- `/cassa` a 390: **8 su 10**.
- Complessivo giro 21: **7 su 10**.

## Ordini da annullare

Nessuno nuovo in questo giro. C-76 (giro 20) risulta già annullato.

## Risposta (chat principale, 25/10/2026)

Fatte, in `src/lib/stampa/escpos.ts` e `src/lib/comanda.ts`, provate in `scripts/prova-stampa.mts`:

1. **Allergie e note sopra le pizze**: «NOTE:» dell'ordine e la nota fissa del cliente escono in una
   fascia alta «!! …» prima del primo reparto, non più nel blocco dell'indirizzo né in fondo.
2. **Riga cresciuta**: in grande «IN PIÙ» e «+1  MARGHERITA», sotto piccolo «(in tutto 2, 1 già fatta)».
   Le righe tutte nuove escono «NUOVA».
3. **L'ora in grande sempre**: «per le 21:30», «DOMANI alle…» o «SUBITO», poi «ricevuto hh:mm · Canale».
4. **Domicilio in fascia rovescia 2×2**, ritiro/banco/tavolo in grande normale: si distinguono da lontano.
5. **Le scelte del menu** escono con «·», non più «-» (che sembrava un SENZA).
6. **ANNULLATO** in cima e ripetuto in fondo.
7. **Tavolo**: «SI PAGA AL CONTO» al posto di «PAGAMENTO DA CHIEDERE». I coperti no: l'ordine non li ha
   ancora (servono un campo e il tasto in `/cassa/nuovo`, si fa quando Edoardo decide come li conta).
8. **«[N ORD.]»** accanto al nome, come 2Bit: `comanda_per_stampa` lo conta (mig. 0048, applicata).
9. **«ZONA X»** in grande sotto la via.
10. **INVIA a 390 col pannello aperto**: `.c-fondo` sta fermo in fondo al pannello anche sul telefono
    (`nuovo.css`): il tasto da solo era sticky ma dentro il blocco non poteva fermarsi.

Prova dell'agente: la stampante «spenta» della prova accettava e chiudeva, e per il PC era una stampa
riuscita (la prova passava una volta su tre). Adesso spenta vuol dire connessione rifiutata, come una
stampante vera staccata: 6 su 6.
