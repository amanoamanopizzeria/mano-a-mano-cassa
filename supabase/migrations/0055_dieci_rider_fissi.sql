-- I rider come oggi in Velocissimo (Edoardo, 25/10/2026): dieci utenze fisse, «Rider 1»…«Rider 10».
-- Chi lavora sempre ha sempre lo stesso numero (4), gli altri 6 li usa chi capita. Niente utenze nuove
-- a ogni rider. Le utenze le crea Edoardo dal pannello di Supabase (Authentication → Add user, con la
-- conferma automatica): un'email riderN@(a)manoamanopugliese.it confermata si aggancia da sola al
-- «Rider N», col ruolo rider. Solo confermate: chi si iscrive da fuori senza la casella non diventa rider.
insert into rider (nome)
select 'Rider ' || n from generate_series(1, 10) n
where not exists (select 1 from rider r where r.nome = 'Rider ' || n);

create or replace function aggancia_rider_fisso(p_utente uuid, p_email text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare n int; v_rider uuid;
begin
  n := (regexp_match(lower(p_email), '^rider([0-9]{1,2})@a?manoamanopugliese\.it$'))[1]::int;
  if n is null or n < 1 or n > 10 then return; end if;
  select id into v_rider from rider where nome = 'Rider ' || n;
  if v_rider is null then return; end if;
  update profilo set ruolo = 'rider', id_rider = v_rider,
         id_negozio = coalesce(id_negozio, (select id from negozio limit 1)), nome = 'Rider ' || n
   where id = p_utente;
end $$;
revoke all on function aggancia_rider_fisso(uuid, text) from public, anon, authenticated;

create or replace function public.crea_profilo_nuovo_utente() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profilo (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  if new.email_confirmed_at is not null then perform aggancia_rider_fisso(new.id, new.email); end if;
  return new;
end $$;

create or replace function public.rider_fisso_confermato() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    perform aggancia_rider_fisso(new.id, new.email);
  end if;
  return new;
end $$;
create or replace trigger on_auth_user_confermato after update of email_confirmed_at on auth.users
  for each row execute function public.rider_fisso_confermato();
