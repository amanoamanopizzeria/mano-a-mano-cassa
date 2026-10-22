-- Comanda cartacea per reparto (Edoardo, 23/10/2026: «la cucina legge tutte le pizze, divise
-- pizza, fritti, dolci… le categorie; per ora non vogliono schermo in cucina, comande cartacee»).
-- Una funzione sola che dà tutto quello che serve a stampare: l'ordine, chi lo ritira, dove va,
-- e le righe col reparto (la categoria del prodotto) nell'ordine del menù.
create or replace function comanda_ordine(p_id uuid)
returns jsonb
language sql security definer set search_path = public, extensions, pg_temp stable as $$
  select jsonb_build_object(
    'id', o.id, 'numero', o.numero, 'canale', o.canale, 'tipo', o.tipo, 'stato', o.stato,
    'creato_il', o.creato_il, 'ora_consegna', o.ora_consegna, 'totale', o.totale, 'note', o.note,
    'pagamento', o.pagamento,
    'cliente', coalesce(c.nome, o.nome_cliente), 'telefono', c.telefono,
    'tavolo', t.numero,
    'indirizzo', case when i.id is null then null else
      jsonb_build_object('via', i.via, 'civico', i.civico, 'cap', i.cap, 'citta', i.citta, 'zona', z.nome) end,
    'righe', coalesce((
      select jsonb_agg(jsonb_build_object(
        'descrizione', r.descrizione, 'quantita', r.quantita, 'variazioni', r.variazioni, 'note', r.note,
        'destinazione', r.destinazione,
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
revoke all on function comanda_ordine(uuid) from public;
grant execute on function comanda_ordine(uuid) to authenticated;
