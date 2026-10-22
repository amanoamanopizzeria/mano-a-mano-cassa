-- Mano a Mano Cassa — Fase 5: capacità per quarto d'ora.
-- Ogni giorno lo staff dice quanti pizzaioli e quanti rider ci sono.
-- Da lì la capacità di ogni quarto d'ora si calcola da sola:
--   pizze  = la regola del numero di pizzaioli (es. 1 pizzaiolo: 10–12 pizze ogni 15 min)
--   consegne = un rider per ogni rider disponibile (1 consegna per rider ogni 15 min)
-- Si può bloccare a mano una fascia (produzione o consegne) per un giorno.
-- Tabelle nuove: non toccano ordini esistenti.

-- ========== Regole di capacità (per numero di pizzaioli) ==========
create table regola_capacita (
  id_negozio     uuid not null references negozio(id) on delete cascade,
  pizzaioli      int  not null check (pizzaioli >= 0),
  pizze_min      int  not null check (pizze_min >= 0),
  pizze_max      int  not null check (pizze_max >= pizze_min),
  primary key (id_negozio, pizzaioli)
);
alter table regola_capacita enable row level security;

-- ========== Turni del giorno ==========
create table turno_giorno (
  id_negozio     uuid not null references negozio(id) on delete cascade,
  giorno         date not null,
  pizzaioli      int  not null default 0 check (pizzaioli >= 0),
  rider          int  not null default 0 check (rider >= 0),
  aggiornato_il  timestamptz not null default now(),
  primary key (id_negozio, giorno)
);
alter table turno_giorno enable row level security;

-- ========== Blocchi manuali di una fascia ==========
create table fascia_bloccata (
  id_negozio  uuid not null references negozio(id) on delete cascade,
  giorno      date not null,
  ora         time not null,
  tipo        text not null check (tipo in ('produzione','consegne')),
  motivo      text,
  primary key (id_negozio, giorno, ora, tipo)
);
alter table fascia_bloccata enable row level security;

-- ========== RLS: solo lo staff legge e scrive ==========
create policy regola_capacita_staff on regola_capacita for all
  using (e_staff()) with check (e_staff());
create policy turno_giorno_staff on turno_giorno for all
  using (e_staff()) with check (e_staff());
create policy fascia_bloccata_staff on fascia_bloccata for all
  using (e_staff()) with check (e_staff());

-- ========== Regole iniziali (dalle indicazioni di Edoardo) ==========
-- Possono cambiare: sono righe, si modificano dall'app.
insert into regola_capacita (id_negozio, pizzaioli, pizze_min, pizze_max)
select n.id, v.pizzaioli, v.pizze_min, v.pizze_max
from negozio n
cross join (values (1, 10, 12), (2, 18, 20), (3, 35, 35)) as v(pizzaioli, pizze_min, pizze_max)
on conflict do nothing;

-- ========== Capacità di ogni quarto d'ora di un giorno ==========
-- Ritorna 52 righe (11:00–23:45) con: pizze massime, pizze già ordinate,
-- consegne massime, consegne già assegnate, e se la fascia è bloccata.
-- Il giorno è quello locale (Europe/Rome).
create or replace function capacita_giorno(p_negozio uuid, p_giorno date)
returns table (
  ora               time,
  inizio            timestamptz,
  pizze_max         int,
  pizze_occupate    int,
  consegne_max      int,
  consegne_occupate int,
  bloccata_produzione boolean,
  bloccata_consegne   boolean
)
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  with slot as (
    select
      gs::time as ora,
      (gs at time zone 'Europe/Rome') as inizio
    from generate_series(
      p_giorno::timestamp + time '11:00',
      p_giorno::timestamp + time '23:45',
      interval '15 minutes'
    ) as gs
  ),
  turno as (
    select coalesce(t.pizzaioli, 0) as pizzaioli, coalesce(t.rider, 0) as rider
    from (select 1) x
    left join turno_giorno t on t.id_negozio = p_negozio and t.giorno = p_giorno
  ),
  regola as (
    select r.pizze_max, r.pizze_min
    from turno tu
    left join regola_capacita r on r.id_negozio = p_negozio and r.pizzaioli = tu.pizzaioli
  ),
  -- pizze ordinate per fascia: righe destinate alla cucina, sull'ora di consegna (o di creazione)
  pizze as (
    select
      to_timestamp(floor(extract(epoch from coalesce(o.ora_consegna, o.creato_il)) / 900) * 900) as fascia,
      sum(r.quantita) as n
    from ordine o
    join ordine_riga r on r.id_ordine = o.id
    where o.id_negozio = p_negozio
      and o.stato <> 'annullato'
      and r.destinazione = 'cucina'
    group by 1
  ),
  consegne as (
    select
      to_timestamp(floor(extract(epoch from coalesce(o.ora_consegna, o.creato_il)) / 900) * 900) as fascia,
      count(*) as n
    from ordine o
    where o.id_negozio = p_negozio
      and o.stato <> 'annullato'
      and o.tipo = 'domicilio'
    group by 1
  )
  select
    s.ora,
    s.inizio,
    coalesce((select pizze_max from regola), 0),
    coalesce(p.n, 0)::int,
    (select rider from turno),
    coalesce(c.n, 0)::int,
    exists (select 1 from fascia_bloccata b
            where b.id_negozio = p_negozio and b.giorno = p_giorno and b.ora = s.ora and b.tipo = 'produzione'),
    exists (select 1 from fascia_bloccata b
            where b.id_negozio = p_negozio and b.giorno = p_giorno and b.ora = s.ora and b.tipo = 'consegne')
  from slot s
  left join pizze p on p.fascia = s.inizio
  left join consegne c on c.fascia = s.inizio
  order by s.ora
$$;

revoke all on function capacita_giorno(uuid, date) from public;
grant execute on function capacita_giorno(uuid, date) to authenticated;

-- ========== Realtime: la cassa vede subito i cambi di turno e di blocco ==========
alter publication supabase_realtime add table turno_giorno, fascia_bloccata;
