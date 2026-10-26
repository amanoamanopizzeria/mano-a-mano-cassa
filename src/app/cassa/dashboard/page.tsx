"use client";

// Il cruscotto dei conti (Edoardo, 26/10/2026: «per questi conti ci serve tutta la dashboard che abbiamo già su
// Velocissimo, così come il CSV con tutti gli ordini, in un'altra pagina»). Copia il «Riepilogo giornata» del
// back-office (REA 13.1): venduto, ordini, scontrino medio, consegne puntuali, per origine, per tipo, per
// pagamento, incasso per ora, il confronto col periodo prima; in più i rider e l'elenco di tutti gli ordini.
// Il CSV a 40 colonne per mano-a-mano-os resta quello di /api/ordini/csv (una serata alla volta); qui c'è
// anche il CSV di quello che si vede, per qualunque periodo.
import { useEffect, useMemo, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { supabaseBrowser } from "@/lib/supabase/client";
import { CANALE_COMANDA } from "@/lib/comanda";

export default function DashboardPagina() {
  return (
    <AuthGate>
      <Dashboard />
    </AuthGate>
  );
}

interface Riga {
  id: string; numero: number; numero_visibile: string | null; tipo: string; canale: string; stato: string;
  totale: number; sconto: number | null; costo_consegna: number | null; pagamento: string | null; pagato_online: boolean;
  coperti: number | null; creato_il: string; ora_consegna: string | null;
  cliente: { nome: string | null; telefono: string | null } | null;
  indirizzo: { via: string; civico: string | null } | null;
  consegna: { stato: string; consegnata_il: string | null; rider: { nome: string } | null }[] | null;
}
type Periodo = "serata" | "settimana" | "mese";

const GIORNO = 86_400_000;
// la serata va dalle 6 di mattina alle 6 del giorno dopo, ora di Roma (come giornata_lavorativa, mig. 0040)
const giornataDi = (t: number) => new Date(t - 6 * 3_600_000).toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
function inizio(g: string) {
  for (const off of ["+02:00", "+01:00"]) {
    const d = new Date(`${g}T06:00:00${off}`);
    if (d.toLocaleTimeString("it-IT", { hour: "2-digit", timeZone: "Europe/Rome" }).startsWith("06")) return d.getTime();
  }
  return new Date(`${g}T05:00:00Z`).getTime();
}
const piu = (g: string, giorni: number) => new Date(new Date(g + "T12:00:00Z").getTime() + giorni * GIORNO).toISOString().slice(0, 10);
/** Il periodo che contiene la serata g, e quello subito prima (per il confronto). */
function intervallo(p: Periodo, g: string) {
  if (p === "serata") return { dal: g, al: g, primaDal: piu(g, -7), primaAl: piu(g, -7), nomePrima: "lo stesso giorno della settimana scorsa" };
  if (p === "settimana") {
    const dow = (new Date(g + "T12:00:00Z").getUTCDay() + 6) % 7;   // lunedì = 0
    const dal = piu(g, -dow);
    return { dal, al: piu(dal, 6), primaDal: piu(dal, -7), primaAl: piu(dal, -1), nomePrima: "la settimana prima" };
  }
  const dal = g.slice(0, 8) + "01";
  const al = piu(piu(dal, 32).slice(0, 8) + "01", -1);
  const primaDal = piu(dal, -1).slice(0, 8) + "01";
  return { dal, al, primaDal, primaAl: piu(dal, -1), nomePrima: "il mese prima" };
}
const euro = (n: number) => n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const SELECT = "id, numero, numero_visibile, tipo, canale, stato, totale, sconto, costo_consegna, pagamento, pagato_online, coperti, creato_il, ora_consegna, cliente(nome, telefono), indirizzo(via, civico), consegna(stato, consegnata_il, rider(nome))";

async function leggi(dal: string, al: string): Promise<Riga[]> {
  const da = new Date(inizio(dal)).toISOString(), a = new Date(inizio(piu(al, 1))).toISOString();
  const tutte: Riga[] = [];
  // a pagine da 1000: un mese di serate sta sotto le 2.000 righe
  for (let p = 0; p < 10; p++) {
    const { data, error } = await supabaseBrowser().from("ordine").select(SELECT)
      .gte("creato_il", da).lt("creato_il", a).order("creato_il").range(p * 1000, p * 1000 + 999);
    if (error) throw new Error(error.message);
    tutte.push(...((data ?? []) as unknown as Riga[]).map((r) => ({ ...r, totale: Number(r.totale) })));
    if ((data ?? []).length < 1000) break;
  }
  return tutte;
}

function conti(righe: Riga[]) {
  const vive = righe.filter((r) => r.stato !== "annullato");
  const venduto = vive.reduce((t, r) => t + r.totale, 0);
  const domicili = vive.filter((r) => r.tipo === "domicilio" && r.canale !== "glovo" && r.canale !== "deliveroo");
  // puntuale = consegnata entro la fine della mezz'ora scelta (19:00 → entro le 19:30)
  const conOra = domicili.filter((r) => r.ora_consegna && r.consegna?.[0]?.consegnata_il);
  const puntuali = conOra.filter((r) => new Date(r.consegna![0].consegnata_il!).getTime() <= Math.floor(new Date(r.ora_consegna!).getTime() / 900_000) * 900_000 + 30 * 60_000).length;
  return {
    venduto, ordini: vive.length, annullati: righe.length - vive.length,
    medio: vive.length ? venduto / vive.length : 0,
    coperti: vive.reduce((t, r) => t + Number(r.coperti ?? 0), 0),
    puntuali: conOra.length ? Math.round((puntuali / conOra.length) * 100) : null, misurate: conOra.length,
    vive,
  };
}
/** Raggruppa per una chiave: ordini ed euro, dal più grande. */
function perChiave(righe: Riga[], chiave: (r: Riga) => string) {
  const m = new Map<string, { n: number; euro: number }>();
  for (const r of righe) { const k = chiave(r); const x = m.get(k) ?? { n: 0, euro: 0 }; x.n++; x.euro += r.totale; m.set(k, x); }
  return [...m.entries()].map(([k, v]) => ({ k, ...v })).sort((a, b) => b.euro - a.euro);
}
const pagamentoDi = (r: Riga) => (r.pagato_online ? "online" : r.pagamento === "pos" ? "POS" : r.pagamento === "contanti" ? "contanti" : "non indicato");
const TIPO: Record<string, string> = { domicilio: "Consegna", ritiro: "Ritiro", tavolo: "Tavolo", banco: "Banco" };
const STATO: Record<string, string> = { ricevuto: "Ricevuto", in_preparazione: "In preparazione", pronto: "Pronto", in_consegna: "In consegna", consegnato: "Consegnato", ritirato: "Ritirato", annullato: "Annullato" };

function Dashboard() {
  const [periodo, setPeriodo] = useState<Periodo>("serata");
  const [giorno, setGiorno] = useState(giornataDi(Date.now()));
  const [righe, setRighe] = useState<Riga[] | null>(null);
  const [prima, setPrima] = useState<Riga[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [tutti, setTutti] = useState(false);
  const iv = useMemo(() => intervallo(periodo, giorno), [periodo, giorno]);

  useEffect(() => {
    let vivo = true;
    setRighe(null); setPrima(null); setErrore(null);
    Promise.all([leggi(iv.dal, iv.al), leggi(iv.primaDal, iv.primaAl)])
      .then(([a, b]) => { if (vivo) { setRighe(a); setPrima(b); } })
      .catch((e: Error) => vivo && setErrore(e.message));
    return () => { vivo = false; };
  }, [iv]);

  const c = righe ? conti(righe) : null;
  const p = prima ? conti(prima) : null;
  const diff = (a: number, b: number | undefined) => {
    if (b == null || b === 0) return null;
    const d = Math.round(((a - b) / b) * 100);
    return <small className={d >= 0 ? "db-su" : "db-giu"}>{d >= 0 ? "▲" : "▼"} {Math.abs(d)}%</small>;
  };
  // incasso per ora (della serata o sommato nel periodo), dalle 11 alle 2
  const perOra = useMemo(() => {
    if (!c) return [];
    const m = new Map<number, number>();
    for (const r of c.vive) {
      const h = Number(new Date(r.ora_consegna ?? r.creato_il).toLocaleTimeString("it-IT", { hour: "2-digit", hour12: false, timeZone: "Europe/Rome" }));
      m.set(h, (m.get(h) ?? 0) + r.totale);
    }
    return [...m.entries()].sort((a, b) => ((a[0] + 18) % 24) - ((b[0] + 18) % 24));
  }, [c]);
  const massimoOra = Math.max(1, ...perOra.map((x) => x[1]));
  const rider = useMemo(() => {
    if (!c) return [];
    const m = new Map<string, { n: number; euro: number; contanti: number }>();
    for (const r of c.vive) {
      const k = r.consegna?.[0];
      if (!k || k.stato !== "consegnata") continue;
      const nome = k.rider?.nome ?? "senza rider";
      const x = m.get(nome) ?? { n: 0, euro: 0, contanti: 0 };
      x.n++; x.euro += r.totale; if (!r.pagato_online && r.pagamento !== "pos") x.contanti += r.totale;
      m.set(nome, x);
    }
    return [...m.entries()].sort((a, b) => b[1].n - a[1].n);
  }, [c]);

  function scaricaVista() {
    if (!righe) return;
    const intesta = ["Numero", "Data", "Ora", "Per le", "Tipo", "Origine", "Stato", "Cliente", "Telefono", "Indirizzo", "Pagamento", "Coperti", "Sconto", "Consegna", "Totale", "Rider"];
    const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const righeCsv = righe.map((r) => [
      r.numero_visibile ?? r.numero,
      new Date(r.creato_il).toLocaleDateString("it-IT", { timeZone: "Europe/Rome" }),
      new Date(r.creato_il).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" }),
      r.ora_consegna ? new Date(r.ora_consegna).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" }) : "",
      TIPO[r.tipo] ?? r.tipo, CANALE_COMANDA[r.canale] ?? r.canale, STATO[r.stato] ?? r.stato,
      r.cliente?.nome ?? "", r.cliente?.telefono ?? "", r.indirizzo ? `${r.indirizzo.via} ${r.indirizzo.civico ?? ""}`.trim() : "",
      pagamentoDi(r), r.coperti ?? "", Number(r.sconto ?? 0).toFixed(2).replace(".", ","), Number(r.costo_consegna ?? 0).toFixed(2).replace(".", ","),
      r.totale.toFixed(2).replace(".", ","), r.consegna?.[0]?.rider?.nome ?? "",
    ].map(q).join(";"));
    // il punto e virgola e il BOM: Excel in italiano lo apre già in colonne
    const blob = new Blob(["﻿" + [intesta.map(q).join(";"), ...righeCsv].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ordini_${iv.dal}${iv.al !== iv.dal ? "_" + iv.al : ""}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const titoloPeriodo = periodo === "serata"
    ? new Date(giorno + "T12:00:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : periodo === "settimana" ? `dal ${new Date(iv.dal + "T12:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "short" })} al ${new Date(iv.al + "T12:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "short" })}`
    : new Date(iv.dal + "T12:00:00").toLocaleDateString("it-IT", { month: "long", year: "numeric" });
  const passo = periodo === "serata" ? 1 : periodo === "settimana" ? 7 : 31;

  return (
    <main className="db-pagina">
      <div className="db-testa">
        <h1>Conti e cruscotto</h1>
        {/* anche da casa: dalla dashboard si cambia il menù (Edoardo, 26/10/2026) */}
        <a href="/cassa/menu" className="db-menu">Cambia il menù →</a>
        <div className="db-periodi" role="tablist">
          {(["serata", "settimana", "mese"] as Periodo[]).map((x) => (
            <button key={x} role="tab" aria-selected={periodo === x} className={periodo === x ? "on" : ""} onClick={() => setPeriodo(x)}>{x === "serata" ? "Serata" : x === "settimana" ? "Settimana" : "Mese"}</button>
          ))}
        </div>
        <div className="db-giorno">
          <button onClick={() => setGiorno(periodo === "mese" ? piu(iv.dal, -1) : piu(giorno, -passo))} aria-label="Prima">‹</button>
          <input type="date" value={giorno} onChange={(e) => e.target.value && setGiorno(e.target.value)} />
          <button onClick={() => setGiorno(periodo === "mese" ? piu(iv.al, 1) : piu(giorno, passo))} aria-label="Dopo">›</button>
        </div>
      </div>
      <p className="db-titolo">{titoloPeriodo} <span className="muto">· confronto con {iv.nomePrima}</span></p>
      {errore && <p className="lo-errore">{errore}</p>}
      {!c && !errore && <p className="muto">Leggo gli ordini…</p>}

      {c && (
        <>
          <div className="db-kpi">
            <div className="carta"><span>Venduto</span><b>{euro(c.venduto)}</b>{diff(c.venduto, p?.venduto)}</div>
            <div className="carta"><span>Ordini</span><b>{c.ordini}</b>{diff(c.ordini, p?.ordini)}</div>
            <div className="carta"><span>Scontrino medio</span><b>{euro(c.medio)}</b>{diff(c.medio, p?.medio)}</div>
            <div className="carta"><span>Consegne puntuali</span><b>{c.puntuali == null ? "—" : `${c.puntuali}%`}</b><small className="muto">{c.misurate} consegne con l&apos;ora</small></div>
            <div className="carta"><span>Coperti</span><b>{c.coperti}</b>{diff(c.coperti, p?.coperti)}</div>
            <div className="carta"><span>Annullati</span><b>{c.annullati}</b><small className="muto">non entrano nei conti</small></div>
          </div>

          <div className="db-griglia">
            {[
              { t: "Per origine", d: perChiave(c.vive, (r) => CANALE_COMANDA[r.canale] ?? r.canale) },
              { t: "Per tipo", d: perChiave(c.vive, (r) => TIPO[r.tipo] ?? r.tipo) },
              { t: "Per pagamento", d: perChiave(c.vive, pagamentoDi) },
            ].map((b) => (
              <section className="carta db-blocco" key={b.t}>
                <h2>{b.t}</h2>
                {b.d.length === 0 && <p className="muto">Nessun ordine.</p>}
                {b.d.map((x) => (
                  <div className="db-barra" key={x.k}>
                    <span className="db-nome">{x.k}</span>
                    <span className="db-fondo"><span style={{ width: `${Math.round((x.euro / Math.max(1, c.venduto)) * 100)}%` }} /></span>
                    <span className="db-num">{x.n} · {euro(x.euro)}</span>
                  </div>
                ))}
              </section>
            ))}
            <section className="carta db-blocco">
              <h2>Incasso per ora</h2>
              {perOra.map(([h, e]) => (
                <div className="db-barra" key={h}>
                  <span className="db-nome">{String(h).padStart(2, "0")}:00</span>
                  <span className="db-fondo"><span style={{ width: `${Math.round((e / massimoOra) * 100)}%` }} /></span>
                  <span className="db-num">{euro(e)}</span>
                </div>
              ))}
            </section>
            <section className="carta db-blocco">
              <h2>Rider</h2>
              {rider.length === 0 && <p className="muto">Nessuna consegna fatta.</p>}
              {rider.map(([nome, x]) => (
                <div className="db-riga" key={nome}><span className="db-nome">{nome}</span><span>{x.n} consegne</span><span>{euro(x.euro)}</span><span className="muto">contanti {euro(x.contanti)}</span></div>
              ))}
              {periodo === "serata" && <p className="muto">Il dare-avere della serata coi rider è in <a href="/cassa/riepilogo">Riepilogo</a>.</p>}
            </section>
          </div>

          <section className="carta db-blocco db-ordini">
            <div className="db-ordini-testa">
              <h2>Tutti gli ordini ({righe!.length})</h2>
              <div className="db-scarica">
                <button onClick={scaricaVista}>Scarica CSV di questa vista</button>
                {periodo === "serata" && <a href={`/api/ordini/csv?giornata=${giorno}`}><button>CSV per mano-a-mano-os (40 colonne)</button></a>}
              </div>
            </div>
            <div className="db-tabella">
              <table>
                <thead><tr><th>N.</th><th>Ora</th><th>Per le</th><th>Tipo</th><th>Origine</th><th>Cliente</th><th>Pagamento</th><th>Stato</th><th>Rider</th><th className="num">Totale</th></tr></thead>
                <tbody>
                  {(tutti ? righe! : righe!.slice(-200)).slice().reverse().map((r) => (
                    <tr key={r.id} className={r.stato === "annullato" ? "annullato" : ""}>
                      <td>{r.numero_visibile ?? r.numero}</td>
                      <td>{new Date(r.creato_il).toLocaleString("it-IT", { day: periodo === "serata" ? undefined : "2-digit", month: periodo === "serata" ? undefined : "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" })}</td>
                      <td>{r.ora_consegna ? new Date(r.ora_consegna).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" }) : ""}</td>
                      <td>{TIPO[r.tipo] ?? r.tipo}</td>
                      <td>{CANALE_COMANDA[r.canale] ?? r.canale}</td>
                      <td>{r.cliente?.nome ?? ""}</td>
                      <td>{pagamentoDi(r)}</td>
                      <td>{STATO[r.stato] ?? r.stato}</td>
                      <td>{r.consegna?.[0]?.rider?.nome ?? ""}</td>
                      <td className="num">{euro(r.totale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!tutti && righe!.length > 200 && <button onClick={() => setTutti(true)}>Mostra tutti i {righe!.length}</button>}
          </section>
        </>
      )}
    </main>
  );
}
