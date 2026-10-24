-- 0044 — Le «informazioni» della giornata per l'OS, complete (24/10/2026; REA 15.3–15.4).
-- A vendite_giornata_totali mancavano tre cose che l'OS legge dall'API di Velocissimo
-- (normalizzaInformazioni): i pagamenti per metodo (`pagamenti[]` con metodo e totale), i coperti
-- (`numeroCoperti`) e gli sconti (`importoScontato`). E la chiusura della sera, che Velocissimo
-- non manda mai al cloud, qui si dà per metodo E per dove (cassa / rider / online / piattaforme),
-- più il borsello per rider: è quello che la Chiusura dell'OS chiede allo staff ogni sera.
create or replace function vendite_giornata_totali(p_giornata date)
returns jsonb
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  with o as (
    select o.*, c.id_rider, r.nome as rider_nome, c.saldata_il,
      case when o.pagato_online then 'online'
           when o.canale::text in ('glovo', 'deliveroo', 'justeat') then 'piattaforma'
           when o.pagamento = 'pos' then 'pos'
           else 'contanti' end as metodo
    from ordine o
    left join lateral (select c.id_rider, c.saldata_il from consegna c where c.id_ordine = o.id order by c.assegnata_il desc nulls last limit 1) c on true
    left join rider r on r.id = c.id_rider
    where o.stato <> 'annullato' and giornata_lavorativa(coalesce(o.ora_consegna, o.creato_il)) = p_giornata
  )
  select jsonb_build_object(
    'giornata', p_giornata,
    'numeroDocumenti', (select count(distinct v."Id") from v_vendite_giornata v where v."dataChiusura" = p_giornata),
    'numeroCoperti', (select coalesce(sum(t.coperti), 0) from ordine x join tavolo t on t.id = x.id_tavolo
                       where x.stato <> 'annullato' and giornata_lavorativa(coalesce(x.ora_consegna, x.creato_il)) = p_giornata),
    'importoScontato', (select coalesce(sum(o.sconto), 0) from o),
    'totale', (select coalesce(sum(o.totale), 0) from o),
    'totaleNetto', (select coalesce(sum(v."prezzoVendutoNettoIva"), 0) from v_vendite_giornata v where v."dataChiusura" = p_giornata),
    'iva', (select coalesce(jsonb_object_agg(a.aliquota::text, a.imposta), '{}'::jsonb) from (
              select v."AliquotaIva" as aliquota, sum(v."prezzoVenduto" - v."prezzoVendutoNettoIva") as imposta
              from v_vendite_giornata v where v."dataChiusura" = p_giornata group by 1) a),
    -- come l'API di Velocissimo: metodo + totale (+ quanti documenti)
    'pagamenti', (select coalesce(jsonb_agg(jsonb_build_object('metodo', p.metodo, 'totale', p.tot, 'numeroDocumenti', p.n) order by p.metodo), '[]'::jsonb)
                  from (select o.metodo, sum(o.totale) as tot, count(*) as n from o group by 1) p),
    -- la chiusura della sera: dove stanno i soldi
    'incassato', jsonb_build_object(
      'contantiInCassa', (select coalesce(sum(o.totale), 0) from o where o.metodo = 'contanti' and o.tipo <> 'domicilio'),
      'posInCassa', (select coalesce(sum(o.totale), 0) from o where o.metodo = 'pos' and o.tipo <> 'domicilio'),
      'contantiAiRider', (select coalesce(sum(o.totale), 0) from o where o.metodo = 'contanti' and o.tipo = 'domicilio'),
      'posAiRider', (select coalesce(sum(o.totale), 0) from o where o.metodo = 'pos' and o.tipo = 'domicilio'),
      'onlineNostro', (select coalesce(sum(o.totale), 0) from o where o.metodo = 'online'),
      'piattaforme', (select coalesce(sum(o.totale), 0) from o where o.metodo = 'piattaforma'),
      'ancoraAperti', (select coalesce(sum(o.totale), 0) from o where o.stato not in ('consegnato', 'ritirato'))),
    'perRider', (select coalesce(jsonb_agg(jsonb_build_object('rider', q.rider_nome, 'consegne', q.n, 'totale', q.tot,
                    'contanti', q.contanti, 'giaPagate', q.pagate, 'saldate', q.saldate) order by q.rider_nome), '[]'::jsonb)
                 from (select o.rider_nome, count(*) as n, sum(o.totale) as tot,
                              sum(case when o.metodo = 'contanti' then o.totale else 0 end) as contanti,
                              sum(case when o.metodo <> 'contanti' then o.totale else 0 end) as pagate,
                              count(*) filter (where o.saldata_il is not null) as saldate
                       from o where o.tipo = 'domicilio' and o.id_rider is not null group by 1) q),
    'perTipo', (select coalesce(jsonb_object_agg(t.tipo, t.tot), '{}'::jsonb) from (
              select o.tipo::text as tipo, sum(o.totale) as tot from o group by 1) t),
    'perOrigine', (select coalesce(jsonb_object_agg(t.canale, t.tot), '{}'::jsonb) from (
              select o.canale::text as canale, sum(o.totale) as tot from o group by 1) t)
  )
  where e_staff() or auth.role() = 'service_role'
$$;
