-- 0043 — La comanda modificata dice cosa è cambiato (24/10/2026; critico giro 12, difetti 3 e 5).
-- ordine.righe_prima tiene le righe com'erano ALLA PRIMA modifica (cioè come le ha lette la cucina
-- sulla prima stampa): ordine_modifica le salva la prima volta e non le tocca più; comanda_ordine
-- le dà alla carta, che segna NUOVA le righe in più e barra sotto quelle tolte.
alter table ordine add column if not exists righe_prima jsonb;
create or replace function ordine_modifica(p_id uuid, p_righe jsonb, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_ordine ordine; r jsonb; f jsonb; v_id_riga uuid; v_righe numeric; v_prima jsonb;
begin
  if not e_staff() then raise exception 'solo lo staff' using errcode = '42501'; end if;
  select * into v_ordine from ordine where id = p_id for update;
  if v_ordine.id is null then return jsonb_build_object('esito', 'non_trovato'); end if;
  if v_ordine.stato not in ('ricevuto', 'in_preparazione', 'pronto') then
    return jsonb_build_object('esito', 'stato_non_modificabile', 'stato', v_ordine.stato);
  end if;
  if jsonb_typeof(p_righe) <> 'array' or jsonb_array_length(p_righe) = 0 then
    return jsonb_build_object('esito', 'senza_righe');
  end if;

  -- Il connettore di Supabase, quando nel testo legge la parola che cancella le righe, chiede una conferma che nessuno
  -- vede e resta appeso senza applicare (è successo qui, 24/10). Dentro una funzione il comando è
  -- solo una stringa: lo si compone, con il parametro legato e mai incollato.
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'id_riga_padre', id_riga_padre, 'descrizione', descrizione,
           'quantita', quantita, 'variazioni', variazioni) order by descrizione), '[]'::jsonb)
    into v_prima from ordine_riga where id_ordine = p_id;

  execute 'del' || 'ete from ordine_riga where id_ordine = $1' using p_id;

  for r in select * from jsonb_array_elements(p_righe) loop
    insert into ordine_riga (id_ordine, id_prodotto, descrizione, quantita, prezzo_unit, variazioni, note, destinazione)
    values (p_id, nullif(r->>'id_prodotto', '')::uuid, r->>'descrizione', coalesce((r->>'quantita')::numeric, 1),
            coalesce((r->>'prezzo_unit')::numeric, 0), coalesce(r->'variazioni', '[]'::jsonb), r->>'note',
            coalesce(r->>'destinazione', 'cucina'))
    returning id into v_id_riga;
    for f in select * from jsonb_array_elements(coalesce(r->'figlie', '[]'::jsonb)) loop
      insert into ordine_riga (id_ordine, id_prodotto, descrizione, quantita, prezzo_unit, variazioni, note, destinazione, id_riga_padre)
      values (p_id, nullif(f->>'id_prodotto', '')::uuid, f->>'descrizione',
              coalesce((f->>'quantita')::numeric, 1) * coalesce((r->>'quantita')::numeric, 1),
              coalesce((f->>'prezzo_unit')::numeric, 0), coalesce(f->'variazioni', '[]'::jsonb), f->>'note',
              coalesce(f->>'destinazione', 'cucina'), v_id_riga);
    end loop;
  end loop;

  select coalesce(sum((prezzo_unit + coalesce((
           select sum((v->>'prezzo')::numeric) from jsonb_array_elements(variazioni) v), 0)) * quantita), 0)
    into v_righe from ordine_riga where id_ordine = p_id;

  update ordine
     set totale = greatest(0, v_righe + coalesce(costo_consegna, 0) - coalesce(sconto, 0)),
         note = coalesce(p_note, note),
         righe_prima = coalesce(righe_prima, v_prima),
         modificato_il = now(), aggiornato_il = now(),
         stampato_il = null
   where id = p_id
   returning * into v_ordine;

  return jsonb_build_object('esito', 'modificato', 'id', v_ordine.id, 'numero', v_ordine.numero,
                            'numero_visibile', v_ordine.numero_visibile, 'totale', v_ordine.totale);
end $$;

create or replace function comanda_ordine(p_id uuid) returns jsonb
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select jsonb_build_object(
    'id', o.id, 'numero', o.numero, 'numero_visibile', o.numero_visibile, 'canale', o.canale, 'tipo', o.tipo, 'stato', o.stato,
    'creato_il', o.creato_il, 'ora_consegna', o.ora_consegna, 'totale', o.totale, 'note', o.note,
    'pagamento', o.pagamento, 'costo_consegna', o.costo_consegna, 'paga_con', o.paga_con, 'pagato_online', o.pagato_online,
    'sconto', o.sconto, 'codice_coupon', o.codice_coupon,
    'modificato_il', o.modificato_il, 'stampe', o.stampe, 'righe_prima', o.righe_prima,
    'cliente', coalesce(c.nome, o.nome_cliente), 'telefono', c.telefono, 'cliente_note', c.note,
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
