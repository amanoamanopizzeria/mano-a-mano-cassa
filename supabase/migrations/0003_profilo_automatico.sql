-- Mano a Mano Cassa — profilo automatico alla registrazione
-- Alla registrazione di un utente nasce il suo profilo (ruolo di partenza: cliente).
-- Lo staff viene promosso a cassa/rider/admin da un amministratore.
create or replace function public.crea_profilo_nuovo_utente()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profilo (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.crea_profilo_nuovo_utente();
