-- La pagina d'ordine NOSTRA (/ordina), REA punto 6 di docs/rea/10: il cliente ordina senza passare
-- da Velocissimo. Tre porte per anon, come il totem (mig. 0017) ma senza chiave, perché la pagina è
-- pubblica: il menù del sito, le fasce libere del giorno e l'ordine stesso.
--
-- Regole che valgono per tutte e tre:
--  - i PREZZI li decide il database, mai il browser: ogni riga si riprezza da prodotto e variazione,
--    una riga con un prodotto sconosciuto o un ingrediente inventato fa saltare l'ordine;
--  - l'indirizzo passa da zona_per_punto (zone vere del back-office): fuori zona non si ordina;
--  - il telefono si normalizza come cerca_cliente (le ultime 9 cifre): il cliente che ha già
--    ordinato per telefono si ritrova, non si duplica;
--  - un freno: al massimo 3 ordini ogni 15 minuti per telefono e 40 dal sito ogni 10 minuti in tutto.

-- 1) il menù del sito: categorie e prodotti visibile_web, gli stessi gruppi e pacchetti del totem
create or replace function sito_menu() returns jsonb
language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
declare v_negozio negozio;
begin
  select * into v_negozio from negozio where attivo order by creato_il limit 1;
  return jsonb_build_object(
    'negozio', jsonb_build_object('nome', v_negozio.nome, 'indirizzo', v_negozio.indirizzo, 'preordini_giorni', coalesce(v_negozio.preordini_giorni, 7),
                                  'attesa_domicilio', coalesce(v_negozio.attesa_min_domicilio, 15), 'attesa_ritiro', coalesce(v_negozio.attesa_min_ritiro, 15)),
    'categorie', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'nome', nome, 'ordine', ordine, 'colore', colore, 'destinazione', destinazione, 'visibile_totem', visibile_totem) order by ordine) from categoria where visibile_web), '[]'::jsonb),
    'prodotti',  coalesce((select jsonb_agg(jsonb_build_object('id', id, 'id_categoria', id_categoria, 'nome', nome, 'descrizione', descrizione, 'prezzo', prezzo, 'prezzo_tavolo', null, 'foto_url', foto_url, 'visibile_totem', visibile_totem, 'incluso', incluso) order by ordine, nome) from prodotto where attivo and visibile_web), '[]'::jsonb),
    'varianti',  coalesce((select jsonb_agg(jsonb_build_object('id', id, 'nome', nome, 'prezzo', prezzo, 'gruppo', gruppo, 'id_categoria', id_categoria) order by gruppo, nome) from variazione), '[]'::jsonb),
    'gruppi',    coalesce((select jsonb_agg(jsonb_build_object('id_categoria', id_categoria, 'gruppo', gruppo, 'ordine', ordine, 'min_n', min_n, 'max_n', max_n, 'max_gratis', max_gratis) order by id_categoria, ordine) from categoria_gruppo_variazione), '[]'::jsonb),
    'pacchetti', coalesce((select jsonb_agg(jsonb_build_object('id', g.id, 'id_pacchetto', g.id_pacchetto, 'etichetta', g.etichetta, 'quantita', g.quantita, 'ordine', g.ordine,
                   'scelte', (select coalesce(jsonb_agg(s.id_prodotto), '[]'::jsonb) from pacchetto_scelta s where s.id_gruppo = g.id)) order by g.id_pacchetto, g.ordine) from pacchetto_gruppo g), '[]'::jsonb),
    'orari', coalesce((select jsonb_agg(jsonb_build_object('giorno', giorno_settimana, 'tipo', tipo, 'dalle', dalle, 'alle', alle) order by giorno_settimana, tipo) from orario where id_negozio = v_negozio.id), '[]'::jsonb)
  );
end $$;
revoke all on function sito_menu() from public;
grant execute on function sito_menu() to anon, authenticated;

-- 2) le fasce di un giorno per domicilio o ritiro: solo quelle dentro l'orario di quel tipo, da adesso
--    più l'attesa in poi; «piena» quando il quarto d'ora non ha più posto (pizze, o consegne se a domicilio).
--    Niente numeri di occupazione al cliente: solo libera o piena.
create or replace function sito_fasce(p_tipo tipo_ordine, p_giorno date) returns jsonb
language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
declare v_negozio negozio; v_orario record; v_da timestamptz; v_attesa int;
begin
  select * into v_negozio from negozio where attivo order by creato_il limit 1;
  if p_tipo not in ('domicilio', 'ritiro') then return jsonb_build_object('esito', 'tipo_non_ammesso'); end if;
  if p_giorno < (now() at time zone 'Europe/Rome')::date or p_giorno > (now() at time zone 'Europe/Rome')::date + coalesce(v_negozio.preordini_giorni, 7) then
    return jsonb_build_object('esito', 'giorno_non_ammesso');
  end if;
  select o.dalle, o.alle into v_orario from orario o
   where o.id_negozio = v_negozio.id and o.giorno_settimana = extract(dow from p_giorno)::int and o.tipo = p_tipo::text;
  if v_orario.dalle is null then return jsonb_build_object('esito', 'chiuso', 'fasce', '[]'::jsonb); end if;
  v_attesa := case when p_tipo = 'domicilio' then coalesce(v_negozio.attesa_min_domicilio, 15) else coalesce(v_negozio.attesa_min_ritiro, 15) end;
  v_da := now() + make_interval(mins => v_attesa);
  return jsonb_build_object('esito', 'ok', 'dalle', v_orario.dalle, 'alle', v_orario.alle,
    'fasce', coalesce((select jsonb_agg(jsonb_build_object('ora', to_char(c.ora, 'HH24:MI'), 'inizio', c.inizio,
                 'piena', c.bloccata_produzione or c.pizze_occupate >= c.pizze_max
                          or (p_tipo = 'domicilio' and (c.bloccata_consegne or c.consegne_occupate >= c.consegne_max))) order by c.ora)
              from capacita_giorno(v_negozio.id, p_giorno) c
              where c.ora >= v_orario.dalle and c.ora <= v_orario.alle and c.inizio >= v_da), '[]'::jsonb));
end $$;
revoke all on function sito_fasce(tipo_ordine, date) from public;
grant execute on function sito_fasce(tipo_ordine, date) to anon, authenticated;

-- 3) il freno
create table if not exists sito_tentativo (
  id bigserial primary key,
  telefono_chiave text,
  creato_il timestamptz not null default now()
);
alter table sito_tentativo enable row level security;
create index if not exists sito_tentativo_il on sito_tentativo(creato_il);

-- 4) l'ordine dal sito
create or replace function ordine_dal_sito(
  p_tipo tipo_ordine, p_righe jsonb, p_nome text, p_telefono text, p_ora timestamptz,
  p_pagamento text, p_note text default null, p_indirizzo jsonb default null, p_email text default null
) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_negozio negozio; v_tel_chiave text; v_nome text; v_cliente cliente; v_ind indirizzo; v_zona zona;
  v_orario record; v_ora_locale time; v_giorno date;
  r jsonb; f jsonb; v jsonb; v_prod prodotto; v_cat categoria; v_figlia prodotto;
  v_righe jsonb := '[]'::jsonb; v_riga jsonb; v_figlie jsonb; v_vars jsonb; v_var variazione; v_sub numeric := 0; v_q numeric;
  v_res jsonb; v_id uuid; v_ordine ordine; v_token text;
begin
  select * into v_negozio from negozio where attivo order by creato_il limit 1;
  if p_tipo not in ('domicilio', 'ritiro') then return jsonb_build_object('esito', 'tipo_non_ammesso'); end if;

  -- chi ordina
  v_nome := left(trim(coalesce(p_nome, '')), 60);
  if length(v_nome) < 2 then return jsonb_build_object('esito', 'manca_nome'); end if;
  v_tel_chiave := right(regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g'), 9);
  if length(v_tel_chiave) < 9 then return jsonb_build_object('esito', 'telefono_corto'); end if;
  if p_pagamento not in ('contanti', 'pos') then return jsonb_build_object('esito', 'pagamento_non_ammesso'); end if;

  -- il freno
  if (select count(*) from sito_tentativo where telefono_chiave = v_tel_chiave and creato_il > now() - interval '15 minutes') >= 3
     or (select count(*) from sito_tentativo where creato_il > now() - interval '10 minutes') >= 40 then
    return jsonb_build_object('esito', 'troppi');
  end if;
  insert into sito_tentativo (telefono_chiave) values (v_tel_chiave);

  -- quando
  if p_ora is null then return jsonb_build_object('esito', 'manca_ora'); end if;
  if p_ora < now() then return jsonb_build_object('esito', 'ora_passata'); end if;
  v_giorno := (p_ora at time zone 'Europe/Rome')::date;
  v_ora_locale := (p_ora at time zone 'Europe/Rome')::time;
  if v_giorno > (now() at time zone 'Europe/Rome')::date + coalesce(v_negozio.preordini_giorni, 7) then
    return jsonb_build_object('esito', 'giorno_non_ammesso');
  end if;
  select o.dalle, o.alle into v_orario from orario o
   where o.id_negozio = v_negozio.id and o.giorno_settimana = extract(dow from v_giorno)::int and o.tipo = p_tipo::text;
  if v_orario.dalle is null or v_ora_locale < v_orario.dalle or v_ora_locale > v_orario.alle then
    return jsonb_build_object('esito', 'fuori_orario', 'dalle', v_orario.dalle, 'alle', v_orario.alle, 'giorno', v_giorno);
  end if;

  -- le righe, riprezzate qui
  if p_righe is null or jsonb_typeof(p_righe) <> 'array' or jsonb_array_length(p_righe) = 0 then
    return jsonb_build_object('esito', 'errore', 'motivo', 'nessuna riga');
  end if;
  if jsonb_array_length(p_righe) > 40 then return jsonb_build_object('esito', 'errore', 'motivo', 'troppe righe'); end if;
  for r in select * from jsonb_array_elements(p_righe) loop
    select * into v_prod from prodotto where id = nullif(r->>'id_prodotto', '')::uuid and attivo and visibile_web;
    if v_prod.id is null then return jsonb_build_object('esito', 'errore', 'motivo', 'prodotto sconosciuto'); end if;
    select * into v_cat from categoria where id = v_prod.id_categoria;
    v_q := least(greatest(floor(coalesce((r->>'quantita')::numeric, 1)), 1), 20);
    -- gli ingredienti: ogni nome deve esistere fra le variazioni ammesse per la categoria; il prezzo è il suo
    v_vars := '[]'::jsonb;
    for v in select * from jsonb_array_elements(coalesce(r->'variazioni', '[]'::jsonb)) loop
      select * into v_var from variazione
       where nome = v->>'nome'
         and (id_categoria = v_prod.id_categoria or (id_categoria is null and gruppo in (select gruppo from categoria_gruppo_variazione where id_categoria = v_prod.id_categoria)))
       limit 1;
      if v_var.id is null then return jsonb_build_object('esito', 'errore', 'motivo', 'ingrediente sconosciuto: ' || coalesce(v->>'nome', '?')); end if;
      v_vars := v_vars || jsonb_build_object('nome', v_var.nome, 'prezzo', v_var.prezzo, 'tipo', 'aggiunta');
    end loop;
    -- le scelte del menu: solo prodotti previsti dal pacchetto, a prezzo 0
    v_figlie := '[]'::jsonb;
    for f in select * from jsonb_array_elements(coalesce(r->'figlie', '[]'::jsonb)) loop
      select p.* into v_figlia from prodotto p
       where p.id = nullif(f->>'id_prodotto', '')::uuid and p.attivo
         and exists (select 1 from pacchetto_scelta s join pacchetto_gruppo g on g.id = s.id_gruppo where g.id_pacchetto = v_prod.id and s.id_prodotto = p.id);
      if v_figlia.id is null then return jsonb_build_object('esito', 'errore', 'motivo', 'scelta del menu non prevista'); end if;
      v_figlie := v_figlie || jsonb_build_object('id_prodotto', v_figlia.id, 'descrizione', v_figlia.nome,
        'quantita', least(greatest(floor(coalesce((f->>'quantita')::numeric, 1)), 1), 10), 'prezzo_unit', 0, 'variazioni', '[]'::jsonb,
        'destinazione', coalesce((select destinazione from categoria where id = v_figlia.id_categoria), 'cucina'));
    end loop;
    v_riga := jsonb_build_object('id_prodotto', v_prod.id, 'descrizione', v_prod.nome, 'quantita', v_q, 'prezzo_unit', v_prod.prezzo,
      'variazioni', v_vars, 'note', left(nullif(trim(coalesce(r->>'note', '')), ''), 200), 'destinazione', coalesce(v_cat.destinazione, 'cucina'), 'figlie', v_figlie);
    v_righe := v_righe || v_riga;
    v_sub := v_sub + (v_prod.prezzo + coalesce((select sum((x->>'prezzo')::numeric) from jsonb_array_elements(v_vars) x), 0)) * v_q;
  end loop;

  -- dove (solo a domicilio)
  if p_tipo = 'domicilio' then
    if p_indirizzo is null or (p_indirizzo->>'lat') is null or (p_indirizzo->>'lng') is null or coalesce(p_indirizzo->>'via', '') = '' then
      return jsonb_build_object('esito', 'manca_indirizzo');
    end if;
    select zona.* into v_zona from zona_per_punto((p_indirizzo->>'lat')::double precision, (p_indirizzo->>'lng')::double precision) z
      join zona on zona.id = z.id;
    if v_zona.id is null then return jsonb_build_object('esito', 'fuori_zona'); end if;
    if v_sub < v_zona.minimo_ordine then
      return jsonb_build_object('esito', 'minimo', 'minimo', v_zona.minimo_ordine, 'subtotale', v_sub);
    end if;
  end if;

  -- il cliente: si ritrova per telefono, se no nasce
  select * into v_cliente from cliente
   where right(regexp_replace(coalesce(telefono, ''), '\D', '', 'g'), 9) = v_tel_chiave
   order by creato_il limit 1;
  if v_cliente.id is null then
    insert into cliente (nome, telefono, email) values (v_nome, left(trim(p_telefono), 20), left(nullif(trim(p_email), ''), 120)) returning * into v_cliente;
  else
    update cliente set nome = coalesce(nullif(nome, ''), v_nome), email = coalesce(email, left(nullif(trim(p_email), ''), 120)) where id = v_cliente.id;
  end if;
  if p_tipo = 'domicilio' then
    select * into v_ind from indirizzo
     where id_cliente = v_cliente.id and lower(via) = lower(p_indirizzo->>'via') and coalesce(civico, '') = coalesce(p_indirizzo->>'civico', '')
     limit 1;
    if v_ind.id is null then
      insert into indirizzo (id_cliente, via, civico, cap, citta, lat, lng, place_id)
      values (v_cliente.id, left(p_indirizzo->>'via', 120), left(p_indirizzo->>'civico', 20), left(p_indirizzo->>'cap', 10), left(coalesce(p_indirizzo->>'citta', 'Roma'), 60),
              (p_indirizzo->>'lat')::double precision, (p_indirizzo->>'lng')::double precision, left(p_indirizzo->>'place_id', 200))
      returning * into v_ind;
    end if;
  end if;

  -- l'ordine, dalla stessa porta della cassa e del totem (capacità del quarto d'ora)
  v_res := accetta_ordine_esterno(v_negozio.id, 'web', p_tipo, null, p_ora, left(nullif(trim(coalesce(p_note, '')), ''), 300), v_righe);
  if v_res->>'esito' <> 'accettato' then return v_res; end if;
  v_id := (v_res->>'id')::uuid;
  update ordine set id_cliente = v_cliente.id, nome_cliente = v_nome, pagamento = p_pagamento,
                    id_indirizzo = v_ind.id, id_zona = v_zona.id,
                    costo_consegna = coalesce(v_zona.costo_consegna, 0), totale = totale + coalesce(v_zona.costo_consegna, 0)
   where id = v_id returning * into v_ordine;
  -- la consegna nasce dal trigger all'insert col totale senza consegna: si riallinea
  if p_tipo = 'domicilio' then
    update consegna set contanti_da_incassare = v_ordine.totale where id_ordine = v_id and stato = 'da_assegnare';
    select token into v_token from consegna where id_ordine = v_id;
  end if;
  return jsonb_build_object('esito', 'accettato', 'numero', v_ordine.numero_visibile, 'totale', v_ordine.totale,
    'costo_consegna', v_ordine.costo_consegna, 'zona', v_zona.nome, 'ora', v_ordine.ora_consegna,
    'segui', case when v_token is not null then 'https://mano-a-mano-cassa.vercel.app/segui/' || v_token end);
end $$;
revoke all on function ordine_dal_sito(tipo_ordine, jsonb, text, text, timestamptz, text, text, jsonb, text) from public;
grant execute on function ordine_dal_sito(tipo_ordine, jsonb, text, text, timestamptz, text, text, jsonb, text) to anon, authenticated;
