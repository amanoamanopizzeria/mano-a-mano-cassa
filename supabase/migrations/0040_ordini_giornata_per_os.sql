-- 0040 — L'export per ordine a 40 colonne, come il CSV «/weborder» di Velocissimo (24/10/2026).
-- mano-a-mano-os legge DUE cose (REA 15): la riga di vendita per articolo (0025, /api/vendite) e il
-- CSV per ordine da cui prende sala / interno / asporto, rider, zona, ritardo, e la piattaforma dal
-- TESTO della nota (GLOVO / DELIVEROO / JUST_EAT). Il giorno del cambio l'OS non deve accorgersene:
-- stesse 40 intestazioni, stesso vocabolario (Tipo, Origine, Pagamento, Stato), stesse date.
-- La funzione dà una riga jsonb per ordine con le chiavi nell'ordine del CSV; /api/ordini/csv la
-- scrive in CSV (virgola, UTF-8, campi quotati). Solo service_role: la chiama il server con la chiave.
create or replace function ordini_giornata(p_giornata date) returns setof jsonb
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  with o as (
    select o.*,
      row_number() over (order by o.creato_il) as progressivo,
      coalesce(o.ora_consegna, o.creato_il) as quando
    from ordine o
    where giornata_lavorativa(o.creato_il) = p_giornata
  ), c as (
    select distinct on (c.id_ordine) c.*
    from consegna c join o on o.id = c.id_ordine
    order by c.id_ordine, c.assegnata_il desc nulls last
  )
  select jsonb_build_object(
    '#', coalesce(o.numero_visibile, '#' || o.numero),
    '# Comanda', case when o.tipo = 'tavolo' then 0 else o.progressivo end,
    'Orario di ritiro', '',
    'Orario richiesto', to_char(o.quando at time zone 'Europe/Rome', 'HH24:MI:SS'),
    'Negozio', n.nome,
    'Stato', case o.stato::text
      when 'consegnato' then 'Consegnato' when 'ritirato' then 'Ritirato dal cliente' when 'annullato' then 'Annullato'
      when 'in_consegna' then 'In consegna' when 'pronto' then 'Pronto' when 'in_preparazione' then 'In preparazione'
      else 'Ricevuto' end,
    'Cliente', coalesce(cl.nome, o.nome_cliente, ''),
    'Rider', coalesce(r.nome, ''),
    'Tipo', case o.tipo::text when 'tavolo' then 'Tavolo' when 'banco' then 'Banco' when 'ritiro' then 'Ritiro' else 'Domicilio' end,
    'Tavolo', coalesce(t.numero, ''),
    'Sala', coalesce(t.zona, ''),
    'Cellulare', coalesce(cl.telefono, ''),
    'Cliente ', coalesce(cl.nome, o.nome_cliente, ''),
    'Data creazione', to_char(o.creato_il at time zone 'Europe/Rome', 'DD/MM/YYYY HH24:MI:SS'),
    'Data ed ora ordine', to_char(o.quando at time zone 'Europe/Rome', 'DD/MM/YYYY HH24:MI:SS'),
    'Data ordine', to_char(o.quando at time zone 'Europe/Rome', 'DD/MM/YYYY'),
    'Totale', o.totale,
    'Costo Consegna', case when coalesce(o.costo_consegna, 0) > 0 then o.costo_consegna::text else '' end,
    'Origine', case o.canale::text
      when 'app' then 'Da app' when 'web' then 'Da sito web' when 'totem' then 'da totem'
      when 'cassa' then 'Da PC' when 'telefono' then 'Da PC' else 'Da Deliverect' end,
    'Pagamento', case
      when o.pagato_online or o.canale::text in ('glovo', 'deliveroo', 'justeat', 'just_eat', 'deliverect') then 'Pagamento online'
      when o.pagamento = 'pos' and o.tipo = 'domicilio' then 'Bancomat alla consegna'
      when o.pagamento = 'pos' then 'Bancomat alla cassa'
      when o.tipo = 'domicilio' then 'Contanti alla consegna'
      else 'Contanti alla cassa' end,
    -- la piattaforma nella nota, finché l'OS la legge da lì (REA 15.2, trappola 2)
    'Note', trim(both from concat_ws(' ',
      case o.canale::text when 'glovo' then 'GLOVO' when 'deliveroo' then 'DELIVEROO' when 'justeat' then 'JUST_EAT' when 'just_eat' then 'JUST_EAT' else null end,
      case when o.canale::text in ('glovo', 'deliveroo', 'justeat', 'just_eat') then o.id_esterno else null end,
      o.note)),
    'Orario associazione rider', coalesce(to_char(c.assegnata_il at time zone 'Europe/Rome', 'HH24:MI:SS'), ''),
    'Orario di partenza', coalesce(to_char(c.ritirata_il at time zone 'Europe/Rome', 'HH24:MI:SS'), ''),
    'Orario di consegna effettivo', coalesce(to_char(c.consegnata_il at time zone 'Europe/Rome', 'HH24:MI:SS'), ''),
    'Distanza percorsa', '',
    'Ritardo consegna (s.)', case when c.consegnata_il is not null and o.ora_consegna is not null
      then round(extract(epoch from (c.consegnata_il - o.ora_consegna)))::text else '' end,
    'Ritardo consegna', '',
    'Coperti', case when o.tipo = 'tavolo' and t.coperti is not null then t.coperti::text else '' end,
    'Telefono', '',
    'Nazione', 'Italy',
    'Sconto', case when coalesce(o.sconto, 0) > 0 then (-o.sconto)::text else '' end,
    'CAP Negozio', '00198', 'Città Negozio', 'Roma', 'Provincia Negozio', 'RM',
    'Città', coalesce(i.citta, ''), 'Provincia', case when i.id is null then '' else 'RM' end,
    'Indirizzo', coalesce(i.via, ''), 'Civico', coalesce(i.civico, ''),
    'Zona', coalesce(z.nome, ''),
    'Gruppo di zone', case when o.tipo = 'domicilio' then 'LIMITAZIONE' else '' end
  )
  from o
  join negozio n on n.id = o.id_negozio
  left join cliente cl on cl.id = o.id_cliente
  left join tavolo t on t.id = o.id_tavolo
  left join indirizzo i on i.id = o.id_indirizzo
  left join zona z on z.id = coalesce(o.id_zona, i.id_zona)
  left join c on c.id_ordine = o.id
  left join rider r on r.id = c.id_rider
  order by o.creato_il;
$$;

revoke all on function ordini_giornata(date) from public;
grant execute on function ordini_giornata(date) to service_role;
