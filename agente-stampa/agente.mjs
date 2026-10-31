#!/usr/bin/env node
// Agente di stampa di A Mano A Mano: gira sul PC della cassa, sempre acceso, e manda le comande alle
// stampanti di rete (porta 9100, ESC/POS) o a quelle installate in Windows (la ASP è USB: campo «windows»). Non ha credenziali Supabase: chiede la coda al server
// della cassa con la sua chiave (STAMPA_KEY) e riceve i byte già pronti, una copia per stampante.
// Zero pacchetti: basta Node 18 o più nuovo. Istruzioni in LEGGIMI.md.
//
//   node agente.mjs            stampa le comande man mano che arrivano
//   node agente.mjs --prova    una pagina di prova su ogni stampante, poi esce
//   node agente.mjs --stato    legge lo stato di ogni stampante e della fiscale SENZA stampare niente, poi esce
import { readFileSync, existsSync, writeFileSync, rmSync } from "node:fs";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import net from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const qui = dirname(fileURLToPath(import.meta.url));
const percorsoConfig = process.env.STAMPA_CONFIG || join(qui, "config.json");
if (!existsSync(percorsoConfig)) { console.error(`Manca ${percorsoConfig}: copia config.esempio.json in config.json e scrivi gli IP.`); process.exit(1); }
const config = JSON.parse(readFileSync(percorsoConfig, "utf8"));
const chiave = process.env.STAMPA_KEY || (existsSync(join(qui, "chiave.txt")) ? readFileSync(join(qui, "chiave.txt"), "utf8").trim() : "");

const server = String(config.server || "https://mano-a-mano-cassa.vercel.app").replace(/\/$/, "");
const ogni = Math.max(1, Number(config.ogniSecondi || 3)) * 1000;
const stampanti = config.stampanti || [];
if (stampanti.length === 0) { console.error("Nessuna stampante in config.json."); process.exit(1); }
const elenco = stampanti.map((s) => `${s.nome}:${s.ruolo}:${s.colonne || 48}`).join(",");

const ora = () => new Date().toLocaleTimeString("it-IT");
const log = (...a) => console.log(`[${ora()}]`, ...a);

const dove = (s) => (s.windows ? `Windows «${s.windows}»` : `${s.ip}:${s.porta || 9100}`);

/** una stampante di Windows (USB): i byte vanno allo spooler in RAW, con stampa-windows.ps1 */
function mandaWindows(s, byte) {
  const file = join(tmpdir(), `comanda-${process.pid}-${Date.now()}.bin`);
  writeFileSync(file, byte);
  return new Promise((ok, ko) => {
    execFile("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", join(qui, "stampa-windows.ps1"), "-Stampante", s.windows, "-File", file],
      { timeout: 15000, windowsHide: true }, (e, _out, err) => {
        rmSync(file, { force: true });
        if (e) ko(new Error(String(err || e.message).trim().split("\n")[0])); else ok();
      });
  });
}

/** manda i byte alla stampante e aspetta che la connessione si chiuda bene */
function manda(s, byte) {
  if (s.windows) return mandaWindows(s, byte);
  return new Promise((ok, ko) => {
    const sock = net.connect({ host: s.ip, port: Number(s.porta || 9100) });
    const t = setTimeout(() => { sock.destroy(); ko(new Error("non risponde (5 s)")); }, 5000);
    sock.on("error", (e) => { clearTimeout(t); ko(e); });
    sock.on("connect", () => sock.end(byte));
    sock.on("close", (errore) => { clearTimeout(t); if (!errore) ok(); });
  });
}

// per ogni comanda (e per il suo contenuto: una modifica è un'altra carta) le stampanti che l'hanno già presa
const prese = new Map();
const impronta = (c) => c.id + ":" + createHash("sha256").update(JSON.stringify(c.stampe)).digest("hex").slice(0, 16);
const giuSegnalate = new Set();

async function giro() {
  const r = await fetch(`${server}/api/stampa/coda?stampanti=${encodeURIComponent(elenco)}`, { headers: { "x-api-key": chiave } });
  if (r.status === 401) throw new Error("chiave sbagliata (401): controlla STAMPA_KEY");
  if (!r.ok) throw new Error(`il server risponde ${r.status}`);
  const { comande } = await r.json();
  const inCoda = new Set(comande.map(impronta));
  for (const k of prese.keys()) if (!inCoda.has(k)) prese.delete(k);
  for (const c of comande) {
    const k = impronta(c);
    const fatte = prese.get(k) || new Set();
    prese.set(k, fatte);
    for (const s of stampanti) {
      if (fatte.has(s.nome)) continue;
      try {
        await manda(s, Buffer.from(c.stampe[s.nome], "base64"));
        fatte.add(s.nome);
        giuSegnalate.delete(s.nome);
        log(`${c.numero} → ${s.nome}`);
      } catch (e) {
        if (!giuSegnalate.has(s.nome)) log(`!! ${s.nome} (${dove(s)}) non stampa: ${e.message}. Riprovo da sola.`);
        giuSegnalate.add(s.nome);
      }
    }
    if (stampanti.every((s) => fatte.has(s.nome))) {
      const f = await fetch(`${server}/api/stampa/fatta`, { method: "POST", headers: { "x-api-key": chiave, "content-type": "application/json" }, body: JSON.stringify({ id: c.id }) });
      if (f.ok) prese.delete(k); else log(`!! ${c.numero} stampata ma non segnata (${f.status}): riprovo senza ristampare.`);
    }
  }
}

function paginaDiProva(s) {
  const t = (x) => Buffer.from(x, "latin1");
  return Buffer.concat([Buffer.from([0x1b, 0x40, 0x1b, 0x61, 1, 0x1d, 0x21, 0x11]), t("PROVA\n"), Buffer.from([0x1d, 0x21, 0]),
    t(`A Mano A Mano - agente di stampa\nstampante: ${s.nome} (${s.ruolo})\n${dove(s)}\n${new Date().toLocaleString("it-IT")}\n`),
    t("1234567890".repeat(7).slice(0, Number(s.colonne || 48)) + "\n"), Buffer.from([0x1b, 0x64, 2, 0x1d, 0x56, 66, 3])]);
}

// ── Stato senza carta ────────────────────────────────────────────────────────────────────────────────
// ESC/POS «DLE EOT n» (stato in tempo reale, standard Epson): la stampante risponde un byte e non stampa.
// La fiscale Epson RT si interroga con queryPrinterStatus su /cgi-bin/fpmate.cgi: nessuno scontrino, X o Z.
function chiediByte(s, n) {
  return new Promise((ok, ko) => {
    const sock = net.connect({ host: s.ip, port: Number(s.porta || 9100) });
    const t = setTimeout(() => { sock.destroy(); ko(new Error("nessuna risposta (3 s)")); }, 3000);
    sock.on("error", (e) => { clearTimeout(t); ko(e); });
    sock.on("connect", () => sock.write(Buffer.from([0x10, 0x04, n])));
    sock.on("data", (d) => { clearTimeout(t); sock.destroy(); ok(d[0]); });
  });
}

async function statoRete(s) {
  const b1 = await chiediByte(s, 1), b2 = await chiediByte(s, 2), b4 = await chiediByte(s, 4);
  const note = [];
  if (b1 & 0x08) note.push("fuori linea");
  if (b2 & 0x04) note.push("coperchio aperto");
  if (b2 & 0x20) note.push("in errore");
  if (b2 & 0x08) note.push("carta in avanzamento");
  if (b4 & 0x60) note.push("CARTA FINITA");
  else if (b4 & 0x0c) note.push("carta quasi finita");
  return note.length ? note.join(", ") : "pronta";
}

function statoWindows(s) {
  // solo lettura: lo stato che Windows ha della stampante USB
  return new Promise((ok) => {
    execFile("powershell", ["-NoProfile", "-Command", `(Get-Printer -Name '${String(s.windows).replace(/'/g, "''")}' | Select-Object -ExpandProperty PrinterStatus)`],
      { timeout: 10000, windowsHide: true }, (e, out) => ok(e ? `non leggibile: ${String(e.message).split("\n")[0]}` : `Windows dice «${String(out).trim() || "?"}»`));
  });
}

async function statoFiscale(f) {
  const xml = '<?xml version="1.0" encoding="utf-8"?>\n<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>'
    + '<printerCommand><queryPrinterStatus operator="1" statusType="1" /></printerCommand></s:Body></s:Envelope>';
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(`http://${f.ip}/cgi-bin/fpmate.cgi`, { method: "POST", headers: { "content-type": "text/xml; charset=utf-8" }, body: xml, signal: ctrl.signal });
    const testo = await r.text();
    const esito = /success="true"/i.test(testo) ? "risponde: success" : `risponde ma non success (HTTP ${r.status})`;
    const info = [...testo.matchAll(/<([A-Za-z]+)>([^<]{1,40})<\/\1>/g)].map((m) => `${m[1]}=${m[2]}`).join(" ");
    return `${esito}${info ? " · " + info : ""}`;
  } finally { clearTimeout(t); }
}

if (process.argv.includes("--stato")) {
  let errori = 0;
  for (const s of stampanti) {
    try { log(`stato ${s.nome} (${dove(s)}): ${s.windows ? await statoWindows(s) : await statoRete(s)}`); }
    catch (e) { errori++; log(`!! ${s.nome} (${dove(s)}): ${e.message}`); }
  }
  if (config.fiscale?.ip) {
    try { log(`stato fiscale (${config.fiscale.ip}): ${await statoFiscale(config.fiscale)}`); }
    catch (e) { errori++; log(`!! fiscale (${config.fiscale.ip}): ${e.name === "AbortError" ? "nessuna risposta (8 s)" : e.message}`); }
  }
  process.exit(errori ? 1 : 0);
}

if (process.argv.includes("--prova")) {
  let errori = 0;
  for (const s of stampanti) {
    try { await manda(s, paginaDiProva(s)); log(`prova → ${s.nome} (${dove(s)}) ok`); }
    catch (e) { errori++; log(`!! ${s.nome} (${dove(s)}): ${e.message}`); }
  }
  process.exit(errori ? 1 : 0);
}

// la chiave serve solo per la coda del server: --stato e --prova parlano soltanto con le stampanti
if (!chiave) { console.error("Manca la chiave: variabile STAMPA_KEY o file chiave.txt accanto all'agente."); process.exit(1); }
log(`agente di stampa acceso: ${stampanti.map((s) => `${s.nome} ${dove(s)}`).join(", ")} · server ${server} · ogni ${ogni / 1000} s`);
let serverGiu = false;
for (;;) {
  try { await giro(); if (serverGiu) log("server di nuovo raggiungibile"); serverGiu = false; }
  catch (e) { if (!serverGiu) log(`!! ${e.message}. Riprovo da sola.`); serverGiu = true; }
  await new Promise((ok) => setTimeout(ok, ogni));
}
