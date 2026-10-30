# REA · 28. Cosa chiedere a Deliverect

*27/10/2026. Edoardo ci parla direttamente. È una pagina da tenere davanti durante la chiamata. Il perché
di ogni domanda sta nella `26`.*

## In una frase, chi siamo e cosa vogliamo

«Sono A Mano A Mano Pugliese, Via Novara 5/7, Roma. Oggi il POS collegato a Deliverect è Velocissimo.
Ci stiamo facendo una cassa nostra (Vi.Ru). Per un mese vogliamo ricevere gli ordini di Glovo, Deliveroo e
Just Eat **anche** nella cassa nuova, senza toglierli a Velocissimo. Dopo, la cassa nuova diventa
il POS della location.»

## Le domande, in ordine di importanza

1. **Prova in parallelo.** Possiamo ricevere una copia degli ordini della mia location su un secondo
   indirizzo nostro, mentre Velocissimo resta il POS? Le «Reporting Webhooks» (nuovo ordine e cambio di
   stato) servono a questo? **Quanto costano** e cosa devo firmare?
   - Se sì: l'indirizzo è `https://mano-a-mano-cassa.vercel.app/api/deliverect/copia`, con la firma
     HMAC-SHA256. Chiedi **il nome dell'intestazione della firma** e un esempio del messaggio.
2. **Diventare il POS.** Un ristorante che si fa la cassa da sé può diventare partner POS? Quanto
   costa? Quanto tempo ci vuole tra il modulo, lo staging, la certificazione e le chiavi di produzione?
3. **Il passaggio.** La notte in cui cambiamo, chi passa la location da Velocissimo a noi: io dal
   pannello o voi? Quanto preavviso serve? Si può tornare indietro in pochi minuti se qualcosa va male?
4. **I menù.** Se il nostro POS manda **gli stessi PLU** di Velocissimo, i menù di Glovo, Deliveroo e
   Just Eat restano come sono, o vanno ripubblicati? Due prodotti di Velocissimo hanno lo stesso
   codice (`142` e `C072`): conviene correggerli prima?
5. **L'abbonamento.** Il mio abbonamento Deliverect è legato a Velocissimo? Se cambio POS cambia il
   prezzo o il contratto?
6. **Gli stati.** Oggi quali stati manda Velocissimo (accettato, pronto, ritirato)? Li accetta in
   automatico? Lo vedo nella storia di un ordine Glovo di ieri.
7. **I codici dei canali.** Che numero hanno Glovo, Deliveroo e Just Eat nella mia location?

## Cosa farti dare (anche dopo, per email)

- l'**account di staging** e le chiavi API, appena accettano il modulo partner;
- il **documento di certificazione** POS;
- se attivano le Reporting Webhooks: il **segreto** della firma. Va **solo su Vercel**, mai in chat né
  per email a me.

## Cosa non dire di sì al telefono

- **Non** spostare adesso l'«Orders webhook URL» della location su di noi: Velocissimo smetterebbe di
  ricevere gli ordini da subito.
- **Non** attivare un secondo sistema che manda stati (un KDS, per esempio): Glovo vedrebbe due
  «accettato» o un «pronto» falso.
