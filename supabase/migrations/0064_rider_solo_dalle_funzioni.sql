-- Controllo ECC del 26/10/2026: il rider poteva riscrivere a mano le proprie consegne (anche
-- contanti_da_incassare = 0 e «saldata») e leggere o cambiare gli avvisi di tutti i clienti.
-- L'app del rider passa già solo dalle funzioni (prendi_consegna, aggiorna_consegna, parto_giro,
-- segnala_posizione), che girano come proprietario e controllano chi è e cosa può fare: le
-- regole di modifica diretta si chiudono. Il rider continua a vedere le sue consegne
-- (consegna_rider_read). Gli avvisi restano allo staff. alter policy e non drop: col connettore
-- drop e revoke possono restare appesi.
alter policy consegna_rider_upd on consegna using (false) with check (false);
alter policy consegna_rider_take on consegna using (false) with check (false);
alter policy notifica_staff on notifica_cliente using (e_staff()) with check (e_staff());
