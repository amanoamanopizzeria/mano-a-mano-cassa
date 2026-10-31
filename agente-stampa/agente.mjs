#!/usr/bin/env node
// Agente di stampa di A Mano A Mano: gira sul PC della cassa, sempre acceso, e manda le comande alle
// stampanti di rete (porta 9100, ESC/POS) o a quelle installate in Windows (la ASP è USB: campo «windows»). Non ha credenziali Supabase: chiede la coda al server
// della cassa con la sua chiave (STAMPA_KEY) e riceve i byte già pronti, una copia per stampante.
// Zero pacchetti: basta Node 18 o più nuovo. Istruzioni in LEGGIMI.md.
//
//   node agente.mjs            stampa le comande man mano che arrivano
//   node agente.mjs --prova    una pagina di prova su ogni stampante, poi esce
//   node agente.mjs --stato    legge lo stato di ogni stampante e della fiscale SENZA stampare niente, poi esce
//   node agente.mjs --z [AAAAMMGG]  legge dalla fiscale la Z del giorno (di ieri sera fino alle 6), solo in lettura
import { readFileSync, existsSync, writeFileSync, rmSync } from "node:fs";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import net from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fileZ, leggiZReport, raccontaZ, giornoSerata } from "./zreport.mjs";

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

// Prima di ogni giro si guarda come sta ogni stampante (DLE EOT in rete, Get-Printer per la USB): a una spenta,
// senza carta o col coperchio aperto non si manda niente, così la comanda non resta nel suo buffer e non
// rallenta le altre (critico Edoardo, 31/10/2026: «E se la PIZZERIA finisce la carta? L'agente se ne accorge?»).
// Si riprova da sola al giro dopo; la comanda resta in coda finché TUTTE le stampanti l'hanno presa.
const fermeSegnalate = new Map();   // nome → motivo già scritto nel registro
async function comeSta(s) {
  try {
    const esito = s.windows ? await statoWindows(s) : await statoRete(s);
    if (s.windows) return /«(Normal|Idle|Printing)»/i.test(esito) ? null : esito;
    return esito === "pronta" || esito === "carta quasi finita" ? null : esito;
  } catch (e) {
    if (/non dice il suo stato/.test(e.message)) return null;   // non tutte rispondono al DLE EOT: si prova a stampare
    return `non risponde: ${e.message}`;
  }
}

// La stampante di riserva (REA 36.5, 31/10/2026): il 2Bit ha il campo per la riserva di ogni centro ma non è
// configurato, e se la PIZZERIA si ferma la comanda non esce da nessuna parte. Da noi in config.json una stampante
// può dire «riserva»: "asp". Se resta ferma più di «riservaDopoSecondi» (60 di base), la sua copia esce sulla
// riserva con in testa la scritta di chi è, e la comanda si segna. Senza «riserva» non cambia niente.
const attesaRiserva = Math.max(1, Number(config.riservaDopoSecondi || 60)) * 1000;
const fermaDa = new Map();   // nome → quando ha smesso di stampare
const cartello = (s) => Buffer.concat([Buffer.from([0x1b, 0x40, 0x1b, 0x61, 1, 0x1d, 0x42, 1, 0x1b, 0x45, 1]),
  Buffer.from(` RISERVA: COPIA ${String(s.nome).toUpperCase()} (FERMA) `, "latin1"), Buffer.from([0x0a, 0x1d, 0x42, 0, 0x1b, 0x45, 0, 0x1b, 0x61, 0])]);
async function suRiserva(c, s, ferme) {
  const r = s.riserva && stampanti.find((x) => x.nome === s.riserva);
  if (!r || r.nome === s.nome || ferme.has(r.nome) || Date.now() - (fermaDa.get(s.nome) ?? Date.now()) < attesaRiserva) return false;
  try {
    await manda(r, Buffer.concat([cartello(s), Buffer.from(c.stampe[s.nome], "base64")]));
    log(`${c.numero} → ${r.nome} (riserva di ${s.nome}, ferma)`);
    return true;
  } catch { return false; }
}

async function giro() {
  const r = await fetch(`${server}/api/stampa/coda?stampanti=${encodeURIComponent(elenco)}`, { headers: { "x-api-key": chiave } });
  if (r.status === 401) throw new Error("chiave sbagliata (401): controlla STAMPA_KEY");
  if (!r.ok) throw new Error(`il server risponde ${r.status}`);
  const { comande } = await r.json();
  const inCoda = new Set(comande.map(impronta));
  for (const k of prese.keys()) if (!inCoda.has(k)) prese.delete(k);
  if (comande.length === 0) return;
  const ferme = new Map();
  for (const s of stampanti) {
    const motivo = await comeSta(s);
    if (motivo) {
      ferme.set(s.nome, motivo);
      if (fermeSegnalate.get(s.nome) !== motivo) log(`!! ${s.nome} (${dove(s)}): ${motivo}. Le sue comande aspettano.`);
      fermeSegnalate.set(s.nome, motivo);
    } else if (fermeSegnalate.has(s.nome)) { log(`${s.nome} di nuovo pronta`); fermeSegnalate.delete(s.nome); }
  }
  for (const c of comande) {
    const k = impronta(c);
    const fatte = prese.get(k) || new Set();
    prese.set(k, fatte);
    for (const s of stampanti) {
      if (fatte.has(s.nome)) continue;
      if (ferme.has(s.nome)) {
        if (!fermaDa.has(s.nome)) fermaDa.set(s.nome, Date.now());
        if (await suRiserva(c, s, ferme)) fatte.add(s.nome);
        continue;
      }
      try {
        await manda(s, Buffer.from(c.stampe[s.nome], "base64"));
        fatte.add(s.nome);
        giuSegnalate.delete(s.nome);
        fermaDa.delete(s.nome);
        log(`${c.numero} → ${s.nome}`);
      } catch (e) {
        if (!giuSegnalate.has(s.nome)) log(`!! ${s.nome} (${dove(s)}) non stampa: ${e.message}. Riprovo da sola.`);
        giuSegnalate.add(s.nome);
        if (!fermaDa.has(s.nome)) fermaDa.set(s.nome, Date.now());
        if (await suRiserva(c, s, ferme)) fatte.add(s.nome);
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
    let collegata = false;
    const t = setTimeout(() => { sock.destroy(); ko(new Error(collegata ? "collegata ma non dice il suo stato (3 s)" : "non raggiungibile (3 s)")); }, 3000);
    sock.on("error", (e) => { clearTimeout(t); ko(e); });
    sock.on("connect", () => { collegata = true; sock.write(Buffer.from([0x10, 0x04, n])); });
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

// Lo stato del registratore telematico, detto in italiano (i nomi dei campi sono quelli che la stampante
// risponde a queryPrinterStatus; «0008» ecc. sono contatori a 4 cifre).
function leggiStatoRT(c) {
  if (!c.rtType) return "";
  const n = (v) => (v === undefined ? null : Number.parseInt(v, 10));
  const data = (v) => (v && /^\d{8}$/.test(v) ? `${v.slice(6, 8)}/${v.slice(4, 6)}/${v.slice(0, 4)}` : v);
  const righe = [];
  righe.push(c.rtDailyOpen === "1" ? "giornata fiscale APERTA (la Z non è ancora stata fatta)" : "giornata fiscale chiusa (Z già fatta)");
  if (c.rtNoWorkingPeriod === "1") righe.push("periodo di inattività: la stampante non emette documenti");
  if (c.rtTrainingMode === "1") righe.push("MODALITÀ TRAINING: i documenti non sono fiscali");
  if (n(c.rtFileToSend) > 0) righe.push(`${n(c.rtFileToSend)} file di corrispettivi ancora da inviare`);
  if (n(c.rtOldFileToSend) > 0) righe.push(`${n(c.rtOldFileToSend)} file VECCHI non inviati: da far guardare`);
  if (n(c.rtFileRejected) > 0) righe.push(`${n(c.rtFileRejected)} FILE RIFIUTATI dall'Agenzia: da far guardare al tecnico`);
  if (c.rtExpiryCD) righe.push(`certificato dispositivo fino al ${data(c.rtExpiryCD)}`);
  return righe.length ? "\n    → " + righe.join("\n    → ") : "";
}

// la fiscale risponde in HTTP sulla porta 80; «porta» nel config serve solo alle prove con una stampante finta
const baseFiscale = (f) => `http://${f.ip}${f.porta ? ":" + f.porta : ""}`;
// se la stampante chiede l'accesso, utente e password stanno SOLO nel config.json del PC (mai nel repo)
function accessoFiscale(f) {
  return f.utente ? { authorization: "Basic " + Buffer.from(`${f.utente}:${f.password ?? ""}`).toString("base64") } : {};
}

async function statoFiscale(f) {
  const xml = '<?xml version="1.0" encoding="utf-8"?>\n<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>'
    + '<printerCommand><queryPrinterStatus operator="1" statusType="1" /></printerCommand></s:Body></s:Envelope>';
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const headers = { "content-type": "text/xml; charset=utf-8", ...accessoFiscale(f) };
    const r = await fetch(`${baseFiscale(f)}/cgi-bin/fpmate.cgi`, { method: "POST", headers, body: xml, signal: ctrl.signal });
    if (r.status === 401) return "chiede l'accesso (401): utente e password della stampante in config.json, «fiscale»";
    const testo = await r.text();
    const esito = /success="true"/i.test(testo) ? "risponde: success" : `risponde ma non success (HTTP ${r.status})`;
    const campi = Object.fromEntries([...testo.matchAll(/<([A-Za-z]+)>([^<]{1,40})<\/\1>/g)].map((m) => [m[1], m[2]]));
    const info = Object.entries(campi).map(([k, v]) => `${k}=${v}`).join(" ");
    return `${esito}${info ? " · " + info : ""}${leggiStatoRT(campi)}`;
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

// ── La Z, letta e basta ──────────────────────────────────────────────────────────────────────────────
// La fiscale pubblica in HTTP (GET) quello che ha mandato all'Agenzia: www/dati-rt/<AAAAMMGG>/ con, per ogni
// chiusura, CORRISP.xml, ESITO-<id>.xml e ZREPORT.txt (REA 34, 31/10/2026). Qui si leggono e si raccontano:
// nessun comando alla stampante, mai. Serve a far tornare ogni sera il conto della cassa con la fiscale, e a
// vedere la Z doppia del 2Bit (due chiusure a un minuto, la seconda vuota).
async function prendiFiscale(f, percorso) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(`${baseFiscale(f)}${percorso}`, { headers: accessoFiscale(f), signal: ctrl.signal });
    if (r.status === 401) throw new Error("chiede l'accesso (401): utente e password della stampante in config.json, «fiscale»");
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`risponde ${r.status} su ${percorso}`);
    return await r.text();
  } finally { clearTimeout(t); }
}

async function zDelGiorno(f, giorno) {
  const elenco = await prendiFiscale(f, `/www/dati-rt/${giorno}/`);
  if (elenco === null) return [];
  // l'esito dell'Agenzia è già nel nome del file ESITO (fileZ): si scarica solo la Z stampata
  const zete = fileZ(elenco);
  for (const z of zete) {
    if (z.zreport) { const t = await prendiFiscale(f, `/www/dati-rt/${giorno}/${z.zreport}`); if (t) z.report = leggiZReport(t); }
  }
  return zete;
}

if (process.argv.includes("--z")) {
  if (!config.fiscale?.ip) { console.error("Manca «fiscale» in config.json."); process.exit(1); }
  const dato = process.argv[process.argv.indexOf("--z") + 1];
  const giorno = dato && /^\d{8}$/.test(dato) ? dato : giornoSerata();
  try {
    const zete = await zDelGiorno(config.fiscale, giorno);
    for (const r of raccontaZ(giorno, zete)) log(r);
    process.exit(zete.length ? 0 : 2);
  } catch (e) {
    log(`!! fiscale (${config.fiscale.ip}): ${e.name === "AbortError" ? "nessuna risposta (8 s)" : e.message}`);
    process.exit(1);
  }
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
