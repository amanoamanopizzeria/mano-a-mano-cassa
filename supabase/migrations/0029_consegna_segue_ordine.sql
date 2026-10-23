-- Critico giro 4b, n. 2: un ordine segnato CONSEGNATO dalla cassa lasciava la sua
-- consegna «da_assegnare» per sempre, e la mappa la teneva in corso. Adesso la
-- consegna segue lo stato dell'ordine: consegnato → consegnata (con l'ora),
-- annullato → annullata (già c'era). Il trigger ordine_consegna scatta già su stato.

create or replace function consegna_da_ordine() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if new.tipo = 'domicilio' then
    if not exists (select 1 from consegna c where c.id_ordine = new.id) then
      insert into consegna (id_ordine, contanti_da_incassare)
      values (new.id, case when new.pagato_online then 0 else new.totale end);
    else
      update consegna set contanti_da_incassare = case when new.pagato_online then 0 else new.totale end
      where id_ordine = new.id and stato in ('da_assegnare', 'assegnata', 'ritirata');
    end if;
    if new.stato = 'annullato' then
      update consegna set stato = 'annullata' where id_ordine = new.id and stato <> 'consegnata';
    elsif new.stato = 'consegnato' then
      update consegna set stato = 'consegnata', consegnata_il = coalesce(consegnata_il, now())
      where id_ordine = new.id and stato <> 'consegnata';
    end if;
  end if;
  return new;
end $$;

-- le righe rimaste indietro
update consegna c set stato = 'consegnata', consegnata_il = coalesce(c.consegnata_il, o.aggiornato_il)
from ordine o where o.id = c.id_ordine and o.stato = 'consegnato' and c.stato <> 'consegnata';
update consegna c set stato = 'annullata'
from ordine o where o.id = c.id_ordine and o.stato = 'annullato' and c.stato not in ('consegnata', 'annullata');
