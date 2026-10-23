-- Mano a Mano Cassa — 0022: gli orari per tipo di carrello e i preordini dalla cassa (23/10/2026).
-- Dal REA (docs/rea/01_BACKOFFICE.md §1.1): in Velocissimo gli orari sono quattro editor, uno per
-- tipo di carrello — apertura 18:30–22:45, consegna 19:00–22:30, ritiro 19:00–22:45, banco vuoto —
-- sette giorni su sette, con l'attesa minima (15 min) e i preordini fino a 7 giorni. Qui, finora,
-- le fasce partivano dalle 11:00 scritte nel codice (critico giro 1, lavoro 10) e un ordine telefonico
-- «per domani alle 20» non si poteva prendere (lavoro 3).

-- 1) gli orari del negozio, giorno della settimana × tipo (0 = domenica … 6 = sabato, come extract(dow))
create table if not exists orario (
  id_negozio        uuid not null references negozio(id) on delete cascade,
  giorno_settimana  int  not null check (giorno_settimana between 0 and 6),
  tipo              text not null check (tipo in ('apertura', 'domicilio', 'ritiro', 'banco')),
  dalle             time not null,
  alle              time not null,
  primary key (id_negozio, giorno_settimana, tipo)
);
alter table orario enable row level security;
create policy orario_read  on orario for select using (auth.role() = 'authenticated');
create policy orario_write on orario for all using (e_staff()) with check (e_staff());

alter table negozio add column if not exists attesa_min_domicilio int not null default 15;
alter table negozio add column if not exists attesa_min_ritiro    int not null default 15;
alter table negozio add column if not exists preordini_giorni     int not null default 7;

insert into orario (id_negozio, giorno_settimana, tipo, dalle, alle)
select n.id, d.g, t.tipo, t.dalle, t.alle
from negozio n
cross join generate_series(0, 6) as d(g)
cross join (values ('apertura', time '18:30', time '22:45'),
                   ('domicilio', time '19:00', time '22:30'),
                   ('ritiro',    time '19:00', time '22:45')) as t(tipo, dalle, alle)
on conflict do nothing;

-- 2) gli orari di un giorno, per la cassa (quando si può prendere un ordine)
create or replace function orari_giorno(p_negozio uuid, p_giorno date)
returns table (tipo text, dalle time, alle time)
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select o.tipo, o.dalle, o.alle
  from orario o
  where o.id_negozio = p_negozio and o.giorno_settimana = extract(dow from p_giorno)::int
  order by o.tipo
$$;
revoke all on function orari_giorno(uuid, date) from public;
grant execute on function orari_giorno(uuid, date) to authenticated;

-- 3) le fasce del giorno partono dall'apertura e finiscono alla chiusura (prima: 11:00–23:45 fisse)
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

-- 4) l'ordine dalla cassa con giorno e ora («per domani alle 20:15»): ordine_da_cassa3.
--    Un nome nuovo e non un parametro in più su ordine_da_cassa2, così PostgREST non ha due firme da scegliere.
--    Fuori dall'orario del tipo (domicilio 19:00–22:30, ritiro 19:00–22:45) risponde `fuori_orario`
--    con gli orari, così la cassa lo dice in italiano.
create or replace function ordine_da_cassa3(
  p_tipo tipo_ordine, p_righe jsonb, p_id_tavolo uuid default null, p_id_cliente uuid default null,
  p_note text default null, p_id_indirizzo uuid default null, p_ora timestamptz default null
) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_negozio uuid; v_res jsonb; v_id uuid;
  v_ind indirizzo; v_zona zona; v_sub numeric;
  v_ora timestamptz; v_giorno date; v_orario record; v_ora_locale time;
begin
  if not e_staff() then raise exception 'solo lo staff' using errcode = '42501'; end if;
  select id_negozio into v_negozio from profilo where id = auth.uid();
  if v_negozio is null then raise exception 'profilo senza negozio'; end if;

  v_ora := coalesce(p_ora, now());
  if v_ora < now() - interval '15 minutes' then
    return jsonb_build_object('esito', 'ora_passata');
  end if;
  v_giorno := (v_ora at time zone 'Europe/Rome')::date;
  v_ora_locale := (v_ora at time zone 'Europe/Rome')::time;

  -- orario del tipo: domicilio e ritiro hanno il loro, banco e tavolo seguono l'apertura
  select o.dalle, o.alle into v_orario
  from orario o
  where o.id_negozio = v_negozio and o.giorno_settimana = extract(dow from v_giorno)::int
    and o.tipo = case when p_tipo in ('domicilio', 'ritiro') then p_tipo::text else 'apertura' end;
  if v_orario.dalle is not null and (v_ora_locale < v_orario.dalle or v_ora_locale > v_orario.alle) then
    return jsonb_build_object('esito', 'fuori_orario', 'dalle', v_orario.dalle, 'alle', v_orario.alle, 'giorno', v_giorno);
  end if;

  if p_tipo = 'domicilio' then
    if p_id_indirizzo is null then return jsonb_build_object('esito', 'manca_indirizzo'); end if;
    select * into v_ind from indirizzo where id = p_id_indirizzo;
    if v_ind.id is null then return jsonb_build_object('esito', 'manca_indirizzo'); end if;
    if v_ind.id_zona is null then return jsonb_build_object('esito', 'fuori_zona'); end if;
    select * into v_zona from zona where id = v_ind.id_zona;
    select coalesce(sum((coalesce((r->>'prezzo_unit')::numeric, 0) + coalesce((
      select sum((v->>'prezzo')::numeric) from jsonb_array_elements(coalesce(r->'variazioni', '[]'::jsonb)) v), 0))
      * coalesce((r->>'quantita')::numeric, 1)), 0)
      into v_sub from jsonb_array_elements(p_righe) r;
    if v_sub < v_zona.minimo_ordine then
      return jsonb_build_object('esito', 'minimo', 'minimo', v_zona.minimo_ordine, 'subtotale', v_sub);
    end if;
  end if;

  v_res := accetta_ordine_esterno(v_negozio, 'cassa', p_tipo, null, p_ora, p_note, p_righe);
  if v_res->>'esito' = 'accettato' then
    v_id := (v_res->>'id')::uuid;
    update ordine set id_tavolo = p_id_tavolo, id_cliente = p_id_cliente where id = v_id;
    if p_id_tavolo is not null then
      update tavolo set stato = 'occupato', aperto_il = coalesce(aperto_il, now()) where id = p_id_tavolo;
    end if;
    if p_tipo = 'domicilio' then
      update ordine set id_indirizzo = v_ind.id, id_zona = v_zona.id, costo_consegna = v_zona.costo_consegna,
                        totale = totale + v_zona.costo_consegna
       where id = v_id;
      v_res := v_res || jsonb_build_object('costo_consegna', v_zona.costo_consegna, 'zona', v_zona.nome,
                                           'totale', (select totale from ordine where id = v_id));
    end if;
  end if;
  return v_res;
end $$;
grant execute on function ordine_da_cassa3(tipo_ordine, jsonb, uuid, uuid, text, uuid, timestamptz) to authenticated;
-- (il revoke da public resta da fare dalla console: col connettore un revoke resta appeso. La funzione
--  controlla e_staff() alla prima riga, quindi un anon che la chiama riceve 42501 comunque.)
