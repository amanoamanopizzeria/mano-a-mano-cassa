# REA · 5. API e integrazioni del sistema Velocissimo

*Letto il 23/10/2026. La specifica OpenAPI ufficiale sta su `admin.velocissimo.app/api-docs/spec` (resa con Scalar). Nessuna chiave è scritta qui: il `client_id` è in Vercel, il secret non è mai stato letto.*

## 5.1 Le tre API che esistono

| API | Chi la usa | Dove | Cosa fa |
|---|---|---|---|
| **pluto-server** (`service.web-app.it/pluto-server/…`) | app iOS/Android, web-app del sito, totem, Centralissimo | interna, non documentata | tutto l'ordine online del cliente: `stores/delivery|takeaway`, `showcases/{id}`, `products/{id}`, `menus/{id}`, `checkout`, coupon, card, punti (vedi `02_APP_CLIENTE.md` §0) |
| **ping-executer → pluto-server** | la cassa 2Bit sul PC del negozio | porta locale 9000 → cloud | il POS scarica ordini e stati, manda vendite, clienti e chiusure (vedi `03_CASSA_2BIT.md` §3.2) |
| **Velocissimo Public API v1** (`api.velocissimo.app/v1`) | sistemi esterni con credenziali OAuth | **documentata**, questa sezione | vendite, borsello rider, catalogo, copertura, **ordini** (modulo premium Ordering API) |

## 5.2 Velocissimo Public API v1 (OpenAPI letta per intero)

**Autenticazione**: OAuth 2.0 **Client Credentials**. Il `client_id` e il `client_secret` si generano nel back-office (sezione Credenziali API). Token da `POST https://api.velocissimo.app/oauth/token` con `grant_type=client_credentials`, poi `Authorization: Bearer …`. Il tenant (negozio) è risolto dal token: nessun id da passare. Base URL `https://api.velocissimo.app/v1`. Risposta sempre `{ status, message, data }`.

**Errori** (Ordering API): codice stabile in `message` e `data.error.code`, dettagli in campi separati. 400 errore di business, 403 negozio non visibile o modulo non attivo (`module_not_active`), 409 stesso `external_ref` in creazione, 422 parametri non validi.

### Endpoint (15)

| Metodo e path | Tag | Serve a |
|---|---|---|
| `GET /whoiam` | Diagnostica | prova di connessione: configurazione del tenant |
| `GET /negozi` | Negozi | i negozi visibili; `principale: true` è il nostro |
| `GET /vendite` | Vendite | **le righe di vendita di una giornata lavorativa**, totali per metodo di pagamento e IVA aggregata |
| `GET /borsello-rider` | Borsello rider | depositi e prelievi dei rider in cassa |
| `GET /stores/{id}/showcases` | Catalogo | i cataloghi del negozio (PRANZO, CENA, SOLO DELIVERECT, TOTEM) |
| `GET /menu` | Catalogo | categorie e prodotti di un catalogo **con i prezzi del listino del tipo d'ordine** (`type` pickup/delivery), formati e gruppi di variazioni; cache 1 ora |
| `GET /menu/compositions` | Catalogo | opzioni di un prodotto composto (2–4 gusti) |
| `GET /menu/bundles` | Catalogo | gruppi e scelte di un menu fisso |
| `POST /coverage` | Ordini | **un indirizzo è in zona?** zona, costo, minimo; motivi: `out_of_zone`, `address_unclear`, `geocode_failed`, `no_house_number` |
| `GET /customers` | Clienti | cliente per telefono: id, nome, telefono, fino a 3 indirizzi recenti |
| `GET /timeslots` | Ordini | slot indicativi (carrello vuoto) per negozio, tipo, giorno, zona |
| `POST /orders/preview` | Ordini ⭐ | anteprima: ricalcola i prezzi, geocodifica, cliente, orario confermato o alternative, metodi di pagamento; carrello temporaneo 2 ore |
| `GET /orders` | Ordini ⭐ | ordini aperti di un cliente (anche quelli da app e cassa); `managed_by_api`, `printed` |
| `POST /orders` | Ordini ⭐ | crea e conferma, a due passi (`tmp_cart_uuid`) o in un passo (`expected_total`); idempotente 24 h con `external_ref`; `origin` scelto dal chiamante |
| `PUT /orders/{id}` · `POST /orders/{id}/cancel` | Ordini ⭐ | modifica e annullo di un ordine creato via API |

⭐ = modulo premium **Ordering API**, da attivare sul tenant. `/timeslots`, `/coverage`, `/menu`, `/customers`, `/vendite`, `/borsello-rider` sono inclusi.

### `GET /vendite`: la fonte che sostituisce il CSV
- Una **giornata lavorativa** alla volta: `dataDa` decide la giornata, `dataA` al massimo **28 ore** dopo (le 24 ore più gli scontrini dopo mezzanotte). Più giorni = una chiamata per giorno, 1–2 secondi fra l'una e l'altra.
- Solo ordini **confermati e non annullati**. Il totale di quadratura è `informazioni.totale.totale`.
- Parametri: `negozioId`, `dataDa`, `dataA`, `getPaymentGroups` (pagamenti per gruppo, es. TheFork Pay), `dettaglioVariazioni` (variazioni come righe separate, `tipoArticolo = variazione`, `tipoVariazione = aggiunta|rimozione`), `hidePayments`, `getRider` (aggiunge `riderId` e l'anagrafica dei rider).
- Riga di vendita (`RigaVendita`): `Id` ordine, `cassa`, `dataChiusura` (giornata), `dataScontrino`, `oraScontrino`, `totaleScontrino`, `metodoPagamento`, `pagamentiScontrino[]`, **`venditaTipo`** = `banco | domicilio | consumazione | ritiro`, **`venditaOrigine`** = `app | manuale | xmenu | sito | instore | centralino | webapp | deliverect | totem | ai`, `riderId`, `idElemento` (DET123 / VAR45), `idArticolo` (PROD99), `tipoArticolo`, `idElementoPadre`, `AliquotaIva`, `numeroCoperti`, `articolo`, `formato`, `descrizioneArticoloConFormato` (con la porzione 1/2, 1/3), `categoria`, `prezzoVenduto` (lordo), `prezzoVendutoNettoIva`, `prezzoListinoNettoIva`, `quantita`, `scontoInRiga`.
- `informazioni`: numero coperti, numero documenti, importo scontato, `totale.totale`, `totaleNetto`, `iva` per aliquota.

È esattamente la riga del CSV Velocissimo che mano-a-mano-os legge oggi a mano: la stessa cosa si può leggere dall'API ogni notte.

### `GET /borsello-rider`
Movimenti in ordine cronologico: `tipo 1` deposito (il rider versa in cassa), `tipo 2` prelievo; `importo` sempre positivo; `fondoCassa` 0/1; `cassa`, `riderId`, nome e cognome, note. I contanti in mano al rider = prelievi − depositi. È il «borsello» che la cassa 2Bit tiene per ogni rider (vedi `04_RIDER.md`).

### Ordering API: come un sistema esterno crea un ordine
1. `GET /menu?store_id&showcase_id&type` → prodotti con `price`, `formats[]`, `variation_groups[] {id, name, min, max, max_free, options[] {id, name, price}}`, `is_composition`, `is_menu_activator`.
2. `POST /coverage {address}` → `covered`, `matches[] {zone_id, zone_name, delivery_cost, minimum_order}`, `geocoded {road, house_number, postal_code, lat, lng}`.
3. `GET /customers?phone` → `found`, `customer {id, name, phone, last_addresses[]}`.
4. `POST /orders/preview {store_id, type, customer {id | name+phone+address}, items[], date?, requested_time?, notes?, origin}` → `available`, `confirmed_time`, `alternatives[]`, `available_timeslots[]`, `tmp_cart_uuid`, `expires_in 7200`, `total`, `payment_methods[]`, `items[]` come risolti dal server.
5. `POST /orders {store_id, type, tmp_cart_uuid, cart_payment_id, requested_time, external_ref, origin}` → `order_id`, `order_number` (es. C-1042), `status`, `total`, `date`, `confirmed_time`, `estimated_ready_time`, `customer_id`.

Regole da copiare nella cassa nuova (sono quelle che il server impone a chiunque):
- i **prezzi li calcola il server**, quelli del chiamante non contano; `expected_total` diverso → `total_mismatch`;
- una riga = `product_id`, `quantity`, `variations[] {variation_id, variation_group_id, freeQuantity, quantity, operator add|remove}`; `remove` solo su ingredienti rimovibili della ricetta; `notes` di riga si uniscono alle note dell'ordine (max 500);
- menu fisso: `menu_id` + `menu_choices[] {group_id, product_id, variations}` una scelta per gruppo; composto: `format_id`, `composition_id`, `flavors[]`;
- consegna: indirizzo obbligatorio (salvo cliente con indirizzo), `missing_house_number`, `out_of_zone` con il motivo, `below_minimum {minimum, total}`;
- orario: `requested_time` assente = il prima possibile; non disponibile → `not_exact` con alternative, o `no_slots`; le fasce dopo mezzanotte hanno la data del giorno dopo; giorni ammessi dalla giornata in corso fino a «preordini fino a N giorni»;
- pagamento: obbligatorio per la consegna, sul ritiro default contanti; **niente pagamento online via API**;
- `origin` decide stampa, documenti rider, cashback, statistiche, etichetta in cassa: `app, manuale, xmenu, sito, instore, centralino, webapp, totem, ai`; mai `deliverect`;
- idempotenza con `external_ref` per 24 ore; `confirmation_failed` blocca il riferimento.

## 5.3 Deliverect
Le piattaforme (Glovo, Deliveroo, Just Eat) entrano in Velocissimo via **Deliverect** (origine `deliverect`, catalogo «SOLO DELIVERECT», pagina «MENU DELIVERECT», listino L2). L'ordine arriva già pagato («PAGATA CON PAYPAL», «Pays with cash» per Just Eat alla consegna), con una riga «CONSEGNA PIATTAFORMA 0,00 €» e la nota con l'id della piattaforma e l'orario di ritiro. Il cliente viene creato con telefono fittizio ed email `@deliverect.com`. Deliverect espone API pubbliche con webhook HMAC e OAuth2: per riceverli nella cassa nuova servono le credenziali Deliverect di Edoardo (solo in Vercel). Nel repo c'è già `src/app/api/deliverect` e la migrazione 0006 `accetta_ordine_esterno`.

## 5.4 Centralissimo (centralino) e il riconoscimento del chiamante
Nel menu c'è «Agenti (centralissimo.cloud)»: il centralino telefonico esterno che oggi apre la scheda del cliente in cassa. L'origine `centralino` esiste nelle vendite e nei coupon («Benvenuto da centralino», 34 ordini). Il telefono è VoIP con un modemino sul PC della cassa (foto in arrivo da Edoardo). La cassa nuova ha già `/api/telefono/chiamata` e la scheda che si apre da sola.

## 5.5 Prenotazioni: X-Reserve e Reserve with Google
Il form «GOOGLE» è collegato a Reserve with Google; il form «PRENOTAZIONI» è sul sito (`url.velocissimo.app/pr/928-17/`). La conferma è manuale via email a Edoardo. TheFork non attivo, garanzia carta no.

## 5.6 Pagamenti
Online: **Nexi** (XPay) dall'app e dal sito («PAGATA CON NEXI»). Alla consegna: contanti (chiede «con quanto paghi»); il POS alla consegna è configurato ma spento. Al ritiro: contanti alla cassa, bancomat alla cassa, online. In negozio il POS bancario non è collegato alla cassa: si batte sul POS e si stampa lo scontrino scegliendo «POS».

## 5.7 Push, email, WhatsApp
Push dall'app (Firebase su Android e APNs su iOS tramite il server di Velocissimo, titolo + messaggio + `[nome]`; per stato ordine e chi le può mandare: `11_PUSH_E_AVVISI_AL_CLIENTE.md`), 12 notifiche automatiche a eventi, email di prenotazione, coupon via WhatsApp (categoria COUPON WHATSAPP, «NON CUCINO» 50 ordini) e Active Campaign (categoria dedicata). Boost CRM esterno.

## 5.8 Cosa ne esce per la cassa nuova
1. **Le vendite di Velocissimo si leggono dall'API** (`/vendite`, una chiamata per giornata, 28 ore): mano-a-mano-os può smettere di importare il CSV a mano, e la cassa nuova deve esporre la stessa forma di riga quando prenderà il posto di Velocissimo (così l'OS non cambia).
2. **Il modello di ordine dell'Ordering API è il contratto giusto per il nostro `/api/ordini`**: anteprima col totale calcolato dal server, orario confermato o alternative, `external_ref` idempotente, errori con codice e dettagli. È già quello che fanno app e sito.
3. `/coverage` dice come si risponde a un indirizzo: coperto / fuori zona / senza civico / non capito, con zona, costo e minimo. La cassa nuova lo fa già con `zona_per_punto`; mancano i motivi.
4. Le origini (`app, manuale, sito, instore, centralino, webapp, totem, deliverect, ai`) e i tipi (`banco, domicilio, consumazione, ritiro`) sono la tassonomia da tenere uguale nel nostro `ordine.canale` e `ordine.tipo`.
