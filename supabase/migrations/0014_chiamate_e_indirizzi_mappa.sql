-- Mano a Mano Cassa — Fase 14: chi chiama apre la scheda, e gli indirizzi con le coordinate (23/10/2026).
-- 1) `chiamata`: ogni telefonata in arrivo, scritta dalla route /api/telefono/chiamata (o da un
--    cassiere con segna_chiamata, per provare). La cassa la ascolta in realtime e apre la scheda.
-- 2) `indirizzo` prende lat/lng, il CAP e l'id del posto su Google Maps; salva_cliente2 li scrive.
--    (salva_cliente resta com'è: niente drop, il connettore si impianta.)

create table if not exists chiamata (
  id          uuid primary key default gen_random_uuid(),
  numero      text not null,
  origine     text not null default 'api',       -- api | telnyx | prova
  ricevuta_il timestamptz not null default now(),
  gestita     boolean not null default false
);
alter table chiamata enable row level security;
create policy chiamata_staff on chiamata for all using (e_staff()) with check (e_staff());
alter publication supabase_realtime add table chiamata;

create or replace function segna_chiamata(p_numero text, p_origine text default 'prova')
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid;
begin
  if not e_staff() then raise exception 'solo lo staff' using errcode = '42501'; end if;
  insert into chiamata (numero, origine) values (p_numero, coalesce(p_origine, 'prova')) returning id into v_id;
  return v_id;
end $$;
revoke all on function segna_chiamata(text, text) from public;
grant execute on function segna_chiamata(text, text) to authenticated;

alter table indirizzo add column if not exists place_id text;
alter table indirizzo add column if not exists etichetta text;   -- «casa», «ufficio»…

create or replace function salva_cliente2(
  p_telefono text, p_nome text, p_note text,
  p_via text, p_civico text, p_cap text, p_citta text,
  p_lat double precision default null, p_lng double precision default null, p_place_id text default null
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_chiave text := right(regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g'), 9);
  v_id uuid;
begin
  if not e_staff() then
    raise exception 'solo lo staff' using errcode = '42501';
  end if;
  if length(v_chiave) < 6 then
    raise exception 'telefono non valido';
  end if;
  select id into v_id from cliente
   where right(regexp_replace(coalesce(telefono, ''), '\D', '', 'g'), 9) = v_chiave
   order by creato_il limit 1;
  if v_id is null then
    insert into cliente (telefono, nome, note) values (p_telefono, p_nome, p_note) returning id into v_id;
  else
    update cliente set nome = coalesce(p_nome, nome), note = coalesce(p_note, note) where id = v_id;
  end if;
  if p_via is not null and p_via <> '' then
    insert into indirizzo (id_cliente, via, civico, cap, citta, lat, lng, place_id)
    select v_id, p_via, p_civico, p_cap, p_citta, p_lat, p_lng, p_place_id
    where not exists (select 1 from indirizzo where id_cliente = v_id and via = p_via and coalesce(civico, '') = coalesce(p_civico, ''));
  end if;
  return jsonb_build_object('esito', 'salvato', 'id', v_id);
end $$;
revoke all on function salva_cliente2(text, text, text, text, text, text, text, double precision, double precision, text) from public;
grant execute on function salva_cliente2(text, text, text, text, text, text, text, double precision, double precision, text) to authenticated;

-- 3) La route può scrivere senza SUPABASE_SERVICE_ROLE_KEY: passa la chiave del centralino e
--    segna_chiamata_api la confronta con l'impronta SHA-256 in `impostazione_riservata`
--    (RLS senza policy: la leggono solo le funzioni security definer). Nel registro di Supabase
--    è la migrazione `chiamata_api_con_impronta`; l'impronta vera si mette con un insert a parte.
create table if not exists impostazione_riservata (
  chiave text primary key,
  valore text not null,
  aggiornata_il timestamptz not null default now()
);
alter table impostazione_riservata enable row level security;
revoke all on impostazione_riservata from anon, authenticated;

create or replace function segna_chiamata_api(p_numero text, p_origine text, p_chiave text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid; v_attesa text;
begin
  select valore into v_attesa from impostazione_riservata where chiave = 'telefono_key_sha256';
  if v_attesa is null or p_chiave is null
     or encode(sha256(convert_to(p_chiave, 'UTF8')), 'hex') <> v_attesa then
    raise exception 'chiave non valida' using errcode = '42501';
  end if;
  insert into chiamata (numero, origine) values (p_numero, coalesce(p_origine, 'api')) returning id into v_id;
  return v_id;
end $$;
revoke all on function segna_chiamata_api(text, text, text) from public;
grant execute on function segna_chiamata_api(text, text, text) to anon, authenticated, service_role;
