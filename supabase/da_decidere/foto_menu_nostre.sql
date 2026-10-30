-- DA DECIDERE (Edoardo, 30/10/2026, risposta H: «le foto del menu le puoi copiare, sì»). Dopo che
-- scripts/copia-foto-menu.sh ha messo le 121 foto in public/menu/ e il deploy è READY: ogni prodotto punta alla
-- copia nostra (stesso nome di file), servita da Vercel. Se una foto manca in public/menu, quel prodotto resta
-- com'era: la riga lo esclude solo se lo script l'ha segnata «manca» (controllare prima l'uscita dello script).
update prodotto
   set foto_url = '/menu/' || regexp_replace(foto_url, '^.*/', '')
 where foto_url like 'https://service.web-app.it/pluto_h725_clienti/A_MANO_A_MANO_PUGLIESE_1686829560/ImgFoto/%';
