-- Il riepilogo delle copie del 2Bit per CANALE, non per OrigineComanda (critico Edoardo, 31/10/2026: «il riepilogo mi
-- dirà Glovo 13, Deliveroo 7, Just Eat 4, o app 39?»). Nel 2Bit app, sito e Deliverect hanno tutti OrigineComanda 1
-- (REA 33): la piattaforma la ricava il copiatore dalle note e la manda in corpo.canale (agente-copiatore,
-- config.esempio.json). Le copie vecchie, senza canale, restano col nome dell'origine.
create or replace function canale_2bit_nome(p_canale text, p_origine text) returns text
language sql immutable as $$
  select case p_canale
    when 'glovo' then 'Glovo' when 'deliveroo' then 'Deliveroo' when 'just_eat' then 'Just Eat'
    when 'app_web' then 'app e sito' when 'cassa' then 'cassa 2Bit' when 'telefono' then 'telefono'
    when 'totem' then 'totem' when 'tavolo' then 'tavoli' when 'altro' then 'altro'
    else origine_2bit_nome(p_origine) end
$$;

create or replace function copia_2bit_riepilogo(p_giornata date)
returns table (origine text, ordini bigint, eliminati bigint, totale numeric, primo timestamptz, ultimo timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select canale_2bit_nome(c.corpo->>'canale', c.origine),
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
