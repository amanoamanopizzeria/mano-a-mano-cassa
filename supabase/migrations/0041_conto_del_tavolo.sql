-- 0041 — Il conto del tavolo (24/10/2026; critico giri 10–11: «Conto» senza conto, Sala voto 4).
-- In Velocissimo/2Bit il tavolo è un preconto: si leggono le righe di tutti gli ordini del tavolo,
-- si incassa (contanti o POS) e il tavolo si libera. Qui tavolo_conto_chiudi fa tutto in una
-- transazione: segna il pagamento su ogni ordine aperto del tavolo, li porta a «ritirato» (il
-- cliente ha mangiato e pagato: è lo stato di chiusura dei non-domicilio, qualunque fosse il passo
-- in cucina), e libera il tavolo. Solo lo staff. La lettura del conto la fa la pagina (RLS staff).
create or replace function tavolo_conto_chiudi(p_id_tavolo uuid, p_pagamento text)
returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_n int; v_tot numeric;
begin
  if not e_staff() then raise exception 'solo lo staff' using errcode = '42501'; end if;
  if p_pagamento not in ('contanti', 'pos') then return jsonb_build_object('esito', 'pagamento_non_ammesso'); end if;
  with chiusi as (
    update ordine
       set pagamento = p_pagamento, stato = 'ritirato', aggiornato_il = now()
     where id_tavolo = p_id_tavolo and stato not in ('annullato', 'ritirato', 'consegnato')
     returning totale
  )
  select count(*), coalesce(sum(totale), 0) into v_n, v_tot from chiusi;
  update tavolo set stato = 'libero', aperto_il = null, coperti = 0 where id = p_id_tavolo;
  return jsonb_build_object('esito', 'chiuso', 'ordini', v_n, 'totale', v_tot);
end $$;

revoke all on function tavolo_conto_chiudi(uuid, text) from public;
grant execute on function tavolo_conto_chiudi(uuid, text) to authenticated;
