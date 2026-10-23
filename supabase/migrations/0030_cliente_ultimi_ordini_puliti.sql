-- Critico giro 6: fra gli «ultimi ordini» del cliente comparivano gli annullati, e col numero nudo.
-- Si tolgono gli annullati e si manda numero_visibile (C-10, APP-4) con la data.

create or replace function cerca_cliente(p_telefono text)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_chiave text := right(regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g'), 9);
  v_cliente cliente;
begin
  if not e_staff() then
    raise exception 'solo lo staff' using errcode = '42501';
  end if;
  if length(v_chiave) < 6 then
    return jsonb_build_object('esito', 'numero_corto');
  end if;
  select * into v_cliente from cliente
   where right(regexp_replace(coalesce(telefono, ''), '\D', '', 'g'), 9) = v_chiave
   order by creato_il limit 1;
  if v_cliente.id is null then
    return jsonb_build_object('esito', 'nuovo', 'telefono', p_telefono);
  end if;
  return jsonb_build_object(
    'esito', 'trovato',
    'cliente', to_jsonb(v_cliente),
    'indirizzi', coalesce((select jsonb_agg(to_jsonb(i) order by i.id) from indirizzo i where i.id_cliente = v_cliente.id), '[]'::jsonb),
    'ultimi_ordini', coalesce((
      select jsonb_agg(x) from (
        select jsonb_build_object('numero', o.numero, 'numero_visibile', o.numero_visibile, 'creato_il', o.creato_il, 'totale', o.totale, 'tipo', o.tipo, 'canale', o.canale) as x
        from ordine o
        where o.id_cliente = v_cliente.id and o.stato <> 'annullato'
        order by o.creato_il desc limit 5
      ) s), '[]'::jsonb)
  );
end $$;
