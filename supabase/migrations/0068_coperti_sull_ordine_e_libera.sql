-- Critico giro 29 (26/10/2026): il coperto si perdeva o lo pagava il tavolo sbagliato.
-- 1) «Libera» liberava un tavolo con ordini ancora aperti, e il gruppo dopo li pagava nel suo conto.
--    Ora tavolo_libera rifiuta se ci sono ordini aperti: prima si incassano o si annullano.
-- 2) Un tavolo aperto da /cassa/nuovo restava a 0 coperti, quindi senza coperto. tavolo_coperti li
--    imposta o li corregge su un tavolo già occupato (la sala li chiede al conto se mancano).
-- 3) L'export a 40 colonne per l'OS leggeva i coperti dal tavolo, che si azzera al conto: dava sempre
--    0. Ora i coperti restano sull'ordine che porta la riga «Coperto» (ordine.coperti).

alter table ordine add column if not exists coperti int;

-- i conti già chiusi col coperto: i coperti dalla riga
update ordine o set coperti = r.q
  from (select id_ordine, sum(quantita)::int q from ordine_riga where descrizione = 'Coperto' and id_prodotto is null group by 1) r
 where r.id_ordine = o.id and o.coperti is null;

create or replace function tavolo_libera(p_id_tavolo uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_n int;
begin
  if not e_staff() then raise exception 'solo lo staff' using errcode = '42501'; end if;
  select count(*) into v_n from ordine
   where id_tavolo = p_id_tavolo and stato not in ('annullato', 'ritirato', 'consegnato');
  if v_n > 0 then return jsonb_build_object('esito', 'ordini_aperti', 'ordini', v_n); end if;
  update tavolo set stato = 'libero', aperto_il = null, coperti = 0 where id = p_id_tavolo;
  return jsonb_build_object('esito', 'libero');
end $$;
revoke all on function tavolo_libera(uuid) from public, anon;
grant execute on function tavolo_libera(uuid) to authenticated;

create or replace function tavolo_coperti(p_id_tavolo uuid, p_coperti int) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if not e_staff() then raise exception 'solo lo staff' using errcode = '42501'; end if;
  if p_coperti is null or p_coperti < 1 or p_coperti > 60 then return jsonb_build_object('esito', 'coperti_non_validi'); end if;
  update tavolo set coperti = p_coperti,
         stato = case when stato = 'libero' then 'occupato' else stato end,
         aperto_il = coalesce(aperto_il, now())
   where id = p_id_tavolo;
  return jsonb_build_object('esito', 'ok', 'coperti', p_coperti);
end $$;
revoke all on function tavolo_coperti(uuid, int) from public, anon;
grant execute on function tavolo_coperti(uuid, int) to authenticated;

create or replace function tavolo_conto_chiudi(p_id_tavolo uuid, p_pagamento text) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_n int; v_tot numeric; v_tav tavolo; v_primo uuid; v_prezzo numeric; v_cop numeric := 0;
begin
  if not e_staff() then raise exception 'solo lo staff' using errcode = '42501'; end if;
  if p_pagamento not in ('contanti', 'pos') then return jsonb_build_object('esito', 'pagamento_non_ammesso'); end if;
  select * into v_tav from tavolo where id = p_id_tavolo for update;

  select o.id into v_primo from ordine o
   where o.id_tavolo = p_id_tavolo and o.stato not in ('annullato', 'ritirato', 'consegnato')
   order by o.creato_il limit 1;
  if v_primo is not null and coalesce(v_tav.coperti, 0) > 0
     and not exists (select 1 from ordine_riga r join ordine o on o.id = r.id_ordine
                      where o.id_tavolo = p_id_tavolo and o.stato not in ('annullato', 'ritirato', 'consegnato')
                        and r.descrizione = 'Coperto' and r.id_prodotto is null) then
    select n.prezzo_coperto into v_prezzo from negozio n join ordine o on o.id_negozio = n.id where o.id = v_primo;
    v_cop := coalesce(v_prezzo, 1.50) * v_tav.coperti;
    if v_cop > 0 then
      insert into ordine_riga (id_ordine, descrizione, quantita, prezzo_unit, destinazione)
      values (v_primo, 'Coperto', v_tav.coperti, coalesce(v_prezzo, 1.50), 'nessuna');
      update ordine set totale = totale + v_cop, coperti = v_tav.coperti, aggiornato_il = now() where id = v_primo;
    end if;
  end if;

  with chiusi as (
    update ordine
       set pagamento = p_pagamento, stato = 'ritirato', aggiornato_il = now()
     where id_tavolo = p_id_tavolo and stato not in ('annullato', 'ritirato', 'consegnato')
     returning totale
  )
  select count(*), coalesce(sum(totale), 0) into v_n, v_tot from chiusi;
  update tavolo set stato = 'libero', aperto_il = null, coperti = 0 where id = p_id_tavolo;
  return jsonb_build_object('esito', 'chiuso', 'ordini', v_n, 'totale', v_tot, 'coperto', v_cop);
end $$;

-- l'export per l'OS legge i coperti dall'ordine, non dal tavolo (che si azzera al conto)
do $$
declare v_def text;
begin
  v_def := pg_get_functiondef('public.ordini_giornata(date)'::regprocedure);
  v_def := replace(v_def, $r$case when o.tipo = 'tavolo' and t.coperti is not null then t.coperti::text else '' end$r$,
                          $r$case when o.tipo = 'tavolo' and coalesce(o.coperti, 0) > 0 then o.coperti::text else '' end$r$);
  if position('o.coperti' in v_def) = 0 then raise exception 'ordini_giornata: testo dei coperti non trovato'; end if;
  execute v_def;

  v_def := pg_get_functiondef('public.vendite_giornata_totali(date)'::regprocedure);
  v_def := replace(v_def, 'sum(t.coperti)', 'sum(x.coperti)');
  if position('sum(x.coperti)' in v_def) = 0 then raise exception 'vendite_giornata_totali: testo dei coperti non trovato'; end if;
  execute v_def;
end $$;
