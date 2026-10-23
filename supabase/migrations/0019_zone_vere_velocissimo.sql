-- Zone di consegna VERE, lette dal back-office Velocissimo il 23/10/2026 (Edoardo: «c'è un
-- costo di consegna per zona, pure quello lo puoi vedere dalle API di Velocissimo»): 16 poligoni
-- (la «Zona generica» di Velocissimo, senza poligono, qui è «nessuna zona» = non serviamo).
-- Tutte le zone hanno ordine minimo 10 € e nessuna soglia di consegna gratuita (0,00 nel back-office).
-- Il punto-nel-poligono è fatto a mano (ray casting): niente PostGIS da tenere acceso per 16 zone.
alter table zona add column if not exists poligono jsonb;            -- [[lat,lng], …] chiuso
alter table zona add column if not exists minimo_ordine numeric(10,2) not null default 10;
alter table zona add column if not exists id_velocissimo int unique;
alter table zona add column if not exists attiva boolean not null default true;
update zona set attiva = false where id_velocissimo is null;         -- i due segnaposto di prova

insert into zona (id_velocissimo, nome, costo_consegna, poligono) values
  (2, 'VERBANO', 1.00, '[[41.91288, 12.50676], [41.92102, 12.51775], [41.92348, 12.51278], [41.92681, 12.50574], [41.92406, 12.5031], [41.92299, 12.50208], [41.9196, 12.49844], [41.91288, 12.50676]]'::jsonb),
  (3, 'VALLI NOMENTANA', 2.00, '[[41.93384, 12.52153], [41.93194, 12.52392], [41.92988, 12.52685], [41.92917, 12.52859], [41.93294, 12.52926], [41.92956, 12.53374], [41.92952, 12.53598], [41.92918, 12.53815], [41.92889, 12.54001], [41.93069, 12.54144], [41.93789, 12.541], [41.93767, 12.53979], [41.93524, 12.53416], [41.93532, 12.53236], [41.93579, 12.53121], [41.93661, 12.52981], [41.93873, 12.52725], [41.93384, 12.52153]]'::jsonb),
  (4, 'SAN GIOVANNI COLOSSEO', 2.00, '[[41.90431, 12.49415], [41.89693, 12.48273], [41.89341, 12.48701], [41.89065, 12.49421], [41.88966, 12.49838], [41.88898, 12.5019], [41.88923, 12.50339], [41.88843, 12.50379], [41.88724, 12.50448], [41.88639, 12.50839], [41.8871, 12.51137], [41.88793, 12.5143], [41.88856, 12.51504], [41.88932, 12.51553], [41.89165, 12.51601], [41.89296, 12.51578], [41.89823, 12.50917], [41.90341, 12.50097], [41.90156, 12.49771], [41.90431, 12.49415]]'::jsonb),
  (5, 'PORTA PIA TERMINI', 1.50, '[[41.91288, 12.50676], [41.90941, 12.50131], [41.9043, 12.49415], [41.90155, 12.49771], [41.9034, 12.50097], [41.89823, 12.50917], [41.89296, 12.51578], [41.89519, 12.51774], [41.89682, 12.51948], [41.8974, 12.52151], [41.90262, 12.51964], [41.90979, 12.51064], [41.91288, 12.50676]]'::jsonb),
  (6, 'PORTA PIA PIAZZA FIUME', 1.00, '[[41.9196, 12.49844], [41.91549, 12.4941], [41.90937, 12.48818], [41.90633, 12.4905], [41.9043, 12.49415], [41.90941, 12.50131], [41.91288, 12.50676], [41.9196, 12.49844]]'::jsonb),
  (7, 'PARIOLI ZOOPARCO - AUDITORIUM', 2.00, '[[41.92989, 12.4848], [41.92915, 12.48231], [41.92836, 12.48145], [41.92869, 12.47742], [41.92727, 12.47467], [41.92403, 12.47186], [41.91901, 12.47342], [41.91854, 12.47724], [41.916, 12.48253], [41.91623, 12.48336], [41.91693, 12.48386], [41.91779, 12.48438], [41.91853, 12.48513], [41.91883, 12.48593], [41.91922, 12.48656], [41.91973, 12.48739], [41.91911, 12.49016], [41.9226, 12.49213], [41.92523, 12.48939], [41.92596, 12.48677], [41.92855, 12.48626], [41.92989, 12.4848]]'::jsonb),
  (8, 'PARIOLI MOSCHEA', 2.00, '[[41.9226, 12.49213], [41.92604, 12.49346], [41.93024, 12.49574], [41.93087, 12.49477], [41.93105, 12.4932], [41.93133, 12.49213], [41.93165, 12.48946], [41.93059, 12.48532], [41.92989, 12.4848], [41.92855, 12.48626], [41.92596, 12.48677], [41.92523, 12.48939], [41.9226, 12.49213]]'::jsonb),
  (9, 'PARIOLI ALTA', 1.00, '[[41.9196, 12.49844], [41.92299, 12.50208], [41.92406, 12.5031], [41.92604, 12.49346], [41.9226, 12.49213], [41.91911, 12.49016], [41.91723, 12.49097], [41.91549, 12.4941], [41.9196, 12.49844]]'::jsonb),
  (10, 'NOMENTANA SANT ANGELA MERICI', 1.50, '[[41.92102, 12.51775], [41.91981, 12.51972], [41.92106, 12.52006], [41.92131, 12.52659], [41.92653, 12.52815], [41.92748, 12.52812], [41.92841, 12.52791], [41.92916, 12.52739], [41.92953, 12.52713], [41.92988, 12.52685], [41.92102, 12.51775]]'::jsonb),
  (11, 'LIBIA ERITREA SALARIA', 1.50, '[[41.92681, 12.50574], [41.92348, 12.51278], [41.92351, 12.51514], [41.9245, 12.51587], [41.92842, 12.5157], [41.93384, 12.52153], [41.93714, 12.51934], [41.93944, 12.51699], [41.93981, 12.51623], [41.93989, 12.51592], [41.94017, 12.51554], [41.94099, 12.51439], [41.94212, 12.51175], [41.9408, 12.51029], [41.94027, 12.50969], [41.93962, 12.50928], [41.93641, 12.50879], [41.93392, 12.50922], [41.93088, 12.50909], [41.92839, 12.50737], [41.92681, 12.50574]]'::jsonb),
  (12, 'LIBIA ERITREA NOM', 1.50, '[[41.92348, 12.51278], [41.92102, 12.51775], [41.92988, 12.52685], [41.93194, 12.52392], [41.93384, 12.52153], [41.92841, 12.5157], [41.9245, 12.51587], [41.92351, 12.51514], [41.92348, 12.51278]]'::jsonb),
  (13, 'CONCA D ORO PRATI FISCALI', 2.00, '[[41.9439, 12.513], [41.93981, 12.51623], [41.93944, 12.51699], [41.93714, 12.51934], [41.93384, 12.52153], [41.93873, 12.52725], [41.93661, 12.52981], [41.93579, 12.53121], [41.93532, 12.53236], [41.93524, 12.53416], [41.93866, 12.53037], [41.93952, 12.52982], [41.94037, 12.52949], [41.94279, 12.52963], [41.94319, 12.52951], [41.94343, 12.52927], [41.9449, 12.52752], [41.9456, 12.52656], [41.9462, 12.52551], [41.94657, 12.51793], [41.94602, 12.51508], [41.9455, 12.51356], [41.9439, 12.513]]'::jsonb),
  (14, 'BOLOGNA STAZIONE TIBURTINA', 1.50, '[[41.91889, 12.51998], [41.9095, 12.52139], [41.90842, 12.5251], [41.90905, 12.53144], [41.91259, 12.52817], [41.9147, 12.52792], [41.92131, 12.52659], [41.92106, 12.52006], [41.91981, 12.51972], [41.91889, 12.51998]]'::jsonb),
  (15, 'BOLOGNA SPALLANZANI', 1.00, '[[41.91288, 12.50676], [41.90979, 12.51064], [41.91071, 12.51333], [41.9109, 12.5156], [41.9095, 12.52139], [41.91889, 12.51998], [41.91981, 12.51972], [41.92102, 12.51775], [41.91288, 12.50676]]'::jsonb),
  (16, 'BOLOGNA SAPIENZA', 1.00, '[[41.90979, 12.51064], [41.90263, 12.51965], [41.90793, 12.52591], [41.90192, 12.53162], [41.90102, 12.53186], [41.90046, 12.53443], [41.89925, 12.53752], [41.90158, 12.54339], [41.90378, 12.54402], [41.90907, 12.5427], [41.91442, 12.54184], [41.91438, 12.54015], [41.91429, 12.5381], [41.91457, 12.53583], [41.91439, 12.53407], [41.90905, 12.53144], [41.90842, 12.5251], [41.9095, 12.52139], [41.91091, 12.51561], [41.91072, 12.51334], [41.90979, 12.51064]]'::jsonb),
  (17, 'BARBERINI VIA VENETO', 1.50, '[[41.90937, 12.48818], [41.90828, 12.48483], [41.90671, 12.48548], [41.90425, 12.48539], [41.90026, 12.48099], [41.89693, 12.48273], [41.9043, 12.49415], [41.90633, 12.4905], [41.90937, 12.48818]]'::jsonb)
on conflict (id_velocissimo) do update set nome = excluded.nome, costo_consegna = excluded.costo_consegna, poligono = excluded.poligono, attiva = true;

-- Il costo di consegna di un ordine si congela sull'ordine (se la zona cambia prezzo domani,
-- l'ordine di ieri resta com'era).
alter table ordine add column if not exists costo_consegna numeric(10,2) not null default 0;

-- Dentro quale zona cade un punto. Null se fuori da tutte: non consegniamo lì.
create or replace function zona_per_punto(p_lat double precision, p_lng double precision)
returns table (id uuid, nome text, costo_consegna numeric, minimo_ordine numeric)
language plpgsql stable as $$
declare
  z record; pts jsonb; n int; i int; j int; dentro boolean;
  xi double precision; yi double precision; xj double precision; yj double precision;
begin
  for z in select zona.id, zona.nome, zona.costo_consegna, zona.minimo_ordine, zona.poligono from zona where zona.attiva and zona.poligono is not null loop
    pts := z.poligono; n := jsonb_array_length(pts); dentro := false; j := n - 1;
    for i in 0 .. n - 1 loop
      yi := (pts->i->>0)::double precision; xi := (pts->i->>1)::double precision;
      yj := (pts->j->>0)::double precision; xj := (pts->j->>1)::double precision;
      if ((yi > p_lat) <> (yj > p_lat)) and (p_lng < (xj - xi) * (p_lat - yi) / (yj - yi) + xi) then
        dentro := not dentro;
      end if;
      j := i;
    end loop;
    if dentro then
      id := z.id; nome := z.nome; costo_consegna := z.costo_consegna; minimo_ordine := z.minimo_ordine;
      return next; return;
    end if;
  end loop;
end $$;
grant execute on function zona_per_punto(double precision, double precision) to authenticated, anon, service_role;
