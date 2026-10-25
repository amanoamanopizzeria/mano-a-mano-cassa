-- La scheda di un cliente nuovo come in 2Bit (Edoardo, 25/10/2026): nome, telefono, via, note del cliente
-- e NOTE DI CONSEGNA, che stanno sull'indirizzo (citofono, scala, piano: cambiano se il cliente ha due case).
-- salva_cliente3 = salva_cliente2 + la nota di consegna, e restituisce anche l'indirizzo salvato.
alter table indirizzo add column if not exists note text;

create or replace function salva_cliente3(p_telefono text, p_nome text, p_note text, p_via text, p_civico text,
  p_cap text, p_citta text, p_lat double precision, p_lng double precision, p_place_id text, p_note_consegna text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_chiave text := right(regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g'), 9);
  v_id uuid; v_ind uuid;
begin
  if not e_staff() then raise exception 'solo lo staff' using errcode = '42501'; end if;
  if length(v_chiave) < 6 then raise exception 'Telefono non valido: servono almeno 6 cifre'; end if;
  select id into v_id from cliente
   where right(regexp_replace(coalesce(telefono, ''), '\D', '', 'g'), 9) = v_chiave
   order by creato_il limit 1;
  if v_id is null then
    insert into cliente (telefono, nome, note) values (p_telefono, nullif(p_nome, ''), nullif(p_note, '')) returning id into v_id;
  else
    update cliente set nome = coalesce(nullif(p_nome, ''), nome), note = coalesce(p_note, note) where id = v_id;
  end if;
  if p_via is not null and p_via <> '' then
    select id into v_ind from indirizzo
     where id_cliente = v_id and lower(via) = lower(p_via) and coalesce(civico, '') = coalesce(p_civico, '') limit 1;
    if v_ind is null then
      insert into indirizzo (id_cliente, via, civico, cap, citta, lat, lng, place_id, note)
      values (v_id, p_via, nullif(p_civico, ''), p_cap, coalesce(p_citta, 'Roma'), p_lat, p_lng, p_place_id, nullif(p_note_consegna, ''))
      returning id into v_ind;
    else
      update indirizzo set note = coalesce(nullif(p_note_consegna, ''), note),
             lat = coalesce(p_lat, lat), lng = coalesce(p_lng, lng), place_id = coalesce(p_place_id, place_id)
       where id = v_ind;
    end if;
  end if;
  return jsonb_build_object('esito', 'salvato', 'id', v_id, 'id_indirizzo', v_ind);
end $$;
revoke all on function salva_cliente3(text, text, text, text, text, text, text, double precision, double precision, text, text) from public, anon;
grant execute on function salva_cliente3(text, text, text, text, text, text, text, double precision, double precision, text, text) to authenticated;
