-- Tavoli (Edoardo, 30/10/2026 03:25Z): «chiamandoli semplicemente 1, 2… fuori sono 11, 12, 13, 14, 15» e «io voglio
-- unire 1 e 2, o 11 e 12: vanno uniti e disegnati come un tavolo solo».
--
-- 1) I nomi: dentro D1…D10 → 1…10, fuori F1…F5 → 11…15. Solo i tavoli attivi; gli spenti (D11…, F6…) restano
--    come sono, così i nomi non si scontrano. Gli ordini puntano al tavolo per id: non cambiano.
-- 2) tavolo.unito_a: il tavolo «principale» del gruppo. Unendo 2 a 1, il 2 punta all'1: gli ordini, i coperti e il
--    conto stanno sull'1, la piantina li disegna come un tavolone «1+2». Il 2 resta «occupato», così nessuno ci
--    batte un ordine da /cassa/nuovo.
-- 3) tavolo_unisci(principale, altro) e tavolo_separa(principale).
-- 4) Quando il conto si chiude o il tavolo si libera, il gruppo si scioglie da solo e tornano 1 e 2 liberi.

update tavolo set numero = regexp_replace(numero, '\D', '', 'g')
 where attivo and zona = 'dentro' and numero ~ '^D\d+$';
update tavolo set numero = (regexp_replace(numero, '\D', '', 'g')::int + 10)::text
 where attivo and zona = 'fuori' and numero ~ '^F\d+$';

alter table tavolo add column if not exists unito_a uuid references tavolo(id);

create or replace function tavolo_unisci(p_principale uuid, p_altro uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_p tavolo; v_a tavolo;
begin
  if not e_staff() then raise exception 'solo lo staff' using errcode = '42501'; end if;
  if p_principale = p_altro then return jsonb_build_object('esito', 'stesso'); end if;
  select * into v_p from tavolo where id = p_principale for update;
  select * into v_a from tavolo where id = p_altro for update;
  if v_p.id is null or v_a.id is null then return jsonb_build_object('esito', 'nessuno'); end if;
  if v_p.unito_a is not null then return jsonb_build_object('esito', 'principale_unito'); end if;
  if v_a.unito_a is not null or exists (select 1 from tavolo where unito_a = v_a.id) then
    return jsonb_build_object('esito', 'gia_unito', 'messaggio', 'Il tavolo ' || v_a.numero || ' è già unito a un altro.');
  end if;
  if v_a.stato <> 'libero' or exists (select 1 from ordine where id_tavolo = v_a.id and stato not in ('annullato', 'ritirato', 'consegnato')) then
    return jsonb_build_object('esito', 'occupato', 'messaggio', 'Il tavolo ' || v_a.numero || ' non è libero.');
  end if;
  update tavolo set unito_a = v_p.id, stato = 'occupato', aperto_il = coalesce(v_p.aperto_il, now()), coperti = 0 where id = v_a.id;
  return jsonb_build_object('esito', 'ok');
end $$;
revoke all on function tavolo_unisci(uuid, uuid) from public, anon;
grant execute on function tavolo_unisci(uuid, uuid) to authenticated;

create or replace function tavolo_separa(p_principale uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_n int;
begin
  if not e_staff() then raise exception 'solo lo staff' using errcode = '42501'; end if;
  with sciolti as (
    update tavolo set unito_a = null, stato = 'libero', aperto_il = null, coperti = 0
     where unito_a = p_principale returning 1
  ) select count(*) into v_n from sciolti;
  return jsonb_build_object('esito', 'ok', 'separati', v_n);
end $$;
revoke all on function tavolo_separa(uuid) from public, anon;
grant execute on function tavolo_separa(uuid) to authenticated;

-- tavolo_libera e tavolo_conto_chiudi come in 0068/0041, più lo scioglimento del gruppo.
create or replace function tavolo_libera(p_id_tavolo uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_n int;
begin
  if not e_staff() then raise exception 'solo lo staff' using errcode = '42501'; end if;
  select count(*) into v_n from ordine
   where id_tavolo = p_id_tavolo and stato not in ('annullato', 'ritirato', 'consegnato');
  if v_n > 0 then return jsonb_build_object('esito', 'ordini_aperti', 'ordini', v_n); end if;
  update tavolo set stato = 'libero', aperto_il = null, coperti = 0, unito_a = null where id = p_id_tavolo or unito_a = p_id_tavolo;
  return jsonb_build_object('esito', 'libero');
end $$;

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
  update tavolo set stato = 'libero', aperto_il = null, coperti = 0, unito_a = null where id = p_id_tavolo or unito_a = p_id_tavolo;
  return jsonb_build_object('esito', 'chiuso', 'ordini', v_n, 'totale', v_tot, 'coperto', v_cop);
end $$;
