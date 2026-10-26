-- DA DECIDERE (Edoardo) — NON APPLICATA. Critico giro 31, 26/10/2026.
-- Oggi e_staff() vale per admin, cassa E totem: il PC del totem (che sta in sala, davanti ai clienti)
-- può cambiare prezzi e prodotti. Il menù lo scrivono solo admin e cassa; il totem lo legge e basta.
create or replace function puo_scrivere_menu() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(ruolo_corrente() in ('admin','cassa'), false)
$$;
alter policy prodotto_write on prodotto using (puo_scrivere_menu()) with check (puo_scrivere_menu());
-- (stessa cosa su categoria, gruppo_categoria, variazione, categoria_gruppo_variazione, pacchetto_*:
--  i nomi delle policy vanno riletti da pg_policies prima di applicare.)
--
-- Secondo punto, da decidere: la comanda della cassa salva il prezzo che manda il browser
-- (0037, crea ordine cassa). /ordina invece riprezza sul server. Riprezzare anche la cassa
-- toglierebbe la possibilità di un prezzo a mano: va scelto con Edoardo.
