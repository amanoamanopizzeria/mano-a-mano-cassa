# Giro 9 del grafico — la sala, la comanda cartacea, il totem (24/10/2026)

Tre pagine, un commit ciascuna, misure prima/dopo con il metro dei giri
precedenti (testi < 13 px, tasti < 40 px, elementi che sforano, schermate;
sul totem la soglia è 20 px di testo e 72 px di tasto). Deploy `READY`
controllato dal connettore. Foto in `lettura/giro9-*.jpg` (fuori da git).
Non toccati `docs/critico` e le migrazioni.

## 1. /cassa/tavoli — `653d9fd`

Le carte dei tavoli e il foglio del conto (`.conto-velo`, `.conto`), senza
toccare `passaAlConto` e `incassa`.

- Carte da 150 px (due a 390, sei sul tablet a 1024) con numero 32 in
  Oswald, stato a pillola, coperti e minuti a 14/15, tasti Apri/Conto/Libera
  da 44 px. «Da troppo» è **rosso errore**, distinto dal vino di «al conto».
- Il conto: «TAVOLO D3» 28 in Oswald, coperti e minuti a 15, ✕ da 44, righe
  16 con la quantità 20 in Oswald e il prezzo 17, totale **34 in vino** sopra
  un filo nero, Stampa/Contanti/POS da 52 px (Contanti e POS in Oswald). Sul
  telefono il foglio **sale dal basso** a tutta larghezza.
- Stampato: `@page 80mm`, il foglio largo 80 mm come le comande, nero,
  niente sotto i 13 px, senza i tasti e senza la pagina dietro (era già
  nascosta: ora anche il formato è quello della stampante della cassa).

| 390×844 / 1024×768 | Prima | Dopo |
|---|---|---|
| tasti < 40 px | 16 / 16 (Apri, Conto, Libera a 31) | **0 / 0** |
| testi < 13 px · sfora | 0 · 0 | 0 · 0 |
| schermate | 1,3 / 1,0 | 1,4 / 1,0 |

## 2. La comanda da 80 mm — `d3e1d92`

`/cassa/comanda/[id]` (`comanda.css` + il piè di pagina in `page.tsx`). Le
righe, i reparti, NUOVA e TOLTE del critico (mig. 0043) non cambiano.

- **MODIFICATA · RISTAMPA** è una banda nera a tutta larghezza a 18 px (era
  un'etichetta da 15 in mezzo alla testata).
- Il **nome del cliente** a 20; la **nota fissa ⚠** in un riquadro a bordo
  doppio a 16 in grassetto (era corsivo da 14).
- Nel piè lo **sconto** ha la sua riga a 16, il totale a 17, e **«PAGA CON →
  RESTO»** è una riga in negativo (bianco su nero) a 16: prima stavano tutti
  in un'unica riga a 14 col totale.
- Niente sotto i 13 px: «per le», il piè e il segno NUOVA erano a 12.

| a 390 (la stampa usa gli stessi px) | Prima | Dopo |
|---|---|---|
| testi < 13 px | 2 («per le», piè) | **0** |
| MODIFICATA · sconto · paga con | 15 px · in riga · in riga | 18 px banda · riga 16 · negativo 16 |

## 3. /totem — `7886bbd`

Dal riferimento `docs/grafico/APP_RIFERIMENTO.md` (home [03, 12] e menù [08]).

- **Avvio** (9:16): fascia sabbia col logo lineare nero in cima; la foto
  delle mani che sfuma nel **bianco** (non più nel crema), il bollino a metà,
  la pennellata «ORDINA QUI» vino inclinata con i bordi sfrangiati a pennello
  secco, la lapide in sabbia. «Siamo chiusi» uguale, con l'ora in vino.
- **Lista**: nome in Oswald 32, descrizione in due righe a 20, prezzo 32 in
  fondo a destra del testo, foto 200 px (era 230) a destra su sabbia, riga
  più stretta: a 1080×1920 entrano cinque righe invece di quattro. Titoli,
  categorie e titolo della barra in Oswald, come /ordina dopo il giro 8.
- Si tocca e si ordina come prima: nessun passo, tasto o dato è cambiato.

| 1080×1920 | Prima | Dopo |
|---|---|---|
| avvio: testi < 20 px · tasti < 72 | 0 · 0 | 0 · 0 (con la fascia sabbia) |
| lista: righe per schermata | 4 | 5 (foto 200, riga 18 px di padding) |

La lista non si è potuta fotografare oggi: la cucina era chiusa e il totem
mostra «Siamo chiusi» finché non apre (18:30). I numeri della lista vengono
dalle misure in CSS; chi passa stasera la fotografi.

## Appunti

- Il checkout è condiviso: due volte mi sono trovato in `HEAD` staccato dopo
  il `pull --rebase` perché un altro agente faceva `git` nello stesso istante.
  Rimedio: `git branch -f main HEAD && git checkout main` quando `HEAD`
  contiene già `origin/main`, poi il push va.
- Per aprire il conto in misura ho toccato «Conto» su un tavolo di prova
  occupato: lo ha messo «al conto». Da non rifare sui tavoli veri.
