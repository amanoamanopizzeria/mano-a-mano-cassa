// Prova completa dell'agente di stampa senza negozio: due stampanti finte (server TCP), un server finto
// che fa la coda come /api/stampa/coda (stesso disegno ESC/POS) e /api/stampa/fatta, e l'agente vero.
// 1) una comanda va su tutte e due e viene segnata; 2) con una stampante spenta non si segna e l'altra
// non ristampa; riaccesa, esce solo dove mancava e si segna; 3) una modifica ristampa su tutte e due.
// npx --yes tsx scripts/prova-agente-stampa.mts
import net from "node:net";
import http from "node:http";
import { spawn, execFile } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
// @ts-ignore — il modulo dell'agente è JavaScript puro (zero pacchetti sul PC di cassa)
import { fileZ, leggiZReport, esitoDalNome, raccontaZ, giornoSerata } from "../agente-stampa/zreport.mjs";
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
// senza carta: risponde al DLE EOT 4 come una Epson con la carta finita (bit 5 e 6)
const senzaCarta: Record<string, boolean> = { cucina: false, cassa: false };
function stampanteFinta(nome: string, porta = 0): Promise<number> {
  const srv = net.createServer((s) => {
    const pezzi: Buffer[] = [];
    s.on("error", () => {});
    s.on("data", (d) => {
      if (d.length === 3 && d[0] === 0x10 && d[1] === 0x04) { s.write(Buffer.from([d[2] === 4 && senzaCarta[nome] ? 0x72 : 0x12])); return; }
      pezzi.push(d);
    });
    s.on("end", () => { if (pezzi.length) ricevute[nome].push(Buffer.concat(pezzi)); s.end(); });
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
ok(uscita.includes("non risponde") && uscita.includes("cassa di nuovo pronta") && uscita.includes("C-102 → cassa"), "il registro dice chi non risponde e quando riparte");

// 4) la cucina finisce la carta: la comanda non le si manda (resterebbe nel suo buffer), la cassa la stampa, e si
//    segna solo quando la carta torna (critico Edoardo 31/10: «E se la PIZZERIA finisce la carta?»)
const ID3 = "00000000-0000-0000-0000-000000000003";
senzaCarta.cucina = true;
coda = [base(ID3, 103)];
await aspetta(3500);
ok(!segnate.includes(ID3) && ricevute.cucina.length === 3 && ricevute.cassa.length === 4, "4) cucina senza carta: non le si manda niente, la cassa sì, non si segna");
ok(uscita.includes("CARTA FINITA"), "4) il registro dice CARTA FINITA");
senzaCarta.cucina = false;
ok(await finché(() => segnate.includes(ID3)), "4) carta rimessa: esce in cucina e si segna");
ok(ricevute.cucina.length === 4 && ricevute.cassa.length === 4, "4) la cassa non ha ristampato");

// 5) la Z letta dalla fiscale (solo GET): una stampante finta che pubblica www/dati-rt/<giorno>/ come la vera
//    (REA 34, 31/10/2026): due Z a un minuto, la seconda vuota, come fa il 2Bit ogni sera.
const col = (etichetta: string, valore: string) => etichetta.padEnd(46 - valore.length) + valore;
const zreport = (ora: string, n: number, piena: boolean) => [
  "PIZZERIA A MANO A MANO".padStart(34), "VI.RU S.R.L.S".padStart(29), "Via Novara, 5".padStart(29), "00198 ROMA (RM)".padStart(30),
  "P.IVA 00000000000".padStart(31), "TEL.0600000000".padStart(30), "DOCUMENTO GESTIONALE", "Chiusura Giornaliera",
  col(`30-10-2026 ${ora}`, "99XXX000000"),
  col("TOTALE GIORNO VENDITE", piena ? "1.075,73" : "0,00"), col("TOTALE GIORNO OMAGGI", "0,00"), col("GRAN TOTALE VENDITE", "1.666.215,15"),
  col("TOTALE GIORNO RESO MERCE", "0,00"), col("GRAN TOTALE RESO MERCE", "0,00"), col("TOTALE GIORNO ANNULLAMENTI", "0,00"),
  col("GRAN TOTALE ANNULLAMENTI", "3.559,54"), col("NUMERO DOCUMENTI COMMERCIALI", piena ? "44" : "0"),
  ...(piena ? ["-".repeat(46), "I V A  --  N A T U R E", col("ALIQUOTA IVA", "10.00%"), col("AMMONTARE", "977,94"), col("IMPOSTA", "97,79"),
    col("IMPORTO PARZIALE", "977,94"), col("CORRISPETTIVO", "1.075,73"), "-".repeat(46), "T O T A L I", col("NUMERO DOCUMENTI COMMERCIALI", "44"),
    col("PAGATO CONTANTI", "81,20"), col("PAGATO ELETTRONICO", "994,53")] : []),
  "-".repeat(46), col("NUMERO AZZERAMENTI", String(n)), col("Documenti da inviare", piena ? "1" : "2"), col("Documenti >  3 giorni", "0"),
  col("NUMERO FATTURE", "0"), col("TOTALE GIORNO FATTURE", "0,00"), col("NUMERO RIPRISTINI", "0"), "MEMORIA PERMANENTE DI DETTAGLIO - DGFE",
  col("N. 1 99XXX000000", "10-10-2019 14:23"), "SIGILLO FISCALE: 0183ED4E", col("30-10-2026 " + ora, ""), `DOCUMENTO N. ${n}-000${piena ? 4 : 2}`, "99XXX000000".padStart(46),
].join("\r\n");
const nomi = { 2526: "99XXX000000-20261030T233032-2526", 2527: "99XXX000000-20261030T233136-2527" };
const cartella: Record<string, string> = {
  [`${nomi[2526]}-ZREPORT.txt`]: zreport("23:30", 2526, true), [`${nomi[2527]}-ZREPORT.txt`]: zreport("23:31", 2527, false),
  // dentro l'ESITO c'è solo un EsitoOperazione firmato con l'IdOperazione: l'esito vero sta nel nome del file
  [`${nomi[2526]}-ESITO-3700734145.xml`]: '<?xml version="1.0"?><ns3:EsitoOperazione><IdOperazione>3700734145</IdOperazione><Signature/></ns3:EsitoOperazione>',
  [`${nomi[2527]}-ESITO-3700734200.xml`]: '<?xml version="1.0"?><ns3:EsitoOperazione><IdOperazione>3700734200</IdOperazione><Signature/></ns3:EsitoOperazione>',
  [`${nomi[2526]}-CORRISP.xml`]: "<DatiCorrispettivi/>", [`${nomi[2527]}-CORRISP.xml`]: "<DatiCorrispettivi/>",
};
const indice = `<html><body><h1>Index of /www/dati-rt/20261030/</h1><table><tr><th><a href="?nd">Name</a></th><th><a href="?dd">Date</a></th><th><a href="?sd">Size</a></th></tr>`
  + Object.keys(cartella).map((n) => `<tr><td><a href="${n}">${n}</a></td><td>&nbsp;30-Oct-2026 23:30</td><td>&nbsp;&nbsp;2.0k</td></tr>`).join("") + "</table></body></html>";
let comandiAllaFiscale = 0;
const fiscaleFinta = http.createServer((req, res) => {
  if (req.method !== "GET") { comandiAllaFiscale++; res.writeHead(405).end(); return; }
  const u = new URL(req.url!, "http://x");
  if (u.pathname === "/www/dati-rt/20261030/") res.writeHead(200, { "content-type": "text/html" }).end(indice);
  else if (u.pathname.startsWith("/www/dati-rt/20261030/") && cartella[u.pathname.split("/").pop()!]) res.writeHead(200, { "content-type": "text/plain" }).end(cartella[u.pathname.split("/").pop()!]);
  else res.writeHead(404).end();
});
const portaFiscale: number = await new Promise((ok) => fiscaleFinta.listen(0, "127.0.0.1", () => ok((fiscaleFinta.address() as net.AddressInfo).port)));

const zete = fileZ(indice);
ok(zete.length === 2 && zete[0].numero === 2526 && zete[0].ora === "23:30:32" && zete[1].numero === 2527 && zete[1].ora === "23:31:36", "5) dall'elenco escono due Z con numero e ora");
ok(zete[0].zreport === `${nomi[2526]}-ZREPORT.txt` && zete[0].fileEsito === `${nomi[2526]}-ESITO-3700734145.xml` && zete[0].corrisp === `${nomi[2526]}-CORRISP.xml` && zete[0].esito === "OK", "5) ogni Z ha i suoi tre file e l'esito OK dal nome");
ok(esitoDalNome("99X-20220215T233000-1234-ESITO-FAIL-406.xml") === "FAIL-406" && esitoDalNome("99X-20261030T233032-2526-ESITO-3700734145.xml") === "OK" && esitoDalNome("boh.txt") === null, "5) l'esito dell'Agenzia dal nome: OK o FAIL-nnn");
ok(fileZ('<a href="99X-20220215T233000-1234-ESITO-FAIL-406.xml">x</a>')[0].esito === "FAIL-406", "5) un ESITO-FAIL nell'elenco si legge come rifiutato");
const piena = leggiZReport(cartella[`${nomi[2526]}-ZREPORT.txt`]);
ok(piena.vendite === 1075.73 && piena.documenti === 44 && piena.contanti === 81.2 && piena.elettronico === 994.53 && piena.azzeramento === 2526 && piena.daInviare === 1 && !piena.vuota, "5) la Z piena: 1.075,73 € in 44 documenti, contanti 81,20, elettronico 994,53");
ok(piena.iva.length === 1 && piena.iva[0].aliquota === 10 && piena.iva[0].imponibile === 977.94 && piena.iva[0].imposta === 97.79 && piena.iva[0].corrispettivo === 1075.73, "5) il blocco IVA 10%");
ok(piena.giorno === "20261030" && piena.ora === "23:30" && piena.documentoN === "2526-0004" && piena.granTotale === 1666215.15, "5) data, ora, numero documento e gran totale");
const vuota = leggiZReport(cartella[`${nomi[2527]}-ZREPORT.txt`]);
ok(vuota.vuota && vuota.vendite === 0 && vuota.documenti === 0 && vuota.azzeramento === 2527 && vuota.iva.length === 0 && vuota.daInviare === 2, "5) la Z vuota si riconosce");
const racconto = raccontaZ("20261030", [{ ...zete[0], report: piena }, { ...zete[1], report: vuota }]).join("\n");
ok(racconto.includes("2 Z per il 30/10/2026") && racconto.includes("1.075,73 €") && racconto.includes("VUOTA") && racconto.includes("64 s dopo la n. 2526") && racconto.includes("totale fiscale del 30/10/2026: 1.075,73 €"), "5) il racconto: due Z, la seconda vuota 64 s dopo, totale 1.075,73");
ok(raccontaZ("20261031", []).join("\n").includes("nessuna Z per il 31/10/2026"), "5) senza Z lo dice");
ok(giornoSerata(new Date(2026, 9, 31, 1, 30)) === "20261030" && giornoSerata(new Date(2026, 9, 31, 12, 0)) === "20261031", "5) fino alle 6 del mattino la serata è quella di ieri");

writeFileSync(join(dir, "config-z.json"), JSON.stringify({ server: `http://127.0.0.1:${portaApi}`, stampanti: [{ nome: "cucina", ruolo: "cucina", ip: "127.0.0.1", porta: pCucina }],
  fiscale: { ip: "127.0.0.1", porta: portaFiscale, utente: "prova", password: "prova" } }));
const lanciaZ = (giorno: string) => new Promise<{ codice: number; testo: string }>((fine) =>
  execFile(process.execPath, ["agente-stampa/agente.mjs", "--z", giorno], { env: { ...process.env, STAMPA_CONFIG: join(dir, "config-z.json") } },
    (e, out, err) => fine({ codice: (e as { code?: number } | null)?.code ?? 0, testo: String(out) + String(err) })));
const z1 = await lanciaZ("20261030");
ok(z1.codice === 0 && z1.testo.includes("2 Z per il 30/10/2026") && z1.testo.includes("esito Agenzia OK") && z1.testo.includes("una chiusura lanciata due volte"), "5) «--z 20261030» legge le due Z dalla stampante finta e lo racconta");
const z2 = await lanciaZ("20261031");
ok(z2.codice === 2 && z2.testo.includes("nessuna Z per il 31/10/2026"), "5) «--z» su un giorno senza cartella esce con 2 e lo dice");
ok(comandiAllaFiscale === 0, "5) alla fiscale sono arrivate solo GET: nessun comando");
fiscaleFinta.close();

agente.kill(); api.close();
console.log("\n--- registro dell'agente ---\n" + uscita.trim());
console.log(errori ? `\n${errori} prove NON passate` : "\ntutte le prove passate");
process.exit(errori ? 1 : 0);
