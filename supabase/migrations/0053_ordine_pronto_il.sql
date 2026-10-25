-- «Pronto in cucina» anche dopo che il rider ha preso la consegna (critico giro 24): prendere o
-- assegnare porta l'ordine a 'in_consegna' e il 'pronto' della cucina si perdeva. L'ora in cui la
-- cucina l'ha fatto pronto resta in pronto_il, e consegne_rider3 lo racconta come 'pronto' finché il
-- rider non l'ha ritirato. Il resto dei passaggi di stato non cambia.
alter table ordine add column if not exists pronto_il timestamptz;

create or replace function trg_ordine_pronto_il() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if new.stato = 'pronto' and new.pronto_il is null then new.pronto_il := now(); end if;
  return new;
end $$;

create or replace trigger ordine_pronto_il before insert or update of stato on ordine
  for each row execute function trg_ordine_pronto_il();

update ordine set pronto_il = aggiornato_il where stato = 'pronto' and pronto_il is null;

create or replace function public.consegne_rider3()
 returns table(id uuid, id_ordine uuid, stato stato_consegna, id_rider uuid, numero bigint, numero_visibile text, stato_ordine text, tipo tipo_ordine, canale canale_ordine, totale numeric, ora_consegna timestamp with time zone, note text, contanti_da_incassare numeric, cliente_nome text, cliente_telefono text, cliente_note text, via text, civico text, cap text, citta text, lat double precision, lng double precision, zona text, righe jsonb, pagamento text, pagato_online boolean, paga_con numeric, consegnata_il timestamp with time zone)
 language sql stable security definer
 set search_path to 'public', 'extensions', 'pg_temp'
as $function$
  select c.id, c.id_ordine, c.stato, c.id_rider,
         o.numero, o.numero_visibile,
         case when o.stato = 'in_consegna' and c.stato <> 'ritirata' and o.pronto_il is not null then 'pronto' else o.stato::text end,
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
$function$;
