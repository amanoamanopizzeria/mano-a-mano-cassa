-- DA DECIDERE (Edoardo, 30/10/2026 02:00Z, risposta C: «Chi può correggere un ordine già chiuso? Solo un admin,
-- con un motivo»). Si applica solo col suo ok, poi diventa una migrazione numerata.
--
-- Oggi nessun profilo è admin (Edoardo è «cassa»): il punto 3 lo fa admin. Senza il punto 3 il tasto «Correggi»
-- sulla cassa non compare a nessuno e la funzione rifiuta tutti.
--
-- 1) ordine_correzione: il registro. Chi, quando, cosa (azione), com'era e com'è dopo, e il motivo, obbligatorio.
--    Lo staff lo legge, nessuno lo scrive a mano: scrive solo la funzione.
-- 2) ordine_correggi(ordine, azione, motivo, pagamento):
--    · 'pagamento' — cambia il metodo di un ordine chiuso (consegnato/ritirato): contanti, pos, buono_pasto,
--      satispay (gli ultimi due solo dopo pagamenti_divisi.sql). Un ordine «diviso» non si cambia così.
--    · 'riapri'    — un ordine ritirato torna «pronto» (si era chiuso per sbaglio). Un domicilio consegnato non si
--      riapre: la consegna e il borsello del rider sono già chiusi; si annulla e si rifà.
--    · 'annulla'   — un ordine chiuso diventa annullato; i punti tornano indietro col trigger ordine_punti, e
--      l'annullo segna chi (ordine_annullo_chi). Resta nell'export, come ogni annullato.
--    Il motivo deve avere almeno 5 caratteri. Ogni passaggio di stato finisce anche in ordine_stato_log.

create table if not exists ordine_correzione (
  id uuid primary key default gen_random_uuid(),
  id_ordine uuid not null references ordine(id),
  chi uuid references profilo(id) default auth.uid(),
  quando timestamptz not null default now(),
  azione text not null check (azione in ('pagamento', 'riapri', 'annulla')),
  prima jsonb not null,
  dopo jsonb not null,
  motivo text not null check (length(trim(motivo)) >= 5)
);
create index if not exists ordine_correzione_ordine on ordine_correzione(id_ordine);
alter table ordine_correzione enable row level security;
create policy ordine_correzione_staff_legge on ordine_correzione for select to authenticated using (e_staff());

create or replace function ordine_correggi(p_id_ordine uuid, p_azione text, p_motivo text, p_pagamento text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_o ordine; v_prima jsonb; v_dopo jsonb;
begin
  if ruolo_corrente() is distinct from 'admin' then
    raise exception 'solo un admin può correggere un ordine chiuso' using errcode = '42501';
  end if;
  if p_motivo is null or length(trim(p_motivo)) < 5 then
    return jsonb_build_object('esito', 'motivo', 'messaggio', 'Scrivi il motivo (almeno 5 lettere).');
  end if;
  select * into v_o from ordine where id = p_id_ordine for update;
  if not found then return jsonb_build_object('esito', 'nessuno'); end if;
  if v_o.stato not in ('consegnato', 'ritirato') then
    return jsonb_build_object('esito', 'aperto', 'messaggio', 'L''ordine non è chiuso: si cambia dalla cassa come sempre.');
  end if;
  v_prima := jsonb_build_object('stato', v_o.stato, 'pagamento', v_o.pagamento);

  if p_azione = 'pagamento' then
    if v_o.pagamento = 'diviso' then
      return jsonb_build_object('esito', 'diviso', 'messaggio', 'Conto pagato con più metodi: non si cambia da qui.');
    end if;
    if p_pagamento is null or p_pagamento = v_o.pagamento then
      return jsonb_build_object('esito', 'uguale', 'messaggio', 'Scegli un metodo diverso.');
    end if;
    update ordine set pagamento = p_pagamento, aggiornato_il = now() where id = v_o.id;  -- il vincolo dice quali metodi
  elsif p_azione = 'riapri' then
    if v_o.tipo = 'domicilio' then
      return jsonb_build_object('esito', 'domicilio', 'messaggio', 'Un domicilio consegnato non si riapre: annullalo e rifallo.');
    end if;
    update ordine set stato = 'pronto', aggiornato_il = now() where id = v_o.id;
  elsif p_azione = 'annulla' then
    update ordine set stato = 'annullato', aggiornato_il = now() where id = v_o.id;
  else
    return jsonb_build_object('esito', 'azione', 'messaggio', 'Azione sconosciuta.');
  end if;

  select jsonb_build_object('stato', stato, 'pagamento', pagamento) into v_dopo from ordine where id = v_o.id;
  insert into ordine_correzione (id_ordine, azione, prima, dopo, motivo)
    values (v_o.id, p_azione, v_prima, v_dopo, trim(p_motivo));
  return jsonb_build_object('esito', 'ok', 'prima', v_prima, 'dopo', v_dopo);
end $$;
revoke all on function ordine_correggi(uuid, text, text, text) from public, anon;
grant execute on function ordine_correggi(uuid, text, text, text) to authenticated;

-- 3) Edoardo diventa admin (il suo profilo, che oggi è «cassa»). L'admin vede e fa tutto quello che fa la cassa:
--    e_staff() comprende admin; controllato il 30/10: nessuna policy, funzione o pagina chiede «cassa» senza admin.
update profilo set ruolo = 'admin' where id = 'c6f925a1-06c6-40fe-9829-62d45708458b';
