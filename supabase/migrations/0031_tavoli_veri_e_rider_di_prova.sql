-- Edoardo, 24/10/2026: «10 tavoli dentro, non 20, perché sono 20 coperti; e fuori 5».
-- Niente delete col connettore (resta appeso): i tavoli in più si spengono con `attivo`.
-- E il rider di prova «mettilo, usalo»: il profilo della cassa fa anche da rider di prova
-- (profilo.id_rider), così il giro completo si prova con l'utenza che c'è.

alter table tavolo add column if not exists attivo boolean not null default true;

update tavolo set attivo = false
 where (zona = 'dentro' and substring(numero from 2)::int > 10)
    or (zona = 'fuori'  and substring(numero from 2)::int > 5);
update tavolo set posti = 2 where zona = 'dentro' and attivo;   -- 10 tavoli × 2 = 20 coperti
update tavolo set posti = 4 where zona = 'fuori' and attivo;

update profilo set id_rider = (select id from rider where nome = 'Rider di prova' limit 1)
 where id_rider is null and ruolo in ('cassa', 'admin');
