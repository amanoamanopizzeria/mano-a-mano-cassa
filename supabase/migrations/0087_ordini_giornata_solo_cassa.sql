-- L'elenco ordini del giorno (ordini_giornata, mig. 0040/0068: è il CSV per l'OS e per la chiusura della serata) era
-- SECURITY DEFINER ed eseguibile anche da anon e da qualunque utente entrato (rider, totem): con la chiave pubblica
-- della pagina chiunque poteva leggere gli ordini della serata, con nomi, telefoni e indirizzi. Edoardo, 31/10/2026
-- 00:55Z: «Sì, chiudilo adesso».
-- 1) Dentro la funzione: solo il server (service_role, /api/ordini/csv per l'OS) o chi è admin o cassa
--    (/api/ordini/csv-serata). Si cambia solo la condizione, il resto della funzione resta com'è.
-- 2) Fuori: niente EXECUTE a PUBLIC e anon (eseguito a parte con execute_sql: col connettore un revoke dentro
--    apply_migration può restare appeso).
do $$
declare d text;
begin
  d := pg_get_functiondef('ordini_giornata(date)'::regprocedure);
  if position('ruolo_corrente()' in d) = 0 then
    execute replace(d, 'where giornata_lavorativa(o.creato_il) = p_giornata',
      'where giornata_lavorativa(o.creato_il) = p_giornata'
      || ' and (auth.role() = ''service_role'' or coalesce(ruolo_corrente() in (''admin'', ''cassa''), false))');
  end if;
end $$;

revoke execute on function ordini_giornata(date) from public, anon;
-- Riletto 31/10 00:58Z: anon non può (has_function_privilege false); un utente entrato senza ruolo di cassa ha 0 righe;
-- cassa 12 righe e il server 12 righe sul 27/10, come prima.
