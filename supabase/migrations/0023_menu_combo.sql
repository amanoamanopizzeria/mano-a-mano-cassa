-- Mano a Mano Cassa — 0023: i menu combo come in Velocissimo (23/10/2026).
-- Dal REA (docs/rea/01_BACKOFFICE.md §1.5, 02_APP_CLIENTE.md §2.2): sette menu a prezzo fisso
-- (Puccia 7,90 · Classico X1 13 / X2 24 / X3 33 · Speciale X1 15 / X2 28 / X3 39), ognuno con
-- gruppi di scelta OBBLIGATORI (SCEGLI LA PIZZA/PUCCIA n–n, SCEGLI LA BIBITA 1–1, bibita grande
-- sui X2/X3) e i fritti in omaggio che nell'app non compaiono da nessuna parte (difetto n. 10:
-- «la cucina li dimentica, il cliente li reclama»). Qui le scelte diventano RIGHE FIGLIE
-- dell'ordine (id_riga_padre), così le pizze del menu contano nella capacità del forno e vanno in
-- comanda sotto il menu; i fritti inclusi sono una riga di testo del prodotto (`incluso`) stampata
-- in comanda. Le pizze del menu accettano gli extra a pagamento, come online.
-- In più: `categoria.impegna_forno` (il flag «usa per impegno forno» del back-office): finora
-- un supplì contava come una pizza nelle fasce.

-- 1) i gruppi di scelta di un menu e i prodotti ammessi
create table if not exists pacchetto_gruppo (
  id            uuid primary key default gen_random_uuid(),
  id_pacchetto  uuid not null references prodotto(id) on delete cascade,
  etichetta     text not null,                       -- «Scegli la pizza», «Scegli la bibita»
  quantita      int  not null default 1 check (quantita > 0),
  ordine        int  not null default 0
);
create table if not exists pacchetto_scelta (
  id_gruppo    uuid not null references pacchetto_gruppo(id) on delete cascade,
  id_prodotto  uuid not null references prodotto(id) on delete cascade,
  primary key (id_gruppo, id_prodotto)
);
alter table pacchetto_gruppo enable row level security;
alter table pacchetto_scelta enable row level security;
create policy pacchetto_gruppo_read  on pacchetto_gruppo for select using (auth.role() = 'authenticated');
create policy pacchetto_gruppo_write on pacchetto_gruppo for all using (e_staff()) with check (e_staff());
create policy pacchetto_scelta_read  on pacchetto_scelta for select using (auth.role() = 'authenticated');
create policy pacchetto_scelta_write on pacchetto_scelta for all using (e_staff()) with check (e_staff());

alter table prodotto add column if not exists incluso text;                       -- «1 supplì, 1 crocchetta, 3 mozzarelline»
alter table categoria add column if not exists impegna_forno boolean not null default true;
alter table ordine_riga add column if not exists id_riga_padre uuid references ordine_riga(id) on delete cascade;
create index if not exists ordine_riga_padre on ordine_riga(id_riga_padre);

update categoria set impegna_forno = false
where nome in ('Fritti', 'Dolci', 'Bevande', 'Birre', 'La nostra cantina', 'Insalate', 'Friselle', 'Menù');

-- 2) i sette menu (id Velocissimo 204, 210–215), per nome: niente id generati nel file
update prodotto set incluso = case id_velocissimo
  when 210 then '1 supplì, 1 crocchetta, 3 mozzarelline'
  when 213 then '1 supplì, 1 crocchetta, 3 mozzarelline'
  when 211 then '2 supplì, 2 crocchette, 3 mozzarelline'
  when 214 then '2 supplì, 2 crocchette, 3 mozzarelline'
  when 212 then '3 supplì, 3 crocchette, 6 mozzarelline'
  when 215 then '3 supplì, 3 crocchette, 6 mozzarelline'
  else incluso end
where id_velocissimo in (210, 211, 212, 213, 214, 215);

-- gruppi: (menu, etichetta, quantità, ordine, quali prodotti)
with menu as (
  select p.id, p.id_velocissimo from prodotto p where p.id_velocissimo in (204, 210, 211, 212, 213, 214, 215)
),
def as (
  select * from (values
    (204, 'Scegli la puccia', 1, 0, 'pucce'),       (204, 'Scegli la bibita', 1, 1, 'bibita'),
    (210, 'Scegli la pizza o la puccia', 1, 0, 'classiche_pucce'), (210, 'Scegli la bibita', 1, 1, 'bibita'),
    (211, 'Scegli le 2 pizze o pucce', 2, 0, 'classiche_pucce'),   (211, 'Scegli la bibita grande', 1, 1, 'bibita_grande'),
    (212, 'Scegli le 3 pizze o pucce', 3, 0, 'classiche_pucce'),   (212, 'Scegli la bibita grande', 1, 1, 'bibita_grande'),
    (213, 'Scegli la pizza speciale', 1, 0, 'speciali'),           (213, 'Scegli la bibita', 1, 1, 'bibita'),
    (214, 'Scegli le 2 pizze speciali', 2, 0, 'speciali'),         (214, 'Scegli la bibita grande', 1, 1, 'bibita_grande'),
    (215, 'Scegli le 3 pizze speciali', 3, 0, 'speciali'),         (215, 'Scegli la bibita grande', 1, 1, 'bibita_grande')
  ) as v(idv, etichetta, quantita, ordine, insieme)
),
ins as (
  insert into pacchetto_gruppo (id_pacchetto, etichetta, quantita, ordine)
  select m.id, d.etichetta, d.quantita, d.ordine
  from def d join menu m on m.id_velocissimo = d.idv
  where not exists (select 1 from pacchetto_gruppo g where g.id_pacchetto = m.id and g.etichetta = d.etichetta)
  returning id, id_pacchetto, etichetta
)
insert into pacchetto_scelta (id_gruppo, id_prodotto)
select i.id, p.id
from ins i
join menu m on m.id = i.id_pacchetto
join def d on d.idv = m.id_velocissimo and d.etichetta = i.etichetta
join prodotto p on p.attivo and (
     (d.insieme = 'pucce'           and p.id_categoria = (select id from categoria where nome = 'Pucce pugliesi'))
  or (d.insieme = 'classiche_pucce' and p.id_categoria in (select id from categoria where nome in ('Pizze classiche', 'Pucce pugliesi')))
  or (d.insieme = 'speciali'        and p.id_categoria = (select id from categoria where nome = 'Pizze speciali'))
  or (d.insieme = 'bibita'          and p.id_velocissimo in (206, 208, 176, 177, 178, 179, 182))
  or (d.insieme = 'bibita_grande'   and p.id_velocissimo in (209, 205, 180, 181, 185))
)
on conflict do nothing;

-- 3) l'ordine: le righe possono portare `figlie` (le scelte del menu); le pizze del forno si contano
--    sulle categorie che lo impegnano (figlie comprese), non più su «destinazione = cucina»
create or replace function accetta_ordine_esterno(
  p_negozio uuid, p_canale canale_ordine, p_tipo tipo_ordine, p_id_esterno text,
  p_ora timestamptz, p_note text, p_righe jsonb
) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_ordine ordine;
  v_slot timestamptz;
  v_giorno date;
  v_cap record;
  v_pizze numeric;
  r jsonb; f jsonb; v_id_riga uuid;
begin
  if p_id_esterno is not null then
    select * into v_ordine from ordine
    where id_negozio = p_negozio and canale = p_canale and id_esterno = p_id_esterno;
    if found then
      return jsonb_build_object('esito', 'duplicato', 'id', v_ordine.id, 'numero', v_ordine.numero);
    end if;
  end if;

  if p_righe is null or jsonb_typeof(p_righe) <> 'array' or jsonb_array_length(p_righe) = 0 then
    return jsonb_build_object('esito', 'errore', 'motivo', 'nessuna riga');
  end if;

  -- quante pizze (righe + figlie) impegnano il forno
  with tutte as (
    select x.riga from jsonb_array_elements(p_righe) x(riga)
    union all
    select y.riga from jsonb_array_elements(p_righe) x(riga), jsonb_array_elements(coalesce(x.riga->'figlie', '[]'::jsonb)) y(riga)
  )
  select coalesce(sum(coalesce((t.riga->>'quantita')::numeric, 1)), 0) into v_pizze
  from tutte t
  left join prodotto p on p.id = nullif(t.riga->>'id_prodotto', '')::uuid
  left join categoria c on c.id = p.id_categoria
  where coalesce(c.impegna_forno, coalesce(t.riga->>'destinazione', 'cucina') = 'cucina');

  v_slot := to_timestamp(floor(extract(epoch from coalesce(p_ora, now())) / 900) * 900);
  v_giorno := (v_slot at time zone 'Europe/Rome')::date;

  select * into v_cap from capacita_giorno(p_negozio, v_giorno) where inizio = v_slot;
  if v_cap is null then
    return jsonb_build_object('esito', 'fuori_orario', 'slot', v_slot);
  end if;
  if v_cap.bloccata_produzione and v_pizze > 0 then
    return jsonb_build_object('esito', 'pieno', 'motivo', 'produzione bloccata', 'slot', v_slot);
  end if;
  if v_pizze > 0 and v_cap.pizze_occupate + v_pizze > v_cap.pizze_max then
    return jsonb_build_object('esito', 'pieno', 'motivo', 'pizze', 'slot', v_slot,
      'libere', greatest(v_cap.pizze_max - v_cap.pizze_occupate, 0));
  end if;
  if p_tipo = 'domicilio' and (v_cap.bloccata_consegne or v_cap.consegne_occupate + 1 > v_cap.consegne_max) then
    return jsonb_build_object('esito', 'pieno', 'motivo', 'consegne', 'slot', v_slot);
  end if;

  insert into ordine (id_negozio, canale, tipo, ora_consegna, note, id_esterno)
  values (p_negozio, p_canale, p_tipo, p_ora, p_note, p_id_esterno)
  returning * into v_ordine;

  for r in select * from jsonb_array_elements(p_righe) loop
    insert into ordine_riga (id_ordine, id_prodotto, descrizione, quantita, prezzo_unit, variazioni, note, destinazione)
    values (v_ordine.id, nullif(r->>'id_prodotto', '')::uuid, r->>'descrizione', coalesce((r->>'quantita')::numeric, 1),
            coalesce((r->>'prezzo_unit')::numeric, 0), coalesce(r->'variazioni', '[]'::jsonb), r->>'note',
            coalesce(r->>'destinazione', 'cucina'))
    returning id into v_id_riga;
    for f in select * from jsonb_array_elements(coalesce(r->'figlie', '[]'::jsonb)) loop
      insert into ordine_riga (id_ordine, id_prodotto, descrizione, quantita, prezzo_unit, variazioni, note, destinazione, id_riga_padre)
      values (v_ordine.id, nullif(f->>'id_prodotto', '')::uuid, f->>'descrizione',
              coalesce((f->>'quantita')::numeric, 1) * coalesce((r->>'quantita')::numeric, 1),
              coalesce((f->>'prezzo_unit')::numeric, 0), coalesce(f->'variazioni', '[]'::jsonb), f->>'note',
              coalesce(f->>'destinazione', 'cucina'), v_id_riga);
    end loop;
  end loop;

  update ordine
     set totale = (
       select coalesce(sum((prezzo_unit + coalesce((
         select sum((v->>'prezzo')::numeric) from jsonb_array_elements(variazioni) v), 0)) * quantita), 0)
       from ordine_riga where id_ordine = v_ordine.id)
   where id = v_ordine.id
   returning * into v_ordine;

  return jsonb_build_object('esito', 'accettato', 'id', v_ordine.id, 'numero', v_ordine.numero, 'totale', v_ordine.totale);
end $$;

-- 4) le fasce contano il forno come sopra
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

-- 5) la comanda: ogni riga porta il suo id e il padre; il menu porta anche il testo incluso
create or replace function comanda_ordine(p_id uuid)
returns jsonb
language sql security definer set search_path = public, extensions, pg_temp stable as $$
  select jsonb_build_object(
    'id', o.id, 'numero', o.numero, 'canale', o.canale, 'tipo', o.tipo, 'stato', o.stato,
    'creato_il', o.creato_il, 'ora_consegna', o.ora_consegna, 'totale', o.totale, 'note', o.note,
    'pagamento', o.pagamento, 'costo_consegna', o.costo_consegna,
    'cliente', coalesce(c.nome, o.nome_cliente), 'telefono', c.telefono,
    'tavolo', t.numero,
    'indirizzo', case when i.id is null then null else
      jsonb_build_object('via', i.via, 'civico', i.civico, 'cap', i.cap, 'citta', i.citta, 'zona', z.nome) end,
    'righe', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'id_riga_padre', r.id_riga_padre,
        'descrizione', r.descrizione, 'quantita', r.quantita, 'variazioni', r.variazioni, 'note', r.note,
        'destinazione', r.destinazione, 'incluso', p.incluso,
        'reparto', coalesce(cat.nome, case r.destinazione when 'cucina' then 'Cucina' else 'Cassa' end),
        'reparto_ordine', coalesce(cat.ordine, 999)
      ) order by coalesce(cat.ordine, 999), r.descrizione)
      from ordine_riga r
      left join prodotto p on p.id = r.id_prodotto
      left join categoria cat on cat.id = p.id_categoria
      where r.id_ordine = o.id), '[]'::jsonb)
  )
  from ordine o
  left join cliente c on c.id = o.id_cliente
  left join tavolo t on t.id = o.id_tavolo
  left join indirizzo i on i.id = o.id_indirizzo
  left join zona z on z.id = i.id_zona
  where o.id = p_id and e_staff();
$$;

-- 6) il totem legge anche i menu
create or replace function totem_menu(p_chiave text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
begin
  if not totem_chiave_valida(p_chiave) then raise exception 'totem non attivato' using errcode = '42501'; end if;
  return jsonb_build_object(
    'categorie', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'nome', nome, 'ordine', ordine, 'colore', colore, 'destinazione', destinazione, 'visibile_totem', visibile_totem) order by ordine) from categoria where visibile_totem), '[]'::jsonb),
    'prodotti',  coalesce((select jsonb_agg(jsonb_build_object('id', id, 'id_categoria', id_categoria, 'nome', nome, 'descrizione', descrizione, 'prezzo', prezzo, 'prezzo_tavolo', prezzo_tavolo, 'foto_url', foto_url, 'visibile_totem', visibile_totem, 'incluso', incluso) order by ordine) from prodotto where attivo and visibile_totem), '[]'::jsonb),
    'varianti',  coalesce((select jsonb_agg(jsonb_build_object('id', id, 'nome', nome, 'prezzo', prezzo, 'gruppo', gruppo, 'id_categoria', id_categoria) order by gruppo, nome) from variazione), '[]'::jsonb),
    'gruppi',    coalesce((select jsonb_agg(jsonb_build_object('id_categoria', id_categoria, 'gruppo', gruppo, 'ordine', ordine, 'min_n', min_n, 'max_n', max_n, 'max_gratis', max_gratis) order by id_categoria, ordine) from categoria_gruppo_variazione), '[]'::jsonb),
    'pacchetti', coalesce((select jsonb_agg(jsonb_build_object('id', g.id, 'id_pacchetto', g.id_pacchetto, 'etichetta', g.etichetta, 'quantita', g.quantita, 'ordine', g.ordine,
                   'scelte', (select coalesce(jsonb_agg(s.id_prodotto), '[]'::jsonb) from pacchetto_scelta s where s.id_gruppo = g.id)) order by g.id_pacchetto, g.ordine) from pacchetto_gruppo g), '[]'::jsonb)
  );
end $$;
