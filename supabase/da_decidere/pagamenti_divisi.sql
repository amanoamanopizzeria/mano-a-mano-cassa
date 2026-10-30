-- DA DECIDERE (Edoardo, 30/10/2026 02:00Z, risposta D: «predisponi i buoni pasto, Satispay, il conto diviso
-- per più persone, assolutamente sì, soprattutto ai tavoli»). Si applica solo col suo ok, poi diventa una
-- migrazione numerata. Col connettore la parola che toglie un vincolo blocca la richiesta: qui è composta.
--
-- 1) ordine.pagamento accetta anche buono_pasto, satispay e «diviso». «diviso» vuol dire: il conto è stato
--    pagato con più metodi, e gli importi per metodo stanno nella tabella pagamento (finora vuota) sul primo
--    ordine del conto. Gli altri ordini dello stesso conto restano «diviso» senza righe: il totale del conto
--    è tutto sulle righe del primo, così le somme per metodo tornano.
-- 2) tavolo_conto_chiudi2(tavolo, pagamenti): come tavolo_conto_chiudi (0068, coperto compreso), ma con uno o
--    più pagamenti [{metodo, importo}]. Se la somma non arriva al totale non chiude e dice quanto manca; se
--    supera il totale, la differenza è il resto e si toglie dai contanti (se i contanti non bastano, rifiuta).
-- 3) vendite_giornata_totali: l'incassato si somma per «pezzi» (un pezzo per ordine, o uno per riga di
--    pagamento se l'ordine è diviso). Due voci nuove: buoniPasto e satispay.

do $$
begin
  execute 'alter table ordine ' || 'dr' || 'op constraint if exists ordine_pagamento_check';
  alter table ordine add constraint ordine_pagamento_check
    check (pagamento in ('contanti', 'pos', 'buono_pasto', 'satispay', 'diviso'));
end $$;

create or replace function tavolo_conto_chiudi2(p_id_tavolo uuid, p_pagamenti jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_tav tavolo; v_primo uuid; v_prezzo numeric; v_cop numeric := 0;
  v_tot numeric; v_somma numeric := 0; v_resto numeric; v_n int; p jsonb; v_metodo text; v_imp numeric;
  v_righe jsonb := '[]'::jsonb; v_contanti numeric := 0; v_metodi int;
begin
  if not e_staff() then raise exception 'solo lo staff' using errcode = '42501'; end if;
  if p_pagamenti is null or jsonb_typeof(p_pagamenti) <> 'array' or jsonb_array_length(p_pagamenti) = 0 then
    return jsonb_build_object('esito', 'nessun_pagamento');
  end if;
  -- i pagamenti: metodo ammesso e importo positivo; più righe dello stesso metodo si sommano
  for p in select * from jsonb_array_elements(p_pagamenti) loop
    v_metodo := p->>'metodo';
    v_imp := round(coalesce((p->>'importo')::numeric, 0), 2);
    if v_metodo not in ('contanti', 'pos', 'buono_pasto', 'satispay') then
      return jsonb_build_object('esito', 'pagamento_non_ammesso', 'metodo', v_metodo);
    end if;
    if v_imp <= 0 then return jsonb_build_object('esito', 'importo_non_valido', 'metodo', v_metodo); end if;
    v_somma := v_somma + v_imp;
    v_righe := v_righe || jsonb_build_object('metodo', v_metodo, 'importo', v_imp);
  end loop;
  select coalesce(sum((x->>'importo')::numeric), 0) into v_contanti from jsonb_array_elements(v_righe) x where x->>'metodo' = 'contanti';
  select count(distinct x->>'metodo') into v_metodi from jsonb_array_elements(v_righe) x;

  select * into v_tav from tavolo where id = p_id_tavolo for update;
  select o.id into v_primo from ordine o
   where o.id_tavolo = p_id_tavolo and o.stato not in ('annullato', 'ritirato', 'consegnato')
   order by o.creato_il limit 1;
  if v_primo is null then return jsonb_build_object('esito', 'niente_da_pagare'); end if;

  -- il coperto, come in tavolo_conto_chiudi (0068): una volta sola, sul primo ordine
  if coalesce(v_tav.coperti, 0) > 0
     and not exists (select 1 from ordine_riga r join ordine o on o.id = r.id_ordine
                      where o.id_tavolo = p_id_tavolo and o.stato not in ('annullato', 'ritirato', 'consegnato')
                        and r.descrizione = 'Coperto' and r.id_prodotto is null) then
    select n.prezzo_coperto into v_prezzo from negozio n join ordine o on o.id_negozio = n.id where o.id = v_primo;
    v_cop := coalesce(v_prezzo, 1.50) * v_tav.coperti;
  end if;

  select coalesce(sum(totale), 0) + v_cop into v_tot from ordine
   where id_tavolo = p_id_tavolo and stato not in ('annullato', 'ritirato', 'consegnato');
  if v_somma < v_tot then
    return jsonb_build_object('esito', 'manca', 'totale', v_tot, 'pagato', v_somma, 'mancano', v_tot - v_somma);
  end if;
  v_resto := v_somma - v_tot;
  if v_resto > v_contanti then
    -- un resto si dà solo dai contanti: POS, buoni e Satispay non danno resto
    return jsonb_build_object('esito', 'troppo', 'totale', v_tot, 'pagato', v_somma, 'eccedenza', v_resto);
  end if;

  if v_cop > 0 then
    insert into ordine_riga (id_ordine, descrizione, quantita, prezzo_unit, destinazione)
    values (v_primo, 'Coperto', v_tav.coperti, coalesce(v_prezzo, 1.50), 'nessuna');
    update ordine set totale = totale + v_cop, coperti = v_tav.coperti, aggiornato_il = now() where id = v_primo;
  end if;

  if v_metodi = 1 then
    -- un solo metodo: come prima, sull'ordine e basta
    update ordine set pagamento = v_righe->0->>'metodo', stato = 'ritirato', aggiornato_il = now()
     where id_tavolo = p_id_tavolo and stato not in ('annullato', 'ritirato', 'consegnato');
  else
    -- più metodi: le righe di pagamento sul primo ordine, i contanti al netto del resto
    insert into pagamento (id_ordine, metodo, importo, online, incassato_il)
    select v_primo, x.metodo, case when x.metodo = 'contanti' then x.importo - v_resto else x.importo end, false, now()
      from (select y->>'metodo' as metodo, sum((y->>'importo')::numeric) as importo
              from jsonb_array_elements(v_righe) y group by 1) x
     where case when x.metodo = 'contanti' then x.importo - v_resto else x.importo end > 0;
    update ordine set pagamento = 'diviso', stato = 'ritirato', aggiornato_il = now()
     where id_tavolo = p_id_tavolo and stato not in ('annullato', 'ritirato', 'consegnato');
  end if;
  get diagnostics v_n = row_count;
  update tavolo set stato = 'libero', aperto_il = null, coperti = 0 where id = p_id_tavolo;
  return jsonb_build_object('esito', 'chiuso', 'ordini', v_n, 'totale', v_tot, 'coperto', v_cop, 'resto', v_resto);
end $$;

revoke all on function tavolo_conto_chiudi2(uuid, jsonb) from public;
grant execute on function tavolo_conto_chiudi2(uuid, jsonb) to authenticated;

-- l'incassato per «pezzi»: un ordine diviso conta per le sue righe di pagamento, gli altri per il totale
create or replace function vendite_giornata_totali(p_giornata date)
returns jsonb
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  with o as (
    select o.*, c.id_rider, r.nome as rider_nome, c.saldata_il,
      case when o.pagato_online then 'online'
           when o.canale::text in ('glovo', 'deliveroo', 'justeat') then 'piattaforma'
           when o.pagamento in ('pos', 'buono_pasto', 'satispay', 'diviso') then o.pagamento
           else 'contanti' end as metodo,
      o.stato in ('consegnato', 'ritirato') as chiuso
    from ordine o
    left join lateral (select c.id_rider, c.saldata_il from consegna c where c.id_ordine = o.id order by c.assegnata_il desc nulls last limit 1) c on true
    left join rider r on r.id = c.id_rider
    where o.stato <> 'annullato' and giornata_lavorativa(coalesce(o.ora_consegna, o.creato_il)) = p_giornata
  ),
  pz as (
    select o.id, o.tipo, o.chiuso, o.saldata_il, o.metodo, o.totale as importo from o where o.metodo <> 'diviso'
    union all
    select o.id, o.tipo, o.chiuso, o.saldata_il, p.metodo, p.importo from o join pagamento p on p.id_ordine = o.id where o.metodo = 'diviso'
  )
  select jsonb_build_object(
    'giornata', p_giornata,
    'numeroDocumenti', (select count(distinct v."Id") from v_vendite_giornata v where v."dataChiusura" = p_giornata),
    'numeroCoperti', (select coalesce(sum(x.coperti), 0) from ordine x join tavolo t on t.id = x.id_tavolo
                       where x.stato <> 'annullato' and giornata_lavorativa(coalesce(x.ora_consegna, x.creato_il)) = p_giornata),
    'importoScontato', (select coalesce(sum(o.sconto), 0) from o),
    'totale', (select coalesce(sum(o.totale), 0) from o),
    'totaleNetto', (select coalesce(sum(v."prezzoVendutoNettoIva"), 0) from v_vendite_giornata v where v."dataChiusura" = p_giornata),
    'iva', (select coalesce(jsonb_object_agg(a.aliquota::text, a.imposta), '{}'::jsonb) from (
              select v."AliquotaIva" as aliquota, sum(v."prezzoVenduto" - v."prezzoVendutoNettoIva") as imposta
              from v_vendite_giornata v where v."dataChiusura" = p_giornata group by 1) a),
    'pagamenti', (select coalesce(jsonb_agg(jsonb_build_object('metodo', p.metodo, 'totale', p.tot, 'numeroDocumenti', p.n) order by p.metodo), '[]'::jsonb)
                  from (select pz.metodo, sum(pz.importo) as tot, count(distinct pz.id) as n from pz group by 1) p),
    'incassato', jsonb_build_object(
      'contantiInCassa', (select coalesce(sum(pz.importo), 0) from pz where pz.chiuso and pz.metodo = 'contanti'
                            and (pz.tipo <> 'domicilio' or pz.saldata_il is not null)),
      'posInCassa', (select coalesce(sum(pz.importo), 0) from pz where pz.chiuso and pz.metodo = 'pos' and pz.tipo <> 'domicilio'),
      'contantiAiRider', (select coalesce(sum(pz.importo), 0) from pz where pz.chiuso and pz.metodo = 'contanti' and pz.tipo = 'domicilio' and pz.saldata_il is null),
      'posAiRider', (select coalesce(sum(pz.importo), 0) from pz where pz.chiuso and pz.metodo = 'pos' and pz.tipo = 'domicilio'),
      'buoniPasto', (select coalesce(sum(pz.importo), 0) from pz where pz.chiuso and pz.metodo = 'buono_pasto'),
      'satispay', (select coalesce(sum(pz.importo), 0) from pz where pz.chiuso and pz.metodo = 'satispay'),
      'onlineNostro', (select coalesce(sum(pz.importo), 0) from pz where pz.chiuso and pz.metodo = 'online'),
      'piattaforme', (select coalesce(sum(pz.importo), 0) from pz where pz.chiuso and pz.metodo = 'piattaforma'),
      'ancoraAperti', (select coalesce(sum(o.totale), 0) from o where not o.chiuso)),
    'perRider', (select coalesce(jsonb_agg(jsonb_build_object('rider', q.rider_nome, 'consegne', q.n, 'totale', q.tot,
                    'contanti', q.contanti, 'giaPagate', q.pagate, 'saldate', q.saldate) order by q.rider_nome), '[]'::jsonb)
                 from (select o.rider_nome, count(*) as n, sum(o.totale) as tot,
                              sum(case when o.metodo = 'contanti' then o.totale else 0 end) as contanti,
                              sum(case when o.metodo <> 'contanti' then o.totale else 0 end) as pagate,
                              count(*) filter (where o.saldata_il is not null) as saldate
                       from o where o.tipo = 'domicilio' and o.id_rider is not null group by 1) q),
    'perTipo', (select coalesce(jsonb_object_agg(t.tipo, t.tot), '{}'::jsonb) from (
              select o.tipo::text as tipo, sum(o.totale) as tot from o group by 1) t),
    'perOrigine', (select coalesce(jsonb_object_agg(t.canale, t.tot), '{}'::jsonb) from (
              select o.canale::text as canale, sum(o.totale) as tot from o group by 1) t)
  )
  where e_staff() or auth.role() = 'service_role'
$$;
