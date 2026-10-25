-- Critico giro 26: la nota di consegna (citofono, piano, mig. 0057) non arrivava sulla carta né al rider.
-- comanda_ordine e comanda_per_stampa la mettono nell'indirizzo; consegne_rider3 la aggiunge alle note
-- del cliente che il rider già legge. Le funzioni si riscrivono dal loro testo, cambiando solo quel pezzo.
-- In più la coda dell'agente non scartava più i preordini presi più di 18 ore prima (C-10 del 23 per il 24):
-- conta l'ora della consegna, non quella in cui è stato preso.
do $$
declare f text; d text;
begin
  foreach f in array array['comanda_ordine(uuid)', 'comanda_per_stampa(uuid)'] loop
    d := pg_get_functiondef(f::regprocedure);
    if position('''note'', i.note' in d) = 0 then
      execute replace(d, '''zona'', z.nome) end', '''zona'', z.nome, ''note'', i.note) end');
    end if;
  end loop;
  d := pg_get_functiondef('consegne_rider3()'::regprocedure);
  if position('concat_ws' in d) = 0 then
    execute replace(d, 'cl.telefono, cl.note,', 'cl.telefono, nullif(concat_ws('' · '', cl.note, case when i.note is not null then ''CONSEGNA: '' || i.note end), ''''),');
  end if;
  d := pg_get_functiondef('coda_stampa()'::regprocedure);
  execute replace(d, 'o.creato_il > now() - interval ''18 hours''', 'coalesce(o.ora_consegna, o.creato_il) > now() - interval ''18 hours''');
end $$;
