-- Edoardo, 25/10/2026: «i burger non li facciamo più»; le pucce restano e contano come le pizze nei
-- quarti d'ora (impegna_forno resta true). Categoria nascosta e prodotti spenti, non cancellati.
update categoria set visibile_app = false, visibile_web = false, visibile_totem = false, impegna_forno = false
 where id = 'aa7d646f-1853-4e2b-af27-6ff66cdb9117';
update prodotto set attivo = false where id_categoria = 'aa7d646f-1853-4e2b-af27-6ff66cdb9117';
