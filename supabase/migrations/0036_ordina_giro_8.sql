-- Critico giro 8 su /ordina (24/10/2026), i tre gravi lato database.
--
-- 1) «Qui non consegniamo» a Via Novara 5: zona_per_punto non è security definer e la policy di
--    zona la legge solo authenticated, quindi dalla pagina pubblica (anon) le zone erano zero.
--    La funzione diventa security definer: dice solo in quale zona cade un punto, non elenca le zone.
alter function zona_per_punto(double precision, double precision) security definer set search_path = public, extensions, pg_temp;

-- 2) la via senza numero passava (W-20 in cassa con civico null): a domicilio il civico è obbligatorio.
-- 3) chi paga col POS al rider non dà contanti: la consegna nasce con contanti_da_incassare = 0 e il
--    borsello non la somma (W-19: 16,50 € contati in mano al rider).
create or replace function consegna_da_ordine() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_contanti numeric;
begin
  if new.tipo = 'domicilio' then
    v_contanti := case when new.pagato_online or new.pagamento = 'pos' then 0 else new.totale end;
    if not exists (select 1 from consegna c where c.id_ordine = new.id) then
      insert into consegna (id_ordine, contanti_da_incassare) values (new.id, v_contanti);
    else
      update consegna set contanti_da_incassare = v_contanti
      where id_ordine = new.id and stato in ('da_assegnare', 'assegnata', 'ritirata');
    end if;
    if new.stato = 'annullato' then
      update consegna set stato = 'annullata' where id_ordine = new.id and stato <> 'consegnata';
    elsif new.stato = 'consegnato' then
      update consegna set stato = 'consegnata', consegnata_il = coalesce(consegnata_il, now())
      where id_ordine = new.id and stato <> 'consegnata';
    end if;
  end if;
  return new;
end $$;

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

  v_nome := left(trim(coalesce(p_nome, '')), 60);
  if length(v_nome) < 2 then return jsonb_build_object('esito', 'manca_nome'); end if;
  v_tel_chiave := right(regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g'), 9);
  if length(v_tel_chiave) < 9 then return jsonb_build_object('esito', 'telefono_corto'); end if;
  if p_pagamento not in ('contanti', 'pos') then return jsonb_build_object('esito', 'pagamento_non_ammesso'); end if;

  if (select count(*) from sito_tentativo where telefono_chiave = v_tel_chiave and creato_il > now() - interval '15 minutes') >= 3
     or (select count(*) from sito_tentativo where creato_il > now() - interval '10 minutes') >= 40 then
    return jsonb_build_object('esito', 'troppi');
  end if;
  insert into sito_tentativo (telefono_chiave) values (v_tel_chiave);

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

  if p_righe is null or jsonb_typeof(p_righe) <> 'array' or jsonb_array_length(p_righe) = 0 then
    return jsonb_build_object('esito', 'errore', 'motivo', 'nessuna riga');
  end if;
  if jsonb_array_length(p_righe) > 40 then return jsonb_build_object('esito', 'errore', 'motivo', 'troppe righe'); end if;
  for r in select * from jsonb_array_elements(p_righe) loop
    select * into v_prod from prodotto where id = nullif(r->>'id_prodotto', '')::uuid and attivo and visibile_web;
    if v_prod.id is null then return jsonb_build_object('esito', 'errore', 'motivo', 'prodotto sconosciuto'); end if;
    select * into v_cat from categoria where id = v_prod.id_categoria;
    v_q := least(greatest(floor(coalesce((r->>'quantita')::numeric, 1)), 1), 20);
    v_vars := '[]'::jsonb;
    for v in select * from jsonb_array_elements(coalesce(r->'variazioni', '[]'::jsonb)) loop
      select * into v_var from variazione
       where nome = v->>'nome'
         and (id_categoria = v_prod.id_categoria or (id_categoria is null and gruppo in (select gruppo from categoria_gruppo_variazione where id_categoria = v_prod.id_categoria)))
       limit 1;
      if v_var.id is null then return jsonb_build_object('esito', 'errore', 'motivo', 'ingrediente sconosciuto: ' || coalesce(v->>'nome', '?')); end if;
      v_vars := v_vars || jsonb_build_object('nome', v_var.nome, 'prezzo', v_var.prezzo, 'tipo', 'aggiunta');
    end loop;
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

  if p_tipo = 'domicilio' then
    if p_indirizzo is null or (p_indirizzo->>'lat') is null or (p_indirizzo->>'lng') is null or coalesce(p_indirizzo->>'via', '') = '' then
      return jsonb_build_object('esito', 'manca_indirizzo');
    end if;
    if coalesce(trim(p_indirizzo->>'civico'), '') = '' then return jsonb_build_object('esito', 'manca_civico'); end if;
    select zona.* into v_zona from zona_per_punto((p_indirizzo->>'lat')::double precision, (p_indirizzo->>'lng')::double precision) z
      join zona on zona.id = z.id;
    if v_zona.id is null then return jsonb_build_object('esito', 'fuori_zona'); end if;
    if v_sub < v_zona.minimo_ordine then
      return jsonb_build_object('esito', 'minimo', 'minimo', v_zona.minimo_ordine, 'subtotale', v_sub);
    end if;
  end if;

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
      values (v_cliente.id, left(p_indirizzo->>'via', 120), left(trim(p_indirizzo->>'civico'), 20), left(p_indirizzo->>'cap', 10), left(coalesce(p_indirizzo->>'citta', 'Roma'), 60),
              (p_indirizzo->>'lat')::double precision, (p_indirizzo->>'lng')::double precision, left(p_indirizzo->>'place_id', 200))
      returning * into v_ind;
    end if;
  end if;

  v_res := accetta_ordine_esterno(v_negozio.id, 'web', p_tipo, null, p_ora, left(nullif(trim(coalesce(p_note, '')), ''), 300), v_righe);
  if v_res->>'esito' <> 'accettato' then return v_res; end if;
  v_id := (v_res->>'id')::uuid;
  update ordine set id_cliente = v_cliente.id, nome_cliente = v_nome, pagamento = p_pagamento,
                    id_indirizzo = v_ind.id, id_zona = v_zona.id,
                    costo_consegna = coalesce(v_zona.costo_consegna, 0), totale = totale + coalesce(v_zona.costo_consegna, 0)
   where id = v_id returning * into v_ordine;
  -- il trigger consegna_da_ordine ha già rifatto contanti_da_incassare (0 col POS) su questo update
  if p_tipo = 'domicilio' then
    select token into v_token from consegna where id_ordine = v_id;
  end if;
  return jsonb_build_object('esito', 'accettato', 'numero', v_ordine.numero_visibile, 'totale', v_ordine.totale,
    'costo_consegna', v_ordine.costo_consegna, 'zona', v_zona.nome, 'ora', v_ordine.ora_consegna,
    'segui', case when v_token is not null then 'https://mano-a-mano-cassa.vercel.app/segui/' || v_token end);
end $$;

-- il trigger deve scattare anche quando la cassa cambia solo il pagamento (ordine_pagamento),
-- se no «POS» dato dopo non azzera i contanti del rider
create or replace trigger ordine_consegna after insert or update of totale, stato, pagato_online, tipo, pagamento on ordine
for each row execute function consegna_da_ordine();
