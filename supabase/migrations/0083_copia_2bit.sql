-- Il copiatore del 2Bit (Edoardo, 30/10/2026 02:40Z: «tu lo puoi già accendere… l'app cassa è solo in parallelo e
-- di prova»). Un agente sul PC di cassa legge in SOLA LETTURA gli ordini del 2Bit (app iOS/Android, sito,
-- piattaforme, banco) e ce li manda come COPIE.
--
-- La copia NON è un ordine della cassa: sta in copia_2bit, non in `ordine`. Quindi non stampa, non occupa i quarti
-- d'ora, non entra nei conti, in /api/vendite né nel CSV per l'OS (che conta già tutto da Velocissimo): niente
-- doppioni. Serve a vedere da noi, in tempo reale, quello che entra nel 2Bit, e a confrontare sera per sera.
--
-- La chiave dell'agente non esce mai dal PC: la genera il PC, qui c'è solo la sua impronta SHA-256
-- (impostazione_riservata «agente_pc_key_sha256», come la chiave del centralino). La stessa chiave serve
-- all'agente delle chiamate (segna_chiamata_pc), così sul PC c'è un solo chiave.txt.

create table if not exists copia_2bit (
  id bigint generated always as identity primary key,
  id_2bit text not null unique,      -- l'id della testata nel 2Bit
  giornata date,                     -- la serata (taglio alle 06:00 di Roma)
  origine text,                      -- come la scrive il 2Bit (codice o nome): app, sito, Deliverect, banco…
  tipo text,                         -- domicilio, asporto, tavolo, banco… come lo scrive il 2Bit
  numero text,                       -- il numero che vedono i ragazzi
  stato text,
  totale numeric(10,2),
  cliente text,
  telefono text,
  indirizzo text,
  ora_consegna timestamptz,
  creato_2bit timestamptz,
  righe jsonb,                       -- le righe dell'ordine, se l'agente le legge
  corpo jsonb not null,              -- la riga intera letta dal 2Bit, così com'è
  ricevuto_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  versioni int not null default 1    -- quante volte è cambiata nel 2Bit (stato, righe…)
);
create index if not exists copia_2bit_giornata on copia_2bit (giornata);

alter table copia_2bit enable row level security;
create policy copia_2bit_leggi on copia_2bit for select to authenticated
  using (exists (select 1 from profilo p where p.id = auth.uid() and p.ruolo in ('admin', 'cassa')));
-- nessuna policy di scrittura: scrive solo copia_2bit_salva, con la chiave dell'agente
alter publication supabase_realtime add table copia_2bit;

create or replace function chiave_agente_pc_valida(p_chiave text) returns boolean
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select p_chiave is not null and length(p_chiave) >= 32 and exists (
    select 1 from impostazione_riservata
     where chiave = 'agente_pc_key_sha256' and valore = encode(sha256(convert_to(p_chiave, 'UTF8')), 'hex'))
$$;
revoke all on function chiave_agente_pc_valida(text) from public, anon, authenticated;

create or replace function copia_2bit_salva(p_chiave text, p_ordini jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v jsonb; v_nuove int := 0; v_cambiate int := 0; v_nuova boolean; v_creato timestamptz;
begin
  if not chiave_agente_pc_valida(p_chiave) then raise exception 'chiave non valida' using errcode = '42501'; end if;
  if jsonb_typeof(p_ordini) <> 'array' or jsonb_array_length(p_ordini) > 200 then
    return jsonb_build_object('esito', 'formato');
  end if;
  for v in select * from jsonb_array_elements(p_ordini) loop
    if coalesce(v->>'id_2bit', '') = '' then continue; end if;
    v_creato := nullif(v->>'creato', '')::timestamptz;
    insert into copia_2bit as c (id_2bit, giornata, origine, tipo, numero, stato, totale, cliente, telefono, indirizzo,
                                 ora_consegna, creato_2bit, righe, corpo)
    values (v->>'id_2bit',
            ((coalesce(v_creato, now()) at time zone 'Europe/Rome') - interval '6 hours')::date,
            v->>'origine', v->>'tipo', v->>'numero', v->>'stato', nullif(v->>'totale', '')::numeric,
            v->>'cliente', v->>'telefono', v->>'indirizzo', nullif(v->>'ora_consegna', '')::timestamptz, v_creato,
            v->'righe', coalesce(v->'corpo', v))
    on conflict (id_2bit) do update set
      origine = excluded.origine, tipo = excluded.tipo, numero = excluded.numero, stato = excluded.stato,
      totale = excluded.totale, cliente = excluded.cliente, telefono = excluded.telefono, indirizzo = excluded.indirizzo,
      ora_consegna = excluded.ora_consegna, righe = excluded.righe, corpo = excluded.corpo,
      aggiornato_il = now(), versioni = c.versioni + 1
     where (c.corpo, c.righe) is distinct from (excluded.corpo, excluded.righe)
    returning (xmax = 0) into v_nuova;
    if v_nuova is true then v_nuove := v_nuove + 1; elsif v_nuova is false then v_cambiate := v_cambiate + 1; end if;
    v_nuova := null;
  end loop;
  return jsonb_build_object('esito', 'ok', 'nuove', v_nuove, 'cambiate', v_cambiate);
end $$;
revoke all on function copia_2bit_salva(text, jsonb) from public;
grant execute on function copia_2bit_salva(text, jsonb) to anon, authenticated;

-- L'agente delle chiamate con la stessa chiave del PC (oltre a TELEFONO_KEY, che resta valida).
create or replace function segna_chiamata_pc(p_numero text, p_chiave text) returns uuid
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_id uuid;
begin
  if not chiave_agente_pc_valida(p_chiave) then raise exception 'chiave non valida' using errcode = '42501'; end if;
  insert into chiamata (numero, origine) values (p_numero, 'pc2bit') returning id into v_id;
  return v_id;
end $$;
revoke all on function segna_chiamata_pc(text, text) from public;
grant execute on function segna_chiamata_pc(text, text) to anon, authenticated;
