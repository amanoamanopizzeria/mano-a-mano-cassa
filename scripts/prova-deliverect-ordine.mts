// Prova di src/lib/deliverect/ordine.ts con un ordine Glovo finto: npx --yes tsx scripts/prova-deliverect-ordine.mts
import { traduciArticoli } from "../src/lib/deliverect/ordine.ts";
import assert from "node:assert/strict";

const prodotti = [
  { id: "p-arr", nome: "L'arrabbiata", codice: "142", id_velocissimo: 264, destinazione: "cucina" as const },
  { id: "p-fin", nome: "La finocchiona", codice: null, id_velocissimo: 260, destinazione: "cucina" as const },
  { id: "p-m1", nome: "Menu classico X1", codice: null, id_velocissimo: 210, destinazione: "cucina" as const },
  { id: "p-mar", nome: "Margherita", codice: "C001", id_velocissimo: 11, destinazione: "cucina" as const },
  { id: "p-coca", nome: "Coca cola 33cl", codice: null, id_velocissimo: 150, destinazione: "cassa" as const },
];
const variazioni = [{ nome: "Mozzarella di bufala", id_velocissimo: 7, tipo: "aggiunta" as const }];

const { righe, sconosciuti } = traduciArticoli([
  { plu: "142", name: "Arrabbiata", price: 990, quantity: 2, subItems: [{ plu: "VAR7", name: "Bufala", price: 250, quantity: 1 }] },
  { plu: "V210", name: "Menu Classico X1", price: 1200, quantity: 1, subItems: [
    { plu: "M-C001", name: "Margherita", price: 0, quantity: 1, subItems: [{ plu: "VAR7", name: "Bufala", price: 250, quantity: 1 }] },
    { plu: "M-V150", name: "Coca Cola", price: 0, quantity: 1 },
  ] },
  { plu: "c001", name: "margherita", price: 850, quantity: 1, remark: "ben cotta" },
  { plu: "ZZZ", name: "Pizza misteriosa", price: 1100, quantity: 1 },
], prodotti, variazioni);

assert.equal(righe[0].id_prodotto, "p-arr"); assert.equal(righe[0].descrizione, "L'arrabbiata");
assert.deepEqual(righe[0].variazioni, [{ nome: "Mozzarella di bufala", prezzo: 2.5, tipo: "aggiunta" }]);
assert.equal(righe[1].id_prodotto, "p-m1"); assert.equal(righe[1].figlie?.length, 2);
assert.equal(righe[1].figlie?.[0].id_prodotto, "p-mar"); assert.equal(righe[1].figlie?.[0].variazioni[0].prezzo, 2.5);
assert.equal(righe[1].figlie?.[1].destinazione, "cassa");
assert.equal(righe[2].id_prodotto, "p-mar"); assert.equal(righe[2].note, "ben cotta");
assert.equal(righe[3].id_prodotto, null); assert.equal(righe[3].prezzo_unit, 11);
assert.deepEqual(sconosciuti, ["Pizza misteriosa (PLU ZZZ)"]);
console.log("ok: PLU, varianti, menu con figlie, maiuscole, prodotto sconosciuto");
