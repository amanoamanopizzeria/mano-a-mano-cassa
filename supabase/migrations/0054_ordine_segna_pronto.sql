-- La cucina segna «pronto» anche quando il rider ha già preso la consegna (critico giro 25): l'ordine
-- resta 'in_consegna', si scrive solo pronto_il, e il rider vede «pronto in cucina» (consegne_rider3).
create or replace function ordine_segna_pronto(p_id uuid) returns timestamptz
language plpgsql security definer set search_path = public, pg_temp as $$
declare v timestamptz;
begin
  if not e_staff() then raise exception 'Solo lo staff'; end if;
  update ordine set pronto_il = coalesce(pronto_il, now()), aggiornato_il = now()
   where id = p_id and stato in ('ricevuto', 'in_preparazione', 'pronto', 'in_consegna')
  returning pronto_il into v;
  if v is null then raise exception 'Ordine non trovato o già chiuso'; end if;
  return v;
end $$;
revoke all on function ordine_segna_pronto(uuid) from public, anon;
grant execute on function ordine_segna_pronto(uuid) to authenticated;
