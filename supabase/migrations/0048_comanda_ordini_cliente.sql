-- La comanda stampata dice quanti ordini ha fatto il cliente, questo compreso: «[N ORD.]» come 2Bit
-- (critico giro 21). Solo comanda_per_stampa: la pagina della comanda resta com'è.
create or replace function comanda_per_stampa(p_id uuid) returns jsonb
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select jsonb_build_object(
    'id', o.id, 'numero', o.numero, 'numero_visibile', o.numero_visibile, 'canale', o.canale, 'tipo', o.tipo, 'stato', o.stato,
    'creato_il', o.creato_il, 'ora_consegna', o.ora_consegna, 'totale', o.totale, 'note', o.note,
    'pagamento', o.pagamento, 'costo_consegna', o.costo_consegna, 'paga_con', o.paga_con, 'pagato_online', o.pagato_online,
    'sconto', o.sconto, 'codice_coupon', o.codice_coupon,
    'modificato_il', o.modificato_il, 'stampe', o.stampe, 'righe_prima', o.righe_prima,
    'cliente', coalesce(c.nome, o.nome_cliente), 'telefono', c.telefono, 'cliente_note', c.note,
    'ordini_cliente', case when o.id_cliente is null then null else
      (select count(*) from ordine x where x.id_cliente = o.id_cliente and x.stato <> 'annullato' and x.creato_il <= o.creato_il) end,
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
  where o.id = p_id and auth.role() = 'service_role';
$$;
