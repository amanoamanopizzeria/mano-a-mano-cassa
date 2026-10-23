-- Mano a Mano Cassa — 0027: la storia degli stati, «stampato» e il numero con il prefisso del canale (23/10/2026).
-- Dal REA (docs/rea/01_BACKOFFICE.md §1.4, lavoro 6 del gap): in Velocissimo ogni ordine ha «confermato» e
-- «stampato» con l'orario, la storia degli stati, e un numero col prefisso del canale (C-1042 dalla cassa,
-- APP-, W-, T-…), così al telefono «il C-1042» non si confonde con l'«APP-1042».

-- 1) la storia degli stati: chi, quando, da cosa a cosa (lo scrive un trigger, nessuno lo salta)
create table if not exists ordine_stato_log (
  id          bigint generated always as identity primary key,
  id_ordine   uuid not null references ordine(id) on delete cascade,
  da          stato_ordine,
  a           stato_ordine not null,
  chi         uuid default auth.uid(),
  quando      timestamptz not null default now()
);
create index if not exists ordine_stato_log_ordine_idx on ordine_stato_log(id_ordine, quando);
alter table ordine_stato_log enable row level security;
create policy ordine_stato_log_staff on ordine_stato_log for select using (e_staff());

create or replace function ordine_stato_registra() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    insert into ordine_stato_log (id_ordine, da, a) values (new.id, null, new.stato);
  elsif old.stato is distinct from new.stato then
    insert into ordine_stato_log (id_ordine, da, a) values (new.id, old.stato, new.stato);
  end if;
  return new;
end $$;
create trigger ordine_stato_log_trg after insert or update of stato on ordine for each row execute function ordine_stato_registra();

-- 2) confermato e stampato, con l'orario
alter table ordine add column if not exists confermato_il timestamptz;
alter table ordine add column if not exists stampato_il   timestamptz;
alter table ordine add column if not exists stampe        int not null default 0;

create or replace function ordine_stampato(p_id uuid) returns void
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if not e_staff() then raise exception 'solo lo staff' using errcode = '42501'; end if;
  update ordine set stampato_il = coalesce(stampato_il, now()), stampe = stampe + 1,
                    confermato_il = coalesce(confermato_il, now()), aggiornato_il = now()
  where id = p_id;
end $$;
grant execute on function ordine_stampato(uuid) to authenticated;

-- 3) il numero con il prefisso del canale: C-12 dalla cassa, TEL-12 dal centralino, APP-, W-, T-, G-, D-, J-
create or replace function prefisso_canale(p canale_ordine) returns text
language sql immutable as $$
  select case p when 'cassa' then 'C' when 'telefono' then 'TEL' when 'app' then 'APP' when 'web' then 'W'
                when 'totem' then 'T' when 'glovo' then 'G' when 'deliveroo' then 'D' when 'justeat' then 'J' else 'X' end
$$;
alter table ordine add column if not exists numero_visibile text generated always as (prefisso_canale(canale) || '-' || numero) stored;
create index if not exists ordine_numero_visibile_idx on ordine(numero_visibile);

-- 4) la comanda porta il numero visibile (eseguito con execute_sql subito dopo)
create or replace function comanda_ordine(p_id uuid)
returns jsonb
language sql security definer set search_path = public, extensions, pg_temp stable as $$
  select jsonb_build_object(
    'id', o.id, 'numero', o.numero, 'numero_visibile', o.numero_visibile, 'canale', o.canale, 'tipo', o.tipo, 'stato', o.stato,
    'creato_il', o.creato_il, 'ora_consegna', o.ora_consegna, 'totale', o.totale, 'note', o.note,
    'pagamento', o.pagamento, 'costo_consegna', o.costo_consegna, 'paga_con', o.paga_con, 'pagato_online', o.pagato_online,
    'sconto', o.sconto, 'codice_coupon', o.codice_coupon,
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
