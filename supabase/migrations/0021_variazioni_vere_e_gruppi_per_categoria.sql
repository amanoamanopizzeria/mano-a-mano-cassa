-- Mano a Mano Cassa — 0021: le variazioni vere di Velocissimo e i gruppi per categoria (23/10/2026).
-- Dal REA (docs/rea/01_BACKOFFICE.md §1.5, 06_DATI.md §6.3): ogni ingrediente in più ha un prezzo
-- (bufala 2,50, impasto alto 1,00, salmone 4,00…) e i gruppi di variazioni si attaccano ALLA CATEGORIA:
-- pizze → IMPASTO, LATTICINI, SALUMI E PESCE, SPEZIE E ALTRO, VERDURE; pucce → gli stessi senza IMPASTO;
-- burger → come le pucce + SALSE; fritti, dolci, bevande, birre, cantina, menù → nessuna.
-- Il critico (giro 1) aveva trovato: bufala a 0 € su cassa e totem (−5 € su un ordine da 24) e
-- «Impasto alto» offerto a Supplì e Coca cola. Tutte e due le cose si chiudono qui.
-- I gruppi di scelta dei menu combo (SCEGLI LA PIZZA, SCEGLI LA BIBITA, FRITTI MENU) arrivano con i menu.

-- 1) la variazione porta l'id di Velocissimo e si rinomina come nel loro listino
alter table variazione add column if not exists id_velocissimo int unique;

update variazione v set nome = n.nuovo, prezzo = n.prezzo, id_velocissimo = n.idv, gruppo = n.gruppo
from (values
  ('Impasto normale', 'Impasto normale', 0.00, 1, 'Impasto'),
  ('Impasto alto', 'Impasto alto', 1.00, 2, 'Impasto'),
  ('Crema cacio e pepe', 'Crema cacio e pepe', 2.50, 3, 'Latticini'),
  ('Doppia mozzarella', 'Doppia mozzarella', 2.00, 4, 'Latticini'),
  ('Gorgonzola piccante', 'Gorgonzola piccante', 2.00, 5, 'Latticini'),
  ('Mozzarella di bufala DOP', 'Mozzarella di bufala DOP', 2.50, 6, 'Latticini'),
  ('Mozzarella di bufala DOP a strappi', 'Mozzarella di bufala DOP a strappi', 3.00, 7, 'Latticini'),
  ('Grana Padano DOP', 'Grana padano DOP', 1.50, 8, 'Latticini'),
  ('Pecorino Romano DOP', 'Pecorino romano DOP', 2.00, 9, 'Latticini'),
  ('Provola affumicata', 'Provola affumicata', 1.50, 10, 'Latticini'),
  ('Stracciatella artigianale', 'Stracciatella artigianale', 3.00, 11, 'Latticini'),
  ('Stracciatella artigianale al tartufo', 'Stracciatella artigianale al tartufo', 3.50, 12, 'Latticini'),
  ('Taleggio', 'Taleggio', 2.50, 13, 'Latticini'),
  ('Brie de Meaux', 'Brie de Meaux', 2.50, 14, 'Latticini'),
  ('Cheddar', 'Cheddar', 2.00, 139, 'Latticini'),
  ('Alici', 'Alici', 2.00, 15, 'Salumi e pesce'),
  ('Prosciutto cotto', 'Prosciutto cotto affumicato di Praga', 2.00, 19, 'Salumi e pesce'),
  ('Prosciutto crudo', 'Prosciutto crudo di Parma 18 mesi', 2.50, 20, 'Salumi e pesce'),
  ('Salsiccia', 'Salsiccia di Norcia', 1.50, 22, 'Salumi e pesce'),
  ('Speck', 'Speck Alto Adige IGP', 2.50, 23, 'Salumi e pesce'),
  ('''Nduja', 'Nduja calabrese piccante', 1.50, 27, 'Salumi e pesce'),
  ('Origano', 'Origano', 0.00, 36, 'Spezie e altro'),
  ('Olio piccante', 'Peperoncino', 0.50, 37, 'Spezie e altro'),
  ('Cipolla', 'Cipolla caramellata', 1.00, 42, 'Verdure'),
  ('Funghi', 'Funghi', 1.50, 45, 'Verdure'),
  ('Patate', 'Patate al forno', 1.00, 48, 'Verdure'),
  ('Pomodorini', 'Pomodoro pachino', 1.50, 51, 'Verdure'),
  ('Rucola', 'Rughetta', 1.00, 53, 'Verdure'),
  ('Zucchine', 'Zucchine', 1.00, 54, 'Verdure')
) as n(vecchio, nuovo, prezzo, idv, gruppo)
where v.nome = n.vecchio and v.id_velocissimo is null;

-- «Basilico» non è una variazione di Velocissimo (è un ingrediente della ricetta): resta, a 0, nelle spezie.

insert into variazione (nome, prezzo, tipo, gruppo, id_categoria, id_velocissimo)
select n.nome, n.prezzo, 'aggiunta', n.gruppo, null, n.idv
from (values
  ('Guanciale', 2.00, 16, 'Salumi e pesce'),
  ('Mortadella bolognese IGP', 2.00, 17, 'Salumi e pesce'),
  ('Pancetta arrotolata piacentina', 2.50, 18, 'Salumi e pesce'),
  ('Spianata calabrese piccante', 2.00, 21, 'Salumi e pesce'),
  ('Wurstel', 1.50, 24, 'Salumi e pesce'),
  ('Bottarga', 2.00, 25, 'Salumi e pesce'),
  ('Bresaola', 3.00, 26, 'Salumi e pesce'),
  ('Salmone affumicato norvegese', 4.00, 28, 'Salumi e pesce'),
  ('Tonno', 2.00, 29, 'Salumi e pesce'),
  ('Uovo', 1.00, 30, 'Salumi e pesce'),
  ('Ciauscolo', 2.00, 31, 'Salumi e pesce'),
  ('Colatura di alici', 1.50, 32, 'Spezie e altro'),
  ('Noci', 1.50, 33, 'Spezie e altro'),
  ('Olio all''aglio', 0.50, 34, 'Spezie e altro'),
  ('Polvere di cappero essiccato', 1.00, 35, 'Spezie e altro'),
  ('Prezzemolo', 0.00, 38, 'Spezie e altro'),
  ('Salsa tartufata', 2.50, 39, 'Spezie e altro'),
  ('Broccoletti', 1.50, 40, 'Verdure'),
  ('Carciofi', 2.00, 41, 'Verdure'),
  ('Emulsione al basilico', 1.50, 43, 'Verdure'),
  ('Crema di patate', 2.00, 44, 'Verdure'),
  ('Melanzane', 1.00, 46, 'Verdure'),
  ('Olive taggiasche', 2.00, 47, 'Verdure'),
  ('Chips di patate', 2.00, 49, 'Verdure'),
  ('Pomodorini semi secchi', 2.50, 50, 'Verdure'),
  ('Radicchio', 1.00, 52, 'Verdure'),
  ('Salsa di pomodoro', 0.00, 55, 'Verdure'),
  ('Fiori di zucca', 1.50, 56, 'Verdure'),
  ('Topping al pachino caramellato', 1.50, 57, 'Verdure'),
  ('Pachino appassito al forno', 2.00, 58, 'Verdure'),
  ('Porcini', 3.00, 131, 'Verdure'),
  ('Insalata', 0.00, 140, 'Verdure'),
  ('Pomodoro burger', 0.00, 141, 'Verdure'),
  ('Mayo', 0.50, 132, 'Salse'),
  ('Ketchup', 0.50, 133, 'Salse'),
  ('BBQ', 0.50, 134, 'Salse'),
  ('Senape', 0.50, 135, 'Salse'),
  ('Mayo tartufo', 1.00, 136, 'Salse'),
  ('Boscaiola', 0.50, 137, 'Salse'),
  ('Mayo nduja', 1.00, 138, 'Salse')
) as n(nome, prezzo, idv, gruppo)
where not exists (select 1 from variazione x where x.id_velocissimo = n.idv);

-- 2) quali gruppi vede ogni categoria (min/max come nel back-office: 0 = libero; max_gratis 0)
create table if not exists categoria_gruppo_variazione (
  id_categoria uuid not null references categoria(id) on delete cascade,
  gruppo       text not null,
  ordine       int  not null default 0,
  min_n        int  not null default 0,
  max_n        int  not null default 0,     -- 0 = senza limite
  max_gratis   int  not null default 0,
  primary key (id_categoria, gruppo)
);
alter table categoria_gruppo_variazione enable row level security;
create policy categoria_gruppo_variazione_read on categoria_gruppo_variazione for select using (auth.role() = 'authenticated');
create policy categoria_gruppo_variazione_write on categoria_gruppo_variazione for all using (e_staff()) with check (e_staff());

insert into categoria_gruppo_variazione (id_categoria, gruppo, ordine)
select c.id, g.gruppo, g.ordine
from categoria c
join (values
  ('Impasto', 0), ('Latticini', 1), ('Salumi e pesce', 2), ('Spezie e altro', 3), ('Verdure', 4)
) as g(gruppo, ordine) on true
where c.nome in ('Pizze classiche', 'Pizze speciali', 'Novità', 'Le novità estive')
on conflict do nothing;

insert into categoria_gruppo_variazione (id_categoria, gruppo, ordine)
select c.id, g.gruppo, g.ordine
from categoria c
join (values
  ('Latticini', 1), ('Salumi e pesce', 2), ('Spezie e altro', 3), ('Verdure', 4)
) as g(gruppo, ordine) on true
where c.nome in ('Pucce pugliesi', 'Burgeria')
on conflict do nothing;

insert into categoria_gruppo_variazione (id_categoria, gruppo, ordine)
select c.id, 'Salse', 5 from categoria c where c.nome = 'Burgeria'
on conflict do nothing;

-- 3) il totem legge anche i gruppi per categoria (la cassa li legge dalla tabella)
create or replace function totem_menu(p_chiave text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
begin
  if not totem_chiave_valida(p_chiave) then raise exception 'totem non attivato' using errcode = '42501'; end if;
  return jsonb_build_object(
    'categorie', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'nome', nome, 'ordine', ordine, 'colore', colore, 'destinazione', destinazione, 'visibile_totem', visibile_totem) order by ordine) from categoria where visibile_totem), '[]'::jsonb),
    'prodotti',  coalesce((select jsonb_agg(jsonb_build_object('id', id, 'id_categoria', id_categoria, 'nome', nome, 'descrizione', descrizione, 'prezzo', prezzo, 'prezzo_tavolo', prezzo_tavolo, 'foto_url', foto_url, 'visibile_totem', visibile_totem) order by ordine) from prodotto where attivo and visibile_totem), '[]'::jsonb),
    'varianti',  coalesce((select jsonb_agg(jsonb_build_object('id', id, 'nome', nome, 'prezzo', prezzo, 'gruppo', gruppo, 'id_categoria', id_categoria) order by gruppo, nome) from variazione), '[]'::jsonb),
    'gruppi',    coalesce((select jsonb_agg(jsonb_build_object('id_categoria', id_categoria, 'gruppo', gruppo, 'ordine', ordine, 'min_n', min_n, 'max_n', max_n, 'max_gratis', max_gratis) order by id_categoria, ordine) from categoria_gruppo_variazione), '[]'::jsonb)
  );
end $$;

-- 4) pulizia del catalogo: i 57 prodotti inventati nelle fasi 1 e 12 (senza id Velocissimo) sono già
--    spenti (attivo = false) e nessun ordine li usa. Il DELETE era qui, ma col connettore un delete resta
--    appeso in attesa di una conferma che non si vede (come revoke e drop policy, vedi CLAUDE.md dell'OS):
--    la migrazione è stata applicata SENZA questo passo (23/10/2026). Si cancellano dalla console quando serve:
--    delete from prodotto p where p.id_velocissimo is null and not p.attivo
--      and not exists (select 1 from ordine_riga r where r.id_prodotto = p.id);
