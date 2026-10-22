# Mano a Mano Cassa

Cassa/POS e sistema ordini **proprietario** della pizzeria A Mano A Mano:
la sostituzione della cassa Velocissimo/2Bit. Cloud-native, tempo reale,
alimenta `mano-a-mano-os` al posto dell'import CSV.

## Perché
Oggi la cassa Velocissimo è un server che il cloud deve raggiungere all'IP
dinamico del negozio (ping-executer + port-forwarding). Qui **ribaltiamo**: la
cassa è un **client** del cloud → funziona dietro qualsiasi router, in tempo
reale, con i dati di proprietà.

## Componenti
- **Cloud ordini** (Supabase: DB + Realtime + Auth) — *in costruzione, Fase 1*
- **Cassa** (PWA): comande, conti, stati, stampa comanda
- **Rider** (PWA): auto-assegnazione, naviga/chiama, consegnato, **mappa live**
- **Cliente** (PWA): menù, carrello, ritiro/domicilio/prenotazione
- **Totem** (PWA, stessa Wi-Fi) — step successivo
- **Aggregatori** via **Deliveract** (Glovo/Deliveroo/Just Eat) — step successivo
- **Stampanti**: 2 comanda (cucina + cassa) ESC/POS + **Epson fiscale** (RT, Agenzia Entrate) — step successivo

## Stato
- Fase 1 (fondamenta): schema dati ordini → `supabase/migrations/0001_schema_ordini.sql`.

## Documenti
- Architettura: `docs/ARCHITETTURA.md`
- Specifica completa: nel progetto (SPEC - Sostituzione cassa Velocissimo).

> Progetto clean-room: reimplementiamo le funzionalità osservate, senza copiare
> il codice proprietario di 2Bit/WebApp né aggirarne le licenze.
