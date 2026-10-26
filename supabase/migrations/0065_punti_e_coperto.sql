-- Punti e coperto (Edoardo, 25/10/2026)
-- 1) I punti: 1 punto ogni 5 € pagati, IVA compresa, sui prodotti e sui coperti; la consegna
--    non fa punti. Prima era 1 punto per euro sul totale con la consegna dentro.
-- 2) Il coperto: chi mangia qui paga 1,50 € a persona. Il tavolo teneva il numero dei coperti
--    ma il conto non li faceva pagare. Al conto si aggiunge una riga «Coperto» (una volta sola)
--    al primo ordine aperto del tavolo, così entra nel totale, nell'export e nei punti.

alter table negozio add column if not exists prezzo_coperto numeric(6,2) not null default 1.50;
update negozio set punti_per_euro = 0.20 where punti_per_euro = 1;

create or replace function punti_da_ordine() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_pe numeric; v_punti int;
begin
  if new.id_cliente is not null and new.stato in ('consegnato', 'ritirato') and old.stato is distinct from new.stato
     and not exists (select 1 from cliente_punti_movimento m where m.id_ordine = new.id and m.punti > 0) then
    select punti_per_euro into v_pe from negozio where id = new.id_negozio;
    -- il totale è già al netto degli sconti; si toglie la consegna, che non fa punti
    v_punti := floor(greatest(0, new.totale - coalesce(new.costo_consegna, 0)) * coalesce(v_pe, 0));
    if v_punti > 0 then
      update cliente set punti = punti + v_punti where id = new.id_cliente;
      insert into cliente_punti_movimento (id_cliente, punti, motivo, id_ordine) values (new.id_cliente, v_punti, 'ordine ' || new.numero, new.id);
    end if;
  end if;
  if new.id_cliente is not null and new.stato = 'annullato' and old.stato is distinct from new.stato then
    select coalesce(sum(m.punti), 0) into v_punti from cliente_punti_movimento m where m.id_ordine = new.id and m.motivo like 'ordine %';
    if v_punti > 0 then
      update cliente set punti = greatest(0, punti - v_punti) where id = new.id_cliente;
      insert into cliente_punti_movimento (id_cliente, punti, motivo, id_ordine) values (new.id_cliente, -v_punti, 'annullato ' || new.numero, new.id);
    end if;
  end if;
  return new;
end $$;

create or replace function tavolo_conto_chiudi(p_id_tavolo uuid, p_pagamento text) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_n int; v_tot numeric; v_tav tavolo; v_primo uuid; v_prezzo numeric; v_cop numeric := 0;
begin
  if not e_staff() then raise exception 'solo lo staff' using errcode = '42501'; end if;
  if p_pagamento not in ('contanti', 'pos') then return jsonb_build_object('esito', 'pagamento_non_ammesso'); end if;
  select * into v_tav from tavolo where id = p_id_tavolo for update;

  -- il coperto: una riga sola sul primo ordine aperto, se non c'è già
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
      update ordine set totale = totale + v_cop, aggiornato_il = now() where id = v_primo;
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
