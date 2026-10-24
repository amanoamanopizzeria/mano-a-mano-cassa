# Giro 8 — la pagina d'ordine nostra, `/ordina`, da cliente col telefono

*Critico, 24/10/2026, 01:50–02:10. Deploy `71ee562` (mig. 0035) READY all'inizio; **a metà giro è
andato in produzione `4cd6e2b`** (la veste del grafico: fasce sabbia e vino, «‹ Indietro» col titolo
del passo, pulsante unico). W-18 e W-19 sono nati sulla veste vecchia, da W-20 in poi e i voti sono
sulla nuova. Finestra a 390×844 (la finestra vera non si lascia stringere: la pagina è montata in
un riquadro di 390 px, come nei giri precedenti). Nome «Prova Critico», telefono finto
+39 000 222 3344. Niente Velocissimo.*

## Gli ordini, da annullare

| Ordine | Cosa | Esito |
|---|---|---|
| **W-18** | ritiro, oggi 19:00, margherita + doppia mozzarella e diavola + impasto alto, contanti, 18,60 € | ✓ accettato |
| **W-19** | domicilio Via Novara 5, Menu classico X1 (margherita · chinotto) + Coca, POS, **domani** 19:00, 16,50 € (consegna 1,00, zona VERBANO) | ✓ accettato, col link «segui la consegna» (vedi grave 1: l'indirizzo è passato solo col trucco) |
| **W-20** | domicilio «Viale Regina Margherita» **senza civico**, 2 marinare, contanti, oggi 19:00, 13,80 € (zona PORTA PIA PIAZZA FIUME) | ✓ accettato: è il grave 2 |
| 3º della lista | domicilio fuori zona: Via Tuscolana 2000 (12,2 km) e «Frascati» (→ Via Frascati, Roma, 6,6 km) | ✓ fermato subito, prima del menù: «Qui non consegniamo» e «Mi dispiace, a quell'indirizzo non arriviamo. Puoi ordinare e ritirare in pizzeria.» |
| 4º della lista | domicilio Via Novara 5 con una marinara da 6,40 | ✓ fermato al carrello: «A casa tua l'ordine minimo è 10,00 €: mancano 3,60 €.», «Scegli quando» spento |
| un 4º vero | ritiro, una margherita, stesso telefono | ✗ voluto: «Hai già mandato diversi ordini in pochi minuti: aspetta un po', o chiamaci.» (freno 3 ogni 15 minuti: funziona) |

Tre ordini, **un solo cliente** in tabella (il telefono li riunisce). Nome e telefono tornano
precompilati al secondo ordine.

## Voti per passo

| Passo | Voto | Perché |
|---|---|---|
| Come lo vuoi | 8 | Due tasti chiari, con la veste nuova si legge bene. Con il carrello vuoto la barra dice già «0 articoli + consegna 1,00 € · 1,00 €» |
| Indirizzo | **2** | **Ogni indirizzo è «Qui non consegniamo»** (grave 1); accetta la via senza numero (grave 2); i suggerimenti non dicono la zona, si scopre dopo averne scelto uno |
| Menù | 7 | Striscia delle categorie e carte ok; «Le novità estive» è la prima categoria il 24 ottobre (aperto dal giro 1); le carte dei menù sono senza descrizione; la barra «Minimo 10,00 €» sotto il minimo è una buona idea |
| Scheda prodotto | 8 | Passi numerati, «Manca: scegli la bibita ↓», il prezzo nel tasto si aggiorna. «Impasto alto» e «Impasto normale» si spuntano **insieme** |
| Carrello | 9 | Righe con le aggiunte, «Consegna · verbano 1,00 €», totale, e sotto il minimo dice esattamente quanto manca |
| Quando | 8 | Giorni e quarti d'ora chiari; oggi nessun quarto pieno, non ho potuto vederne uno barrato |
| Dati | 7 | Telefono corto: «Conferma» resta grigio **senza una parola**; la barra dice il totale due volte («Conferma · 13,80 €» e «13,80 €») |
| Conferma | 7 | Numero, ora, come paghi, «Segui la consegna». Ma **niente riepilogo né totale**: chi chiude la pagina ha solo «W-19» |
| Cassa | 7 | W-18, W-19 («DOMANI alle 19:00») e W-20 stanno nei preordini con nome, ora, indirizzo e totale. La scheda del preordine **non dice zona, costo di consegna, pagamento né la nota**; «Viale Regina Margherita» senza civico non è segnalato |
| Indietro | ✓ | A ogni passo torna a quello prima con tutto com'era |
| Carrello che torna | ✓ | Chiusa e riaperta: «2 articoli · 18,60 €» e «Lo ritiro» già scelto |

## I difetti, dal più grave

1. **Nessuno può ordinare a domicilio da `/ordina`: ogni indirizzo è «Qui non consegniamo».**
   Via Novara 5 (0,5 km), Viale Regina Margherita 100 (0,2 km): sempre «Mi dispiace, a
   quell'indirizzo non arriviamo». Causa: `/api/ordina/indirizzi` chiama `zona_per_punto` con la
   chiave `anon`; la funzione non è `security definer` e la policy `zona_read` su `zona` è
   `auth.role() = 'authenticated'`: anon vede **zero zone** (provato: `set role anon; select
   count(*) from zona` → 0). In SQL gli stessi punti stanno in VERBANO. Sul server
   `ordine_dal_sito` è security definer e la zona la trova: per provare il resto del giro ho
   sostituito **nel browser** la risposta della zona (solo entro 3 km); W-19 e W-20 hanno la zona
   vera, calcolata dal server. Non ho riparato niente.
   *Riprodurre:* `/ordina` → Consegna a casa → «Via Novara 5» → scegliere.
2. **Si ordina a domicilio con la via e basta.** «Viale Regina Margherita» senza numero: la
   pagina lo accetta («Consegna 1,00 € · ordine minimo 10,00 €»), il server anche (`ordine_dal_sito`
   chiede solo `via`), e W-20 è in cassa con `civico null`: il rider ha un viale di due chilometri.
   *Riprodurre:* scrivere solo il nome della via e scegliere il primo suggerimento.
3. **Chi paga col POS risulta contanti in mano al rider.** W-19 ha `pagamento = pos` e
   `contanti_da_incassare = 16,50` (anche W-17, di un altro giro). La scheda del rider dice «col
   POS», ma `rider_borsello` somma `contanti_da_incassare` delle consegne fatte: a fine serata il
   rider avrebbe in mano 16,50 € che non ha mai preso.
4. **La conferma non dice cosa hai ordinato né quanto paghi.** Solo numero, ora e «Paghi col POS
   al rider»: niente righe, totale, telefono della pizzeria.
5. **In cassa il preordine dal sito non dice zona, costo di consegna, pagamento e nota.**
   «domicilio · Prova Critico · Via Novara 5 · 16,50 €»: POS e «prova critico giro 8» non si vedono.
6. Telefono corto («333 12»): «Conferma» grigio e muto. Il server avrebbe la frase giusta
   («Scrivi un numero di telefono completo…») ma non ci si arriva.
7. «Impasto alto» (+1,00) e «Impasto normale» si spuntano tutti e due: il gruppo dovrebbe
   essere a scelta unica.
8. Le carte dei menù combinati non hanno descrizione: «Menu classico X1 · 13,00 €» e basta,
   cosa c'è dentro si scopre aprendo.
9. «Le novità estive» è la prima categoria che si vede, il 24 ottobre (aperto dal giro 1).
10. I suggerimenti (Google) escono senza la zona: «Via Novara, 5, Roma, RM» e nient'altro, la
    zona compare solo dopo; «Frascati» non propone mai il comune, solo «Via Frascati, Roma».
11. Barra con carrello vuoto a domicilio: «0 articoli + consegna 1,00 € · 1,00 €».
12. Dati: il totale due volte nella barra. Carrello (veste nuova): «Aggiungi prodotti» sembra
    un'etichetta, non un tasto.

## Cosa va bene

Il giro in sé è giusto e corto: tipo → menù → carrello → quando → dati, cinque schermate, il
carrello e la scelta sopravvivono alla chiusura della pagina, «Indietro» non perde niente, i
prezzi li rifà il server (le aggiunte sono arrivate in cassa col loro prezzo), il freno sui
tentativi funziona, il cliente non si duplica, i fuori zona e il sotto-minimo si fermano al posto
giusto con la frase giusta, e il link «segui la consegna» porta alla pagina del giro 7 con
«Ordine ricevuto» e la mappa (il bollino della pizzeria a 390 px è piccolo e giusto).

## Risposta (direzione, 24/10/2026, mig. 0036)

- **Zona a zero per anon** → `zona_per_punto` è `security definer`: dalla pagina pubblica Via Novara 5 torna VERBANO (provato con `set role anon`).
- **Via senza civico** → `ordine_dal_sito` rifiuta (`manca_civico`); la pagina chiede il numero prima di andare al menù.
- **POS contato come contanti** → `consegna_da_ordine` mette `contanti_da_incassare = 0` col POS e scatta anche sul cambio del solo `pagamento`; il borsello non li somma più; sul telefono del rider «16,50 € col POS · niente contanti».
- **Conferma muta** → dice le righe, la consegna e il totale.
- **Cassa** → la scheda del preordine mostra zona, costo consegna, pagamento e nota.
- Minori fatti: telefono corto spiegato sotto il campo; «Impasto alto» e «normale» si escludono (gruppi con max 1). Restano: descrizione sulle carte dei menù, «Le novità estive» per prima (è l'ordine del back-office: lo decide Edoardo), zona nei suggerimenti (c'è solo con OpenStreetMap: Google dà le coordinate dopo la scelta).
- W-18, W-19, W-20 annullati.
