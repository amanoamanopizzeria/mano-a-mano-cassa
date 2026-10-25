-- Dalla tabella di appoggio (mig. 0049) a cliente e indirizzo. Si può rifare: chi c'è già non si
-- duplica. Lo stesso cliente si riconosce come fa la cassa quando squilla il telefono: le ultime 9
-- cifre (cliente_per_telefono, mig. 0007). Se in Velocissimo più schede hanno lo stesso numero vince
-- quella con più ordini, poi la più recente. Un cliente che la cassa conosceva già tiene il suo nome
-- e prende solo id_velocissimo e la via, se manca. La zona si prende per nome (le zone sono le stesse
-- di Velocissimo, mig. 0014); la via «Via Nomentana 120» si divide in via e civico.
create or replace function fondi_clienti_velocissimo() returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_nuovi int; v_agganciati int; v_vie int;
begin
  create temp table _v on commit drop as
  with base as (
    select id_velocissimo, dati,
           nullif(trim(coalesce(nullif(dati->>'cell', ''), dati->>'tel')), '') as tel,
           right(regexp_replace(coalesce(nullif(dati->>'cell', ''), dati->>'tel', ''), '\D', '', 'g'), 9) as chiave,
           coalesce(nullif(regexp_replace(dati->>'ordini', '\D', '', 'g'), '')::int, 0) as ordini
    from import_cliente_velocissimo
  )
  select distinct on (chiave) * from base
  where length(chiave) >= 8
    -- un numero su più di 5 schede non è di un cliente: è il centralino di una piattaforma (uno solo
    -- stava su 5.585 schede, Edoardo: «escludi quelli che entrano da Deliverect»)
    and chiave not in (select chiave from base group by chiave having count(*) > 5)
  order by chiave, ordini desc, id_velocissimo desc;

  -- chi la cassa conosce già
  update cliente c set id_velocissimo = v.id_velocissimo,
         nome = coalesce(nullif(c.nome, ''), nullif(v.dati->>'nome', '')),
         email = coalesce(c.email, nullif(v.dati->>'email', ''))
  from _v v
  where c.id_velocissimo is null and right(regexp_replace(coalesce(c.telefono, ''), '\D', '', 'g'), 9) = v.chiave;
  get diagnostics v_agganciati = row_count;

  -- i nuovi
  insert into cliente (nome, telefono, email, id_velocissimo)
  select nullif(v.dati->>'nome', ''), v.tel, nullif(v.dati->>'email', ''), v.id_velocissimo
  from _v v
  where not exists (select 1 from cliente c where c.id_velocissimo = v.id_velocissimo)
    and not exists (select 1 from cliente c where right(regexp_replace(coalesce(c.telefono, ''), '\D', '', 'g'), 9) = v.chiave);
  get diagnostics v_nuovi = row_count;

  -- le vie
  insert into indirizzo (id_cliente, id_zona, via, civico, cap, citta, etichetta)
  select c.id, z.id,
         coalesce(nullif(trim((regexp_match(trim(v.dati->>'via'), '^(.*?)[ ,]+(\d+\s*[A-Za-z]?(/\s*[A-Za-z0-9]+)?)$'))[1]), ''), trim(v.dati->>'via')),
         (regexp_match(trim(v.dati->>'via'), '^(.*?)[ ,]+(\d+\s*[A-Za-z]?(/\s*[A-Za-z0-9]+)?)$'))[2],
         nullif(v.dati->>'cap', ''),
         case when lower(coalesce(v.dati->>'citta', '')) in ('', 'roma', 'rome') then 'Roma' else v.dati->>'citta' end,
         'da Velocissimo'
  from _v v
  join cliente c on c.id_velocissimo = v.id_velocissimo
  left join zona z on z.nome = nullif(v.dati->>'zona', '')
  where nullif(trim(v.dati->>'via'), '') is not null
    and not exists (select 1 from indirizzo i where i.id_cliente = c.id);
  get diagnostics v_vie = row_count;

  return jsonb_build_object('nuovi', v_nuovi, 'agganciati', v_agganciati, 'vie', v_vie);
end $$;
revoke all on function fondi_clienti_velocissimo() from public, anon, authenticated;
