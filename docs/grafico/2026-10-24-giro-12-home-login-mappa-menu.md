# Grafico, giro 12 — Home, Accesso, Mappa rider, Menù (24/10/2026)

Quattro pagine, un commit ciascuna, su `main`; deploy READY (`da2ed7d`).
Nessun flusso cambiato: stessi link, stesse chiamate, stesse rpc.

## 1. `/` (home dello staff) — `19869db`

Prima: logo lineare piccolo accanto al titolo, tredici carte uguali in una
griglia sola. Dopo: la testata dell'app (fascia sabbia col logo lineare e il
bollino, barra vino «Mano a Mano Cassa · Scegli la postazione»); sotto NUOVO
ORDINE le stesse tredici carte divise in **La sera** (Cassa, Rider, Sala,
Mappa rider, Rider e borsello), **I clienti** (Cliente, Ordina online, Totem) e
**Il giorno** (Planner fasce, Capacità, Riepilogo, Menù). Di sera si guarda la
prima fila e basta. A 390: 1,0 → 1,2 schermate (le tre righe di titolo),
0 testi < 13, 0 tasti < 40 prima e dopo.

## 2. `/login` — `92e882e`

Fascia sabbia col logo, barra vino, titolo Oswald 28, campi da 52 px (testo
17), «Accedi» vino da 56 in Oswald, «Registrati» resta (è una funzione) ma
come riga discreta da 44, l'errore in una fascia. Stesse chiamate a Supabase
Auth e stesso rimando a /cassa. Misurato montando il markup con il CSS vero
(da loggati /login rimanda alla home): 1 schermata, 0 testi < 13, campi e
tasti 52/52/56/44 (prima: campi ≈ 46, Registrati ≈ 40).

## 3. `/cassa/mappa` — `58a7621`

Finché le tessere non arrivano si legge «Carico la mappa…» col bollino che
pulsa sul crema (prima 3–4 s di riquadro grigio muto); i tasti dello zoom
dicono «Avvicina» e «Allontana» (erano «Zoom in», «Zoom out»); in basso resta
solo «© OpenStreetMap» (il rimando «Leaflet», un link da 15 px, non c'è più).
Leaflet, marker, linee e «Assegna a…» intatti: un `setPrefix("")` e due
`title` sul DOM dopo che la mappa è nata, e un `once("load")` sulle tessere
per togliere la scritta. Tasti/link < 40: 1 → 0 (a 390 e 1024).

## 4. `/cassa/menu` — `da2ed7d`

Titolo Oswald 28, il gruppo come riga con la linea sotto, categoria 20, righe
da 16 con più aria e prezzo 17 tabulare, «Spenti» da 40 px; dai 900 px le
categorie su due colonne. A 1024×768: 7,6 → 6,2 schermate. A 390 le righe
più alte costano 7,0 → 9,1 schermate (ridotte a 6 px di aria sotto i 600 px
nel commit del rapporto); sul telefono il menù non si legge di sera, sul
tablet sì.

Foto: `lettura/giro12-prima-home-mappa-menu.jpg`, `lettura/giro12-dopo-home-mappa-menu.jpg`.
