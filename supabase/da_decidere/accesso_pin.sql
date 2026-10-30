-- DA DECIDERE (Edoardo, 30/10/2026, risposta B: «un PIN di 4 cifre va bene»). Si applica solo col suo ok.
--
-- Rider e postazioni (cassa, totem, tablet) entrano con un nome breve e un PIN di 4 cifre, invece di email e
-- password. L'utenza resta quella di Supabase (la crea Edoardo, io non creo account): il PIN è solo un modo
-- più corto di aprirla. L'admin NON entra col PIN: resta con la password.
--
-- Sicurezza: il PIN non è salvato, solo la sua impronta (bcrypt). Dopo 5 errori di fila quell'accesso è fermo
-- 15 minuti; dopo 10 resta fermo finché un admin non rimette il PIN. Con 10 tentativi su 10.000 PIN chi prova
-- a indovinare ha una probabilità su mille. La verifica la chiama solo il server (/api/accesso/pin, chiave
-- service_role): dal browser non si può chiamare.
--
-- 1) accesso_pin: nome breve (es. «rider3», «totem», «cassa»), l'utenza, l'impronta del PIN, gli errori.
-- 2) pin_entra(nome, pin) — solo service_role: dice ok + email, o no / fermo.
-- 3) pin_imposta(nome, utente, pin) e pin_elenco() — solo admin.

create table if not exists accesso_pin (
  nome text primary key check (nome ~ '^[a-z0-9_-]{2,20}$'),
  id_utente uuid not null unique references auth.users(id) on delete cascade,
  pin_hash text not null,
  errori int not null default 0,
  bloccato_fino timestamptz,
  ultimo_accesso timestamptz,
  creato_il timestamptz not null default now()
);
alter table accesso_pin enable row level security;   -- nessuna policy: si passa solo dalle funzioni

create or replace function pin_entra(p_nome text, p_pin text) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v accesso_pin; v_email text; v_ruolo ruolo_utente;
begin
  select * into v from accesso_pin where nome = lower(trim(p_nome)) for update;
  if not found then return jsonb_build_object('esito', 'no'); end if;
  if v.errori >= 10 then return jsonb_build_object('esito', 'fermo', 'messaggio', 'Accesso fermo: chiedi all''admin di rimettere il PIN.'); end if;
  if v.bloccato_fino > now() then
    return jsonb_build_object('esito', 'fermo', 'messaggio', 'Troppi errori: riprova alle ' || to_char(v.bloccato_fino at time zone 'Europe/Rome', 'HH24:MI') || '.');
  end if;
  if p_pin is null or p_pin !~ '^\d{4}$' or crypt(p_pin, v.pin_hash) <> v.pin_hash then
    update accesso_pin set errori = errori + 1,
      bloccato_fino = case when (errori + 1) % 5 = 0 then now() + interval '15 minutes' else bloccato_fino end
      where nome = v.nome;
    return jsonb_build_object('esito', 'no');
  end if;
  select u.email, p.ruolo into v_email, v_ruolo from auth.users u left join profilo p on p.id = u.id where u.id = v.id_utente;
  if v_email is null or v_ruolo is null or v_ruolo = 'admin' or v_ruolo = 'cliente' then
    return jsonb_build_object('esito', 'no');
  end if;
  update accesso_pin set errori = 0, bloccato_fino = null, ultimo_accesso = now() where nome = v.nome;
  return jsonb_build_object('esito', 'ok', 'email', v_email);
end $$;
revoke all on function pin_entra(text, text) from public, anon, authenticated;
grant execute on function pin_entra(text, text) to service_role;

create or replace function pin_imposta(p_nome text, p_id_utente uuid, p_pin text) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_ruolo ruolo_utente;
begin
  if ruolo_corrente() is distinct from 'admin' then raise exception 'solo un admin' using errcode = '42501'; end if;
  if p_pin !~ '^\d{4}$' then return jsonb_build_object('esito', 'pin', 'messaggio', 'Il PIN è di 4 cifre.'); end if;
  if p_pin in ('0000', '1111', '1234', '2222', '4321', '9999') then
    return jsonb_build_object('esito', 'pin', 'messaggio', 'PIN troppo facile.');
  end if;
  select ruolo into v_ruolo from profilo where id = p_id_utente;
  if v_ruolo is null or v_ruolo in ('admin', 'cliente') then
    return jsonb_build_object('esito', 'utente', 'messaggio', 'Il PIN è solo per rider, cassa e totem.');
  end if;
  insert into accesso_pin (nome, id_utente, pin_hash) values (lower(trim(p_nome)), p_id_utente, crypt(p_pin, gen_salt('bf', 8)))
  on conflict (id_utente) do update set nome = excluded.nome, pin_hash = excluded.pin_hash, errori = 0, bloccato_fino = null;
  return jsonb_build_object('esito', 'ok');
end $$;
revoke all on function pin_imposta(text, uuid, text) from public, anon;
grant execute on function pin_imposta(text, uuid, text) to authenticated;

create or replace function pin_elenco() returns table (id_utente uuid, email text, ruolo text, nome text, errori int, bloccato boolean, ultimo_accesso timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select u.id, u.email::text, p.ruolo::text, a.nome, coalesce(a.errori, 0),
         coalesce(a.errori >= 10 or a.bloccato_fino > now(), false), a.ultimo_accesso
    from auth.users u join profilo p on p.id = u.id
    left join accesso_pin a on a.id_utente = u.id
   where ruolo_corrente() = 'admin' and p.ruolo in ('rider', 'cassa', 'totem')
   order by p.ruolo, u.email
$$;
revoke all on function pin_elenco() from public, anon;
grant execute on function pin_elenco() to authenticated;
