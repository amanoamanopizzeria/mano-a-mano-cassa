-- Mano a Mano Cassa — Fase 1: ruoli, sicurezza (RLS) e tempo reale
-- Chi può vedere/fare cosa, e quali tabelle trasmettono in realtime.

-- ========== Ruoli e profili ==========
-- Ogni utente autenticato (Supabase Auth) ha un profilo con un ruolo.
create type ruolo_utente as enum ('admin','cassa','rider','cliente','totem');

create table profilo (
  id          uuid primary key references auth.users(id) on delete cascade,
  ruolo       ruolo_utente not null default 'cliente',
  id_negozio  uuid references negozio(id) on delete set null,
  id_rider    uuid references rider(id) on delete set null,  -- se ruolo = rider
  nome        text,
  creato_il   timestamptz not null default now()
);
alter table profilo enable row level security;

-- helper: ruolo dell'utente corrente (SECURITY DEFINER per evitare ricorsione RLS)
create or replace function ruolo_corrente() returns ruolo_utente
  language sql stable security definer set search_path = public as $$
  select ruolo from profilo where id = auth.uid()
$$;

create or replace function rider_corrente() returns uuid
  language sql stable security definer set search_path = public as $$
  select id_rider from profilo where id = auth.uid()
$$;

-- staff = chi lavora dentro (admin/cassa/totem)
create or replace function e_staff() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(ruolo_corrente() in ('admin','cassa','totem'), false)
$$;

-- ciascuno vede il proprio profilo; lo staff li vede tutti
create policy profilo_self on profilo for select using (id = auth.uid() or e_staff());
create policy profilo_self_upd on profilo for update using (id = auth.uid() or ruolo_corrente() = 'admin');

-- ========== RLS sulle tabelle del dominio ==========
alter table negozio          enable row level security;
alter table gruppo_categoria enable row level security;
alter table categoria        enable row level security;
alter table prodotto         enable row level security;
alter table variazione       enable row level security;
alter table cliente          enable row level security;
alter table zona             enable row level security;
alter table indirizzo        enable row level security;
alter table stampante        enable row level security;
alter table rider            enable row level security;
alter table ordine           enable row level security;
alter table ordine_riga      enable row level security;
alter table pagamento        enable row level security;
alter table consegna         enable row level security;
alter table rider_posizione  enable row level security;

-- Menù e anagrafiche "pubbliche" (listino, categorie, zone): lettura a tutti gli
-- autenticati; scrittura solo staff.
do $$
declare t text;
begin
  foreach t in array array['negozio','gruppo_categoria','categoria','prodotto','variazione','zona'] loop
    execute format('create policy %1$s_read on %1$I for select using (auth.role() = ''authenticated'')', t);
    execute format('create policy %1$s_write on %1$I for all using (e_staff()) with check (e_staff())', t);
  end loop;
end $$;

-- Stampanti e clienti/indirizzi: solo staff.
create policy stampante_staff on stampante for all using (e_staff()) with check (e_staff());
create policy cliente_staff   on cliente   for all using (e_staff()) with check (e_staff());
create policy indirizzo_staff on indirizzo for all using (e_staff()) with check (e_staff());

-- Rider: lo staff gestisce tutto; il rider legge la propria scheda.
create policy rider_staff on rider for all using (e_staff()) with check (e_staff());
create policy rider_self  on rider for select using (id = rider_corrente());

-- Ordini: lo staff vede/gestisce tutto.
create policy ordine_staff      on ordine      for all using (e_staff()) with check (e_staff());
create policy ordine_riga_staff on ordine_riga for all using (e_staff()) with check (e_staff());
create policy pagamento_staff   on pagamento   for all using (e_staff()) with check (e_staff());

-- Il rider vede le righe/ordini delle consegne che lo riguardano (sola lettura).
create policy ordine_rider on ordine for select using (
  ruolo_corrente() = 'rider' and exists (
    select 1 from consegna c where c.id_ordine = ordine.id and c.id_rider = rider_corrente()
  )
);
create policy ordine_riga_rider on ordine_riga for select using (
  ruolo_corrente() = 'rider' and exists (
    select 1 from consegna c where c.id_ordine = ordine_riga.id_ordine and c.id_rider = rider_corrente()
  )
);

-- Consegne: staff tutto; il rider vede le proprie e può aggiornarne lo stato.
create policy consegna_staff on consegna for all using (e_staff()) with check (e_staff());
create policy consegna_rider_read on consegna for select using (id_rider = rider_corrente());
create policy consegna_rider_upd  on consegna for update using (id_rider = rider_corrente());
-- auto-assegnazione: il rider prende una consegna libera assegnandola a sé
create policy consegna_rider_take on consegna for update
  using (ruolo_corrente() = 'rider' and stato = 'da_assegnare')
  with check (id_rider = rider_corrente());

-- Posizione rider: lo staff legge tutto; il rider scrive la propria.
create policy rider_pos_staff on rider_posizione for select using (e_staff());
create policy rider_pos_self  on rider_posizione for insert with check (id_rider = rider_corrente());

-- ========== Tempo reale ==========
-- La cassa vede gli ordini comparire/aggiornarsi; la cassa e il cliente vedono
-- la consegna e la posizione del rider muoversi sulla mappa.
alter publication supabase_realtime add table ordine;
alter publication supabase_realtime add table ordine_riga;
alter publication supabase_realtime add table consegna;
alter publication supabase_realtime add table rider_posizione;

-- Nota: la creazione dei profili alla registrazione (trigger su auth.users) e il
-- flusso per totem/cliente anonimo verranno definiti col setup di Auth reale.
