# Giro 28 del critico: rider a tappe end to end e chi annulla in cassa

Main a `28a6740` (READY), con `0f5fe4c`, `4cb1182`, `69bbadd`. Migrazioni 0061 e 0062 applicate (registro
Supabase, 25/10 01:45 e 02:30 UTC). 25/10/2026, 03:55–04:10 ora di Roma. Clienti di prova miei:
0009990026 (Via Novara 9), 0009990027 (Via Nizza 10), 0009990028 (Via Salaria 100). Ordini di prova:
C-92 (Via Nizza, 20:00), C-93 (Via Salaria, 20:30), C-94 (Via Novara, 21:00).

**Voto: 8 su 10.** Il giro a tappe fa quello che Edoardo ha chiesto: il cliente seconda non riceve nulla
finché la prima non è consegnata. Restano una scritta sbagliata su /segui e un saldo del rider che non
torna.

## 1. Rider a tappe, end to end (priorità 1)

- **Presa**: «+ Aggiungi» su C-92 e C-93, poi «Le prendo io». Entrambe in «LE MIE (2)», «In tutto da
  incassare in contanti 33,40 €». Database: `assegnata`.
- **Parto con tutte e 2**: `consegna.tappa` 1 per C-92 e 2 per C-93; `in_viaggio_il` solo su C-92. La
  scheda di C-93 dice «In attesa: prima C-92. Il cliente sarà avvisato quando parti.»
- **Avvisi**: `notifica_cliente` per C-92 (`partita`, `da_inviare`, telefono 0009990027). **Nessuna** per
  C-93, finché C-92 non è consegnata. `da_inviare` vuol dire «creato, non ancora spedito» (il giro che
  spedisce non è stato eseguito in questa prova).
- **/segui di C-93, prima della consegna di C-92**: sottotitolo «il rider sta finendo un'altra consegna:
  parte per te dopo». ✓ come da richiesta. Il riquadro grande però dice **«IN VIAGGIO VERSO DI TE», con
  il 🛵**, mentre è in attesa: vedi sotto.
- **Consegnata C-92** (due tocchi su «Consegnata»): `consegnata`, C-93 passa a `in_viaggio_il` e nasce
  la sua notifica (`da_inviare`). Su /segui di C-93 il sottotitolo diventa «partito alle 04:00 · previsto
  per le 20:30». Il 04:00 è corretto: il database segna le 04:00 di Roma.

## 2. Annullo dalla cassa e v_annulli_per_persona (priorità 2)

- Da `/cassa`, su C-94 (domicilio per le 21:00), «Annullato» → «Sicuro? Tocca ancora» → annullato:
  la carta esce dalla lista.
- `v_annulli_per_persona`, 25/10: **Edoardo · cassa · 1 annullo · 16,40 €**. Chi è dal profilo, come
  previsto.
- **Non compaiono** gli annulli fatti prima delle 02:30 UTC, cioè prima che 0062 fosse applicata (C-84,
  C-85, C-86, C-87…C-91 del giro 26 e 27): `annullato_il` è vuoto e la vista li esclude. Chi li ha
  annullati, quindi, non si sa. Serve decidere se si rimettono a mano o si lasciano vuoti.
- Non provato: l'annullo da app o sito (`cliente / canale esterno`) richiede un ordine dall'esterno.

## 3. Barra di 2Bit

Non provata, come da richiesta.

## Cosa non va

**Medio**
- **/segui su C-93 in attesa dice «IN VIAGGIO VERSO DI TE» con il 🛵.** Il sottotitolo è giusto, il
  titolo no. Per lo stato `ritirata` il titolo dovrebbe leggere «In attesa del rider» (o simile) finché
  `prima_un_altra`; la scritta «in viaggio» va solo a `in_viaggio_il` valorizzato.
- **«Hai in mano 0,00 €» con C-92 consegnata e 15,60 € in contanti da saldare.** Il rider ha in mano quei
  soldi e l'app dice zero. Già notato nel giro 25 (−1,00 €), ora il segno è cambiato ma il valore resta
  sbagliato: il borsello non conta le consegne `consegnata` non ancora saldate.
- **Annulli prima di 0062 senza chi.** Vedi sopra. Gli annulli del giro 26 e 27 non hanno autore.

**Da avere**
- Un ordine consegnato non si annulla dalla cassa (409 «Da "consegnato" non si può passare a
  "annullato"»). C-92 quindi resta aperta: 15,60 € da saldare, già scritti a Edoardo nel giro 26.

## Pulizia

- **C-93**: annullata da `/api/ordini/<id>/stato` (200), mentre era in consegna. Sparita dalla lista del
  rider («LE MIE (0)»).
- **C-94**: annullata dalla cassa, vedi sopra.
- **C-92**: **resta consegnata**, con 15,60 € da saldare nella lista del rider. Non si annulla dalla
  cassa. Chiedo a Edoardo come chiuderla (saldo in cassa o annullo via SQL, come nei giri precedenti).
- I clienti di prova 0009990026, 0009990027 e 0009990028 restano in anagrafica.
