// Prova dei messaggi per la Epson FP-81 II RT (src/lib/fiscale/epson-xml.ts): li compone e li controlla, NON li
// manda a nessuna stampante (Edoardo, 30/10/2026: niente scontrini, X o Z veri senza prova in negozio e suo ok).
//   npx --yes tsx scripts/prova-fiscale.mts
import assert from "node:assert/strict";
import { xmlScontrino, xmlRapporto, xmlStato, xmlCassetto, leggiRisposta, importo } from "../src/lib/fiscale/epson-xml.ts";

const s = xmlScontrino({
  righe: [
    { descrizione: "Margherita", quantita: 2, prezzo: 7.5 },
    { descrizione: "Pizza «Bufala & Pomodorini»", quantita: 1, prezzo: 10 },
    { descrizione: "Coperto", quantita: 3, prezzo: 1.5 },
  ],
  sconto: 2,
  pagamenti: [{ metodo: "pos", importo: 20 }, { metodo: "contanti", importo: 20 }],
});
assert.equal(s.totale, 27.5);   // 15 + 10 + 4,50 − 2 di sconto
assert.equal(s.resto, 12.5);
assert.match(s.xml, /<beginFiscalReceipt operator="1" \/>/);
assert.match(s.xml, /description="Pizza Bufala &amp; Pomodorini"/);   // niente caratteri fuori ASCII, & escapato
assert.match(s.xml, /unitPrice="7,50"/);
assert.match(s.xml, /amount="2,00"/);
assert.match(s.xml, /paymentType="2"/);
assert.equal((s.xml.match(/<printRecTotal /g) ?? []).length, 2);
assert.throws(() => xmlScontrino({ righe: [{ descrizione: "x", quantita: 1, prezzo: 10 }], pagamenti: [{ metodo: "contanti", importo: 5 }] }), /mancano 5,00/);
assert.throws(() => xmlScontrino({ righe: [{ descrizione: "x", quantita: 1, prezzo: 10 }], pagamenti: [{ metodo: "pos", importo: 15 }] }), /resto/);
assert.match(xmlRapporto("Z"), /<printZReport operator="1" \/>/);
assert.match(xmlRapporto("X"), /<printXReport operator="1" \/>/);
assert.match(xmlStato(), /queryPrinterStatus/);
assert.match(xmlCassetto(), /openDrawer/);
assert.deepEqual(leggiRisposta('<response success="true" code="" status="2" />'), { ok: true, codice: null, stato: "2" });
assert.equal(importo(0.1 + 0.2), "0,30");
console.log(s.xml);
console.log("Prova fiscale: tutto ok (niente è stato mandato alla stampante).");
