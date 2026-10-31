-- Tavoli uniti, di nuovo (Edoardo, 31/10/2026 00:31Z): «torniamo alla grafica dei tavoli che abbiamo già fatto… prevedere
-- la possibilità di unire i tavoli anche graficamente, tipo trascini i tavoli… un tavolo a 6 prende il tavolo 1, 2 e 3
-- e li unisce, e deve sempre mettere quanti sono i coperti». È la sala del 30/10 03:31Z (mig. 0081), annullata alle
-- 03:38Z insieme alla Home (mig. 0082) e ora ripresa:
-- 1) i nomi come li chiama lui e come li chiama il 2Bit (il 30/10 c'erano il 6 e il 12): dentro D1…D10 → 1…10, fuori
--    F1…F5 → 11…15. Solo i tavoli attivi; gli ordini puntano al tavolo per id e non cambiano.
-- 2) tavolo.unito_a, tavolo_unisci e tavolo_separa ci sono ancora da 0081 (0082 non li aveva tolti).
-- 3) Chiudendo il conto o liberando il tavolo, il gruppo si scioglie da solo: tavolo_libera e tavolo_conto_chiudi
--    tornano come in 0081.
-- Il 2Bit fa lo stesso con PIZ_tabTavoliUniti (coppie «unito → principale») e chiede sempre i coperti (REA 35).
update tavolo set numero = regexp_replace(numero, '\D', '', 'g')
 where attivo and zona = 'dentro' and numero ~ '^D\d+$';
update tavolo set numero = (regexp_replace(numero, '\D', '', 'g')::int + 10)::text
 where attivo and zona = 'fuori' and numero ~ '^F\d+$';

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
