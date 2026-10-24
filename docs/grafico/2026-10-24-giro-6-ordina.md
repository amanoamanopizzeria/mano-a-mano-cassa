# Giro 6 del grafico (24/10/2026): /ordina e il totem come l'app

Edoardo, davanti alla pagina d'ordine nuova: «graficamente ancora devi
migliorare proprio tanto». Lo studio del giro 5
(`docs/grafico/APP_RIFERIMENTO.md`) è diventato codice.

## /ordina (`4cd6e2b`, `0254901`)

Cosa è cambiato, schermata per schermata, nel linguaggio dell'app:

- **In testa, sempre**: la fascia sabbia col logo lineare e il bollino, la
  barra vino con «‹ Indietro» e il titolo del passo (Ordina, Dettagli,
  Carrello, Consegna/Ritiro, I tuoi dati). La riga dei passi è sparita: il
  titolo dice dove sei.
- **Ordina**: bollino, «A MANO A MANO PUGLIESE», «Come lo vuoi?» con la riga
  sotto, i due pulsanti sabbia larghi con lo scooter e il sacchetto. Scelto,
  diventa vino (il vino dice dove sei). Sotto, «Indirizzo di consegna» con il
  campo grigio e i risultati a righe: la zona e il costo accanto a ogni via,
  «Qui non consegniamo» in vino.
- **Un tocco solo** (Edoardo, stesso giorno): «Ritiro» apre subito il menù;
  «A casa» apre il menù appena l'indirizzo è in zona. Niente più «Vai al
  menù». Nel «quando», il quarto d'ora porta subito ai dati.
- **Menù**: le categorie come tab bianche nella barra vino (la scelta piena e
  sottolineata); il titolo della sezione centrato con la riga; una colonna
  di righe col nome maiuscolo in grassetto, la descrizione, il prezzo nero in
  grassetto, «! Novità» a pillola, e la foto da 136 px a destra (prima
  francobolli da 54 px nei tondi e schede da due colonne). Il numero nel
  carrello è il quadratino sabbia sulla foto.
- **Dettagli**: pagina intera con le due fasce, foto quadrata grande, «Quantità»
  e «Aggiungi ingredienti» con la riga sotto, i tondi grigi − e +, le righe
  degli ingredienti col «+» grigio a destra che diventa vino con la spunta,
  in fondo «[1] Aggiungi al carrello 9,50 €» sabbia.
- **Carrello**: «Ritiro» o «Indirizzo di consegna», «Il tuo ordine» con
  «Aggiungi prodotti» (link sabbia), righe «1x NOME prezzo» con «CON Impasto
  alto (1,00 €)» sotto e il contatore grigio, poi «Consegna» e «Totale».
- **Consegna/Ritiro**: «Giorno» e «Orario» con la riga, tasselli grigi,
  quello scelto vino, i pieni barrati e sbiaditi.
- **I tuoi dati**: campi grigi; «Pagamento» a caselle quadrate con la spunta
  nera («Contanti alla cassa» / «Bancomat o carta alla cassa», o «alla
  consegna»); «Il tuo ordine» con le righe «1x».
- **In fondo, sempre**: la fascia grigia col pulsante sabbia unico
  «[articoli] azione totale», testo nero (bianco su sabbia non si legge).
- **Grazie**: bollino, numero in un riquadro sabbia chiaro, «Segui la
  consegna» come pulsante sabbia.
- **Carattere**: Figtree ovunque, grassetto dove l'app è in grassetto.
  Oswald non c'è più in questa pagina: l'app lo usa solo nelle pennellate.

### Misure a 390×844 (sul sito)

| passo | prima | dopo |
|---|---|---|
| Ordina | 1,0 schermate · 0 < 13 px | 1,0 · 0 |
| Menù (5 prodotti) | 1,4 schermate · **19** testi < 13 px (categorie a 11,5) · **9** a capo | 1,2 · 0 · 0 (restano a capo solo le descrizioni, che sono testo) |
| Dettagli | 24 testi < 13 px | 0 |
| Carrello | 1,0 · 0 | 1,0 · 0 |
| Quando | **8** testi a 12 px | 0 |
| Dati | 1,2 · **5** a 12,5 px | 1,1 · 0 |
| overflow / scroll orizzontale | 0 / no | 0 / no |

Foto: `lettura/ordina-prima/` e `lettura/ordina-dopo/`.

## Totem (`3f8bcc7`)

La bozza del giro 5, pubblicata con una differenza: Figtree al posto di
Oswald anche qui, tranne la pennellata dell'avvio. Fascia sabbia e barra
vino, categorie a tab, righe con la foto da 230 px, il pulsante sabbia
«[n] Vedi ordine · cosa c'è dentro · totale» sempre visibile, contatore e
ingredienti coi tondi grigi, scheda a tutta larghezza.

Misure a 1080×1920 sul sito (iframe, stato iniettato perché `?anteprima=1`
non esiste), nella parte visibile:

| schermata | prima | dopo |
|---|---|---|
| Menù | **28** testi < 20 px (categorie a 14, «Annulla» a 17) · «Novità» a 12 px · **2** tasti < 72 px | 0 · 0 · 0 |
| Scheda del prodotto | **46** testi < 20 px · **16** tasti < 72 px (ingredienti da 55) | 0 · 0 |
| Carrello, pagamento | — | 0 · 0 |
| scroll orizzontale | no | no |

Foto: `lettura/totem-prima-*.jpg` e `lettura/totem-dopo/`.

## Da sapere

- I rilevatori contano come «a capo» anche le descrizioni dentro il
  pulsante del prodotto (3 righe di testo): non sono etichette di pulsanti.
- Il carrello della WebApp e la bozza di /ordina nel browser condiviso col
  critico avevano già prodotti e un indirizzo: usati solo per guardare, mai
  mandati. Nessun ordine è stato inviato, né su /ordina né sul totem.
