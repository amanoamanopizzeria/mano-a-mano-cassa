-- La coda dell'agente di stampa con la regola di Edoardo (25/10/2026), la stessa di /cassa: consegne e
-- ordini con un'ora escono a blocchi, mezz'ora prima del LORO quarto d'ora (alle 18:30 tutto il blocco
-- delle 19:00); senza ora, Glovo e Deliveroo escono subito. Prima la mezz'ora si contava dall'ora esatta.
create or replace function coda_stampa() returns setof jsonb
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select comanda_per_stampa(o.id)
  from ordine o
  where auth.role() = 'service_role'
    and o.stampato_il is null
    and o.stato <> 'annullato'
    and o.creato_il > now() - interval '18 hours'
    and (o.ora_consegna is null
         or o.canale in ('glovo', 'deliveroo')
         or date_bin('15 minutes', o.ora_consegna, timestamptz '2000-01-01') - interval '30 minutes' <= now())
  order by coalesce(o.ora_consegna, o.creato_il), o.numero
  limit 20;
$$;
revoke all on function coda_stampa() from public, anon, authenticated;
grant execute on function coda_stampa() to service_role;
