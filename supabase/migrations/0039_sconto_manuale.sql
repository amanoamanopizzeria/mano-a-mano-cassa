-- 0039 — Lo sconto manuale in cassa (24/10/2026; REA 13, prima fila A.3).
-- In Velocissimo lo sconto battuto a mano è la terza voce di sconto: circa 190 volte al mese,
-- −1.050 € («al vicino», «per il ritardo», «arrotondo»). La cassa nuova aveva solo il coupon.
-- ordine.sconto resta il TOTALE dello sconto (coupon + manuale), così comanda, riepilogo e
-- ordine_modifica (che rifà il totale con «− sconto») non cambiano; qui si aggiungono la parte
-- manuale e il motivo, per il report e per l'OS.
alter table ordine add column if not exists sconto_manuale numeric(8,2) not null default 0;
alter table ordine add column if not exists sconto_motivo text;

create or replace function ordine_sconto_manuale(p_id uuid, p_sconto numeric, p_motivo text default null)
returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_o ordine; v_s numeric;
begin
  if not e_staff() then raise exception 'solo lo staff' using errcode = '42501'; end if;
  select * into v_o from ordine where id = p_id for update;
  if v_o.id is null then return jsonb_build_object('esito', 'non_trovato'); end if;
  if v_o.stato in ('annullato', 'consegnato', 'ritirato') then
    return jsonb_build_object('esito', 'stato_non_modificabile', 'stato', v_o.stato);
  end if;
  if p_sconto is null or p_sconto <= 0 then return jsonb_build_object('esito', 'sconto_non_valido'); end if;
  -- si toglie l'eventuale sconto manuale di prima e si mette quello nuovo, mai oltre il totale
  v_s := least(round(p_sconto, 2), v_o.totale + v_o.sconto_manuale);
  update ordine
     set totale = greatest(0, totale + sconto_manuale - v_s),
         sconto = greatest(0, sconto - sconto_manuale + v_s),
         sconto_manuale = v_s, sconto_motivo = nullif(trim(p_motivo), ''), aggiornato_il = now()
   where id = p_id
   returning * into v_o;
  return jsonb_build_object('esito', 'applicato', 'sconto', v_s, 'totale', v_o.totale);
end $$;

revoke all on function ordine_sconto_manuale(uuid, numeric, text) from public;
grant execute on function ordine_sconto_manuale(uuid, numeric, text) to authenticated;
