# Giro 40: la dashboard sui conti del database (26/10/2026)

Deploy `c9bdaa4` (`dpl_2jDgkKUkwrcpuXtK99AK6EBryAps`, **READY**, production). Mig. 0075 nel registro come
`cruscotto_dal_database` + `cruscotto_prodotti_per_nome`; il corpo di `cruscotto()` in produzione è uguale al
file a meno dei due commenti (md5 confrontato; `clienti_da_riconquistare` identica).
**Senza scritture**: solo SELECT e transazioni annullate col ruolo `authenticated` e i claims dell'utente
cassa. Chrome: una scheda mia su `/cassa/dashboard` a 1316 px e in un iframe a 390 px, chiusa alla fine.
Nessun file scaricato, nessun ordine. Foto: `lettura/giro40/` (fuori da git).

**Voto: 7 su 10.** I conti sono giusti fino all'ultimo centesimo e il database risponde in 80–130 ms. Però
al telefono la pagina si allarga appena apri una tabella, e il cruscotto mostra i telefoni dei clienti a chi
è collegato come cassa.

## 1. I numeri: `cruscotto()` contro le mie query

Le mie query leggono direttamente `ordine`, `ordine_riga` e `consegna`, con i confini
`timestamptz 'AAAA-MM-GG 06:00 Europe/Rome'`.

| Voce | Serata 24/10: cruscotto | Serata 24/10: mia | Ottobre: cruscotto | Ottobre: mia |
|---|---|---|---|---|
| Venduto | 327,80 | 327,80 | 458,30 | 458,30 |
| Ordini | 24 | 24 | 31 | 31 |
| Annullati (€) | 48 (751,73) | 48 (751,73) | 76 (1.305,93) | 76 (1.305,93) |
| Sconti / consegna | 5,00 / 11,00 | 5,00 / 11,00 | 5,00 / 12,00 | 5,00 / 12,00 |
| Per canale | cassa 23 / 311,40 · web 1 / 16,40 | uguale | cassa 28 · app 2 · web 1 | uguale |
| Per tipo | domicilio 11 · tavolo 9 · ritiro 4 | uguale | 14 · 9 · 8 | uguale |
| Pagamento | contanti 18 / 240,70 · POS 6 / 87,10 | uguale | + «non indicato» 6 / 117,80 | uguale |
| Per ora (dall'ora richiesta) | 11→4, 12→2, 16→2, 17→1, 19→1, 20→6, 21→5, 22→3 | uguale | — | — |
| Clienti nuovi / tornati / senza scheda | 2 / 1 / 13 | 2 / 1 (primi ordini letti) | 3 / 0 / 19 | 3 distinti, 19 |
| Punti dati | 289 | — | 304 | 304 |
| Puntuali / misurate | 11 / 11 | 11 consegnate con l'ora | 13 / 13 | — |

**Prodotti e venduto.** Il 24/10 la somma degli euro delle righe fa 321,80, che è uguale a
327,80 − 11,00 (consegna) + 5,00 (sconti). Torna. A ottobre le righe fanno 451,90 invece di 451,30: ci sono
0,60 € di differenza, che vengono da **due ordini di prova del 21–22/10** (n. 4 app, n. 5 cassa). In quei due
ordini il totale non corrisponde alle righe (+0,90 e −0,30): sono di prima del listino vero, e
non è un difetto della funzione. Le variazioni a pagamento sono moltiplicate per la quantità, come nel totale
dell'ordine. Le categorie fanno la stessa somma dei prodotti. Una riga senza prodotto («Non specificato» di
Velocissimo) non c'è: 0 righe con `id_prodotto` nullo.

**Il cambio dell'ora del 25/10.** La serata del 24 finisce alle 05:00Z, cioè alle 06:00 CET, e non alle
04:00Z: il confine è giusto, sia nella funzione (`at time zone`) sia nella pagina (`inizio()`, che prova
+02:00 e poi +01:00). L'ordine delle 04:00 ora di Roma del 25/10 (02:58Z) cade nella serata del 24, come deve.

**Tempo.** `EXPLAIN ANALYZE select cruscotto('2026-01-01','2026-12-31')` impiega 23 ms, ma su 107 ordini. Ho
rifatto a vuoto (`generate_series`, 32.000 ordini e 4.000 clienti) l'`exists` dei clienti «tornati»: il
planner lo trasforma in un *hashed subplan* e ci mette 31 ms, quindi non esplode. Mancano però gli indici su
`ordine_riga(id_ordine)`, `consegna(id_ordine)`, `ordine(id_cliente)` e
`cliente_punti_movimento(creato_il)`. Con un anno vero i join diventano scansioni dell'intera tabella, e la
scheda di un ordine (`ordine_riga eq id_ordine`) legge tutta `ordine_riga`. In Chrome due chiamate al
cruscotto (periodo e confronto) ci mettono 80–130 ms.

## 2. Sicurezza

- `cruscotto` e `clienti_da_riconquistare` sono SECURITY DEFINER con `search_path` fissato. **PUBLIC e anon
  hanno EXECUTE** (`proacl {=X/postgres, anon=X…}`): la `grant … to authenticated` non ha tolto il
  default.
- La porta però tiene: con `anon` la chiamata dà `42501 solo la cassa`, e così con un `sub` a caso senza
  profilo. I ruoli rider, totem e cliente sono fuori dal controllo `ruolo_corrente() in ('admin','cassa')`.
  Un profilo rider da provare non esiste: `profilo` ha solo **1 riga, ruolo cassa**.
- **I dati personali vanno a chi entra come cassa.** «I migliori del periodo» (20 nomi con telefono) e «Da
  riconquistare» (fino a 300 nomi con telefono, spesa e consenso) sono aperti al ruolo `cassa`, cioè al PC
  in negozio. REA 24 §24.9 n. 9 diceva: «pagina solo per il ruolo di Edoardo».

## 3. La pagina: difetti in ordine di gravità

### Gravi

1. **A 390 px la pagina diventa larga fino a 930 px appena si apre un ramo con una tabella.** Misurato
   nell'iframe: Prodotti porta la pagina a 497 px, Rider a 758, Zone a 726 e Tutti gli ordini a 930.
   `.db-tabella { overflow-x: auto }` (`globals.css:1087`) non serve a niente, perché `.db-rami` è una
   griglia con la colonna `auto` (`globals.css:1233`) e i figli `details` non hanno `min-width: 0`: la
   tabella allarga il ramo invece di scorrere dentro. Così **tutti i riassunti a destra dei rami escono
   dallo schermo** (foto `lettura/giro40/390-rider-aperto.jpg`) e la pagina scorre di lato. È proprio la
   pagina «da casa col telefono».
2. **Il ruolo cassa vede i telefoni dei clienti** (sopra, §2). Ci sono 20 «migliori» per periodo
   (`0075:…'migliori'`, `page.tsx:288`) e fino a 300 «da riconquistare» (`page.tsx:383`). Oggi l'utenza è una
   sola, ma il PC in cassa la usa anche lo staff.

### Medi

3. **L'elenco degli ordini si scarica anche a ramo chiuso, e due volte a ogni cambio di periodo.** `<Ordini>`
   sta dentro un `<details>` chiuso ma React lo monta lo stesso (`page.tsx:301-303`). In rete, a ogni cambio:
   `ordine?select=` 130–409 ms, poi le due chiamate al cruscotto, poi di nuovo `ordine?select=`. La prima
   lettura parte coi vecchi conti ancora a video, la seconda dopo. Con «Anno» vuol dire fino a 5 pagine da
   1.000 ordini con i join, due volte, per un ramo che nessuno ha aperto. Così si perde quello che il
   cruscotto nel database ha guadagnato.
4. **«Spesa a persona» divide tutto il venduto per i coperti dei soli ordini che li hanno**
   (`page.tsx:207`). La scritta dice «solo dove i coperti ci sono», ma il conto non fa così: quando i tavoli
   cominceranno a scrivere i coperti, 458 € diviso 4 persone farà 114 € a persona. Oggi **0 ordini su 107
   hanno i coperti**, anche i 9 al tavolo, quindi «Persone servite» è sempre 0.
5. **Il periodo in corso viene messo contro un periodo intero, e la frase lo dice come una sconfitta.**
   «Mese» al 26 si confronta con tutto il mese prima, «Anno» al 26/10 con tutto l'anno prima
   (`page.tsx:75-77`), e la frase scrive «meno di …» (`page.tsx:194`). Nella stessa riga c'è anche un errore
   di italiano: **«meno di il mese prima», «più di l'anno prima», «di lo stesso giorno»** (deve essere
   «del», «dell'», «dello»).
6. **«Puntuale» vuol dire solo «non dopo»**: il ritardo è `greatest(0, …)` rispetto al quarto
   d'ora più 30 minuti (`0075:dom`). Una consegna arrivata 8 ore prima dell'ora chiesta (succede nei dati
   del 24/10: chiesta per le 20:00, consegnata alle 12:00) conta come puntuale, e l'anticipo non si vede da
   nessuna parte.
7. **Nelle «Zone» finiscono anche le consegne delle piattaforme** (`where o.tipo = 'domicilio'`, senza
   escludere glovo e deliveroo): finiranno tutte in «senza zona» e ne gonfieranno il numero. Nel rider
   compare **«senza rider» con 1 consegna e 19 €** a ottobre (una consegna segnata «consegnata» senza
   rider): va detto cos'è, o tolto.
8. **CSV: una nota che comincia con `=`, `+`, `-` o `@` diventa una formula in Excel** (`page.tsx:443`).
   Le note le scrivono anche i clienti dal sito.

### Lievi

9. Con «Ultimi 12 mesi» il titolo dice **«Dal 25 Ott Al 24 Ott 2026»**: manca l'anno della prima data, e
   `text-transform: capitalize` (`globals.css:1069`) mette la maiuscola a «Dal», «Al» e «Ott». Anche il
   confronto («25 ott–24 ott») e quello di «Anno» («1 gen–31 dic») non hanno l'anno (`page.tsx:136,185`).
10. **29 febbraio**: in un anno bisestile il confronto con l'anno prima di febbraio 2028 va dal 1/02 **al
    1/03/2027** (`unAnnoPrima`, `page.tsx:57-60,73`). Da una serata del 29/02 l'anno prima diventa il 1/03.
    «Anno ›» partendo dal 29/02 mette nel campo data un giorno che non esiste (2029-02-29) e il campo
    resta vuoto (`page.tsx:128`).
11. I minuti sono scritti col punto inglese: **«0.1 min»** (`page.tsx:213-214,266,275`).
12. «Per ora» disegna solo le ore che hanno ordini (11, 12, 16, 17, 19…): le ore senza ordini mancano
    invece di valere zero, e il grafico sembra continuo.
13. Con un periodo fra 31 e 62 giorni le colonne dell'andamento portano come nome solo il giorno
    (`x.g.slice(8)`, `page.tsx:242`): «01» compare due volte, le chiavi React sono doppie e non si capisce di
    che mese è la colonna.
14. Le categorie contano due volte i pezzi dentro i menu: le pizze del menu stanno in «Pizze classiche» e
    il menu sta in «Menù».
15. «Prodotti» si ferma ai primi 60 senza dirlo (`limit 60`).
16. A 390 px la scritta «Tipo» resta in fondo alla riga delle origini, e i suoi tasti vanno a capo sotto.
    Gli euro sopra le colonne sono a 11 px.
17. La scheda dell'ordine non mostra il totale, chi ha annullato né la data degli stati (mostra solo l'ora);
    il prezzo della riga madre non conta le variazioni (`page.tsx:529`); gli errori di lettura non si
    vedono (`page.tsx:520`).
18. `clienti_da_riconquistare` conta i giorni da `current_date`, che è il giorno UTC del server, non di Roma.

### A posto

Ho provato i periodi Serata, Settimana, Mese, Anno, 7, 30, 12 mesi e Dal–al, le frecce, «Oggi» e il
confronto col periodo prima o con l'anno prima. Ogni ramo si apre e il riassunto a destra è sensato. Ricerca
e filtro per stato funzionano. La scheda dell'ordine apre le righe e la storia, e si può solo leggere (lo
stato non si cambia da lì: bene). Il CSV della vista ha `;` e BOM; quello dell'OS è disponibile solo per la
serata. Il limite di 5.000 ordini è scritto a video. Il cruscotto senza ordini dice «Nessun ordine in questo
periodo». Il periodo non valido (più di 1.100 giorni, oppure al < dal) viene rifiutato dal database, e la
pagina scambia dal e al da sola.

## 4. Cosa manca ancora rispetto a Velocissimo (REA 24 §24.3–24.9)

- **Il confronto dentro i grafici**: Velocissimo mette la curva dell'anno prima accanto a ogni grafico
  dell'Andamento. Da noi il confronto c'è solo nei tre numeri in cima.
- **G S M T Q A**: non si può scegliere come raggruppare. Da noi si passa da sola ai giorni o ai mesi, a
  62 giorni.
- **Lista ordini**: mancano i filtri a scelta per pagamento, rider, zona, prodotto, origine e tipo dentro
  l'elenco (ci sono solo la ricerca libera e lo stato), e il riquadro «Metriche» sopra l'elenco filtrato.
- **Export dei rami**: c'è solo il CSV degli ordini. Prodotti, categorie, rider, zone e sconti non si
  esportano (in Velocissimo ogni report si esporta).
- **Coupon e premi**: il ramo c'è, ma `coupon_emesso` è vuota (import ancora da fare, `20` §7).
- **Report giornata / chiusura di cassa**: non c'è (`21` D7), ed è il buco più grande.
- **Coperti asporto / persone servite**: nessun ordine scrive `coperti`, quindi le metriche «a persona»
  restano vuote.
- **Storico Velocissimo** (55.592 ordini): senza import, «tornati», «da riconquistare» e il confronto con
  l'anno prima saranno vuoti per un anno (D24-3).
- Fuori per scelta: margine e food cost (li fa l'OS), recensioni, prenotazioni, carrelli abbandonati,
  upsell.
