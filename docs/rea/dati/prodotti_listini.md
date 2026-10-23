# Prodotti: i tre listini L1 / L2 / L3 e il food cost

*Letti da `admin.velocissimo.app/product/{id}/edit` (campo «Prezzo», componente a tre listini) il 23/10/2026. Prezzi in euro, IVA inclusa (10%).*

**Quale listino usa chi.** L'app e il sito mostrano **L1** (Margherita 7,20, Aglio olio e baccalà 12,90: verificato sull'app il 23/10). **L2** è il listino della **sala** (Margherita 8,50, Supplì 2,50, Coca 3,50: Edoardo l'ha controllato sul menù del QR in sala il 22/10, ed è `prezzo_tavolo` nella cassa nuova). **L3** sta in mezzo (Margherita 7,90, Chinotto 2,50, Menù classico X1 12) ed è quello delle **piattaforme/Deliverect** (`prezzo_piattaforme`); dal video Velocissimo i listini si cambiano dalla cassa per canale «Negozio / Just Eat / Altre piattaforme». *Da confermare con Edoardo che L3 valga anche per Just Eat, prima di Deliverect.*

**Food cost.** Compilato solo su 12 pizze classiche (Marinara 0,67 · Margherita 1,20 · Funghi 1,80 · Napoli 1,52 · Diavola 1,56 · Wurstel 1,58 · Fiori e alici 2,12 · Patate con wurstel 1,78 · Capricciosa 2,20 · Margherita con bufala 2,60 · Bufala e pachino 2,81 · Provola e speck 2,30) e su Tonno e cipolla 1,78 e Amatriciana 1,50. Il resto è vuoto: il food cost vero lo tiene `mano-a-mano-os`.

| id | prodotto | categoria | L1 | L2 | L3 |
|---|---|---|---|---|---|
| 11 | LA TRE PACHINO | Novità estive | 9,50 | 10,50 | 10,50 |
| 17 | I FIORI E IL DATTERINO | Novità estive | 10,50 | 11,50 | 11,50 |
| 22 | AMATRICIANA ESTIVA (off) | Novità estive | 9,50 | 10,50 | 10,50 |
| 27 | LA BARONA | Novità estive | 8,50 | 9,50 | 9,50 |
| 34 | FOCACCIA DI PARMA (off) | Novità estive | 9,50 | 10,50 | 10,50 |
| 81 | LA MARINARA | Classiche | 6,40 | 7,50 | 6,40 |
| 82 | LA MARGHERITA | Classiche | 7,20 | 8,50 | 7,90 |
| 84 | LA FUNGHI | Classiche | 8,20 | 9,50 | 8,90 |
| 85 | LA NAPOLI | Classiche | 8,40 | 9,50 | 8,90 |
| 86 | LA DIAVOLA | Classiche | 8,40 | 9,50 | 8,90 |
| 87 | LA WURSTEL | Classiche | 8,40 | 9,50 | 8,90 |
| 88 | LA MARGHERITA CON CRUDO | Classiche | 9,40 | 10,50 | 10,00 |
| 89 | LA SALSICCIA | Classiche | 8,40 | 9,50 | 8,90 |
| 90 | L'ORTOLANA | Classiche | 8,40 | 10,50 | 8,90 |
| 92 | LA FIORI E ALICI | Classiche | 9,40 | 10,50 | 9,40 |
| 93 | LA CROSTINO | Classiche | 9,40 | 9,40 | 9,40 |
| 94 | LA BOSCAIOLA | Classiche | 8,90 | 10,50 | 9,40 |
| 95 | LA PATATE CON SALSICCIA | Classiche | 8,90 | 10,00 | 9,40 |
| 96 | LA PATATE CON WURSTEL | Classiche | 8,90 | 10,00 | 9,40 |
| 97 | LA CAPRICCIOSA | Classiche | 9,40 | 9,90 | 9,90 |
| 99 | LA MARGHERITA CON BUFALA | Classiche | 9,20 | 10,50 | 9,90 |
| 100 | LA 5 FORMAGGI | Classiche | 9,40 | 9,90 | 9,90 |
| 101 | LA BUFALA E PACHINO | Classiche | 9,90 | 10,50 | 10,40 |
| 102 | LA PROVOLA E SPECK | Classiche | 9,20 | 10,50 | 9,90 |
| 222 | LA MARGHERITA RICCA (impasto alto) | Classiche | 10,80 | 11,50 | 11,50 |
| 223 | LA CROSTINO PUGLIESE (impasto alto) | Classiche | 11,00 | 12,00 | 12,00 |
| 243 | ROSSA SEMPLICE | Classiche | 5,00 | 6,50 | 6,00 |
| 270 | TAGLIATE | Classiche | 0 | 0 | 0 |
| 271–273 | COSTI DI SERVIZIO ×3 | Classiche | 0,30 | 0,30 | 0,30 |
| 103 | LA TONNO E CIPOLLA | Speciali | 9,40 | 10,00 | 9,40 |
| 104 | L'AMATRICIANA | Speciali | 9,40 | 10,50 | 11,00 |
| 106 | LA DAR CONTADINO | Speciali | 9,90 | 10,50 | 10,40 |
| 107 | LA RADICCHIO E GORGONZOLA | Speciali | 9,40 | 10,50 | 10,40 |
| 108 | L'ANNIVERSARIO | Speciali | 10,90 | 11,00 | 10,90 |
| 110 | LA PORCINI E TARTUFO | Speciali | 11,90 | 12,00 | 11,90 |
| 112 | LA BRESAOLA | Speciali | 10,90 | 10,50 | 10,90 |
| 114 | LA MORTADELLA RIVISITATA | Speciali | 11,40 | 13,00 | 11,40 |
| 115 | LA SALMONE | Speciali | 11,90 | (solo L1) | |
| 117 | A MANO A MANO | Speciali | 11,40 | 13,00 | 11,40 |
| 118 | LA CACIO E PEPE | Speciali | 9,70 | 11,00 | 9,90 |
| 122 | LA GRICIA | Speciali | 9,40 | 11,00 | 9,90 |
| 123 | LA PARMIGIANA | Speciali | 10,50 | 11,50 | 11,50 |
| 124 | MADE IN SUD | Speciali | 10,90 | 11,00 | 10,90 |
| 126 | COTTO AFFUMICATO | Speciali | 10,90 | 11,00 | 10,90 |
| 127 | CARBONARA | Speciali | 10,50 | 11,00 | 10,50 |
| 129 | SAPORI | Speciali | 10,90 | 11,00 | 10,90 |
| 131 | CIAUSCOLO | Speciali | 10,90 | 11,00 | 10,90 |
| 132 | LA PORCINI | Speciali | 11,90 | 12,00 | 12,00 |
| 134 | GRICIA ALLE PERE | Speciali | 10,40 | 11,00 | 10,90 |
| 224 | LA FURIOSA (impasto alto) | Speciali | 10,00 | 11,00 | 11,00 |
| 225 | LA GATEAU (impasto alto) | Speciali | 11,00 | 12,00 | 12,00 |
| 226 | LA PROVOLONA (impasto alto) | Speciali | 11,00 | 12,00 | 12,00 |
| 227 | IL CRUDO DI PARMA | Speciali | 11,90 | 13,00 | 12,00 |
| 136 | PUCCIA VEGETARIANA | Pucce | 7,00 | 7,50 | 7,00 |
| 138 | PUCCIA CRUDO DI PARMA | Pucce | 8,00 | 8,50 | 8,00 |
| 139 | PUCCIA MORTADELLA STRACCIATELLA | Pucce | 8,00 | 8,50 | 8,00 |
| 140 | PUCCIA STRACCIACOTTO | Pucce | 7,50 | 8,00 | 7,50 |
| 141 | PUCCIA LA PUGLIESE | Pucce | 8,00 | 8,50 | 8,00 |
| 142 | PUCCIA FIORI DI ALICI | Pucce | 8,50 | 9,00 | 8,50 |
| 143 | PUCCIA PANCETTA E PECORINO | Pucce | 8,00 | 8,50 | 8,00 |
| 144 | PUCCIA CARCIOFI E GUANCIALE | Pucce | 7,50 | 8,00 | 7,50 |
| 145 | PUCCIA BROCCOLETTI AFFUMICATI (off) | Pucce | 7,00 | | |
| 146 | PUCCIA COTTO E PESTO | Pucce | 8,00 | 8,50 | 8,00 |
| 148 | PUCCIA BRIE E SPECK | Pucce | 7,50 | 8,00 | 7,50 |
| 149 | PUCCIA RADICCHIO GORGONZOLA E SPECK | Pucce | 7,50 | 8,00 | 7,50 |
| 150 | PUCCIA LA SALMONE | Pucce | 8,50 | 9,00 | 8,50 |
| 151 | PUCCIA CIME DI RAPA | Pucce | 7,50 | 8,00 | 7,50 |
| 153 | PUCCIA CIAUSCOLO | Pucce | 8,00 | 8,50 | 8,00 |
| 154 | PUCCIA CRUDO E STRACCIATELLA | Pucce | 8,50 | 9,00 | 8,50 |
| 156 | SUPPLÌ DI RISO | Fritti | 2,20 | 2,50 | 2,00 |
| 157 | CROCCHETTA DI PATATE | Fritti | 2,20 | 2,50 | 2,00 |
| 158 | CROCCHETTA ALLA 'NDUJA | Fritti | 3,00 | 3,50 | 3,00 |
| 159 | CROCCHETTA AL GORGONZOLA | Fritti | 3,00 | 3,50 | 3,00 |
| 160 | ARANCINO ALLA GRICIA | Fritti | 3,50 | 4,00 | 4,00 |
| 161 | ARANCINO ALLA CARBONARA | Fritti | 3,50 | 4,50 | 4,00 |
| 162 | FIORE DI ZUCCA | Fritti | 3,00 | 4,00 | 3,50 |
| 163 | FIORE SARDO | Fritti | 3,50 | 4,50 | 4,00 |
| 164 | FIORE ALL' NDUJA | Fritti | 3,50 | 4,50 | 4,00 |
| 165 | FILETTO DI BACCALÀ PASTELLATO | Fritti | 4,50 | 5,00 | 5,00 |
| 166 | CHIPS DI PATATE | Fritti | 3,50 | 4,50 | 4,00 |
| 167 | MOZZARELLINE | Fritti | 4,50 | 4,50 | 4,50 |
| 168 | CROCCHETTA CACIO E PEPE | Fritti | 3,00 | 3,50 | 3,50 |
| 256 | ANELLI DI CIPOLLA | Fritti | 4,00 | 4,00 | 4,00 |
| 257 | OLIVE ASCOLANE | Fritti | 5,00 | 4,50 | 4,50 |
| 258 | PATATE STICK | Fritti | 4,00 | 4,00 | 4,00 |
| 259 | JALAPENOS | Fritti | 4,50 | 4,50 | 4,50 |
| 263 | PEPITE DI BACCALA' | Fritti | 4,50 | 5,00 | 5,00 |
| 268 | FRITTURA DI VERDURE | Fritti | 5,00 | 5,00 | 5,00 |
| 169 | PUCCIA CON NUTELLA | Dolci | 5,50 | 5,50 | 5,50 |
| 170–175 | BARATTOLI (tutti off) | Dolci | 6,50 (cocco mango 4,50) | = | = |
| 269 | CHEESECAKE AL PISTACCHIO (off) | Dolci | 6,50 | 6,50 | 6,50 |
| 176 | Chinotto neri | Bevande | 2,00 | 3,50 | 2,50 |
| 177 | Coca cola 0,33cl | Bevande | 2,50 | 3,50 | 2,50 |
| 178 | Coca cola 0,33cl zero | Bevande | 2,50 | 3,50 | 2,50 |
| 179 | Fanta 0,33cl | Bevande | 2,50 | 3,50 | 2,50 |
| 180 | Coca 1,5lt | Bevande | 4,00 | 4,50 | 4,00 |
| 181 | Coca 1,5lt zero | Bevande | 4,00 | 4,50 | 4,00 |
| 205 | Acqua frizzante 1L | Bevande | 2,50 | 2,50 | 2,50 |
| 206 | Acqua frizzante 0,5 | Bevande | 1,00 | 1,00 | 1,50 |
| 208 | Acqua naturale 0,5 | Bevande | 1,00 | 1,00 | 1,50 |
| 209 | Acqua naturale 1L | Bevande | 2,50 | 2,50 | 2,50 |
| 182 | Peroni 33cl | Birre | 2,50 | 3,50 | 2,50 |
| 183 | Menabrea 33cl | Birre | 3,50 | 4,00 | 3,50 |
| 184 | Heineken 33cl | Birre | 3,00 | 4,00 | 2,50 |
| 185 | Peroni 66cl | Birre | 3,00 | 4,50 | 3,00 |
| 186 | Heineken 66cl | Birre | 4,00 | 4,50 | 4,00 |
| 187 | Menabrea 66cl | Birre | 4,50 | 4,50 | 4,50 |
| 188 | LA CLASSICA (frisella) | Friselle | 6,50 | 6,50 | 7,00 |
| 190 | LA RICCA | Friselle | 7,50 | 7,50 | 8,00 |
| 191 | LA RUSTICA | Friselle | 7,50 | 7,50 | 8,00 |
| 193 | SUPER MISTA | Insalate | 6,50 | 6,50 | 6,50 |
| 197 | SALMONE | Insalate | 7,50 | 7,50 | 7,50 |
| 198 | SPINACINO | Insalate | 7,00 | 7,00 | 7,00 |
| 200 | PERE E NOCI | Insalate | 7,50 | 7,50 | 7,50 |
| 204/207 | MENU PUCCIA / Menù Puccia | Menu | 7,90 | 7,90 | 7,90 |
| 210/216 | MENU CLASSICO X1 (riga cassa / attivatore app) | Menu | 13,00 | 13,00 | 12,00 |
| 211/217 | MENU CLASSICO X2 | Menu | 24,00 | 24,00 | 22,00 |
| 212/218 | MENU CLASSICO X3 | Menu | 33,00 | 33,00 | 30,00 |
| 213/219 | MENU SPECIALE X1 | Menu | 15,00 | 15,00 | 14,00 |
| 214/220 | MENU SPECIALE X2 | Menu | 28,00 | 28,00 | 24,00 |
| 215/221 | MENU SPECIALE X3 | Menu | 39,00 | 39,00 | 35,00 |
| 237–242 | MENU ×6 per Deliverect | Menu Deliverect | 13/24/33/15/28/39 | = | 13/23/31/15/25/36 |
| 245 | CACIO E CICORIA | Novità | 10,70 | 10,90 | 10,90 |
| 246 | LA LARDO | Novità | 11,90 | 13,00 | 11,90 |
| 260 | LA FINOCCHIONA (off) | Novità | 10,90 | 13,00 | 11,90 |
| 261 | AGLIO OLIO E BACCALA' | Novità | 12,90 | 13,00 | 12,90 |
| 262/275 | VARIAZIONE DI ZUCCHINE | Novità | 11,70 | 13,00 | 11,90 |
| 264 | L'ARRABBIATA | Novità | 9,90 | 9,90 | 9,90 |
| 274 | ARRABBIATA (doppione) | Novità | 9,90 | 13,00 | 11,90 |
| 247 | CLASSICO (burger) | Burgeria | 8,50 | 8,50 | 8,50 |
| 248 | COMPONI BURGER | Burgeria | 6,50 | = | = |
| 249 | BACON | Burgeria | 10,50 | = | = |
| 250 | BARESE | Burgeria | 11,00 | = | = |
| 251 | CHEESE | Burgeria | 10,00 | = | = |
| 252 | TIROLESE | Burgeria | 11,00 | = | = |
| 253 | TROPEANO | Burgeria | 9,00 | = | = |
| 254 | COMPONI DOPPIO BURGER | Burgeria | 9,50 | = | = |
| 255 | COMPONI SALSICCIA | Burgeria | 6,50 | = | = |
| 265 | PINOT GRIGIO (off) | Cantina | 15,00 | = | = |
| 266 | CHARDONNAY (off) | Cantina | 15,50 | = | = |
| 267 | MONTEPULCIANO (off) | Cantina | 16,00 | = | = |
| 276 | ARPIONE (Negramaro rosso) | Cantina | 17,00 | = | = |
| 277 | BALESTRONE (Primitivo) | Cantina | 18,00 | = | = |
| 278 | BATTIFREDDO (Negramaro rosato) | Cantina | 16,00 | = | = |
| 279 | ARMABIANCA (Vermentino) | Cantina | 16,00 | = | = |
| 280 | TORRIERO (Chardonnay) | Cantina | 16,00 | = | = |
| 232–236 | CONSEGNA PIATTAFORMA, MANCIA, SERVIZIO PIATTAFORMA, SCONTO, SERVIZIO | *Gestionale* | 0 | 0 | 0 |

Sotto ogni listino esistono anche i prezzi per le composizioni «2/3/4 gusti» (Margherita 3,45 / 2,30 / 1,73 = prezzo diviso per i gusti), ma le composizioni sono **disabilitate** nel back-office: non si usano.
