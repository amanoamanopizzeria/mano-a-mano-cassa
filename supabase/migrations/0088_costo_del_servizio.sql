-- «Costo del servizio» al posto di «Coperto» (Edoardo, 31/10/2026 02:18Z): «quando dici quanti sono i coperti,
-- poi nello scontrino andrà il costo del servizio, 1,50 euro per ogni persona». La riga che il conto del tavolo
-- aggiunge da sola (mig. 0065/0086) si chiama così anche sullo scontrino. Nel 2Bit è la riga COPERTO a 1,50 €,
-- IVA 10 %, una per persona (V, 111 righe in 30 giorni): stesso prezzo, stessa IVA, nome nostro.
-- Le righe già scritte «Coperto» restano com'erano: il controllo «c'è già» le riconosce tutte e due.
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
                        and r.descrizione in ('Costo del servizio', 'Coperto') and r.id_prodotto is null) then
    select n.prezzo_coperto into v_prezzo from negozio n join ordine o on o.id_negozio = n.id where o.id = v_primo;
    v_cop := coalesce(v_prezzo, 1.50) * v_tav.coperti;
    if v_cop > 0 then
      insert into ordine_riga (id_ordine, descrizione, quantita, prezzo_unit, destinazione)
      values (v_primo, 'Costo del servizio', v_tav.coperti, coalesce(v_prezzo, 1.50), 'nessuna');
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
