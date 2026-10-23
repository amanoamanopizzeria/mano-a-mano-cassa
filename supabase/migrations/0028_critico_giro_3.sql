-- Mano a Mano Cassa — 0028: le correzioni dal giro 3 del critico (23/10/2026, docs/critico/2026-10-23-giro-3-cassa-dopo-rea.md).
-- 1) «Un preordine per domani viene rifiutato: pieno, ci stanno ancora 0 pizze»: domani non aveva i pizzaioli
--    in /cassa/capacita, quindi 0 posti. Un giorno senza turno prende l'ULTIMO turno impostato (lo standard
--    finché Edoardo non lo cambia), e la risposta dice anche `massimo`, così la cassa distingue «pieno» da
--    «non impostato».
-- 2) Il totem sa se la cucina è aperta: totem_menu porta `orario` di oggi (apertura), così lo dice all'avvio
--    e non dopo venti tocchi.

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
  -- il turno del giorno; se non c'è, l'ultimo impostato prima (lo standard)
  turno as (
    select coalesce(t.pizzaioli, u.pizzaioli, 0) as pizzaioli, coalesce(t.rider, u.rider, 0) as rider
    from (select 1) x
    left join turno_giorno t on t.id_negozio = p_negozio and t.giorno = p_giorno
    left join lateral (select pizzaioli, rider from turno_giorno where id_negozio = p_negozio and giorno < p_giorno order by giorno desc limit 1) u on true
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
      'libere', greatest(v_cap.pizze_max - v_cap.pizze_occupate, 0), 'massimo', v_cap.pizze_max, 'giorno', v_giorno);
  end if;
  if p_tipo = 'domicilio' and (v_cap.bloccata_consegne or v_cap.consegne_occupate + 1 > v_cap.consegne_max) then
    return jsonb_build_object('esito', 'pieno', 'motivo', 'consegne', 'slot', v_slot, 'massimo', v_cap.consegne_max, 'giorno', v_giorno);
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

create or replace function totem_menu(p_chiave text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
declare v_negozio uuid; v_orario record; v_oggi date := (now() at time zone 'Europe/Rome')::date; v_ora time := (now() at time zone 'Europe/Rome')::time;
begin
  if not totem_chiave_valida(p_chiave) then raise exception 'totem non attivato' using errcode = '42501'; end if;
  select id into v_negozio from negozio order by creato_il limit 1;
  select o.dalle, o.alle into v_orario from orario o
   where o.id_negozio = v_negozio and o.giorno_settimana = extract(dow from v_oggi)::int and o.tipo = 'apertura';
  return jsonb_build_object(
    'categorie', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'nome', nome, 'ordine', ordine, 'colore', colore, 'destinazione', destinazione, 'visibile_totem', visibile_totem) order by ordine) from categoria where visibile_totem), '[]'::jsonb),
    'prodotti',  coalesce((select jsonb_agg(jsonb_build_object('id', id, 'id_categoria', id_categoria, 'nome', nome, 'descrizione', descrizione, 'prezzo', prezzo, 'prezzo_tavolo', prezzo_tavolo, 'foto_url', foto_url, 'visibile_totem', visibile_totem, 'incluso', incluso) order by ordine, nome) from prodotto where attivo and visibile_totem), '[]'::jsonb),
    'varianti',  coalesce((select jsonb_agg(jsonb_build_object('id', id, 'nome', nome, 'prezzo', prezzo, 'gruppo', gruppo, 'id_categoria', id_categoria) order by gruppo, nome) from variazione), '[]'::jsonb),
    'gruppi',    coalesce((select jsonb_agg(jsonb_build_object('id_categoria', id_categoria, 'gruppo', gruppo, 'ordine', ordine, 'min_n', min_n, 'max_n', max_n, 'max_gratis', max_gratis) order by id_categoria, ordine) from categoria_gruppo_variazione), '[]'::jsonb),
    'pacchetti', coalesce((select jsonb_agg(jsonb_build_object('id', g.id, 'id_pacchetto', g.id_pacchetto, 'etichetta', g.etichetta, 'quantita', g.quantita, 'ordine', g.ordine,
                   'scelte', (select coalesce(jsonb_agg(s.id_prodotto), '[]'::jsonb) from pacchetto_scelta s where s.id_gruppo = g.id)) order by g.id_pacchetto, g.ordine) from pacchetto_gruppo g), '[]'::jsonb),
    'orario', case when v_orario.dalle is null then null else jsonb_build_object('dalle', v_orario.dalle, 'alle', v_orario.alle,
                   'aperto', v_ora >= v_orario.dalle and v_ora <= v_orario.alle) end
  );
end $$;
