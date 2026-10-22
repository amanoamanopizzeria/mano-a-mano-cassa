-- Mano a Mano Cassa — Fase 16: il planner delle fasce come nel Velocissimo nuovo (23/10/2026).
-- Edoardo: «ti avevo fatto vedere un video di Velocissimo per capire come scadenzata a quarto
-- d'ora, consegne, non consegne: terrei praticamente la stessa impaginazione».
-- Nel video ogni cella (fascia × reparto) ha «occupate/massimo» e toccandola si cambia il
-- massimo solo per quella fascia («3/2, 1 reali»). Qui: la tabella delle eccezioni per fascia,
-- che vince sulla regola dei pizzaioli e sul numero di rider.
create table if not exists fascia_capacita (
  id_negozio  uuid not null references negozio(id) on delete cascade,
  giorno      date not null,
  ora         time not null,
  tipo        text not null check (tipo in ('produzione','consegne')),
  massimo     int  not null check (massimo >= 0),
  aggiornata_il timestamptz not null default now(),
  primary key (id_negozio, giorno, ora, tipo)
);
alter table fascia_capacita enable row level security;
create policy fascia_capacita_staff on fascia_capacita for all using (e_staff()) with check (e_staff());
alter publication supabase_realtime add table fascia_capacita;

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
    select gs::time as ora, (gs at time zone 'Europe/Rome') as inizio
    from generate_series(p_giorno::timestamp + time '11:00', p_giorno::timestamp + time '23:45', interval '15 minutes') as gs
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
  pizze as (
    select to_timestamp(floor(extract(epoch from coalesce(o.ora_consegna, o.creato_il)) / 900) * 900) as fascia, sum(r.quantita) as n
    from ordine o join ordine_riga r on r.id_ordine = o.id
    where o.id_negozio = p_negozio and o.stato <> 'annullato' and r.destinazione = 'cucina'
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
      (select pizze_max from regola), 0),
    coalesce(p.n, 0)::int,
    coalesce(
      (select massimo from fascia_capacita f where f.id_negozio = p_negozio and f.giorno = p_giorno and f.ora = s.ora and f.tipo = 'consegne'),
      (select rider from turno)),
    coalesce(c.n, 0)::int,
    exists (select 1 from fascia_bloccata b where b.id_negozio = p_negozio and b.giorno = p_giorno and b.ora = s.ora and b.tipo = 'produzione'),
    exists (select 1 from fascia_bloccata b where b.id_negozio = p_negozio and b.giorno = p_giorno and b.ora = s.ora and b.tipo = 'consegne')
  from slot s
  left join pizze p on p.fascia = s.inizio
  left join consegne c on c.fascia = s.inizio
  order by s.ora
$$;

-- Imposta (o toglie, con null) il massimo di una fascia; 0 = chiusa.
create or replace function imposta_fascia(p_negozio uuid, p_giorno date, p_ora time, p_tipo text, p_massimo int)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not e_staff() then raise exception 'solo lo staff' using errcode = '42501'; end if;
  if p_massimo is null then
    delete from fascia_capacita where id_negozio = p_negozio and giorno = p_giorno and ora = p_ora and tipo = p_tipo;
  else
    insert into fascia_capacita (id_negozio, giorno, ora, tipo, massimo) values (p_negozio, p_giorno, p_ora, p_tipo, p_massimo)
    on conflict (id_negozio, giorno, ora, tipo) do update set massimo = excluded.massimo, aggiornata_il = now();
  end if;
end $$;
revoke all on function imposta_fascia(uuid, date, time, text, int) from public;
grant execute on function imposta_fascia(uuid, date, time, text, int) to authenticated;
