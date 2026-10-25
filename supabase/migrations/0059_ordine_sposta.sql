-- L'orologio a destra di ogni ordine, come in 2Bit (Edoardo, 25/10/2026): «questa me la metti in quell'altro
-- quarto d'ora». Cambia solo l'ora di consegna: una comanda non ancora stampata esce col blocco del quarto
-- d'ora nuovo; una già stampata non si ristampa (la cucina ce l'ha già in mano).
create or replace function ordine_sposta(p_id uuid, p_ora timestamptz) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare o ordine;
begin
  if not e_staff() then raise exception 'Solo lo staff'; end if;
  select * into o from ordine where id = p_id;
  if o.id is null then raise exception 'Ordine non trovato'; end if;
  if o.stato in ('consegnato', 'ritirato', 'annullato') then raise exception 'Ordine già chiuso: non si sposta'; end if;
  update ordine set ora_consegna = p_ora, aggiornato_il = now() where id = p_id;
  return jsonb_build_object('esito', 'spostato', 'ora', p_ora);
end $$;
revoke all on function ordine_sposta(uuid, timestamptz) from public, anon;
grant execute on function ordine_sposta(uuid, timestamptz) to authenticated;
