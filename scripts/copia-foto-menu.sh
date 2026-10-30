#!/bin/sh
# Copia le foto del menù dal CDN di Velocissimo (WebApp) in public/menu/, così il menù non dipende più da
# loro (Edoardo, 30/10/2026, risposta H: «le foto del menu le puoi copiare, sì»). Il container di sviluppo
# non raggiunge service.web-app.it: si lancia da un computer normale, dalla cartella del repo.
#   sh scripts/copia-foto-menu.sh
# Poi: git add public/menu && commit, e supabase/da_decidere/foto_menu_nostre.sql col sì di Edoardo.
set -e
BASE="https://service.web-app.it/pluto_h725_clienti/A_MANO_A_MANO_PUGLIESE_1686829560/ImgFoto"
cd "$(dirname "$0")/../public/menu"
ok=0; no=0
for f in $(cat ELENCO.txt); do
  if [ -s "$f" ]; then ok=$((ok+1)); continue; fi
  if curl -fsS -o "$f.tmp" "$BASE/$f"; then mv "$f.tmp" "$f"; ok=$((ok+1)); else rm -f "$f.tmp"; no=$((no+1)); echo "manca: $f"; fi
done
# sul Mac le foto grandi si portano a 900 px di lato (sips c'è già); altrove restano come sono
if command -v sips >/dev/null 2>&1; then for f in *.jpeg *.png; do sips -Z 900 "$f" >/dev/null; done; fi
echo "copiate $ok, mancano $no"
