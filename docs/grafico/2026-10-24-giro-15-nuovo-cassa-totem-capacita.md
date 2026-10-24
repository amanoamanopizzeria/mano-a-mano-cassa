# Grafico, giro 15 — Nuovo ordine a 390, Cassa a 390, Totem (riepilogo e grazie), Capacità a 390 (24/10/2026)

Quattro pagine, un commit ciascuna, su `main` da `1fe79fa` (deploy READY
prima di misurare); deploy READY dei miei (`32e9484`, poi il rapporto).
Nessuna scrittura sul DB, nessun ordine: il messaggio verde dell'invio e le
due schermate del totem sono stati montati con markup finto sul CSS vero.

## 1. `/cassa/nuovo` a 390, pannello chiuso — `01550b2`

Contanti / POS / Già pagato: tre tasti uguali da 44×122 in Oswald col bordo
oro (vino quando scelto; erano pillole grigie da 40 di larghezze diverse);
il messaggio verde dell'invio a due righe al massimo col filo verde a
sinistra; Svuota 44, Invia in cucina 54; il pannello chiuso non sale oltre
34 dvh e dentro scorre.

| 390×844, pannello chiuso | prima | dopo |
|---|---|---|
| altezza del pannello | 218 px (26 %) | 216 px (26 %), tetto 287 px (34 %) |
| tasti < 44 px | Contanti, POS, Già pagato, Svuota (40) | 0 |
| testi < 13 | 0 | 0 |

## 2. `/cassa` a 390 — `b1fdae5`

«Ieri e prima (N)» da pillola grigia di 40 px a pillola col bordo oro, testo
vino 15, 44 px a tutta larghezza; a 390 i tasti delle carte (Comanda, Stampa,
Modifica, i passi di stato, Annullato) in due colonne uguali, con Annullato e
«Sicuro? Tocca ancora» a tutta riga; i preordini col filo oro a sinistra.
Con gli ordini di stasera (47 carte del critico + 1 preordine): 15,8 → 15,6
schermate; 0 tasti < 40 e 0 testi < 13 prima e dopo. La lunghezza è dei dati,
non della veste: una carta sta in ≈ 300 px.

## 3. `/totem`, riepilogo finale e «grazie» — `34eba54`

Riepilogo prima di confermare: righe da 22 con quantità e prezzo in Oswald
24, totale col filo nero e la cifra vino 30, titolo «Il tuo ordine · nome» in
vino con la riga sotto (erano righe da 18 con lo stile in riga, senza
totale). «Grazie»: titolo Oswald 52, numero d'ordine in un tassello sabbia
con la cifra Oswald 80 e «IL TUO ORDINE» sopra (era un 32 vino), testo 24,
«Nuovo ordine» da 72. A 1080×1920: 0 testi < 20 in tutte e due.

## 4. `/cassa/capacita` a 390 — `32e9484`

Pizzaioli e rider affiancati, Salva turni a tutta larghezza da 48, frase coi
numeri a 15, carte dei quarti d'ora da 8 px di bordo con ora 24 e conteggi
19. 3,1 → 2,8 schermate; 0 tasti < 40, 0 testi < 13, nessuno scorrimento
laterale.

Foto: `lettura/giro15-prima-nuovo-cassa-capacita.jpg`, `lettura/giro15-dopo-nuovo-cassa-totem.jpg`.
