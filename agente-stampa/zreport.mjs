// La Z letta dalla fiscale, senza mandarle niente. L'Epson FP-81 II RT pubblica da sola, in HTTP, quello che ha
// mandato all'Agenzia: www/dati-rt/<AAAAMMGG>/ è un elenco «Index of» con, per ogni chiusura, tre file che si
// chiamano <matricola>-<AAAAMMGG>T<hhmmss>-<numero Z>-<TIPO>: CORRISP.xml (quello inviato), ESITO-<id>.xml
// (la risposta dell'Agenzia) e ZREPORT.txt (la Z com'è uscita sulla carta, 46 colonne, importi all'italiana).
// Letto sulla stampante vera il 31/10/2026 (REA 34): qui si legge e si traduce, mai un comando.
//
// Perché: ogni sera il conto della cassa deve tornare con la fiscale da solo, e la doppia Z del 2Bit (due
// chiusure a 64 secondi, la seconda vuota) si vede solo da qui.

/** i file di un elenco «Index of» della stampante, raggruppati per chiusura (numero Z) */
export function fileZ(html) {
  const perZ = new Map();
  for (const m of String(html).matchAll(/href="([^"?]+?-(\d{8})T(\d{6})-(\d+)-([A-Z]+(?:-\d+)?)\.(?:txt|xml))"/g)) {
    const [, nome, giorno, ora, numero, tipo] = m;
    const z = perZ.get(numero) || { numero: Number(numero), giorno, ora: `${ora.slice(0, 2)}:${ora.slice(2, 4)}:${ora.slice(4, 6)}` };
    if (tipo === "ZREPORT") z.zreport = nome;
    else if (tipo === "CORRISP") z.corrisp = nome;
    else if (tipo.startsWith("ESITO")) z.esito = nome;
    perZ.set(numero, z);
  }
  return [...perZ.values()].sort((a, b) => a.numero - b.numero);
}

/** «1.075,73» → 1075.73 */
export const importoIt = (s) => Math.round(Number(String(s).replace(/\./g, "").replace(",", ".")) * 100) / 100;

const RIGHE = {
  vendite: "TOTALE GIORNO VENDITE", omaggi: "TOTALE GIORNO OMAGGI", resi: "TOTALE GIORNO RESO MERCE",
  annullamenti: "TOTALE GIORNO ANNULLAMENTI", granTotale: "GRAN TOTALE VENDITE", contanti: "PAGATO CONTANTI",
  elettronico: "PAGATO ELETTRONICO", fatture: "TOTALE GIORNO FATTURE",
};
const CONTATORI = {
  documenti: "NUMERO DOCUMENTI COMMERCIALI", azzeramento: "NUMERO AZZERAMENTI", daInviare: "Documenti da inviare",
  oltre3Giorni: "Documenti >  3 giorni", numeroFatture: "NUMERO FATTURE", ripristini: "NUMERO RIPRISTINI",
};

/** la Z com'è stampata (ZREPORT.txt) → i numeri che servono alla cassa */
export function leggiZReport(testo) {
  const righe = String(testo).split(/\r?\n/).map((r) => r.trimEnd());
  const z = { iva: [] };
  const valore = (etichetta) => {
    const r = righe.find((x) => x.startsWith(etichetta) && /\d$/.test(x));
    return r ? r.slice(etichetta.length).trim() : null;
  };
  for (const [campo, etichetta] of Object.entries(RIGHE)) { const v = valore(etichetta); if (v !== null && /^[\d.]+,\d{2}$/.test(v)) z[campo] = importoIt(v); }
  for (const [campo, etichetta] of Object.entries(CONTATORI)) {
    // «NUMERO DOCUMENTI COMMERCIALI» compare due volte (totali e riepilogo) con lo stesso numero: vale la prima
    const v = valore(etichetta); if (v !== null && /^\d+$/.test(v)) z[campo] = Number(v);
  }
  const quando = righe.map((r) => r.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})/)).find(Boolean);
  if (quando) { z.giorno = `${quando[3]}${quando[2]}${quando[1]}`; z.ora = `${quando[4]}:${quando[5]}`; }
  const doc = righe.map((r) => r.match(/^DOCUMENTO N\.\s+(\d+-\d+)/)).find(Boolean);
  if (doc) z.documentoN = doc[1];
  // il blocco IVA: ALIQUOTA, poi AMMONTARE (imponibile), IMPOSTA, IMPORTO PARZIALE, CORRISPETTIVO; può ripetersi
  for (let i = 0; i < righe.length; i++) {
    const a = righe[i].match(/^ALIQUOTA IVA\s+([\d.,]+)%/);
    if (!a) continue;
    const blocco = { aliquota: Number(a[1].replace(",", ".")) };
    for (let j = i + 1; j < Math.min(i + 6, righe.length); j++) {
      const m = righe[j].match(/^(AMMONTARE|IMPOSTA|IMPORTO PARZIALE|CORRISPETTIVO)\s+([\d.]+,\d{2})$/);
      if (!m) continue;
      blocco[{ AMMONTARE: "imponibile", IMPOSTA: "imposta", "IMPORTO PARZIALE": "parziale", CORRISPETTIVO: "corrispettivo" }[m[1]]] = importoIt(m[2]);
    }
    z.iva.push(blocco);
  }
  z.vuota = (z.documenti ?? 0) === 0 && (z.vendite ?? 0) === 0;
  return z;
}

/** la risposta dell'Agenzia (ESITO-<id>.xml), letta alla larga: OK, oppure il codice dell'errore */
export function esitoDa(xml) {
  const t = String(xml);
  const e = t.match(/<(?:\w+:)?(?:esito|Esito|codiceEsito|CodiceEsito)[^>]*>\s*([^<]{1,40}?)\s*</i);
  if (e) return e[1];
  if (/\bFAIL[- ]?\d*/.test(t)) return t.match(/\bFAIL[- ]?\d*/)[0];
  if (/\bOK\b/.test(t)) return "OK";
  return null;
}

// come sulla carta della Z: punto delle migliaia sempre (il locale it-IT di Node lo toglie sotto 10.000), virgola dei centesimi
const euro = (n) => {
  if (n === undefined) return "?";
  const [intero, cent] = Math.abs(n).toFixed(2).split(".");
  return `${n < 0 ? "-" : ""}${intero.replace(/\B(?=(\d{3})+$)/g, ".")},${cent} €`;
};
const secondi = (a, b) => {
  const s = (o) => { const [h, m, x] = o.split(":").map(Number); return h * 3600 + m * 60 + (x || 0); };
  return s(b) - s(a);
};

/** le Z di un giorno, in italiano, con l'avviso sulla Z doppia */
export function raccontaZ(giorno, zete) {
  const g = `${giorno.slice(6, 8)}/${giorno.slice(4, 6)}/${giorno.slice(0, 4)}`;
  if (zete.length === 0) return [`nessuna Z per il ${g}: la giornata fiscale non è stata chiusa (o la cartella non c'è ancora)`];
  const righe = [`${zete.length === 1 ? "una Z" : zete.length + " Z"} per il ${g}:`];
  for (const z of zete) {
    const r = z.report || {};
    const esito = z.esito === undefined ? "" : ` · esito Agenzia ${z.esito ?? "non leggibile"}`;
    if (r.vuota) righe.push(`  Z n. ${z.numero} alle ${z.ora}: VUOTA (0 documenti, 0,00 €)${r.daInviare ? ` · ${r.daInviare} da inviare` : ""}${esito}`);
    else {
      const iva = (r.iva || []).map((b) => `IVA ${b.aliquota}% su ${euro(b.imponibile)} = ${euro(b.imposta)}`).join(", ");
      righe.push(`  Z n. ${z.numero} alle ${z.ora}: ${euro(r.vendite)} in ${r.documenti ?? "?"} documenti · contanti ${euro(r.contanti)} · elettronico ${euro(r.elettronico)}`
        + (r.annullamenti ? ` · annullamenti ${euro(r.annullamenti)}` : "") + (r.resi ? ` · resi ${euro(r.resi)}` : "") + (iva ? ` · ${iva}` : "")
        + (r.daInviare ? ` · ${r.daInviare} da inviare` : "") + (r.oltre3Giorni ? ` · ${r.oltre3Giorni} OLTRE 3 GIORNI` : "") + esito);
    }
  }
  const piene = zete.filter((z) => z.report && !z.report.vuota);
  for (let i = 1; i < zete.length; i++) {
    const prima = zete[i - 1], z = zete[i];
    if (z.report?.vuota) righe.push(`  → la Z n. ${z.numero} è vuota ed è arrivata ${secondi(prima.ora, z.ora)} s dopo la n. ${prima.numero}: una chiusura lanciata due volte, non sono vendite in più`);
  }
  if (piene.length > 1) righe.push(`  → ${piene.length} Z con vendite nello stesso giorno: il totale della giornata è la somma, ${euro(piene.reduce((s, z) => s + (z.report.vendite || 0), 0))}`);
  const totale = piene.reduce((s, z) => s + (z.report.vendite || 0), 0);
  righe.push(`  totale fiscale del ${g}: ${euro(totale)} (${piene.reduce((s, z) => s + (z.report.documenti || 0), 0)} documenti)`);
  return righe;
}

/** il giorno della serata: fino alle 6 del mattino è ancora quello di ieri (la Z si fa dopo mezzanotte) */
export function giornoSerata(adesso = new Date()) {
  const d = new Date(adesso);
  if (d.getHours() < 6) d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}
