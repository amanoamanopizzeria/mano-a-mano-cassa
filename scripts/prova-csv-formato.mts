// Prova: il nostro CSV ha lo stesso formato del file vero di Velocissimo, e il parser dell'OS li legge uguali.
// Il file vero ha dati dei clienti e NON sta nel repo: si passa il percorso.
//   node --experimental-strip-types --no-warnings scripts/prova-csv-formato.mts /percorso/export.csv
// Vuole mano-a-mano-os accanto (in /home/claude) per il parser. Esito atteso col file del 30/10/2026: intestazione
// uguale, nessun BOM, LF, 54 ordini, 1.356,80 €, sala 79,5, Glovo 268,02, Deliveroo 168,3, Just Eat 87,7, POS 237,3,
// contanti 362,27 (REA 33).
import { readFileSync } from "node:fs";
import { COLONNE, csvDaRighe } from "/home/claude/mano-a-mano-cassa/src/lib/export-ordini.ts";
import { parseCsvVelocissimo } from "/home/claude/mano-a-mano-os/src/domain/chiusura/parse-csv-velocissimo.ts";

const vero = readFileSync(process.argv[2], "utf8");
const nostro = csvDaRighe([Object.fromEntries(COLONNE.map((c) => [c, ""]))]);
const testa = (t: string) => t.slice(0, t.indexOf("\n"));
const controlli: [string, boolean][] = [
  ["intestazione uguale", testa(vero).replace(/\r$/, "") === testa(nostro)],
  ["nessun BOM nel vero", !vero.startsWith("﻿")],
  ["nessun BOM nel nostro", !nostro.startsWith("﻿")],
  ["vero con LF", !testa(vero).endsWith("\r")],
  ["nostro con LF", !testa(nostro).endsWith("\r")],
];
for (const [nome, ok] of controlli) console.log(ok ? "ok  " : "NO  ", nome);
const p = parseCsvVelocissimo(vero) as any;
console.log(JSON.stringify({ ordini: p.ordini.length, totale: p.totaleGiornaliero, sala: p.sala, glovo: p.glovo, deliveroo: p.deliveroo,
  justEat: p.justEat, pos: p.pos, contante: p.contante, coperti: p.ordini.reduce((a: number, o: any) => a + (o.coperti ?? 0), 0) }));
if (controlli.some(([, ok]) => !ok)) process.exit(1);
