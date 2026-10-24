// Prova completa dell'agente di stampa senza negozio: due stampanti finte (server TCP), un server finto
// che fa la coda come /api/stampa/coda (stesso disegno ESC/POS) e /api/stampa/fatta, e l'agente vero.
// 1) una comanda va su tutte e due e viene segnata; 2) con una stampante spenta non si segna e l'altra
// non ristampa; riaccesa, esce solo dove mancava e si segna; 3) una modifica ristampa su tutte e due.
// npx --yes tsx scripts/prova-agente-stampa.mts
import net from "node:net";
import http from "node:http";
import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { comandaEscPos, anteprimaTesto } from "../src/lib/stampa/escpos";
import { leggiStampanti } from "../src/lib/stampa/stampanti";
import type { Comanda } from "../src/lib/comanda";

const ricevute: Record<string, Buffer[]> = { cucina: [], cassa: [] };
// una stampante spenta non risponde proprio (connessione rifiutata): non accetta e poi chiude, che
// per il PC sarebbe una stampa andata a buon fine (era la prova che a volte non passava)
const server: Record<string, net.Server> = {};
const porte: Record<string, number> = {};
function stampanteFinta(nome: string, porta = 0): Promise<number> {
  const srv = net.createServer((s) => {
    const pezzi: Buffer[] = [];
    s.on("error", () => {});
    s.on("data", (d) => pezzi.push(d));
    s.on("end", () => { ricevute[nome].push(Buffer.concat(pezzi)); s.end(); });
  });
  server[nome] = srv;
  return new Promise((ok) => srv.listen(porta, "127.0.0.1", () => ok((porte[nome] = (srv.address() as net.AddressInfo).port))));
}
const spegni = (nome: string) => new Promise((ok) => server[nome].close(ok));
const accendi = (nome: string) => stampanteFinta(nome, porte[nome]);

const base = (id: string, numero: number): Comanda => ({
  id, numero, numero_visibile: `C-${numero}`, canale: "cassa", tipo: "banco", stato: "ricevuto", creato_il: new Date().toISOString(),
  ora_consegna: null, totale: 8.5, note: null, pagamento: "contanti", costo_consegna: 0, cliente: "Prova", telefono: null, tavolo: null, indirizzo: null,
  righe: [{ id: "r" + numero, descrizione: "Margherita", quantita: 1, variazioni: [], note: null, destinazione: "cucina", reparto: "Pizze classiche", reparto_ordine: 1 }],
});
let coda: Comanda[] = [];
const segnate: string[] = [];
const CHIAVE = "chiave-di-prova";
const api = http.createServer((req, res) => {
  if (req.headers["x-api-key"] !== CHIAVE) { res.writeHead(401).end(); return; }
  const u = new URL(req.url!, "http://x");
  if (req.method === "GET" && u.pathname === "/api/stampa/coda") {
    const st = leggiStampanti(u.searchParams.get("stampanti"))!;
    const comande = coda.map((c) => ({ id: c.id, numero: c.numero_visibile, stampe: Object.fromEntries(st.map((s) => [s.nome, Buffer.from(comandaEscPos(c, { ruolo: s.ruolo, colonne: s.colonne })).toString("base64")])) }));
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ comande }));
  } else if (req.method === "POST" && u.pathname === "/api/stampa/fatta") {
    let b = ""; req.on("data", (d) => (b += d)); req.on("end", () => { const { id } = JSON.parse(b); segnate.push(id); coda = coda.filter((c) => c.id !== id); res.writeHead(200).end("{}"); });
  } else res.writeHead(404).end();
});
const portaApi: number = await new Promise((ok) => api.listen(0, "127.0.0.1", () => ok((api.address() as net.AddressInfo).port)));
const [pCucina, pCassa] = [await stampanteFinta("cucina"), await stampanteFinta("cassa")];

const dir = mkdtempSync(join(tmpdir(), "agente-"));
writeFileSync(join(dir, "config.json"), JSON.stringify({ server: `http://127.0.0.1:${portaApi}`, ogniSecondi: 1, stampanti: [
  { nome: "cucina", ruolo: "cucina", ip: "127.0.0.1", porta: pCucina, colonne: 48 },
  { nome: "cassa", ruolo: "cassa", ip: "127.0.0.1", porta: pCassa, colonne: 42 },
] }));
const agente = spawn(process.execPath, ["agente-stampa/agente.mjs"], { env: { ...process.env, STAMPA_KEY: CHIAVE, STAMPA_CONFIG: join(dir, "config.json") }, stdio: ["ignore", "pipe", "pipe"] });
let uscita = ""; agente.stdout.on("data", (d) => (uscita += d)); agente.stderr.on("data", (d) => (uscita += d));
const aspetta = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
const finché = async (cond: () => boolean, ms = 8000) => { const fine = Date.now() + ms; while (!cond() && Date.now() < fine) await aspetta(100); return cond(); };

let errori = 0;
const ok = (c: boolean, cosa: string) => { console.log((c ? "ok  " : "NO  ") + cosa); if (!c) errori++; };
const ID1 = "00000000-0000-0000-0000-000000000001", ID2 = "00000000-0000-0000-0000-000000000002";

coda = [base(ID1, 101)];
ok(await finché(() => segnate.includes(ID1)), "1) la comanda va su tutte e due e si segna");
ok(ricevute.cucina.length === 1 && ricevute.cassa.length === 1, "1) una copia per stampante");
ok(anteprimaTesto(new Uint8Array(ricevute.cucina[0])).includes("C-101") && anteprimaTesto(new Uint8Array(ricevute.cucina[0])).includes("copia cucina"), "1) la cucina ha la sua copia");
ok(anteprimaTesto(new Uint8Array(ricevute.cassa[0])).includes("TOTALE"), "1) la cassa col totale");

await spegni("cassa");
coda = [base(ID2, 102)];
await aspetta(3500);
ok(!segnate.includes(ID2) && ricevute.cucina.length === 2 && ricevute.cassa.length === 1, "2) cassa spenta: non si segna, la cucina l'ha presa una volta sola");
await accendi("cassa");
ok(await finché(() => segnate.includes(ID2)), "2) riaccesa: esce e si segna");
ok(ricevute.cucina.length === 2 && ricevute.cassa.length === 2, "2) la cucina non ha ristampato");

const mod = { ...base(ID1, 101), modificato_il: new Date().toISOString(), stampe: 1, righe_prima: [{ id: "r101", id_riga_padre: null, descrizione: "Margherita", quantita: 1, variazioni: [] }] };
mod.righe = [...mod.righe, { id: "x", descrizione: "Coca Cola", quantita: 1, variazioni: [], note: null, destinazione: "cassa", reparto: "Bibite", reparto_ordine: 9 }];
coda = [mod];
ok(await finché(() => segnate.filter((x) => x === ID1).length === 2), "3) la modifica torna in coda e si segna di nuovo");
const t = anteprimaTesto(new Uint8Array(ricevute.cucina[2]));
ok(t.includes("MODIFICATA - RISTAMPA") && t.includes("NUOVA") && t.includes("COCA COLA"), "3) esce con MODIFICATA e la riga nuova");
ok(uscita.includes("non stampa") && uscita.includes("C-102 → cassa"), "il registro dice chi non stampa e quando riparte");

agente.kill(); api.close();
console.log("\n--- registro dell'agente ---\n" + uscita.trim());
console.log(errori ? `\n${errori} prove NON passate` : "\ntutte le prove passate");
process.exit(errori ? 1 : 0);
