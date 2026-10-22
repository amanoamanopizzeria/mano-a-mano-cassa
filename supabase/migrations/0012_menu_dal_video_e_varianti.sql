-- Mano a Mano Cassa — Fase 12: il menù com'è sul totem e sulla cassa vera (video del 23/10/2026),
-- il colore e la destinazione di ogni categoria, le varianti a gruppi (Impasto, Latticini…),
-- e due correzioni a accetta_ordine_esterno: salva id_prodotto e conta le varianti nel totale.
-- I prezzi che nel video non si leggevano sono 0: la cassa li mostra come «da impostare».
-- (Applicata sul progetto con apply_migration, nome menu_dal_video_e_varianti.)

-- ========== Categoria: colore della tessera in cassa e dove va la comanda ==========
alter table categoria add column if not exists colore text;
alter table categoria add column if not exists destinazione text not null default 'cucina'
  check (destinazione in ('cucina','cassa','nessuna'));

-- ========== Gruppi ==========
insert into gruppo_categoria (nome, ordine)
select v.nome, v.ordine from (values ('Cucina', 2), ('Bar', 3)) as v(nome, ordine)
where not exists (select 1 from gruppo_categoria g where g.nome = v.nome);

-- ========== Categorie (quelle della barra colorata della cassa) ==========
with g as (select id, nome from gruppo_categoria)
insert into categoria (id_gruppo, nome, ordine, colore, destinazione)
select (select id from g where g.nome = v.gruppo), v.nome, v.ordine, v.colore, v.dest
from (values
  ('Pizze',  'Le novità estive',   0, '#f5e642', 'cucina'),
  ('Pizze',  'Pizze speciali',     2, '#4dd0c4', 'cucina'),
  ('Cucina', 'Pucce pugliesi',     3, '#f7e36b', 'cucina'),
  ('Cucina', 'Fritti',             4, '#e9b44c', 'cucina'),
  ('Cucina', 'Burgeria',           5, '#8bc34a', 'cucina'),
  ('Cucina', 'Insalate',           6, '#5fd3c8', 'cucina'),
  ('Cucina', 'Dolci',              7, '#f48fb1', 'nessuna'),
  ('Bar',    'Bevande',            8, '#8ed0f5', 'cassa'),
  ('Bar',    'Birre',              9, '#7b61ff', 'cassa'),
  ('Bar',    'La nostra cantina', 10, '#c99a5b', 'cassa')
) as v(gruppo, nome, ordine, colore, dest)
where not exists (select 1 from categoria c where c.nome = v.nome);

update categoria set colore = '#f5c518' where nome = 'Pizze classiche' and colore is null;

-- ========== Prodotti ==========
-- Pizze speciali (prezzi letti dal totem).
insert into prodotto (id_categoria, nome, prezzo, ordine)
select c.id, v.nome, v.prezzo, v.ordine
from categoria c, (values
  ('A Mano a Mano', 11.40, 1), ('Carbonara', 10.50, 2), ('Ciauscolo', 10.90, 3),
  ('Cotto affumicato', 10.90, 4), ('Gricia alle pere', 10.40, 5), ('Il crudo di Parma', 11.90, 6),
  ('L''amatriciana', 9.40, 7), ('L''anniversario', 10.90, 8), ('La bresaola', 10.90, 9),
  ('La cacio e pepe', 9.70, 10), ('La dar contadino', 9.90, 11), ('La gricia', 9.40, 12)
) as v(nome, prezzo, ordine)
where c.nome = 'Pizze speciali'
  and not exists (select 1 from prodotto p where p.id_categoria = c.id and p.nome = v.nome);

-- Le novità estive (prezzi letti dal totem).
insert into prodotto (id_categoria, nome, prezzo, ordine)
select c.id, v.nome, v.prezzo, v.ordine
from categoria c, (values
  ('Aglio olio e baccalà', 10.90, 1), ('L''arrabbiata', 9.90, 2), ('La lardo', 11.90, 3),
  ('Variazione di zucchine', 11.70, 4)
) as v(nome, prezzo, ordine)
where c.nome = 'Le novità estive'
  and not exists (select 1 from prodotto p where p.id_categoria = c.id and p.nome = v.nome);

-- Pizze classiche: quelle della griglia della cassa (prezzo 0 = da impostare).
insert into prodotto (id_categoria, nome, prezzo, ordine)
select c.id, v.nome, v.prezzo, v.ordine
from categoria c, (values
  ('La bufala e pachino', 9.90, 10), ('La crostino', 9.40, 11), ('La crostino pugliese', 0, 12),
  ('I 3 formaggi', 0, 13), ('La boscaiola', 0, 14), ('La bufala e padano', 0, 15),
  ('La fiori e alici', 0, 16), ('La funghi', 0, 17), ('La margherita con bufala', 0, 18),
  ('La margherita con crudo', 0, 19), ('La margherita ricca', 0, 20), ('La napoli', 0, 21),
  ('La patate con salsiccia', 0, 22), ('La patate con wurstel', 0, 23), ('La provola e speck', 0, 24),
  ('La salsiccia', 0, 25), ('La wurstel', 0, 26), ('L''ortolana', 0, 27)
) as v(nome, prezzo, ordine)
where c.nome = 'Pizze classiche'
  and not exists (select 1 from prodotto p where p.id_categoria = c.id and p.nome = v.nome);

-- Fritti (nomi dalla griglia della cassa; prezzi da impostare).
insert into prodotto (id_categoria, nome, prezzo, ordine)
select c.id, v.nome, 0, v.ordine
from categoria c, (values
  ('Anelli di cipolla', 1), ('Arancino alla carbonara', 2), ('Arancino alla griglia', 3),
  ('Chips di patate', 4), ('Crocchetta al gorgonzola', 5), ('Crocchetta alla ''nduja', 6),
  ('Crocchetta cacio e pepe', 7), ('Crocchetta di patate', 8), ('Filetto di baccalà pastellato', 9),
  ('Fiore all''nduja', 10), ('Fiore di zucca', 11), ('Frittura di verdure', 12), ('Jalapenos', 13),
  ('Mozzarelline', 14), ('Olive ascolane', 15), ('Patate stick', 16), ('Pepite di baccalà', 17),
  ('Supplì di riso', 18)
) as v(nome, ordine)
where c.nome = 'Fritti'
  and not exists (select 1 from prodotto p where p.id_categoria = c.id and p.nome = v.nome);

-- ========== Varianti a gruppi (valgono per tutte le pizze: id_categoria nullo) ==========
insert into variazione (nome, prezzo, tipo, gruppo, id_categoria)
select v.nome, v.prezzo, 'aggiunta', v.gruppo, null
from (values
  ('Impasto alto', 1.00, 'Impasto'), ('Impasto normale', 0, 'Impasto'),
  ('Brie de Meaux', 0, 'Latticini'), ('Cheddar', 0, 'Latticini'), ('Crema cacio e pepe', 0, 'Latticini'),
  ('Doppia mozzarella', 0, 'Latticini'), ('Gorgonzola piccante', 0, 'Latticini'), ('Grana Padano DOP', 0, 'Latticini'),
  ('Mozzarella di bufala DOP', 0, 'Latticini'), ('Mozzarella di bufala DOP a strappi', 0, 'Latticini'),
  ('Pecorino Romano DOP', 0, 'Latticini'), ('Provola affumicata', 0, 'Latticini'),
  ('Stracciatella artigianale', 0, 'Latticini'), ('Stracciatella artigianale al tartufo', 0, 'Latticini'),
  ('Taleggio', 0, 'Latticini'),
  ('Prosciutto cotto', 0, 'Salumi e pesce'), ('Prosciutto crudo', 0, 'Salumi e pesce'), ('Salsiccia', 0, 'Salumi e pesce'),
  ('Speck', 0, 'Salumi e pesce'), ('''Nduja', 0, 'Salumi e pesce'), ('Alici', 0, 'Salumi e pesce'),
  ('Funghi', 0, 'Verdure'), ('Cipolla', 0, 'Verdure'), ('Zucchine', 0, 'Verdure'), ('Patate', 0, 'Verdure'),
  ('Rucola', 0, 'Verdure'), ('Pomodorini', 0, 'Verdure'),
  ('Origano', 0, 'Spezie e altro'), ('Basilico', 0, 'Spezie e altro'), ('Olio piccante', 0, 'Spezie e altro')
) as v(nome, prezzo, gruppo)
where not exists (select 1 from variazione x where x.nome = v.nome);

-- ========== accetta_ordine_esterno: id_prodotto salvato e varianti nel totale ==========
create or replace function accetta_ordine_esterno(
  p_negozio uuid, p_canale canale_ordine, p_tipo tipo_ordine, p_id_esterno text,
  p_ora timestamptz, p_note text, p_righe jsonb
) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_ordine ordine;
  v_slot timestamptz;
  v_giorno date;
  v_cap record;
  v_pizze numeric;
begin
  if p_id_esterno is not null then
    select * into v_ordine from ordine
    where id_negozio = p_negozio and canale = p_canale and id_esterno = p_id_esterno;
    if found then
      return jsonb_build_object('esito', 'duplicato', 'id', v_ordine.id, 'numero', v_ordine.numero);
    end if;
  end if;

  if p_righe is null or jsonb_typeof(p_righe) <> 'array' or jsonb_array_length(p_righe) = 0 then
    return jsonb_build_object('esito', 'errore', 'motivo', 'nessuna riga');
  end if;

  select coalesce(sum((r->>'quantita')::numeric), 0) into v_pizze
  from jsonb_array_elements(p_righe) r
  where coalesce(r->>'destinazione', 'cucina') = 'cucina';

  v_slot := to_timestamp(floor(extract(epoch from coalesce(p_ora, now())) / 900) * 900);
  v_giorno := (v_slot at time zone 'Europe/Rome')::date;

  select * into v_cap from capacita_giorno(p_negozio, v_giorno) where inizio = v_slot;
  if v_cap is null then
    return jsonb_build_object('esito', 'fuori_orario', 'slot', v_slot);
  end if;
  if v_cap.bloccata_produzione and v_pizze > 0 then
    return jsonb_build_object('esito', 'pieno', 'motivo', 'produzione bloccata', 'slot', v_slot);
  end if;
  if v_pizze > 0 and v_cap.pizze_occupate + v_pizze > v_cap.pizze_max then
    return jsonb_build_object('esito', 'pieno', 'motivo', 'pizze', 'slot', v_slot,
      'libere', greatest(v_cap.pizze_max - v_cap.pizze_occupate, 0));
  end if;
  if p_tipo = 'domicilio' and (v_cap.bloccata_consegne or v_cap.consegne_occupate + 1 > v_cap.consegne_max) then
    return jsonb_build_object('esito', 'pieno', 'motivo', 'consegne', 'slot', v_slot);
  end if;

  insert into ordine (id_negozio, canale, tipo, ora_consegna, note, id_esterno)
  values (p_negozio, p_canale, p_tipo, p_ora, p_note, p_id_esterno)
  returning * into v_ordine;

  insert into ordine_riga (id_ordine, id_prodotto, descrizione, quantita, prezzo_unit, variazioni, note, destinazione)
  select v_ordine.id,
         nullif(r->>'id_prodotto', '')::uuid,
         r->>'descrizione',
         coalesce((r->>'quantita')::numeric, 1),
         coalesce((r->>'prezzo_unit')::numeric, 0),
         coalesce(r->'variazioni', '[]'::jsonb),
         r->>'note',
         coalesce(r->>'destinazione', 'cucina')
  from jsonb_array_elements(p_righe) r;

  update ordine
     set totale = (
       select coalesce(sum((prezzo_unit + coalesce((
         select sum((v->>'prezzo')::numeric) from jsonb_array_elements(variazioni) v), 0)) * quantita), 0)
       from ordine_riga where id_ordine = v_ordine.id)
   where id = v_ordine.id
   returning * into v_ordine;

  return jsonb_build_object('esito', 'accettato', 'id', v_ordine.id, 'numero', v_ordine.numero, 'totale', v_ordine.totale);
end $$;
