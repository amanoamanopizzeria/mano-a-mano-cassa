// Prova di src/lib/deliverect/ordine.ts con ordini Glovo finti: npx --yes tsx scripts/prova-deliverect-ordine.mts
// Il catalogo è come quello vero del 26/10: nessun codice nel database, solo l'id di Velocissimo.
import { traduciArticoli } from "../src/lib/deliverect/ordine.ts";
import assert from "node:assert/strict";

const P = (id: string, nome: string, idv: number, attivo = true, destinazione: "cucina" | "cassa" = "cucina") =>
  ({ id, nome, codice: null, id_velocissimo: idv, attivo, destinazione });
const prodotti = [
  P("p-fin", "La finocchiona", 260) /* accesa nel DB come oggi */, P("p-bar", "Barattolo variegato nutella", 170), P("p-che", "Cheesecake al pistacchio", 269), P("p-arr", "L'arrabbiata", 264),
  P("p-m1", "Menu classico X1", 210), P("p-mar-vecchia", "Margherita", 999, false), P("p-mar", "Margherita", 11),
  P("p-coca", "Coca cola 33cl", 150, true, "cassa"), P("p-chips", "Chips di patate", 300),
];
const variazioni = [
  { nome: "Mozzarella di bufala", id_velocissimo: 7, tipo: "aggiunta" as const },
  { nome: "Cipolla", id_velocissimo: 8, tipo: "aggiunta" as const },
  { nome: "Chips di patate", id_velocissimo: 9, tipo: "aggiunta" as const },
];
const combo = new Set(["p-m1"]);

// 1) il PLU di oggi (codice Velocissimo): 142 è di due prodotti, vince l'acceso
let t = traduciArticoli([{ plu: "142", name: "Arrabbiata", price: 990, quantity: 2,
  subItems: [{ plu: "B7", name: "Mozzarella di bufala", price: 250, quantity: 1 }, { name: "Cipolla", price: 0, quantity: 1, modifierAction: "NO" }] }],
  prodotti, variazioni, combo);
assert.equal(t.righe[0].id_prodotto, "p-arr");
assert.deepEqual(t.righe[0].variazioni, [{ nome: "Mozzarella di bufala", prezzo: 2.5, tipo: "aggiunta" }, { nome: "Cipolla", prezzo: 0, tipo: "rimozione" }]);
assert.equal(t.totale, 24.8);

// 1b) C072 è di due prodotti accesi: sceglie il nome che manda Deliverect
t = traduciArticoli([{ plu: "C072", name: "Cheesecake pistacchio", price: 650, quantity: 1 }], prodotti, variazioni, combo);
assert.equal(t.righe[0].id_prodotto, "p-che");
t = traduciArticoli([{ plu: "C072", name: "Barattolo Nutella", price: 650, quantity: 1 }], prodotti, variazioni, combo);
assert.equal(t.righe[0].id_prodotto, "p-bar");

// 2) un menu: la pizza scelta CON l'extra resta una riga figlia, dentro un gruppo P-
t = traduciArticoli([{ plu: "24", name: "Menu Classico X1", price: 1200, quantity: 1, subItems: [
  { plu: "P-abc", name: "Scegli la pizza", price: 0, quantity: 1, productType: 3, subItems: [
    { plu: "C001", name: "Margherita", price: 0, quantity: 1, subItems: [{ plu: "VAR7", name: "Bufala", price: 250, quantity: 2 }] }] },
  { name: "Coca Cola 33cl", price: 0, quantity: 1 },
  { name: "Chips di patate", price: 0, quantity: 1 },
] }], prodotti, variazioni, combo);
assert.equal(t.righe[0].id_prodotto, "p-m1");
assert.equal(t.righe[0].figlie?.length, 3); // anche le Chips, che sono pure il nome di una variante
assert.equal(t.righe[0].figlie?.[0].id_prodotto, "p-mar");
assert.equal(t.righe[0].figlie?.[0].variazioni.length, 2);
assert.equal(t.righe[0].figlie?.[1].destinazione, "cassa");
assert.equal(t.totale, 17);

// 3) un extra che si chiama come un prodotto non diventa una riga, fuori da un menu
t = traduciArticoli([{ plu: "C001", name: "Margherita", price: 850, quantity: 1, remark: "ben cotta",
  subItems: [{ name: "Chips di patate", price: 150, quantity: 1 }] }], prodotti, variazioni, combo);
assert.equal(t.righe[0].id_prodotto, "p-mar");
assert.equal(t.righe[0].figlie, undefined);
assert.equal(t.righe[0].variazioni[0].nome, "Chips di patate");
assert.equal(t.righe[0].note, "ben cotta");

// 4) per nome vince l'acceso; lo sconosciuto entra col suo prezzo e si segnala
t = traduciArticoli([{ name: "margherita", price: 850, quantity: 1 }, { plu: "ZZZ", name: "Pizza misteriosa", price: 1100, quantity: 1 }], prodotti, variazioni, combo);
assert.equal(t.righe[0].id_prodotto, "p-mar");
assert.equal(t.righe[1].id_prodotto, null);
assert.deepEqual(t.sconosciuti, ["Pizza misteriosa (PLU ZZZ)"]);
console.log("ok: codici Velocissimo, doppioni, senza, menu con gruppi ed extra, extra-prodotto, nomi doppi, sconosciuti, totali");
