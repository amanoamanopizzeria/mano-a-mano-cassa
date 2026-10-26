-- «Esaurito per stasera» (REA 21, punto 5): in Velocissimo un prodotto si mette in pausa per la serata;
-- nella cassa nuova c'era solo `attivo`, che lo toglie per sempre. Ora lo staff lo segna esaurito da
-- /cassa/menu fino alle 6 di domattina (quando finisce la serata), e torna da solo.
-- Il sito e il totem non lo mostrano e non lo accettano; in cassa si vede grigio con «ESAURITO».

alter table prodotto add column if not exists esaurito_fino timestamptz;

create or replace function prodotto_esaurito(p_id uuid, p_esaurito boolean) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_fino timestamptz;
begin
  if not e_staff() then raise exception 'solo lo staff' using errcode = '42501'; end if;
  if p_esaurito then
    -- la serata finisce alle 6 di mattina, ora di Roma
    v_fino := ((date_trunc('day', (now() at time zone 'Europe/Rome') - interval '6 hours') + interval '1 day 6 hours') at time zone 'Europe/Rome');
  end if;
  update prodotto set esaurito_fino = v_fino where id = p_id;
  return jsonb_build_object('esito', 'ok', 'esaurito_fino', v_fino);
end $$;
revoke all on function prodotto_esaurito(uuid, boolean) from public, anon;
grant execute on function prodotto_esaurito(uuid, boolean) to authenticated;

do $$
declare v_def text;
begin
  -- il menù del sito non mostra gli esauriti
  v_def := pg_get_functiondef('public.sito_menu()'::regprocedure);
  v_def := replace(v_def, 'from prodotto where attivo and visibile_web)',
                          'from prodotto where attivo and visibile_web and (esaurito_fino is null or esaurito_fino <= now()))');
  if position('esaurito_fino' in v_def) = 0 then raise exception 'sito_menu: testo non trovato'; end if;
  execute v_def;

  -- gli ordini dal sito, dall'app e dal totem non accettano un prodotto esaurito
  v_def := pg_get_functiondef('public.accetta_ordine_esterno(uuid, canale_ordine, tipo_ordine, text, timestamptz, text, jsonb)'::regprocedure);
  v_def := replace(v_def, '  with tutte as (', $r$  if p_canale in ('web', 'app', 'totem') then
    select string_agg(distinct p.nome, ', ') into v_esauriti
      from jsonb_array_elements(p_righe) x(riga)
      join prodotto p on p.id = nullif(x.riga->>'id_prodotto', '')::uuid
     where p.esaurito_fino > now();
    if v_esauriti is not null then
      return jsonb_build_object('esito', 'esaurito', 'prodotti', v_esauriti);
    end if;
  end if;

  with tutte as ($r$);
  v_def := replace(v_def, '  v_pizze numeric;', '  v_pizze numeric; v_esauriti text;');
  if position('v_esauriti text' in v_def) = 0 or position('esito'', ''esaurito''' in v_def) = 0 then
    raise exception 'accetta_ordine_esterno: testo non trovato';
  end if;
  execute v_def;
end $$;

-- anche il menù del totem non mostra gli esauriti
do $$
declare v_def text;
begin
  v_def := pg_get_functiondef('public.totem_menu(text)'::regprocedure);
  v_def := replace(v_def, 'from prodotto where attivo and visibile_totem)',
                          'from prodotto where attivo and visibile_totem and (esaurito_fino is null or esaurito_fino <= now()))');
  if position('esaurito_fino' in v_def) = 0 then raise exception 'totem_menu: testo non trovato'; end if;
  execute v_def;
end $$;
