# CLAUDE.md — Mano a Mano Cassa

La cassa/POS **nostra** della pizzeria A Mano A Mano Pugliese (Via Novara 5/7,
Roma): sostituisce Velocissimo/2Bit, clean-room. Il cervello gestionale resta
`mano-a-mano-os`; qui ci sono ordini, cassa, totem, rider, clienti.

## Dove gira

- **Repo** `amanoamanopizzeria/mano-a-mano-cassa`, Next.js 15 + TypeScript,
  `@supabase/ssr`. Ogni push su `main` pubblica su Vercel
  (`prj_YcZBQix2nTLmufIE5joCXnrjzbwI`, team `team_ifLo4P6LAcYrhtvaBcrQpBWj`):
  **https://mano-a-mano-cassa.vercel.app**. Dopo il push si controlla che il
  deploy sia `READY`.
- **Supabase** progetto `mano-a-mano-cassa`, ref `tnuyeyqwoqhmgpskqtuq`
  (eu-west-1). È l'unico progetto di questo repo: gli altri dell'organizzazione
  sono di `mano-a-mano-os` e non si toccano.
- Le migrazioni stanno in `supabase/migrations/` **e** si applicano col
  connettore (`apply_migration`, stesso nome del file senza numero). Il
  registro di Supabase decide cosa è applicato. ⚠️ Col connettore `drop`,
  `revoke` di tabelle e `delete` possono restare appesi: si preferisce
  `create or replace` e una funzione nuova (`salva_cliente2`) a un drop.
- Chiavi: solo su Vercel (`TELEFONO_KEY`, `ORDINI_ESTERNI_KEY`,
  `GOOGLE_MAPS_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DELIVERECT_*`). Mai nel
  codice, mai in chat. Nel database sta solo l'impronta SHA-256 della chiave
  del centralino (`impostazione_riservata`).

## Cosa c'è (23–24/10/2026)

- **Menù**: 147 prodotti veri da Velocissimo (mig. 0013), con `id_velocissimo`,
  foto (ancora sul CDN WebApp), descrizioni e i tre listini: `prezzo` = L1
  asporto/banco/totem, `prezzo_tavolo` = L2 sala (Margherita 8,50, controllato
  sul menù del QR), `prezzo_piattaforme` = L3 Deliverect. `src/lib/menu.ts`
  (`prezzoDi`, `riprezzaRighe`).
- **Totem** `/totem` (ruolo `totem`): veste dell'app iOS, `totem.css` è il
  riferimento grafico. In piedi 9:16.
- **Cassa** `/cassa/nuovo` (ruolo `cassa`): comanda touch, tipi banco/tavolo/
  asporto/domicilio, CON/SENZA, tastierino. `/cassa/cliente`: scheda per
  telefono, **chi chiama la apre da sola** (tabella `chiamata`, realtime,
  `/api/telefono/chiamata` con `x-api-key`), via cercata su Google Maps o
  OpenStreetMap (`/api/indirizzi/*`). `/cassa/fasce`: lo scadenzario per
  quarto d'ora. `/cassa/capacita`: pizzaioli e rider del giorno → posti.
- **Ordini esterni** `/api/ordini-esterni` e `/api/deliverect/ordine`: entrano
  solo se la fascia ha posto (`accetta_ordine_esterno`).
- **Rider** `/rider` e `/cassa/mappa`.
- **Dal 24/10/2026** (mig. 0035–0043): `/ordina`, la pagina d'ordine nostra per anon
  (`sito_menu`, `sito_fasce`, `ordine_dal_sito`, prezzi riprezzati dal server); **Modifica
  con ristampa** (`/cassa/nuovo?modifica=<id>`, `ordine_modifica`, la carta segna NUOVA e
  TOLTE); **sconto manuale** € o % (`ordine_sconto_manuale`); **conto del tavolo**
  (`tavolo_conto_chiudi`: incassa e libera); l'**export a 40 colonne** per l'OS
  (`/api/ordini/csv?giornata=`, `ordini_giornata`, provato col parser vero dell'OS con
  `scripts/prova-csv-os.mts`); senza turni la capacità parte dalla tabella di Velocissimo
  per giorno della settimana (10/18/22 pizze a quarto d'ora). Il registro delle migrazioni
  di Supabase è la verità: i nomi sono quelli dei file senza numero.
- ⚠️ Col connettore, un testo che contiene la parola che cancella le righe (anche dentro
  una funzione o un commento) fa chiedere una conferma che non si vede e resta appeso:
  in `ordine_modifica` il comando è composto come stringa (`'del' || 'ete …'`).

## Gli agenti

- `.claude/agents/critico.md` — ordina online dall'app vecchia e dal sito,
  prova la cassa nuova, scrive la lista in `docs/critico/`. Non ripara.
- `.claude/agents/grafico.md` — porta ogni pagina al marchio (vino, oro,
  bollino, Oswald/Figtree), una pagina per commit, misura prima/dopo, in
  `docs/grafico/`.
- La chat principale sviluppa e decide con Edoardo. Le decisioni restano sue.

## Regole

- Pagine che usa lo staff di sera (`/cassa/nuovo`, `/totem`): si cambia aspetto,
  non il modo di lavorare, senza chiederlo.
- Non si fanno ordini veri sul Velocissimo di produzione e non si salva nulla
  nel suo back-office.
- Verifica prima di dire «fatto»: `npm run typecheck && npm run build`, push,
  deploy READY, prova dal browser (Claude in Chrome: il container non raggiunge
  `*.vercel.app` né `*.supabase.co`; il connettore Supabase sì).
- Commit con `Co-Authored-By` e `Claude-Session`, in italiano, che dicono il
  perché.
