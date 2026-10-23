-- Domicilio con la zona vera: l'indirizzo prende la zona da solo dalle coordinate, l'ordine a
-- domicilio congela il costo di consegna e rispetta il minimo d'ordine (10 € in tutte le zone,
-- Edoardo 23/10/2026). Fuori da ogni zona non si consegna: la cassa lo dice prima, non dopo.

-- 1) la zona dell'indirizzo si calcola da sola (e si ricalcola se cambiano le coordinate)
create or replace function trg_indirizzo_zona() returns trigger
language plpgsql as $$
begin
  if new.lat is not null and new.lng is not null then
    select z.id into new.id_zona from zona_per_punto(new.lat, new.lng) z;
  end if;
  return new;
end $$;
create or replace trigger indirizzo_zona_auto before insert or update of lat, lng on indirizzo
for each row execute function trg_indirizzo_zona();
update indirizzo set lat = lat where lat is not null;   -- ricalcola quelli già salvati

-- 2) l'ordine dalla cassa con l'indirizzo: zona, costo, minimo. (ordine_da_cassa resta: niente drop.)
create or replace function ordine_da_cassa2(
  p_tipo tipo_ordine, p_righe jsonb, p_id_tavolo uuid default null, p_id_cliente uuid default null,
  p_note text default null, p_id_indirizzo uuid default null
) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_negozio uuid; v_res jsonb; v_id uuid;
  v_ind indirizzo; v_zona zona; v_sub numeric;
begin
  if not e_staff() then raise exception 'solo lo staff' using errcode = '42501'; end if;
  select id_negozio into v_negozio from profilo where id = auth.uid();
  if v_negozio is null then raise exception 'profilo senza negozio'; end if;

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

  v_res := accetta_ordine_esterno(v_negozio, 'cassa', p_tipo, null, null, p_note, p_righe);
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
revoke all on function ordine_da_cassa2(tipo_ordine, jsonb, uuid, uuid, text, uuid) from public;
grant execute on function ordine_da_cassa2(tipo_ordine, jsonb, uuid, uuid, text, uuid) to authenticated;

-- 3) la comanda dice anche il costo di consegna
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
