-- Il menù lo cambiano solo la cassa e la dashboard (ruoli cassa e admin), non il totem (Edoardo, 26/10/2026
-- 20:56Z: «il menu sì, è modificabile solo dalla cassa e anche dalla dashboard»). Critico giro 31: con
-- e_staff() il PC del totem, in sala davanti ai clienti, poteva cambiare prezzi e prodotti. Il totem il
-- menù lo legge e basta (le policy di lettura non cambiano). Vale anche per «esaurito per stasera».
-- Più il gruppo «Menu» per la categoria dei menu combo, che stava sotto Pizze.
create or replace function puo_scrivere_menu() returns boolean
  language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select coalesce(ruolo_corrente() in ('admin', 'cassa'), false)
$$;
grant execute on function puo_scrivere_menu() to authenticated;

alter policy prodotto_write on prodotto using (puo_scrivere_menu()) with check (puo_scrivere_menu());
alter policy categoria_write on categoria using (puo_scrivere_menu()) with check (puo_scrivere_menu());
alter policy gruppo_categoria_write on gruppo_categoria using (puo_scrivere_menu()) with check (puo_scrivere_menu());
alter policy variazione_write on variazione using (puo_scrivere_menu()) with check (puo_scrivere_menu());
alter policy categoria_gruppo_variazione_write on categoria_gruppo_variazione using (puo_scrivere_menu()) with check (puo_scrivere_menu());
alter policy pacchetto_gruppo_write on pacchetto_gruppo using (puo_scrivere_menu()) with check (puo_scrivere_menu());
alter policy pacchetto_scelta_write on pacchetto_scelta using (puo_scrivere_menu()) with check (puo_scrivere_menu());

create or replace function prodotto_esaurito(p_id uuid, p_esaurito boolean) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_fino timestamptz;
begin
  if not puo_scrivere_menu() then raise exception 'solo la cassa' using errcode = '42501'; end if;
  if p_esaurito then
    v_fino := ((date_trunc('day', (now() at time zone 'Europe/Rome') - interval '6 hours') + interval '1 day 6 hours') at time zone 'Europe/Rome');
  end if;
  update prodotto set esaurito_fino = v_fino where id = p_id;
  return jsonb_build_object('esito', 'ok', 'esaurito_fino', v_fino);
end $$;

insert into gruppo_categoria (nome, ordine)
  select 'Menu', 4 where not exists (select 1 from gruppo_categoria where nome = 'Menu');
update categoria set id_gruppo = (select id from gruppo_categoria where nome = 'Menu')
  where id = 'cfed1855-4d6e-4828-a844-adfd9175594e';
