-- Mano a Mano Cassa — 0024: le consegne nascono da sole, il borsello del rider e il dare-avere (23/10/2026).
-- Dal REA (docs/rea/04_RIDER.md): il primo rider che rientra «si assegna da solo la prima comanda»;
-- a fine serata fa il dare-avere in cassa; i movimenti del borsello sono depositi (versa) e prelievi
-- (ritira: il fondo, il resto da portare), nella stessa forma dell'API /borsello-rider, così l'OS
-- legge uguale. Prima di questa migrazione NESSUNO creava la riga `consegna` per un ordine a domicilio:
-- la pagina /rider restava vuota e la mappa non aveva consegne in corso.

-- 1) ogni ordine a domicilio ha la sua consegna, con i contanti da incassare (tutto il totale, a meno
--    che non sia già pagato online). Il totale può cambiare dopo l'insert (ordine_da_cassa3 aggiunge la
--    consegna): la riga si tiene allineata finché il rider non ha consegnato.
alter table ordine add column if not exists pagato_online boolean not null default false;
alter table ordine add column if not exists paga_con numeric(10,2);          -- «pago con 50»: il rider porta il resto
alter table consegna add column if not exists saldata_il timestamptz;        -- il dare-avere in cassa
alter table consegna add column if not exists id_movimento uuid;             -- il deposito con cui si è saldata

create or replace function consegna_da_ordine() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if new.tipo = 'domicilio' then
    if not exists (select 1 from consegna c where c.id_ordine = new.id) then
      insert into consegna (id_ordine, contanti_da_incassare)
      values (new.id, case when new.pagato_online then 0 else new.totale end);
    else
      update consegna set contanti_da_incassare = case when new.pagato_online then 0 else new.totale end
      where id_ordine = new.id and stato in ('da_assegnare', 'assegnata', 'ritirata');
    end if;
    if new.stato = 'annullato' then
      update consegna set stato = 'annullata' where id_ordine = new.id and stato <> 'consegnata';
    end if;
  end if;
  return new;
end $$;
-- (niente «drop trigger if exists»: col connettore un drop resta appeso; il trigger non esisteva)
create trigger ordine_consegna after insert or update of totale, stato, pagato_online, tipo on ordine
for each row execute function consegna_da_ordine();

-- le consegne degli ordini a domicilio già in tabella (quelli presi prima di oggi)
insert into consegna (id_ordine, contanti_da_incassare, stato, consegnata_il)
select o.id, case when o.stato = 'consegnato' then o.totale else o.totale end,
       case when o.stato = 'consegnato' then 'consegnata'::stato_consegna
            when o.stato = 'annullato' then 'annullata'::stato_consegna else 'da_assegnare'::stato_consegna end,
       case when o.stato = 'consegnato' then o.aggiornato_il end
from ordine o
where o.tipo = 'domicilio' and not exists (select 1 from consegna c where c.id_ordine = o.id);

-- 2) il borsello: la stessa forma di GET /borsello-rider di Velocissimo (tipo 1 deposito, 2 prelievo)
create table if not exists rider_movimento (
  id          uuid primary key default gen_random_uuid(),
  id_rider    uuid not null references rider(id) on delete cascade,
  tipo        text not null check (tipo in ('deposito', 'prelievo')),   -- deposito = versa in cassa; prelievo = ritira dalla cassa
  importo     numeric(10,2) not null check (importo > 0),
  fondo_cassa boolean not null default false,                             -- il fondo di inizio serata
  note        text,
  creato_da   uuid default auth.uid(),
  creato_il   timestamptz not null default now()
);
create index if not exists rider_movimento_rider_idx on rider_movimento(id_rider, creato_il);
alter table rider_movimento enable row level security;
create policy rider_movimento_staff on rider_movimento for all using (e_staff()) with check (e_staff());
create policy rider_movimento_self  on rider_movimento for select using (id_rider = rider_corrente());

-- 3) quanto ha in mano ogni rider adesso: prelievi − depositi + contanti delle consegne fatte e non saldate
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
       + coalesce((select sum(c.contanti_da_incassare) from consegna c where c.id_rider = r.id and c.stato = 'consegnata' and c.saldata_il is null), 0)
  from rider r
  where e_staff() or r.id = rider_corrente()
  order by r.attivo desc, r.nome
$$;
grant execute on function rider_borsello() to authenticated;

-- 4) un movimento dalla cassa (prelievo o deposito a mano: il fondo, un resto, un versamento)
create or replace function rider_movimento_scrivi(p_rider uuid, p_tipo text, p_importo numeric, p_fondo boolean default false, p_note text default null)
returns rider_movimento language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare m rider_movimento;
begin
  if not e_staff() then raise exception 'solo lo staff' using errcode = '42501'; end if;
  insert into rider_movimento (id_rider, tipo, importo, fondo_cassa, note)
  values (p_rider, p_tipo, p_importo, p_fondo, p_note) returning * into m;
  return m;
end $$;
grant execute on function rider_movimento_scrivi(uuid, text, numeric, boolean, text) to authenticated;

-- 5) il dare-avere: il rider versa i contanti delle consegne fatte; le consegne saldate spariscono
--    dal suo storico (come nell'app Velocissimo RIDER). Un deposito solo, con dentro le consegne.
create or replace function rider_salda(p_rider uuid, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_tot numeric; v_n int; m rider_movimento;
begin
  if not e_staff() then raise exception 'solo lo staff' using errcode = '42501'; end if;
  select coalesce(sum(contanti_da_incassare), 0), count(*) into v_tot, v_n
  from consegna where id_rider = p_rider and stato = 'consegnata' and saldata_il is null;
  if v_n = 0 then return jsonb_build_object('esito', 'niente_da_saldare'); end if;
  if v_tot > 0 then
    insert into rider_movimento (id_rider, tipo, importo, note)
    values (p_rider, 'deposito', v_tot, coalesce(p_note, v_n || ' consegne saldate')) returning * into m;
  end if;
  update consegna set saldata_il = now(), id_movimento = m.id
  where id_rider = p_rider and stato = 'consegnata' and saldata_il is null;
  return jsonb_build_object('esito', 'saldato', 'consegne', v_n, 'importo', v_tot, 'id_movimento', m.id);
end $$;
grant execute on function rider_salda(uuid, text) to authenticated;

-- 6) la lista del rider: libere + mie in corso + le mie consegnate NON saldate (lo storico «da saldare»),
--    con le note fisse del cliente (critico giro 1, lavoro 11) e come paga («contanti, paga con 50 → resto 26,50»).
--    Funzione nuova perché la vecchia restituisce una tabella con meno colonne (non si può cambiare con replace).
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
  where ruolo_corrente() = 'rider'
    and (c.stato = 'da_assegnare'
         or (c.id_rider = rider_corrente() and (c.stato in ('assegnata', 'ritirata') or (c.stato = 'consegnata' and c.saldata_il is null))))
  order by c.stato = 'consegnata', o.ora_consegna nulls last, o.creato_il
$$;
grant execute on function consegne_rider2() to authenticated;

-- 7) come paga, dalla cassa: contanti (con quanto → resto), POS, già pagato online
create or replace function ordine_pagamento(p_id uuid, p_pagamento text, p_paga_con numeric default null, p_pagato_online boolean default false)
returns void language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if not e_staff() then raise exception 'solo lo staff' using errcode = '42501'; end if;
  if p_pagamento is not null and p_pagamento not in ('contanti', 'pos') then raise exception 'pagamento non ammesso'; end if;
  update ordine set pagamento = p_pagamento, paga_con = p_paga_con, pagato_online = p_pagato_online, aggiornato_il = now()
  where id = p_id;
end $$;
grant execute on function ordine_pagamento(uuid, text, numeric, boolean) to authenticated;

-- 8) la comanda porta le note fisse del cliente («citofono rotto», «cane») e come paga
create or replace function comanda_ordine(p_id uuid)
returns jsonb
language sql security definer set search_path = public, extensions, pg_temp stable as $$
  select jsonb_build_object(
    'id', o.id, 'numero', o.numero, 'canale', o.canale, 'tipo', o.tipo, 'stato', o.stato,
    'creato_il', o.creato_il, 'ora_consegna', o.ora_consegna, 'totale', o.totale, 'note', o.note,
    'pagamento', o.pagamento, 'costo_consegna', o.costo_consegna, 'paga_con', o.paga_con, 'pagato_online', o.pagato_online,
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
  where o.id = p_id and e_staff();
$$;
