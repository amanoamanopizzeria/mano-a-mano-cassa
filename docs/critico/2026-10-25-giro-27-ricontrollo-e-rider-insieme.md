# Giro 27 del critico: ricontrollo del giro 26, minuti per strada, rider che prende più comande

Deploy `4f92603` (con `ee98e57`), READY. 25/10/2026, 02:38–02:50 (ora solare). Cassa a 1024 e app
rider a 390 affiancate, con l'utenza della cassa che ha il rider di prova. Clienti di prova miei:
0009990026 (Via Novara 9), 0009990027 «Prova Critico Ventisette» (Via Nizza 10, «PROVA citofono 27,
piano 2»), 0009990028 «Prova Critico Ventotto» (Via Salaria 100, «PROVA scala C»). Ordini di prova
C-87, C-88, C-89, C-91 (domicili per stasera) e C-90 (domicilio per domani): **tutti annullati**,
ordini e consegne (controllato sul database).

**Voto: 8 su 10.** I quattro resti del giro 26 sono chiusi. Le doppie sulla striscia vanno ancora in
linea d'aria, perché Google rifiuta la Routes API. L'app del rider prende più comande insieme e parte
con tutte come Velocissimo RIDER.

## Ricontrollo del giro 26

| Punto | Esito |
|---|---|
| Nota di consegna | **A posto.** Comanda di C-88: «CONSEGNA: PROVA citofono 27, piano 2» (16 px, 900) sotto la zona. Carta in `/cassa`: «Via Novara 9 · **PROVA citofono Critico, scala B**». Rider: «⚠ PROVA critico giro 27 · CONSEGNA: PROVA scala C». `comanda_per_stampa` ha `'note', i.note` e l'ESC/POS stampa «CONSEGNA: …» (letto, non stampato). |
| Orologio sul giorno dell'ordine | **A posto.** C-90 «DOMANI alle 20:00». Con 🕒 si vedono i quarti di domani dalle 18:30 (20:15 «0/35 pizze 0/2 cons.» mentre oggi quel quarto è pieno). Tocco su 20:30: «DOMANI alle 20:30», a database `2026-10-26 20:30`. La colonna di oggi non cambia (20:15 «5/35 2/2»). |
| «Elimina» col mouse | **A posto.** 4 trascinamenti su 4 righe, 4 «Elimina» aperti; il clic su «Elimina» toglie la riga giusta (La napoli). |
| Cliente che restava attaccato | **A posto.** Dopo C-87 la comanda nuova è vuota: «Serve l'indirizzo: apri Dati cliente», niente «Prova Critico». Il tipo resta Domicilio. |
| Coda dell'agente (18 ore) | Corretta in 0060: conta l'ora di consegna. Attenzione: C-10 (per il 24 alle 20:30, mai stampato) adesso rientra nelle 18 ore e uscirebbe alla prima accensione dell'agente. |

## Novità

**1. Minuti per strada in `/cassa/nuovo`.** `/api/indirizzi/tempi` risponde **«linea»**, con motivo:
«Google 403: … Requests to this API routes.googleapis.com method
google.maps.routing.v2.Routes.ComputeRouteMatrix are blocked.» La chiave di Google non ha la Routes API
abilitata, oppure è limitata ad altre API: va abilitata sul progetto Google. Con «linea» la striscia
resta in metri: «20:00 1/2 cons. C-87 a 450 m» per Via Nizza, «C-87 a 1,2 km» e «C-88 a 1,3 km» per Via
Salaria, «20:30 · C-88 a 0 m» per C-91. Il motivo di Google arriva così com'è al browser: non ci sono
chiavi dentro, ma è testo interno.

**2. `/rider`** a 390 px. Niente scorrimento orizzontale e niente testo sotto i 13 px. I tasti sono
«LA PRENDO IO» 320×64, «+ Aggiungi» 320×56, «Naviga»/«Chiama» 56 px.
- «Tocca «Aggiungi» su più comande e prendile insieme.» «+ Aggiungi» su C-87 e C-89 diventa «✓
  Aggiunta» e la carta si segna. In fondo resta ferma la barra «2 comande: C-87, C-89 | Le prendo io |
  Annulla». «Le prendo io»: tutte e due in «LE MIE (2)», «In tutto da incassare in contanti 42,80 €».
- «A 2 min da C-88: falle insieme» (C-87), «A 5 min da C-87» (C-89), «A 1 min da C-91» (C-88).
- «Parto con tutte e 2»: tutte e due «RITIRATA», in un tocco.
- «Naviga tutte»: «Giro: C-87 → C-89». L'URL è `www.google.com/maps/dir/` con `api`, `origin` =
  pizzeria (41.9138, 12.50734), `waypoints` = C-87, `destination` = C-89 e `travelmode=driving`. È
  giusto.
- Variazioni: «1× La margherita · + Impasto alto, **senza senza** Pecorino romano DOP». Totale:
  «Totale ordine 17,60 € · si ritira in pizzeria, Via Novara 5/7».

## Cosa non va

**Medio**
- **Routes API bloccata**: finché Google risponde 403, le doppie sono la stima in linea d'aria. Va
  abilitata «Routes API» sulla chiave (`GOOGLE_MAPS_API_KEY`).
- **«senza senza»** sulle variazioni del rider: il nome della variazione ha già «senza» e la scheda ne
  aggiunge un altro.
- **Il civico non sposta il punto**: la distanza («1,2 km dalla pizzeria») si calcola appena si sceglie
  la via dalla lista, prima del civico. Via Salaria 100 è salvata a 41.9244, 12.5037. Su una via lunga
  la doppia e il giro possono sbagliare di chilometri. Da verificare con un indirizzo vero.
- **Ordine annullato in viaggio**: C-87 e C-89 erano «RITIRATA» dal rider. Annullati dalla cassa, sono
  spariti dalla sua lista senza un avviso.

**Da avere**
- Due consegne allo stesso indirizzo, C-88 e C-91, mostrano «A 1 min da C-91: falle insieme». Fra le
  libere servirebbe «Stesso indirizzo», come fra le sue.
- Nella barra, «Annulla» (togli le spunte) sta accanto a «Le prendo io» e si legge come «annulla
  l'ordine». Meglio «Togli le spunte».
- «Naviga tutte» mette le tappe per vicinanza, non per ora promessa: con orari diversi può portare
  prima quella delle 20:15.
- La bozza della comanda non inviata resta ricaricando la pagina: un mio ordine è partito con una
  Napoli in più rimasta da prima (C-89, 2× La napoli).

## Pulizia

C-87 … C-91 annullati da `/api/ordini/<id>/stato` (200 su 5). Le consegne risultano «annullata». Il
borsello del rider è a «Hai in mano 0,00 €»: il −1,00 € del giro 25 non c'è più. Restano in anagrafica i
clienti di prova 0009990026, 0009990027 e 0009990028, con i loro indirizzi.
