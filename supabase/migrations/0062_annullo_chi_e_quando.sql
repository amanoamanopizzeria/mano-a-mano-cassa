-- Chi annulla un ordine (Edoardo, 25/10/2026: «se un ragazzo interno annulla troppi ordini è un problema»).
-- L'annullo resta una riga (stato annullato, come nel CSV dell'OS): qui si registrano chi e quando.
-- Il cliente che annulla dall'app o dal sito non ha un profilo: annullato_da resta vuoto e il canale dice da dove.
alter table ordine add column if not exists annullato_il timestamptz;
alter table ordine add column if not exists annullato_da uuid references profilo(id);

create or replace function ordine_annullo_chi() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.stato = 'annullato' and old.stato is distinct from 'annullato' then
    new.annullato_il := now();
    new.annullato_da := auth.uid();
  end if;
  return new;
end $$;
revoke all on function ordine_annullo_chi() from public, anon, authenticated;

create or replace trigger ordine_annullo_chi before update of stato on ordine
  for each row execute function ordine_annullo_chi();

-- Il controllo di Edoardo: annulli per persona e per giorno, con il canale e il valore
create or replace view v_annulli_per_persona with (security_invoker = true) as
select (o.annullato_il at time zone 'Europe/Rome')::date as giorno,
       coalesce(p.nome, 'cliente / canale esterno') as chi,
       o.canale,
       count(*) as annulli,
       round(sum(o.totale), 2) as valore
from ordine o
left join profilo p on p.id = o.annullato_da
where o.stato = 'annullato' and o.annullato_il is not null
group by 1, 2, 3;
