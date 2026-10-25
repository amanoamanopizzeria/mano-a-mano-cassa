-- Il rider vede «C-77» come la cassa, la carta e il cliente (non «#77»), e se in cucina l'ordine è già
-- pronto (critico giro 23). La 2 resta (niente drop): cambia solo il ritorno, quindi è una funzione nuova.
create or replace function consegne_rider3()
returns table(id uuid, id_ordine uuid, stato stato_consegna, id_rider uuid, numero bigint, numero_visibile text, stato_ordine text,
  tipo tipo_ordine, canale canale_ordine, totale numeric, ora_consegna timestamptz, note text, contanti_da_incassare numeric,
  cliente_nome text, cliente_telefono text, cliente_note text, via text, civico text, cap text, citta text,
  lat double precision, lng double precision, zona text, righe jsonb, pagamento text, pagato_online boolean, paga_con numeric,
  consegnata_il timestamptz)
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select c.id, c.id_ordine, c.stato, c.id_rider,
         o.numero, o.numero_visibile, o.stato::text,
         o.tipo, o.canale, o.totale, o.ora_consegna, o.note, c.contanti_da_incassare,
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
revoke all on function consegne_rider3() from public, anon;
grant execute on function consegne_rider3() to authenticated;
