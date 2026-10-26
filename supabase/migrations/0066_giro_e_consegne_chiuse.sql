-- Numero 0066: il 0065 lo prende la cassa per punti e coperto (conferma del 26/10).
-- Controllo ECC del 26/10/2026, il giro a tappe e le consegne chiuse:
-- 1. consegna_da_ordine: quando la cassa annulla o chiude la tappa in corso, parte la prossima del giro
--    (prima restava ferma, e il cliente dopo riceveva «è partito» a pizza già arrivata).
-- 2. aggiorna_consegna: si parte solo da 'assegnata' o 'ritirata'. Uno schermo vecchio non riapre più
--    una consegna annullata, né la segna consegnata (l'ordine annullato tornava nei totali).
-- 3. assegna_consegna: togliere il rider non segna più l'ordine «pronto» se la cucina non l'ha fatto
--    (il trigger della 0053 scriveva anche pronto_il). Torna «pronto» solo se pronto_il c'era già.

create or replace function consegna_da_ordine() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_contanti numeric; v_rider uuid;
begin
  if new.tipo = 'domicilio' then
    v_contanti := case when new.pagato_online or new.pagamento = 'pos' then 0 else new.totale end;
    if not exists (select 1 from consegna c where c.id_ordine = new.id) then
      insert into consegna (id_ordine, contanti_da_incassare) values (new.id, v_contanti);
    else
      update consegna set contanti_da_incassare = v_contanti
      where id_ordine = new.id and stato in ('da_assegnare', 'assegnata', 'ritirata');
    end if;
    if new.stato = 'annullato' then
      update consegna set stato = 'annullata'
      where id_ordine = new.id and stato not in ('consegnata', 'annullata')
      returning id_rider into v_rider;
    elsif new.stato = 'consegnato' then
      update consegna set stato = 'consegnata', consegnata_il = coalesce(consegnata_il, now())
      where id_ordine = new.id and stato not in ('consegnata', 'annullata')
      returning id_rider into v_rider;
    end if;
    -- la cassa ha chiuso la tappa in corso: il rider passa alla successiva del giro
    if v_rider is not null then perform prossima_tappa(v_rider); end if;
  end if;
  return new;
end $$;

create or replace function aggiorna_consegna(p_id uuid, p_stato stato_consegna) returns consegna
language plpgsql security definer set search_path = public, pg_temp as $$
declare c consegna;
begin
  if not e_rider() then raise exception 'Solo un rider'; end if;
  if p_stato not in ('ritirata','consegnata') then raise exception 'Stato non ammesso'; end if;
  update consegna
  set stato = p_stato,
      ritirata_il   = case when p_stato = 'ritirata'   then coalesce(ritirata_il, now()) else ritirata_il end,
      consegnata_il = case when p_stato = 'consegnata' then now() else consegnata_il end,
      in_viaggio_il = case when p_stato = 'consegnata' then coalesce(in_viaggio_il, now()) else in_viaggio_il end
  where id = p_id and id_rider = rider_corrente() and stato in ('assegnata', 'ritirata')
  returning * into c;
  if c.id is null then raise exception 'Consegna non tua o già chiusa (annullata o consegnata)'; end if;
  if p_stato = 'consegnata' then
    update ordine set stato = 'consegnato', aggiornato_il = now() where id = c.id_ordine;
  end if;
  perform prossima_tappa(c.id_rider);
  return c;
end $$;

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
  if p_rider is null then
    -- togliere il rider non vuol dire «pronto»: torna pronto solo se la cucina l'aveva fatto pronto
    update ordine set stato = case when pronto_il is not null then 'pronto'::stato_ordine else 'in_preparazione'::stato_ordine end,
           aggiornato_il = now()
     where id = c.id_ordine and stato = 'in_consegna';
  else
    update ordine set stato = 'in_consegna'::stato_ordine, aggiornato_il = now()
     where id = c.id_ordine and stato in ('ricevuto', 'in_preparazione', 'pronto', 'in_consegna');
  end if;
  return c;
end $$;
grant execute on function assegna_consegna(uuid, uuid) to authenticated;
