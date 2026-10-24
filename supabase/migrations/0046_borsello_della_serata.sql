-- Critico giro 15: in /cassa/rider «prelievi 20 · depositi 113,50» erano di sempre (il prelievo del
-- giorno prima, già stornato) accanto ai movimenti di oggi, e la frase non era la formula.
-- Il borsello è della SERATA: movimenti e consegne dalle 6 di mattina (ora di Roma), come il riepilogo.
-- In mano = fondo e prelievi di stasera − depositi di stasera + contanti di tutte le consegne fatte stasera.
create or replace function inizio_serata()
returns timestamptz
language sql stable as $$
  select (((now() at time zone 'Europe/Rome') - interval '6 hours')::date + time '06:00') at time zone 'Europe/Rome'
$$;
grant execute on function inizio_serata() to authenticated, service_role;

create or replace function rider_borsello()
returns table (
  id uuid, nome text, telefono text, attivo boolean,
  prelievi numeric, depositi numeric, da_saldare numeric, n_da_saldare int, in_corso int, in_mano numeric
)
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  with s as (select inizio_serata() as da)
  select r.id, r.nome, r.telefono, r.attivo,
         coalesce((select sum(m.importo) from rider_movimento m, s where m.id_rider = r.id and m.tipo = 'prelievo' and m.creato_il >= s.da), 0),
         coalesce((select sum(m.importo) from rider_movimento m, s where m.id_rider = r.id and m.tipo = 'deposito' and m.creato_il >= s.da), 0),
         coalesce((select sum(c.contanti_da_incassare) from consegna c where c.id_rider = r.id and c.stato = 'consegnata' and c.saldata_il is null), 0),
         (select count(*)::int from consegna c where c.id_rider = r.id and c.stato = 'consegnata' and c.saldata_il is null),
         (select count(*)::int from consegna c where c.id_rider = r.id and c.stato in ('assegnata', 'ritirata')),
         coalesce((select sum(m.importo) from rider_movimento m, s where m.id_rider = r.id and m.tipo = 'prelievo' and m.creato_il >= s.da), 0)
       - coalesce((select sum(m.importo) from rider_movimento m, s where m.id_rider = r.id and m.tipo = 'deposito' and m.creato_il >= s.da), 0)
       + coalesce((select sum(c.contanti_da_incassare) from consegna c, s where c.id_rider = r.id and c.stato = 'consegnata' and c.consegnata_il >= s.da), 0)
  from rider r
  where e_staff() or r.id = rider_corrente()
  order by r.attivo desc, r.nome
$$;
