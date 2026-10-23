-- Mano a Mano Cassa — 0025: le vendite nella forma di Velocissimo, per mano-a-mano-os (23/10/2026).
-- Dal REA (docs/rea/05_API_E_INTEGRAZIONI.md §5.2, 06_DATI.md §6.7): l'OS legge oggi il CSV Velocissimo,
-- una riga per articolo, e domani potrebbe leggere GET /vendite (`RigaVendita`). Qui la stessa riga
-- esce dalla cassa nuova: così la Chiusura dell'OS non cambia quando cambia il POS.
-- Regole copiate: una «giornata lavorativa» alla volta (dopo mezzanotte resta la sera prima: il taglio
-- è alle 06:00 di Roma); solo ordini non annullati; le variazioni sono righe separate
-- (tipoArticolo = variazione, con idElementoPadre); i prezzi lordi e netti IVA; le scelte di un menu
-- (0023) sono righe a prezzo 0 sotto il menu, come i loro «menu_choices».

create or replace function giornata_lavorativa(p_quando timestamptz) returns date
language sql immutable as $$
  select ((p_quando at time zone 'Europe/Rome') - interval '6 hours')::date
$$;

create or replace view v_vendite_giornata as
with righe as (
  -- la riga dell'articolo
  select o.id as id_ordine, r.id as id_riga, null::uuid as id_riga_padre_var, r.id_riga_padre,
         r.id_prodotto, r.descrizione as articolo, r.quantita, r.prezzo_unit as prezzo_unit,
         'articolo'::text as tipo_articolo, null::text as tipo_variazione, r.destinazione, r.note
  from ordine o join ordine_riga r on r.id_ordine = o.id
  union all
  -- ogni variazione come riga a sé, sotto la sua riga
  select o.id, r.id, r.id, r.id_riga_padre,
         r.id_prodotto, v->>'nome', r.quantita, coalesce((v->>'prezzo')::numeric, 0),
         'variazione', case v->>'tipo' when 'rimozione' then 'rimozione' else 'aggiunta' end, r.destinazione, null
  from ordine o join ordine_riga r on r.id_ordine = o.id, jsonb_array_elements(r.variazioni) v
)
select
  o.id                                                   as "Id",
  o.numero                                               as numero,
  'cassa-nuova'::text                                    as cassa,
  giornata_lavorativa(coalesce(o.ora_consegna, o.creato_il)) as "dataChiusura",
  (o.creato_il at time zone 'Europe/Rome')::date         as "dataScontrino",
  (o.creato_il at time zone 'Europe/Rome')::time(0)      as "oraScontrino",
  o.totale                                               as "totaleScontrino",
  case when o.pagato_online then 'online' when o.pagamento = 'pos' then 'pos' when o.pagamento = 'contanti' then 'contanti'
       when o.canale in ('glovo', 'deliveroo', 'justeat') then 'piattaforma' else null end as "metodoPagamento",
  case o.tipo when 'tavolo' then 'consumazione' else o.tipo::text end as "venditaTipo",
  case o.canale when 'app' then 'app' when 'web' then 'sito' when 'totem' then 'totem' when 'telefono' then 'centralino'
                when 'cassa' then 'manuale' else 'deliverect' end as "venditaOrigine",
  o.canale::text                                         as canale,
  o.stato::text                                          as stato,
  c.id_rider                                             as "riderId",
  rd.nome                                                as rider,
  case x.tipo_articolo when 'variazione' then 'VAR' else 'DET' end || left(replace(x.id_riga::text, '-', ''), 12) as "idElemento",
  x.id_prodotto                                          as "idArticolo",
  p.id_velocissimo                                       as "idArticoloVelocissimo",
  x.tipo_articolo                                        as "tipoArticolo",
  x.tipo_variazione                                      as "tipoVariazione",
  case when x.tipo_articolo = 'variazione' then x.id_riga else x.id_riga_padre end as "idElementoPadre",
  coalesce(p.aliquota_iva, 10)                           as "AliquotaIva",
  x.articolo                                             as articolo,
  cat.nome                                               as categoria,
  x.prezzo_unit * x.quantita                             as "prezzoVenduto",
  round(x.prezzo_unit * x.quantita / (1 + coalesce(p.aliquota_iva, 10) / 100.0), 2) as "prezzoVendutoNettoIva",
  round(case when x.tipo_articolo = 'articolo' and x.id_riga_padre is null then p.prezzo * x.quantita else x.prezzo_unit * x.quantita end
        / (1 + coalesce(p.aliquota_iva, 10) / 100.0), 2) as "prezzoListinoNettoIva",
  x.quantita                                             as quantita,
  0::numeric                                             as "scontoInRiga",
  o.costo_consegna                                       as "costoConsegna",
  o.id_negozio
from ordine o
join righe x on x.id_ordine = o.id
left join prodotto p on p.id = x.id_prodotto
left join categoria cat on cat.id = p.id_categoria
left join consegna c on c.id_ordine = o.id
left join rider rd on rd.id = c.id_rider
where o.stato <> 'annullato';

-- la vista eredita le policy delle tabelle (security invoker): la legge chi legge gli ordini, cioè lo staff.
-- Per l'OS (service_role, dal server, una giornata per volta come GET /vendite):
create or replace function vendite_giornata(p_giornata date)
returns setof v_vendite_giornata
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select * from v_vendite_giornata v
  where v."dataChiusura" = p_giornata and (e_staff() or auth.role() = 'service_role')
  order by v."oraScontrino", v.numero, v."idElementoPadre" nulls first, v."tipoArticolo" desc
$$;
grant execute on function vendite_giornata(date) to authenticated, service_role;

-- i totali della giornata, come `informazioni` di /vendite: totale, netto, IVA per aliquota, documenti
create or replace function vendite_giornata_totali(p_giornata date)
returns jsonb
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select jsonb_build_object(
    'giornata', p_giornata,
    'numeroDocumenti', (select count(distinct v."Id") from v_vendite_giornata v where v."dataChiusura" = p_giornata),
    'totale', (select coalesce(sum(o.totale), 0) from ordine o where o.stato <> 'annullato' and giornata_lavorativa(coalesce(o.ora_consegna, o.creato_il)) = p_giornata),
    'totaleNetto', (select coalesce(sum(v."prezzoVendutoNettoIva"), 0) from v_vendite_giornata v where v."dataChiusura" = p_giornata),
    'iva', (select coalesce(jsonb_object_agg(a.aliquota::text, a.imposta), '{}'::jsonb) from (
              select v."AliquotaIva" as aliquota, sum(v."prezzoVenduto" - v."prezzoVendutoNettoIva") as imposta
              from v_vendite_giornata v where v."dataChiusura" = p_giornata group by 1) a),
    'perTipo', (select coalesce(jsonb_object_agg(t.tipo, t.tot), '{}'::jsonb) from (
              select o.tipo::text as tipo, sum(o.totale) as tot from ordine o
              where o.stato <> 'annullato' and giornata_lavorativa(coalesce(o.ora_consegna, o.creato_il)) = p_giornata group by 1) t),
    'perOrigine', (select coalesce(jsonb_object_agg(t.canale, t.tot), '{}'::jsonb) from (
              select o.canale::text as canale, sum(o.totale) as tot from ordine o
              where o.stato <> 'annullato' and giornata_lavorativa(coalesce(o.ora_consegna, o.creato_il)) = p_giornata group by 1) t)
  )
  where e_staff() or auth.role() = 'service_role'
$$;
grant execute on function vendite_giornata_totali(date) to authenticated, service_role;
