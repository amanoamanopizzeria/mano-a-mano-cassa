-- Il confronto sera per sera col 2Bit (REA 30 D-3, REA 32 §32.2): quanti ordini e quanti euro ha visto il 2Bit
-- per origine, dalle copie del copiatore. I codici di OrigineComanda vengono dal modello dati del 2Bit (REA 32
-- §32.4). Solo lettura, per admin e cassa.
create or replace function origine_2bit_nome(p_codice text) returns text
language sql immutable as $$
  select case p_codice
    when '0' then 'cassa 2Bit' when '1' then 'app' when '2' then 'sito' when '3' then 'Just Eat'
    when '4' then 'telefono' when '5' then 'totem' when '100' then 'Deliveroo' when '101' then 'Uber Eats'
    when '199' then 'Glovo' else coalesce(p_codice, '?') end
$$;

create or replace function copia_2bit_riepilogo(p_giornata date)
returns table (origine text, ordini bigint, eliminati bigint, totale numeric, primo timestamptz, ultimo timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select origine_2bit_nome(c.origine),
         count(*) filter (where coalesce(c.stato, '') <> 'eliminato'),
         count(*) filter (where c.stato = 'eliminato'),
         coalesce(sum(c.totale) filter (where coalesce(c.stato, '') <> 'eliminato'), 0),
         min(c.creato_2bit), max(c.creato_2bit)
    from copia_2bit c
   where c.giornata = p_giornata
     and exists (select 1 from profilo p where p.id = auth.uid() and p.ruolo in ('admin', 'cassa'))
   group by 1
   order by 2 desc
$$;
revoke all on function copia_2bit_riepilogo(date) from public, anon;
grant execute on function copia_2bit_riepilogo(date) to authenticated;
