-- REA cap. 10, lavoro 4 (video Velocissimo 18:52): la consegna si assegna anche dalla cassa,
-- sulla mappa, oltre al «la prendo io» del rider. Lo staff sceglie il rider; si può anche
-- riassegnare una consegna già assegnata ma non ancora partita, o toglierla (p_rider null).
create or replace function assegna_consegna(p_id uuid, p_rider uuid)
returns consegna language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare c consegna;
begin
  if not e_staff() then raise exception 'solo lo staff' using errcode = '42501'; end if;
  if p_rider is not null and not exists (select 1 from rider where id = p_rider and attivo) then
    raise exception 'rider non attivo';
  end if;
  update consegna
     set id_rider = p_rider,
         stato = case when p_rider is null then 'da_assegnare'::stato_consegna else 'assegnata'::stato_consegna end,
         assegnata_il = case when p_rider is null then null else now() end
   where id = p_id and stato in ('da_assegnare', 'assegnata')
  returning * into c;
  if c.id is null then raise exception 'consegna già partita o chiusa'; end if;
  update ordine set stato = case when p_rider is null then 'pronto'::stato_ordine else 'in_consegna'::stato_ordine end, aggiornato_il = now()
   where id = c.id_ordine and stato in ('ricevuto', 'in_preparazione', 'pronto', 'in_consegna');
  return c;
end $$;
grant execute on function assegna_consegna(uuid, uuid) to authenticated;
