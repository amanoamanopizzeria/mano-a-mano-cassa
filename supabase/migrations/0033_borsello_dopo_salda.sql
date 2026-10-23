-- Critico giro 7: dopo «Salda» il rider aveva −12,70 € in mano. Il saldo scalava il deposito
-- E toglieva le consegne saldate dai contanti: gli stessi soldi uscivano due volte.
-- Quello che il rider ha in mano = fondo e prelievi + contanti di TUTTE le consegne fatte − depositi.
-- «Da saldare» resta la parte delle consegne non ancora versate.
create or replace function rider_borsello()
returns table (
  id uuid, nome text, telefono text, attivo boolean,
  prelievi numeric, depositi numeric, da_saldare numeric, n_da_saldare int, in_corso int, in_mano numeric
)
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select r.id, r.nome, r.telefono, r.attivo,
         coalesce((select sum(m.importo) from rider_movimento m where m.id_rider = r.id and m.tipo = 'prelievo'), 0),
         coalesce((select sum(m.importo) from rider_movimento m where m.id_rider = r.id and m.tipo = 'deposito'), 0),
         coalesce((select sum(c.contanti_da_incassare) from consegna c where c.id_rider = r.id and c.stato = 'consegnata' and c.saldata_il is null), 0),
         (select count(*)::int from consegna c where c.id_rider = r.id and c.stato = 'consegnata' and c.saldata_il is null),
         (select count(*)::int from consegna c where c.id_rider = r.id and c.stato in ('assegnata', 'ritirata')),
         coalesce((select sum(m.importo) from rider_movimento m where m.id_rider = r.id and m.tipo = 'prelievo'), 0)
       - coalesce((select sum(m.importo) from rider_movimento m where m.id_rider = r.id and m.tipo = 'deposito'), 0)
       + coalesce((select sum(c.contanti_da_incassare) from consegna c where c.id_rider = r.id and c.stato = 'consegnata'), 0)
  from rider r
  where e_staff() or r.id = rider_corrente()
  order by r.attivo desc, r.nome
$$;
