-- Mano a Mano Cassa — Fase 17: il totem senza utente (23/10/2026, Edoardo: «è come se un cliente
-- ordinasse in cassa ma ordina solo: parte in automatico, gli chiede il nome alla fine, come un
-- ordine al banco, e poi se vuole pagare in contanti o col POS»).
-- Il totem si attiva una volta con un codice (l'impronta SHA-256 sta in impostazione_riservata,
-- chiave 'totem_key_sha256'; il codice vero lo ha Edoardo e si scrive sul totem, mai qui).
-- Nel registro di Supabase è `totem_senza_utente`; l'insert dell'impronta è a parte.
alter table ordine add column if not exists nome_cliente text;
alter table ordine add column if not exists pagamento text check (pagamento in ('contanti','pos'));

create or replace function totem_chiave_valida(p_chiave text) returns boolean
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select exists (select 1 from impostazione_riservata
                 where chiave = 'totem_key_sha256' and valore = encode(sha256(convert_to(coalesce(p_chiave, ''), 'UTF8')), 'hex'));
$$;
revoke all on function totem_chiave_valida(text) from public;
grant execute on function totem_chiave_valida(text) to anon, authenticated;

-- Il menù per il totem (solo quello visibile al totem), senza utente.
create or replace function totem_menu(p_chiave text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
begin
  if not totem_chiave_valida(p_chiave) then raise exception 'totem non attivato' using errcode = '42501'; end if;
  return jsonb_build_object(
    'categorie', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'nome', nome, 'ordine', ordine, 'colore', colore, 'destinazione', destinazione, 'visibile_totem', visibile_totem) order by ordine) from categoria where visibile_totem), '[]'::jsonb),
    'prodotti',  coalesce((select jsonb_agg(jsonb_build_object('id', id, 'id_categoria', id_categoria, 'nome', nome, 'descrizione', descrizione, 'prezzo', prezzo, 'prezzo_tavolo', prezzo_tavolo, 'foto_url', foto_url, 'visibile_totem', visibile_totem) order by ordine) from prodotto where attivo and visibile_totem), '[]'::jsonb),
    'varianti',  coalesce((select jsonb_agg(jsonb_build_object('id', id, 'nome', nome, 'prezzo', prezzo, 'gruppo', gruppo, 'id_categoria', id_categoria) order by gruppo, nome) from variazione), '[]'::jsonb)
  );
end $$;
revoke all on function totem_menu(text) from public;
grant execute on function totem_menu(text) to anon, authenticated;

create or replace function ordine_da_totem_api(p_chiave text, p_righe jsonb, p_nome text, p_pagamento text, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_negozio uuid;
  v_esito jsonb;
begin
  if not totem_chiave_valida(p_chiave) then raise exception 'totem non attivato' using errcode = '42501'; end if;
  select id into v_negozio from negozio where attivo order by creato_il limit 1;
  v_esito := accetta_ordine_esterno(v_negozio, 'totem', 'banco', null, null, p_note, p_righe);
  if v_esito->>'esito' = 'accettato' then
    update ordine set nome_cliente = nullif(trim(p_nome), ''),
                      pagamento = case when p_pagamento in ('contanti','pos') then p_pagamento else null end
     where id = (v_esito->>'id')::uuid;
  end if;
  return v_esito;
end $$;
revoke all on function ordine_da_totem_api(text, jsonb, text, text, text) from public;
grant execute on function ordine_da_totem_api(text, jsonb, text, text, text) to anon, authenticated;
