-- L'import dello storico di Velocissimo (0079) dalla pagina /cassa/importa: il file lo sceglie Edoardo
-- dal suo computer, la pagina lo legge e lo manda a lotti di 1000 righe. Ogni lotto si scrive una volta
-- sola (velocissimo_import_lotto): rifare l'import dopo un errore riprende senza raddoppiare.
-- Il numero dell'ordine non è unico in Velocissimo, per questo si conta per lotto e non per numero.
create table if not exists public.velocissimo_import_lotto (
  file text not null,
  lotto int not null,
  righe int not null,
  chi uuid not null default auth.uid(),
  fatto_il timestamptz not null default now(),
  primary key (file, lotto)
);
alter table public.velocissimo_import_lotto enable row level security;
create policy velocissimo_import_lotto_leggi on public.velocissimo_import_lotto for select to authenticated
  using (exists (select 1 from public.profilo p where p.id = auth.uid() and p.ruolo in ('admin', 'cassa')));

create or replace function public.velocissimo_importa(p_file text, p_lotto int, p_righe jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare n int;
begin
  if not exists (select 1 from profilo where id = auth.uid() and ruolo in ('admin', 'cassa')) then
    raise exception 'solo la cassa' using errcode = '42501';
  end if;
  if exists (select 1 from velocissimo_import_lotto where file = p_file and lotto = p_lotto) then
    return jsonb_build_object('lotto', p_lotto, 'gia_fatto', true);
  end if;
  insert into velocissimo_ordine (numero, comanda, stato, tipo, origine, pagamento, cliente, cellulare, telefono,
    indirizzo, civico, citta, provincia, zona, gruppo_zone, rider, tavolo, sala, creato_il, ora_ordine, giornata,
    orario_ritiro, orario_richiesto, ora_associazione_rider, ora_partenza, ora_consegna, distanza, ritardo_secondi,
    totale, costo_consegna, sconto, coperti_asporto, note)
  select r->>'numero', nullif(r->>'comanda',''), nullif(r->>'stato',''), nullif(r->>'tipo',''), nullif(r->>'origine',''),
    nullif(r->>'pagamento',''), nullif(r->>'cliente',''), nullif(r->>'cellulare',''), nullif(r->>'telefono',''),
    nullif(r->>'indirizzo',''), nullif(r->>'civico',''), nullif(r->>'citta',''), nullif(r->>'provincia',''),
    nullif(r->>'zona',''), nullif(r->>'gruppo_zone',''), nullif(r->>'rider',''), nullif(r->>'tavolo',''), nullif(r->>'sala',''),
    (nullif(r->>'creato_il',''))::timestamp at time zone 'Europe/Rome',
    (nullif(r->>'ora_ordine',''))::timestamp at time zone 'Europe/Rome',
    ((nullif(r->>'ora_ordine',''))::timestamp - interval '6 hours')::date,
    nullif(r->>'orario_ritiro',''), nullif(r->>'orario_richiesto',''), nullif(r->>'ora_associazione_rider',''),
    nullif(r->>'ora_partenza',''), nullif(r->>'ora_consegna',''), nullif(r->>'distanza',''),
    (nullif(r->>'ritardo_secondi',''))::int, (nullif(r->>'totale',''))::numeric, (nullif(r->>'costo_consegna',''))::numeric,
    (nullif(r->>'sconto',''))::numeric, (nullif(r->>'coperti_asporto',''))::int, nullif(r->>'note','')
  from jsonb_array_elements(p_righe) r;
  get diagnostics n = row_count;
  insert into velocissimo_import_lotto (file, lotto, righe) values (p_file, p_lotto, n);
  return jsonb_build_object('lotto', p_lotto, 'righe', n);
end $$;
grant execute on function public.velocissimo_importa(text, int, jsonb) to authenticated;
