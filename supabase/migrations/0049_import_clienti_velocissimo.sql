-- I clienti di Velocissimo (app e telefono) nella cassa nuova (Edoardo, 25/10/2026: «caricati i clienti
-- dell'app e del telefono con i nomi e le vie»). Si leggono dal back-office con la sessione di Edoardo,
-- in sola lettura, e arrivano qui a pacchi in una tabella di appoggio; poi un'unica funzione li fonde
-- in cliente e indirizzo, senza doppioni (chiave: id_velocissimo, poi il telefono).
--
-- La porta d'ingresso la chiama il browser con una chiave usa-e-getta: nel database c'è solo la sua
-- impronta SHA-256 (impostazione_riservata 'import_clienti'), e a import finito l'impronta si svuota
-- e la porta non apre più niente.
create table if not exists import_cliente_velocissimo (
  id_velocissimo integer primary key,
  dati jsonb not null,
  arrivato_il timestamptz not null default now()
);
alter table import_cliente_velocissimo enable row level security;

create or replace function importa_clienti_velocissimo(p_chiave text, p_righe jsonb) returns integer
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_attesa text; n integer;
begin
  select valore into v_attesa from impostazione_riservata where chiave = 'import_clienti';
  if v_attesa is null or v_attesa = '' or encode(digest(coalesce(p_chiave, ''), 'sha256'), 'hex') <> v_attesa then
    raise exception 'chiave non valida';
  end if;
  insert into import_cliente_velocissimo (id_velocissimo, dati)
  select (r->>'id')::int, r from jsonb_array_elements(p_righe) r where (r->>'id') ~ '^\d+$'
  on conflict (id_velocissimo) do update set dati = excluded.dati, arrivato_il = now();
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function importa_clienti_velocissimo(text, jsonb) from public;
grant execute on function importa_clienti_velocissimo(text, jsonb) to anon, authenticated;
