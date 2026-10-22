-- Mano a Mano Cassa — Fase 15: gli ordini scadenzati per quarto d'ora (23/10/2026, Edoardo).
-- La cassa vede il giorno come una scaletta di fasce: in ogni quarto d'ora gli ordini che
-- cadono lì (sull'ora di consegna richiesta, o di creazione se non c'è), con cliente, tipo,
-- stato, pizze e totale. Si legge insieme a capacita_giorno, che dà i posti della fascia.
create or replace function ordini_per_fascia(p_negozio uuid, p_giorno date)
returns table (
  fascia        time,
  id            uuid,
  numero        bigint,
  tipo          tipo_ordine,
  canale        canale_ordine,
  stato         stato_ordine,
  ora_consegna  timestamptz,
  creato_il     timestamptz,
  totale        numeric,
  pizze         int,
  cliente       text,
  telefono      text,
  indirizzo     text,
  note          text
)
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select
    (to_timestamp(floor(extract(epoch from coalesce(o.ora_consegna, o.creato_il)) / 900) * 900) at time zone 'Europe/Rome')::time as fascia,
    o.id, o.numero, o.tipo, o.canale, o.stato, o.ora_consegna, o.creato_il, o.totale,
    coalesce((select sum(r.quantita) from ordine_riga r where r.id_ordine = o.id and r.destinazione = 'cucina'), 0)::int as pizze,
    c.nome, c.telefono,
    case when i.id is null then null else trim(concat_ws(' ', i.via, i.civico)) end as indirizzo,
    o.note
  from ordine o
  left join cliente c on c.id = o.id_cliente
  left join indirizzo i on i.id = o.id_indirizzo
  where o.id_negozio = p_negozio
    and (coalesce(o.ora_consegna, o.creato_il) at time zone 'Europe/Rome')::date = p_giorno
    and e_staff()
  order by 1, o.numero;
$$;
revoke all on function ordini_per_fascia(uuid, date) from public;
grant execute on function ordini_per_fascia(uuid, date) to authenticated;
