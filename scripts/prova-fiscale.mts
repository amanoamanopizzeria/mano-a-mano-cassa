// Prova dei messaggi per la Epson FP-81 II RT (src/lib/fiscale/epson-xml.ts): li compone e li controlla, NON li
// manda a nessuna stampante (Edoardo, 30/10/2026: niente scontrini, X o Z veri senza prova in negozio e suo ok).
//   npx --yes tsx scripts/prova-fiscale.mts
import assert from "node:assert/strict";
import { xmlScontrino, xmlRapporto, xmlStato, xmlCassetto, xmlNonFiscale, leggiRisposta, importo } from "../src/lib/fiscale/epson-xml.ts";

// il documento non fiscale della prima prova in negozio: niente corrispettivi, solo testo
const nf = xmlNonFiscale(["PROVA CASSA NUOVA", "31/10/2026 — nessun corrispettivo", "x".repeat(60)]);
assert.match(nf, /<beginNonFiscal operator="1" \/>/);
assert.match(nf, /data="PROVA CASSA NUOVA"/);
assert.match(nf, /data="31\/10\/2026  nessun corrispettivo"/);   // il trattino lungo non è ASCII: via
assert.match(nf, new RegExp(`data="${"x".repeat(46)}"`));          // tagliata a 46
assert.doesNotMatch(nf, /Fiscal(Receipt|Report)/);                  // mai uno scontrino o una Z per sbaglio
assert.throws(() => xmlNonFiscale([]), /senza righe/);

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

// ── Lo stato del registratore telematico e la decisione sulla Z (src/lib/fiscale/stato-rt.ts) ──────────
// La risposta è quella vera della stampante del negozio, letta il 31/10/2026 (REA 34).
const { leggiStatoRT, avvisiRT, decidiChiusura, esitoChiusura } = await import("../src/lib/fiscale/stato-rt.ts");
const rispostaVera = '<response success="true" code="" status="2"><addInfo><elementList>lastCommand,rtType</elementList>'
  + "<lastCommand>138</lastCommand><rtType>I</rtType><rtMainStatus>02</rtMainStatus><rtSubStatus>08</rtSubStatus>"
  + "<rtDailyOpen>0</rtDailyOpen><rtNoWorkingPeriod>0</rtNoWorkingPeriod><rtFileToSend>0000</rtFileToSend>"
  + "<rtOldFileToSend>0000</rtOldFileToSend><rtFileRejected>0008</rtFileRejected><rtExpiryCD>20281228</rtExpiryCD>"
  + "<rtExpiryCA>20380111</rtExpiryCA><rtTrainingMode>0</rtTrainingMode><rtUpgradeResult>0</rtUpgradeResult></addInfo></response>";
const st = leggiStatoRT(rispostaVera);
assert.equal(st.rtDailyOpen, "0");
assert.equal(st.rtFileRejected, "0008");
const avvisi = avvisiRT(st);
assert.equal(avvisi.length, 1);
assert.match(avvisi[0].testo, /8 file di corrispettivi rifiutati/);
assert.equal(avvisi[0].grave, true);
assert.equal(decidiChiusura(st).azione, "gia_fatta");                       // a negozio chiuso la Z è già fatta
assert.equal(decidiChiusura({ ...st, rtDailyOpen: "1" }).azione, "fai_z");
assert.equal(decidiChiusura({ ...st, rtDailyOpen: "1", rtTrainingMode: "1" }).azione, "fermati");
assert.equal(decidiChiusura({}).azione, "fermati");                          // nessuna risposta RT: non si tocca
assert.equal(esitoChiusura({ ok: true, codice: null }, null).fatta, true);
assert.equal(esitoChiusura(null, { rtType: "I", rtDailyOpen: "0" }).fatta, true);     // risposta persa ma giornata chiusa
assert.equal(esitoChiusura(null, { rtType: "I", rtDailyOpen: "1" }).fatta, false);
assert.equal(esitoChiusura(null, null).fatta, false);
assert.match(esitoChiusura(null, null).motivo, /non rimandare/);
console.log("Stato RT: tutto ok (giornata chiusa, 8 file rifiutati da far guardare).");
