-- 0042 — La capacità di Velocissimo per giorno della settimana, quando nessuno ha messo i turni
-- (24/10/2026; REA 13, scoperta 5). Oggi i SOLD OUT dell'app li decide questa tabella di
-- Velocissimo: 10 pizze a quarto d'ora lun–mer, 18 gio–ven, 22 sab–dom, una consegna per quarto
-- d'ora. La nostra capacità parte dai pizzaioli del giorno (/cassa/capacita, regola_capacita) e
-- ricade sull'ultimo giorno inserito; ma se non c'è MAI stato un turno, dava 0 posti e tutto
-- «pieno» (critico giro 10). Qui, senza nessun turno, vale la tabella di Velocissimo. Un turno
-- con 0 pizzaioli messo apposta (chiusi) resta 0: il ripiego scatta solo quando non si sa niente.
create or replace function capacita_giorno(p_negozio uuid, p_giorno date)
returns table(ora time, inizio timestamptz, pizze_max int, pizze_occupate int, consegne_max int, consegne_occupate int, bloccata_produzione boolean, bloccata_consegne boolean)
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  with apertura as (
    select coalesce(min(o.dalle), time '11:00') as dalle, coalesce(max(o.alle), time '23:45') as alle
    from orario o
    where o.id_negozio = p_negozio and o.giorno_settimana = extract(dow from p_giorno)::int
  ),
  slot as (
    select gs::time as ora, (gs at time zone 'Europe/Rome') as inizio
    from apertura a,
         generate_series(p_giorno::timestamp + a.dalle, p_giorno::timestamp + a.alle, interval '15 minutes') as gs
  ),
  turno as (
    select coalesce(t.pizzaioli, u.pizzaioli, 0) as pizzaioli, coalesce(t.rider, u.rider, 0) as rider,
           (t.pizzaioli is not null or u.pizzaioli is not null) as conosciuto
    from (select 1) x
    left join turno_giorno t on t.id_negozio = p_negozio and t.giorno = p_giorno
    left join lateral (select pizzaioli, rider from turno_giorno where id_negozio = p_negozio and giorno < p_giorno order by giorno desc limit 1) u on true
  ),
  regola as (
    select r.pizze_max, r.pizze_min
    from turno tu
    left join regola_capacita r on r.id_negozio = p_negozio and r.pizzaioli = tu.pizzaioli
  ),
  -- la tabella di Velocissimo (dow: 0 domenica … 6 sabato)
  velocissimo as (
    select case when extract(dow from p_giorno)::int in (1, 2, 3) then 10
                when extract(dow from p_giorno)::int in (4, 5) then 18
                else 22 end as pizze, 1 as consegne
  ),
  pizze as (
    select to_timestamp(floor(extract(epoch from coalesce(o.ora_consegna, o.creato_il)) / 900) * 900) as fascia, sum(r.quantita) as n
    from ordine o
    join ordine_riga r on r.id_ordine = o.id
    left join prodotto p on p.id = r.id_prodotto
    left join categoria c on c.id = p.id_categoria
    where o.id_negozio = p_negozio and o.stato <> 'annullato'
      and coalesce(c.impegna_forno, r.destinazione = 'cucina')
    group by 1
  ),
  consegne as (
    select to_timestamp(floor(extract(epoch from coalesce(o.ora_consegna, o.creato_il)) / 900) * 900) as fascia, count(*) as n
    from ordine o
    where o.id_negozio = p_negozio and o.stato <> 'annullato' and o.tipo = 'domicilio'
    group by 1
  )
  select
    s.ora,
    s.inizio,
    coalesce(
      (select massimo from fascia_capacita f where f.id_negozio = p_negozio and f.giorno = p_giorno and f.ora = s.ora and f.tipo = 'produzione'),
      (select pizze_max from regola),
      case when (select conosciuto from turno) then 0 else (select pizze from velocissimo) end),
    coalesce(p.n, 0)::int,
    coalesce(
      (select massimo from fascia_capacita f where f.id_negozio = p_negozio and f.giorno = p_giorno and f.ora = s.ora and f.tipo = 'consegne'),
      case when (select conosciuto from turno) then (select rider from turno) else (select consegne from velocissimo) end),
    coalesce(c.n, 0)::int,
    exists (select 1 from fascia_bloccata b where b.id_negozio = p_negozio and b.giorno = p_giorno and b.ora = s.ora and b.tipo = 'produzione'),
    exists (select 1 from fascia_bloccata b where b.id_negozio = p_negozio and b.giorno = p_giorno and b.ora = s.ora and b.tipo = 'consegne')
  from slot s
  left join pizze p on p.fascia = s.inizio
  left join consegne c on c.fascia = s.inizio
  order by s.ora
$$;
