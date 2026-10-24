-- Critico giro 10 (la serata intera, 24/10/2026), lato database.
--
-- 1) Il rider vedeva fra le consegne di stasera quelle di DOMANI (W-26 «per le 20:00», senza giorno) e una
--    di ieri rimasta «da assegnare». Le consegne libere che il rider può prendere sono quelle della serata
--    di oggi (giorno di Roma dell'ora di consegna, o della creazione); quelle già sue restano sempre.
create or replace function consegne_rider2()
returns table (
  id uuid, id_ordine uuid, stato stato_consegna, id_rider uuid,
  numero bigint, tipo tipo_ordine, canale canale_ordine, totale numeric,
  ora_consegna timestamptz, note text, contanti_da_incassare numeric,
  cliente_nome text, cliente_telefono text, cliente_note text,
  via text, civico text, cap text, citta text, lat double precision, lng double precision,
  zona text, righe jsonb, pagamento text, pagato_online boolean, paga_con numeric, consegnata_il timestamptz
)
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select c.id, c.id_ordine, c.stato, c.id_rider,
         o.numero, o.tipo, o.canale, o.totale, o.ora_consegna, o.note, c.contanti_da_incassare,
         coalesce(cl.nome, o.nome_cliente), cl.telefono, cl.note,
         i.via, i.civico, i.cap, i.citta, i.lat, i.lng,
         z.nome,
         coalesce((select jsonb_agg(jsonb_build_object('descrizione', r.descrizione, 'quantita', r.quantita, 'variazioni', r.variazioni) order by r.id_riga_padre nulls first)
                   from ordine_riga r where r.id_ordine = o.id), '[]'::jsonb),
         o.pagamento, o.pagato_online, o.paga_con, c.consegnata_il
  from consegna c
  join ordine o on o.id = c.id_ordine
  left join cliente cl on cl.id = o.id_cliente
  left join indirizzo i on i.id = o.id_indirizzo
  left join zona z on z.id = o.id_zona
  where e_rider()
    and ((c.stato = 'da_assegnare'
          and (coalesce(o.ora_consegna, o.creato_il) at time zone 'Europe/Rome')::date = (now() at time zone 'Europe/Rome')::date)
         or (c.id_rider = rider_corrente() and (c.stato in ('assegnata', 'ritirata') or (c.stato = 'consegnata' and c.saldata_il is null))))
  order by c.stato = 'consegnata', o.ora_consegna nulls last, o.creato_il
$$;

-- 2) Tavolo e banco fuori orario: alle 22:46 con la sala piena la comanda non partiva («la cucina è chiusa»,
--    ma per il tavolo giorno e ora non si scelgono). Se c'è qualcuno in cassa che batte un tavolo o un banco,
--    la cucina è aperta: l'orario vale per domicilio e ritiro, che li decide il cliente da fuori.
create or replace function ordine_da_cassa3(p_tipo tipo_ordine, p_righe jsonb, p_id_tavolo uuid default null, p_id_cliente uuid default null, p_note text default null, p_id_indirizzo uuid default null, p_ora timestamptz default null)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_negozio uuid; v_res jsonb; v_id uuid;
  v_ind indirizzo; v_zona zona; v_sub numeric;
  v_ora timestamptz; v_giorno date; v_orario record; v_ora_locale time;
begin
  if not e_staff() then raise exception 'solo lo staff' using errcode = '42501'; end if;
  select id_negozio into v_negozio from profilo where id = auth.uid();
  if v_negozio is null then raise exception 'profilo senza negozio'; end if;

  v_ora := coalesce(p_ora, now());
  if v_ora < now() - interval '15 minutes' then
    return jsonb_build_object('esito', 'ora_passata');
  end if;
  v_giorno := (v_ora at time zone 'Europe/Rome')::date;
  v_ora_locale := (v_ora at time zone 'Europe/Rome')::time;

  if p_tipo in ('domicilio', 'ritiro') then
    select o.dalle, o.alle into v_orario
    from orario o
    where o.id_negozio = v_negozio and o.giorno_settimana = extract(dow from v_giorno)::int and o.tipo = p_tipo::text;
    if v_orario.dalle is not null and (v_ora_locale < v_orario.dalle or v_ora_locale > v_orario.alle) then
      return jsonb_build_object('esito', 'fuori_orario', 'dalle', v_orario.dalle, 'alle', v_orario.alle, 'giorno', v_giorno);
    end if;
  end if;

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

  v_res := accetta_ordine_esterno(v_negozio, 'cassa', p_tipo, null, p_ora, p_note, p_righe);
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

-- 3) Un asporto senza nome: chi ritira? (C-24 senza cliente). La cassa scrive il nome sull'ordine.
create or replace function ordine_nome(p_id uuid, p_nome text) returns void
language sql security definer set search_path = public, pg_temp as $$
  update ordine set nome_cliente = left(nullif(trim(p_nome), ''), 60), aggiornato_il = now() where id = p_id and e_staff()
$$;
grant execute on function ordine_nome(uuid, text) to authenticated;
