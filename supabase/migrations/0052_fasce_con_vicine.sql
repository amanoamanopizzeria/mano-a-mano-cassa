-- La doppia (Edoardo, 25/10/2026): «se squilla il telefono, una volta aperta la scheda del cliente,
-- deve già suggerirti con un colore differente: guarda, qui ho già una consegna lì molto vicino».
-- Due ordini restano due consegne (non si riduce niente): si segnala soltanto, quarto d'ora per
-- quarto d'ora, la consegna già presa più vicina all'indirizzo di chi chiama. Qui la distanza è in
-- linea d'aria; i minuti in macchina li dice Google (/api/indirizzi/vicine) solo per le poche vicine.
create or replace function fasce_con_vicine(p_negozio uuid, p_giorno date, p_lat double precision, p_lng double precision)
returns table (ora time, pizze_max int, pizze_occupate int, consegne_max int, consegne_occupate int,
  bloccata_produzione boolean, bloccata_consegne boolean,
  vicina_metri int, vicina_numero text, vicina_id uuid, vicina_lat double precision, vicina_lng double precision)
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  with dom as (
    select o.id, o.numero_visibile,
           (to_timestamp(floor(extract(epoch from coalesce(o.ora_consegna, o.creato_il)) / 900) * 900) at time zone 'Europe/Rome')::time as ora,
           i.lat, i.lng,
           (2 * 6371000 * asin(sqrt(power(sin(radians(i.lat - p_lat) / 2), 2)
              + cos(radians(p_lat)) * cos(radians(i.lat)) * power(sin(radians(i.lng - p_lng) / 2), 2))))::int as metri
    from ordine o
    join indirizzo i on i.id = o.id_indirizzo
    where e_staff() and o.id_negozio = p_negozio and o.tipo = 'domicilio' and o.stato not in ('annullato', 'consegnato')
      and i.lat is not null and p_lat is not null
      and (coalesce(o.ora_consegna, o.creato_il) at time zone 'Europe/Rome')::date = p_giorno
  ),
  migliore as (
    select distinct on (ora) * from dom order by ora, metri
  )
  select c.ora, c.pizze_max, c.pizze_occupate, c.consegne_max, c.consegne_occupate, c.bloccata_produzione, c.bloccata_consegne,
         m.metri, m.numero_visibile, m.id, m.lat, m.lng
  from capacita_giorno(p_negozio, p_giorno) c
  left join migliore m on m.ora = c.ora
  where e_staff()
  order by c.ora
$$;
revoke all on function fasce_con_vicine(uuid, date, double precision, double precision) from public, anon;
grant execute on function fasce_con_vicine(uuid, date, double precision, double precision) to authenticated;
