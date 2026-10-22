# Architettura — Mano a Mano Cassa

## Idea di fondo
La cassa non è più un server raggiungibile dall'esterno: è un **client** del
cloud. Tutti i dispositivi (cassa, totem, rider, cliente) parlano con lo stesso
**cloud ordini** e ricevono gli aggiornamenti in **tempo reale**.

```
 App Cliente ─┐                 ┌─ Totem (stessa Wi-Fi)
              ▼                 ▼
        ┌──────────────────────────────┐   realtime  ┌───────────────┐
        │  CLOUD ORDINI (Supabase)      │◀───────────▶│  CASSA (PWA)   │
        │  DB · Realtime · Auth · API   │             │  + print agent │─▶ stampanti
        │  webhook aggregatori          │             └───────────────┘   cucina/cassa/fiscale
        └──────────────▲────────────────┘
                        │ realtime
                  App Rider (PWA) + mappa live
                        │
         feed dati ─────┴────▶  mano-a-mano-os (dato diretto, non più CSV)
    Deliveract ─(webhook)─▶ cloud ordini (Glovo/Deliveroo/JustEat)
```

## Stack
- **DB / Realtime / Auth:** Supabase (Postgres).
- **App:** Next.js (PWA) per cassa, rider, cliente, totem; poi React Native per lo Store.
- **Mappe rider:** posizione da `watchPosition` → tabella `rider_posizione` → Supabase Realtime → mappa.
- **Hosting:** Vercel (front-end) + Supabase (dati).

## Stampa
- Comanda (cucina/cassa): **print agent** locale nel negozio che riceve dal
  cloud e stampa in ESC/POS sulle stampanti di rete; la riga d'ordine porta la
  sua `destinazione` (cucina/cassa).
- Fiscale: **Epson RT** via API ePOS/XML in LAN, con invio corrispettivi
  all'Agenzia delle Entrate (modulo dedicato, step successivo).

## Dominio dati
Vedi `supabase/migrations/0001_schema_ordini.sql`. Entità: negozio, prodotto
(+categoria/gruppo, prezzi per formato, flag per canale), variazione, cliente,
zona/indirizzo, **ordine** (+righe, pagamenti; canale/origine e tipo evasione),
rider + **consegna** + **rider_posizione**, stampante.

## Ciclo di vita ordine
`ricevuto → in_preparazione → pronto → in_consegna → consegnato/ritirato`
(o `annullato`). La consegna: `da_assegnare → assegnata → ritirata → consegnata`.

## Prossimi passi
Auth/ruoli (cassa, rider, cliente, totem) + policy RLS + pubblicazioni realtime
(migrazione 0002), poi API ordini e le PWA, nell'ordine: cassa → rider → cliente.
