-- La coda di stampa per l'agente sul PC di cassa (Edoardo, 24/10/2026: due stampanti comande e una
-- fiscale, tutte in LAN). L'agente non ha credenziali Supabase: chiede al server (/api/stampa/coda,
-- con la sua chiave su Vercel) e il server, col service_role, legge qui.
-- In coda: gli ordini non ancora stampati e non annullati delle ultime 18 ore; un preordine entra
-- 30 minuti prima della sua ora (come ATTESA_MIN in /cassa). Una modifica (0038) azzera stampato_il
-- e la comanda torna in coda con MODIFICATA; «ordine_ristampa» fa lo stesso a mano.

create or replace function comanda_per_stampa(p_id uuid) returns jsonb
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
  where o.id = p_id and auth.role() = 'service_role';
$$;
revoke all on function comanda_per_stampa(uuid) from public, anon, authenticated;
grant execute on function comanda_per_stampa(uuid) to service_role;

create or replace function coda_stampa() returns setof jsonb
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select comanda_per_stampa(o.id)
  from ordine o
  where auth.role() = 'service_role'
    and o.stampato_il is null
    and o.stato <> 'annullato'
    and o.creato_il > now() - interval '18 hours'
    and (o.ora_consegna is null or o.ora_consegna - interval '30 minutes' <= now())
  order by coalesce(o.ora_consegna, o.creato_il), o.numero
  limit 20;
$$;
revoke all on function coda_stampa() from public, anon, authenticated;
grant execute on function coda_stampa() to service_role;

-- l'agente la chiama quando TUTTE le stampanti hanno preso la comanda
create or replace function stampa_fatta(p_id uuid) returns void
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if auth.role() <> 'service_role' then raise exception 'solo il server' using errcode = '42501'; end if;
  update ordine set stampato_il = now(), stampe = stampe + 1,
                    confermato_il = coalesce(confermato_il, now()), aggiornato_il = now()
  where id = p_id and stampato_il is null;
end $$;
revoke all on function stampa_fatta(uuid) from public, anon, authenticated;
grant execute on function stampa_fatta(uuid) to service_role;

-- dalla cassa: «ristampa» rimette la comanda in coda (esce con la scritta RISTAMPA)
create or replace function ordine_ristampa(p_id uuid) returns void
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if not e_staff() then raise exception 'solo lo staff' using errcode = '42501'; end if;
  update ordine set stampato_il = null, aggiornato_il = now() where id = p_id and stato <> 'annullato';
end $$;
revoke all on function ordine_ristampa(uuid) from public, anon;
grant execute on function ordine_ristampa(uuid) to authenticated;
