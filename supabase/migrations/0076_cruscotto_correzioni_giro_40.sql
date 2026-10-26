-- Correzioni del critico giro 40 (26/10/2026) alla 0075, nell'approvazione di Edoardo delle 22:20Z sui conti
-- dal database: una consegna arrivata molto prima del quarto chiesto non conta come puntuale (si conta a
-- parte, «in_anticipo»); le zone non contano Glovo e Deliveroo, che consegnano loro; la spesa a persona
-- si fa sul venduto dei soli ordini coi coperti (venduto_coperti); «da quanti giorni» con la data di Roma;
-- gli indici che servono a un anno di ordini.
create or replace function cruscotto(p_dal date, p_al date, p_canali text[] default null, p_tipi text[] default null)
returns jsonb
language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
declare
  v_da timestamptz := ((p_dal::timestamp + interval '6 hours') at time zone 'Europe/Rome');
  v_a timestamptz := (((p_al + 1)::timestamp + interval '6 hours') at time zone 'Europe/Rome');
  v jsonb;
begin
  if coalesce(ruolo_corrente() in ('admin', 'cassa'), false) is not true then
    raise exception 'solo la cassa' using errcode = '42501';
  end if;
  if p_al < p_dal or p_al - p_dal > 1100 then
    raise exception 'periodo non valido' using errcode = '22023';
  end if;

  with tutti as (
    select o.*,
           (((o.creato_il at time zone 'Europe/Rome') - interval '6 hours')::date) as serata,
           (coalesce(o.ora_consegna, o.creato_il) at time zone 'Europe/Rome') as ora_roma
    from ordine o
    where o.creato_il >= v_da and o.creato_il < v_a
      and (p_canali is null or o.canale::text = any(p_canali))
      and (p_tipi is null or o.tipo::text = any(p_tipi))
  ),
  o as (select * from tutti where stato <> 'annullato'),
  -- le consegne nostre (non Glovo/Deliveroo, che consegnano loro) con ora chiesta e consegna fatta
  dom as (
    select o.id, o.id_zona, k.id_rider, k.consegnata_il,
           greatest(0, extract(epoch from k.consegnata_il - (to_timestamp(floor(extract(epoch from o.ora_consegna) / 900) * 900) + interval '30 minutes')) / 60) as ritardo,
           -- puntuale = dentro la mezz'ora scelta; molto prima (oltre 15 minuti) non è puntuale, è un dato da guardare
           k.consegnata_il >= to_timestamp(floor(extract(epoch from o.ora_consegna) / 900) * 900) - interval '15 minutes' as non_prima,
           extract(epoch from k.consegnata_il - coalesce(k.in_viaggio_il, k.ritirata_il)) / 60 as viaggio
    from o join consegna k on k.id_ordine = o.id
    where o.tipo = 'domicilio' and o.canale not in ('glovo', 'deliveroo')
      and o.ora_consegna is not null and k.consegnata_il is not null
  ),
  righe as (
    select r.id_ordine, r.id_prodotto, r.descrizione, r.quantita, r.id_riga_padre,
           r.quantita * (r.prezzo_unit + coalesce((select sum((x->>'prezzo')::numeric) from jsonb_array_elements(case when jsonb_typeof(r.variazioni) = 'array' then r.variazioni else '[]'::jsonb end) x), 0)) as euro
    from ordine_riga r join o on o.id = r.id_ordine
  ),
  cli as (
    select o.id_cliente, count(*) as n, sum(o.totale) as euro,
           exists (select 1 from ordine p where p.id_cliente = o.id_cliente and p.stato <> 'annullato' and p.creato_il < v_da) as tornato
    from o where o.id_cliente is not null group by o.id_cliente
  )
  select jsonb_build_object(
    'dal', p_dal, 'al', p_al,
    'totali', (select jsonb_build_object(
        'venduto', coalesce(sum(o.totale), 0), 'ordini', count(*),
        'annullati', (select count(*) from tutti where stato = 'annullato'),
        'annullati_euro', (select coalesce(sum(totale), 0) from tutti where stato = 'annullato'),
        'medio', coalesce(round(avg(o.totale), 2), 0),
        'coperti', coalesce(sum(o.coperti), 0),
        'sconti', coalesce(sum(o.sconto), 0),
        'consegna', coalesce(sum(o.costo_consegna), 0),
        'clienti', count(distinct o.id_cliente),
        'puntuali', (select count(*) filter (where ritardo = 0 and non_prima) from dom),
        'in_anticipo', (select count(*) filter (where not non_prima) from dom),
        'venduto_coperti', coalesce(sum(o.totale) filter (where coalesce(o.coperti, 0) > 0), 0),
        'misurate', (select count(*) from dom),
        'ritardo_medio', (select round(avg(ritardo)::numeric, 1) from dom),
        'viaggio_medio', (select round(avg(viaggio)::numeric, 1) from dom where viaggio between 0 and 120))
      from o),
    'per_canale', (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'n', n, 'euro', euro) order by euro desc), '[]')
      from (select canale::text k, count(*) n, sum(totale) euro from o group by 1) x),
    'per_tipo', (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'n', n, 'euro', euro) order by euro desc), '[]')
      from (select tipo::text k, count(*) n, sum(totale) euro from o group by 1) x),
    'per_pagamento', (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'n', n, 'euro', euro) order by euro desc), '[]')
      from (select case when pagato_online then 'online' when pagamento = 'pos' then 'POS' when pagamento = 'contanti' then 'contanti' else 'non indicato' end k,
                   count(*) n, sum(totale) euro from o group by 1) x),
    'per_stato', (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'n', n) order by n desc), '[]')
      from (select stato::text k, count(*) n from tutti group by 1) x),
    'per_ora', (select coalesce(jsonb_agg(jsonb_build_object('h', h, 'n', n, 'euro', euro) order by (h + 18) % 24), '[]')
      from (select extract(hour from ora_roma)::int h, count(*) n, sum(totale) euro from o group by 1) x),
    'per_giorno_settimana', (select coalesce(jsonb_agg(jsonb_build_object('d', d, 'n', n, 'euro', euro, 'sere', sere) order by d), '[]')
      from (select extract(isodow from serata)::int d, count(*) n, sum(totale) euro, count(distinct serata) sere from o group by 1) x),
    'per_giorno', (select coalesce(jsonb_agg(jsonb_build_object('g', g, 'n', n, 'euro', euro) order by g), '[]')
      from (select serata g, count(*) n, sum(totale) euro from o group by 1) x),
    'per_mese', (select coalesce(jsonb_agg(jsonb_build_object('m', m, 'n', n, 'euro', euro) order by m), '[]')
      from (select to_char(serata, 'YYYY-MM') m, count(*) n, sum(totale) euro from o group by 1) x),
    -- i pezzi contano anche le pizze dentro i menu; gli euro sono quelli della riga (dentro un menu è il
    -- supplemento, di solito 0: il prezzo sta sul menu)
    'prodotti', (select coalesce(jsonb_agg(jsonb_build_object('nome', nome, 'categoria', categoria, 'pezzi', pezzi, 'nei_menu', nei_menu, 'euro', euro) order by euro desc, pezzi desc), '[]')
      from (select coalesce(p.nome, r.descrizione) nome, max(c.nome) categoria, sum(r.quantita) pezzi,
                   sum(r.quantita) filter (where r.id_riga_padre is not null) nei_menu, sum(r.euro) euro
            from righe r left join prodotto p on p.id = r.id_prodotto left join categoria c on c.id = p.id_categoria
            group by 1 order by sum(r.euro) desc, sum(r.quantita) desc limit 60) x),
    'categorie', (select coalesce(jsonb_agg(jsonb_build_object('nome', nome, 'pezzi', pezzi, 'euro', euro) order by euro desc), '[]')
      from (select coalesce(c.nome, 'Senza categoria') nome, sum(r.quantita) pezzi, sum(r.euro) euro
            from righe r left join prodotto p on p.id = r.id_prodotto left join categoria c on c.id = p.id_categoria
            group by 1) x),
    'sconti', (select coalesce(jsonb_agg(jsonb_build_object('voce', voce, 'n', n, 'euro', euro) order by euro desc), '[]')
      from (select 'Sconto a mano' || coalesce(' · ' || sconto_motivo, '') voce, count(*) n, sum(sconto_manuale) euro
              from o where sconto_manuale > 0 group by sconto_motivo
            union all
            select 'Coupon ' || upper(codice_coupon), count(*), sum(greatest(0, sconto - coalesce(sconto_manuale, 0)))
              from o where codice_coupon is not null group by upper(codice_coupon)) x),
    'rider', (select coalesce(jsonb_agg(jsonb_build_object('nome', nome, 'consegne', consegne, 'euro', euro, 'contanti', contanti,
                'in_ritardo', in_ritardo, 'ritardo_medio', ritardo_medio, 'viaggio_medio', viaggio_medio, 'annullate', annullate) order by consegne desc), '[]')
      from (select coalesce(ri.nome, 'senza rider') nome,
                   count(*) filter (where k.stato = 'consegnata') consegne,
                   coalesce(sum(t.totale) filter (where k.stato = 'consegnata'), 0) euro,
                   coalesce(sum(t.totale) filter (where k.stato = 'consegnata' and not t.pagato_online and coalesce(t.pagamento, '') <> 'pos'), 0) contanti,
                   (select count(*) from dom d where d.id_rider is not distinct from k.id_rider and d.ritardo > 0) in_ritardo,
                   (select round(avg(d.ritardo)::numeric, 1) from dom d where d.id_rider is not distinct from k.id_rider) ritardo_medio,
                   (select round(avg(d.viaggio)::numeric, 1) from dom d where d.id_rider is not distinct from k.id_rider and d.viaggio between 0 and 120) viaggio_medio,
                   count(*) filter (where k.stato = 'annullata' or t.stato = 'annullato') annullate
            from tutti t join consegna k on k.id_ordine = t.id left join rider ri on ri.id = k.id_rider
            group by k.id_rider, ri.nome) x),
    'zone', (select coalesce(jsonb_agg(jsonb_build_object('nome', nome, 'n', n, 'euro', euro, 'medio', medio, 'consegna', consegna, 'ritardo_medio', ritardo_medio) order by n desc), '[]')
      from (select coalesce(z.nome, 'senza zona') nome, count(*) n, sum(o.totale) euro, round(avg(o.totale), 2) medio,
                   sum(o.costo_consegna) consegna,
                   (select round(avg(d.ritardo)::numeric, 1) from dom d where d.id_zona is not distinct from o.id_zona) ritardo_medio
            from o left join zona z on z.id = o.id_zona where o.tipo = 'domicilio' and o.canale not in ('glovo', 'deliveroo') group by o.id_zona, z.nome) x),
    'clienti', (select jsonb_build_object(
        'con_scheda', count(*), 'nuovi', count(*) filter (where not tornato), 'ricorrenti', count(*) filter (where tornato),
        'senza_scheda', (select count(*) from o where id_cliente is null),
        'migliori', (select coalesce(jsonb_agg(jsonb_build_object('nome', coalesce(cl.nome, cl.telefono), 'telefono', cl.telefono, 'n', c2.n, 'euro', c2.euro) order by c2.euro desc), '[]')
                     from (select * from cli order by euro desc limit 20) c2 join cliente cl on cl.id = c2.id_cliente))
      from cli),
    'punti', (select jsonb_build_object(
        'dati', coalesce(sum(m.punti) filter (where m.punti > 0), 0),
        'spesi', coalesce(-sum(m.punti) filter (where m.punti < 0 and m.motivo not like 'annullato%'), 0),
        'tolti_annulli', coalesce(-sum(m.punti) filter (where m.punti < 0 and m.motivo like 'annullato%'), 0))
      from cliente_punti_movimento m where m.creato_il >= v_da and m.creato_il < v_a),
    'coupon', (select jsonb_build_object(
        'emessi', (select count(*) from coupon_emesso e where e.ottenuto_il >= v_da and e.ottenuto_il < v_a),
        'usati', (select count(*) from coupon_emesso e where e.usato_il >= v_da and e.usato_il < v_a),
        'ordini_con_coupon', (select count(*) from o where codice_coupon is not null)))
  ) into v;
  return v;
end $$;
grant execute on function cruscotto(date, date, text[], text[]) to authenticated;

-- «Clienti da riconquistare» di Velocissimo, ma solo chi ha ordinato davvero almeno p_min volte (REA 24
-- §24.3: la loro tabella mescola iscritti all'app senza ordini). Con lo storico che parte dal passaggio.
create or replace function clienti_da_riconquistare(p_giorni int default 45, p_min int default 2)
returns table (id uuid, nome text, telefono text, ordini bigint, speso numeric, ultimo timestamptz, giorni int, consenso boolean)
language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
begin
  if coalesce(ruolo_corrente() in ('admin', 'cassa'), false) is not true then
    raise exception 'solo la cassa' using errcode = '42501';
  end if;
  return query
    select c.id, c.nome, c.telefono, count(*), sum(o.totale), max(o.creato_il),
           ((now() at time zone 'Europe/Rome')::date - (max(o.creato_il) at time zone 'Europe/Rome')::date)::int, c.consenso_marketing
    from ordine o join cliente c on c.id = o.id_cliente
    where o.stato <> 'annullato'
    group by c.id
    having count(*) >= p_min and max(o.creato_il) < now() - make_interval(days => p_giorni)
    order by sum(o.totale) desc
    limit 300;
end $$;
grant execute on function clienti_da_riconquistare(int, int) to authenticated;

create index if not exists ordine_riga_id_ordine on ordine_riga(id_ordine);
create index if not exists consegna_id_ordine on consegna(id_ordine);
create index if not exists ordine_id_cliente on ordine(id_cliente);
create index if not exists ordine_creato_il on ordine(creato_il);
