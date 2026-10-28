-- Controllo ECC del 26/10/2026, punto grave: la regola profilo_self_upd (0002) lasciava a chiunque
-- modificare il proprio profilo senza limiti, quindi chi si registrava poteva mettersi ruolo = 'admin'
-- (o un id_rider) e leggere clienti, ordini e incassi. Da qui in poi ruolo, rider e negozio li cambia
-- solo un admin, il pannello di Supabase o una funzione nostra (che gira come proprietario, non come
-- «authenticated»). Il proprio nome si può ancora cambiare. Trigger invece di toccare la regola: col
-- connettore drop e revoke possono restare appesi.
create or replace function public.profilo_campi_protetti() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  -- niente security definer: current_user è chi scrive davvero (dentro una funzione nostra è il proprietario)
  if current_user in ('anon', 'authenticated') then
    if coalesce(ruolo_corrente() = 'admin', false) then
      return new;
    end if;
    if new.id is distinct from old.id
       or new.ruolo is distinct from old.ruolo
       or new.id_rider is distinct from old.id_rider
       or new.id_negozio is distinct from old.id_negozio then
      raise exception 'ruolo, rider e negozio li cambia solo un admin' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.profilo_campi_protetti() from public, anon, authenticated;

create or replace trigger profilo_campi_protetti before update on profilo
  for each row execute function public.profilo_campi_protetti();
