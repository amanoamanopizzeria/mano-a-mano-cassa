"use client";

// Il planner delle fasce, impaginato come nel Velocissimo nuovo (video «NUOVO VELOCISSIMO
// RISTO», 14:11): una riga per quarto d'ora, una colonna per reparto (Pizze, Rider), in ogni
// cella «occupate/massimo»; la riga rossa è adesso; la lente apre gli ordini della fascia;
// toccando una cella si cambia il massimo solo per quella fascia («3/2 · 1 reali»).
// I posti vengono da capacita_giorno (la stessa regola dell'accettazione degli ordini).
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";
import type { CapacitaFascia } from "@/lib/types";

interface OrdineFascia {
  fascia: string; id: string; numero: number; tipo: string; canale: string; stato: string;
  ora_consegna: string | null; creato_il: string; totale: number; pizze: number;
  cliente: string | null; telefono: string | null; indirizzo: string | null; note: string | null;
}
type Reparto = "produzione" | "consegne";
interface Modifica { ora: string; tipo: Reparto; massimo: number; reali: number }
/** Le prossime consegne con chi le porta (Edoardo 24/10: «le fasce delle prossime consegne, di quanti rider»). */
interface Prossima {
  id: string; stato: "da_assegnare" | "assegnata" | "ritirata";
  rider: { nome: string } | null;
  ordine: { numero: number; numero_visibile: string | null; ora_consegna: string | null; creato_il: string; indirizzo: { via: string; civico: string | null } | null } | null;
}

const TIPO: Record<string, string> = { domicilio: "Domicilio", ritiro: "Ritiro", tavolo: "Tavolo", banco: "Banco" };
const STATO: Record<string, string> = {
  ricevuto: "Ricevuto", in_preparazione: "In preparazione", pronto: "Pronto", in_consegna: "In consegna",
  consegnato: "Consegnato", ritirato: "Ritirato", annullato: "Annullato",
};

export default function FascePagina() {
  return (
    <AuthGate>
      <Fasce />
    </AuthGate>
  );
}

const oggi = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
const oraRoma = (iso: string) => new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
const adessoRoma = () => new Date().toLocaleTimeString("sv-SE", { timeZone: "Europe/Rome" }).slice(0, 5);

function Fasce() {
  const [giorno, setGiorno] = useState(oggi());
  const [fasce, setFasce] = useState<CapacitaFascia[]>([]);
  const [ordini, setOrdini] = useState<OrdineFascia[]>([]);
  const [idNegozio, setIdNegozio] = useState<string | null>(null);
  const [aperta, setAperta] = useState<string | null>(null);     // fascia con gli ordini in vista
  const [modifica, setModifica] = useState<Modifica | null>(null);
  const [adesso, setAdesso] = useState(adessoRoma());
  const [errore, setErrore] = useState<string | null>(null);
  const [prossime, setProssime] = useState<Prossima[]>([]);
  const [turno, setTurno] = useState<{ pizzaioli: number; rider: number } | null>(null);

  const carica = useCallback(async () => {
    const supabase = supabaseBrowser();
    const { data: prof } = await supabase.from("profilo").select("id_negozio").single();
    const negozio = prof?.id_negozio as string | undefined;
    if (!negozio) { setErrore("Nessun negozio collegato al tuo profilo."); return; }
    setIdNegozio(negozio);
    const [c, o, p, t] = await Promise.all([
      supabase.rpc("capacita_giorno", { p_negozio: negozio, p_giorno: giorno }),
      supabase.rpc("ordini_per_fascia", { p_negozio: negozio, p_giorno: giorno }),
      supabase.from("consegna").select("id, stato, rider(nome), ordine(numero, numero_visibile, ora_consegna, creato_il, indirizzo(via, civico))")
        .in("stato", ["da_assegnare", "assegnata", "ritirata"]),
      supabase.from("turno_giorno").select("pizzaioli, rider").eq("id_negozio", negozio).lte("giorno", giorno).order("giorno", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const quando = (x: Prossima) => x.ordine?.ora_consegna ?? x.ordine?.creato_il ?? "";
    setProssime(((p.data ?? []) as unknown as Prossima[])
      .filter((x) => quando(x).length > 0 && new Date(quando(x)).toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" }) === giorno)
      .sort((a, b) => quando(a).localeCompare(quando(b))));
    setTurno(t.data ?? null);
    if (c.error) setErrore(c.error.message); else if (o.error) setErrore(o.error.message);
    else { setErrore(null); setFasce((c.data ?? []) as CapacitaFascia[]); setOrdini((o.data ?? []) as OrdineFascia[]); }
  }, [giorno]);

  useEffect(() => {
    carica();
    const supabase = supabaseBrowser();
    const canale = supabase
      .channel("fasce-" + giorno)
      .on("postgres_changes", { event: "*", schema: "public", table: "ordine" }, () => carica())
      .on("postgres_changes", { event: "*", schema: "public", table: "turno_giorno" }, () => carica())
      .on("postgres_changes", { event: "*", schema: "public", table: "fascia_bloccata" }, () => carica())
      .on("postgres_changes", { event: "*", schema: "public", table: "fascia_capacita" }, () => carica())
      .on("postgres_changes", { event: "*", schema: "public", table: "consegna" }, () => carica())
      .subscribe();
    const orologio = setInterval(() => setAdesso(adessoRoma()), 30_000);
    return () => { supabase.removeChannel(canale); clearInterval(orologio); };
  }, [carica, giorno]);

  const perFascia = useMemo(() => {
    const m = new Map<string, OrdineFascia[]>();
    for (const o of ordini) { const k = o.fascia.slice(0, 5); m.set(k, [...(m.get(k) ?? []), o]); }
    return m;
  }, [ordini]);

  const vivi = ordini.filter((o) => o.stato !== "annullato");
  const totali = {
    ordini: vivi.length,
    pizze: vivi.reduce((s, o) => s + o.pizze, 0),
    consegne: vivi.filter((o) => o.tipo === "domicilio").length,
    euro: vivi.reduce((s, o) => s + Number(o.totale), 0),
  };

  async function salvaMassimo(m: Modifica, togli = false) {
    if (!idNegozio) return;
    const { error } = await supabaseBrowser().rpc("imposta_fascia", {
      p_negozio: idNegozio, p_giorno: giorno, p_ora: m.ora, p_tipo: m.tipo, p_massimo: togli ? null : m.massimo,
    });
    if (error) setErrore(error.message);
    setModifica(null);
    carica();
  }
  // −/+ direttamente sulla riga: un tocco cambia il massimo di QUEL quarto d'ora (Edoardo 24/10).
  // Si salva subito, ma per 6 secondi resta «Salvato · Annulla» (critico giro 10: con le dita del
  // servizio il «+» si tocca per sbaglio): «Annulla» rimette il numero di prima.
  const [ultimo, setUltimo] = useState<{ ora: string; tipo: Reparto; prima: number; dopo: number; reali: number } | null>(null);
  async function passo(f: CapacitaFascia, tipo: Reparto, d: number) {
    const attuale = tipo === "produzione" ? f.pizze_max : f.consegne_max;
    const reali = tipo === "produzione" ? f.pizze_occupate : f.consegne_occupate;
    const dopo = Math.max(0, attuale + d);
    await salvaMassimo({ ora: f.ora, tipo, massimo: dopo, reali });
    setUltimo({ ora: f.ora, tipo, prima: attuale, dopo, reali });
    setTimeout(() => setUltimo((u) => (u && u.ora === f.ora && u.tipo === tipo && u.dopo === dopo ? null : u)), 6000);
  }
  async function annullaUltimo() {
    if (!ultimo) return;
    await salvaMassimo({ ora: ultimo.ora, tipo: ultimo.tipo, massimo: ultimo.prima, reali: ultimo.reali });
    setUltimo(null);
  }

  const eOggi = giorno === oggi();

  return (
    <main style={{ maxWidth: 980 }} className="fasce-pagina">
      {ultimo && (
        <div role="status" style={{ position: "fixed", left: "50%", bottom: 18, transform: "translateX(-50%)", zIndex: 40, display: "flex", gap: 10, alignItems: "center", padding: "10px 14px", borderRadius: 999, background: "var(--testo)", color: "#fff", fontSize: 15, boxShadow: "0 8px 22px rgba(26,23,21,.3)" }}>
          <span>{ultimo.ora.slice(0, 5)} · {ultimo.tipo === "produzione" ? "pizze" : "consegne"} {ultimo.prima} → <b>{ultimo.dopo}</b> · salvato</span>
          <button onClick={annullaUltimo} style={{ minHeight: 36, padding: "0 12px", background: "var(--oro)", color: "var(--testo)", borderColor: "transparent" }}>Annulla</button>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Planner — fasce</h1>
        <input type="date" value={giorno} onChange={(e) => setGiorno(e.target.value)} style={{ minHeight: 44, fontSize: 16 }} />
        <Link href="/cassa/capacita" className="f-turno">
          {turno ? <><b>{turno.pizzaioli}</b> pizzaioli · <b>{turno.rider}</b> rider</> : "Imposta pizzaioli e rider"} →
        </Link>
        <span className="f-totale" style={{ marginLeft: "auto" }}>
          <b>{totali.ordini}</b> ordini · <b>{totali.pizze}</b> pizze · <b>{totali.consegne}</b> consegne · <b>{totali.euro.toFixed(2).replace(".", ",")} €</b>
        </span>
      </div>
      <div className="f-legenda">
        <span><span className="f-pill libera">0/20</span> posti liberi</span>
        <span><span className="f-pill quasi">14/20</span> quasi piena</span>
        <span><span className="f-pill piena">20/20</span> sold out</span>
        <span><span className="f-pill lente">🔍 2</span> gli ordini della fascia: tocca per vederli</span>
        <span className="muto">Con − e + cambi il massimo di quel quarto d&apos;ora; tocca il numero per scriverlo.</span>
      </div>
      {errore && <p style={{ color: "var(--accento)" }}>{errore}</p>}

      {prossime.length > 0 && (
        <div className="carta f-prossime">
          <h2>Prossime consegne <small>{prossime.length}</small></h2>
          {prossime.map((x) => (
            <div key={x.id} className={"f-cons " + x.stato}>
              <b className="f-ora">{oraRoma(x.ordine?.ora_consegna ?? x.ordine?.creato_il ?? "")}</b>
              <b>{x.ordine?.numero_visibile ?? `#${x.ordine?.numero ?? ""}`}</b>
              <span className="f-via">{x.ordine?.indirizzo ? `${x.ordine.indirizzo.via} ${x.ordine.indirizzo.civico ?? ""}` : "senza indirizzo"}</span>
              <span className="f-chi">{x.stato === "da_assegnare" ? "da assegnare" : `${x.rider?.nome ?? "rider"} · ${x.stato === "ritirata" ? "in viaggio" : "assegnata"}`}</span>
            </div>
          ))}
        </div>
      )}

      <div className="carta" style={{ marginTop: 12, padding: 0, overflow: "hidden" }}>
        <table className="f-tabella" style={{ width: "100%", borderCollapse: "collapse", fontSize: 15 }}>
          <thead>
            <tr style={{ background: "var(--sfondo)", color: "var(--muto)", fontSize: 14, fontFamily: "Oswald, sans-serif", fontWeight: 500, textTransform: "uppercase", letterSpacing: ".1em" }}>
              <th className="f-col-ora" style={{ textAlign: "left", padding: "8px 12px", width: 70 }}>Ora</th>
              <th style={{ padding: 8 }}>Pizze</th>
              <th style={{ padding: 8 }}>Consegne</th>
              <th className="f-col-ord" style={{ padding: 8, width: 70 }}>Ordini</th>
            </tr>
          </thead>
          <tbody>
            {fasce.map((f) => {
              const ora = f.ora.slice(0, 5);
              const lista = perFascia.get(ora) ?? [];
              const corrente = eOggi && ora <= adesso && adesso < aggiungi15(ora);
              const passata = eOggi && ora < adesso && !corrente;
              return [
                <tr key={ora} style={{ borderTop: corrente ? "2px solid var(--vino)" : "1px solid var(--bordo)", opacity: passata ? .55 : 1, background: aperta === ora ? "var(--oro-velo)" : undefined }}>
                  <td className="f-col-ora" style={{ padding: "6px 12px", fontWeight: 700, fontVariantNumeric: "tabular-nums", fontSize: 18, color: corrente ? "var(--vino)" : undefined }}>
                    {corrente && <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 999, background: "var(--vino)", marginRight: 6 }} />}{ora}
                  </td>
                  <td className="f-cella" style={{ textAlign: "center", padding: 4, whiteSpace: "nowrap" }}><span className="f-cella-in">
                    <button className="f-passo" onClick={() => passo(f, "produzione", -1)} aria-label={`Una pizza in meno alle ${ora}`}>−</button>
                    <Pillola n={f.pizze_occupate} max={f.pizze_max} bloccata={f.bloccata_produzione}
                      onClick={() => setModifica({ ora: f.ora, tipo: "produzione", massimo: f.pizze_max, reali: f.pizze_occupate })} />
                    <button className="f-passo" onClick={() => passo(f, "produzione", 1)} aria-label={`Una pizza in più alle ${ora}`}>+</button>
                  </span></td>
                  <td className="f-cella" style={{ textAlign: "center", padding: 4, whiteSpace: "nowrap" }}><span className="f-cella-in">
                    <button className="f-passo" onClick={() => passo(f, "consegne", -1)} aria-label={`Una consegna in meno alle ${ora}`}>−</button>
                    <Pillola n={f.consegne_occupate} max={f.consegne_max} bloccata={f.bloccata_consegne}
                      onClick={() => setModifica({ ora: f.ora, tipo: "consegne", massimo: f.consegne_max, reali: f.consegne_occupate })} />
                    <button className="f-passo" onClick={() => passo(f, "consegne", 1)} aria-label={`Una consegna in più alle ${ora}`}>+</button>
                  </span></td>
                  <td className="f-col-ord" style={{ textAlign: "center", padding: 4 }}>
                    <button onClick={() => setAperta(aperta === ora ? null : ora)} title={lista.length === 1 ? "1 ordine in questa fascia: tocca per vederlo" : `${lista.length} ordini in questa fascia: tocca per vederli`}
                      style={{ border: "none", background: lista.length ? "var(--vino-chiaro)" : "transparent", borderRadius: 999, padding: "6px 10px", minHeight: 44, minWidth: 44, fontSize: 16, fontWeight: 700, color: lista.length ? "var(--vino)" : "var(--muto)" }}>
                      🔍{lista.length > 0 && <> {lista.length}<span className="sr">{lista.length === 1 ? " ordine" : " ordini"}</span></>}
                    </button>
                  </td>
                </tr>,
                aperta === ora && (
                  <tr key={ora + "-ordini"} style={{ background: "var(--oro-velo)" }}>
                    <td colSpan={4} style={{ padding: "4px 12px 10px" }}>
                      {lista.length === 0 && <span className="muto">Nessun ordine in questa fascia.</span>}
                      {lista.map((o) => (
                        <div key={o.id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "8px 0", fontSize: 15, borderTop: "1px solid var(--bordo)", opacity: o.stato === "annullato" ? .5 : 1 }}>
                          <b>#{o.numero}</b>
                          <span className={"badge " + o.stato}>{STATO[o.stato] ?? o.stato}</span>
                          <span>{TIPO[o.tipo] ?? o.tipo}{o.ora_consegna ? " · " + oraRoma(o.ora_consegna) : ""}</span>
                          <span style={{ flex: 1 }}>
                            {o.cliente ?? (o.telefono ? "" : <span className="muto">senza cliente</span>)}
                            {o.telefono && <span className="muto"> {o.telefono}</span>}
                            {o.indirizzo && <span className="muto"> · {o.indirizzo}</span>}
                            {o.note && <span className="muto"> · {o.note}</span>}
                          </span>
                          <span className="muto">{o.pizze} {o.pizze === 1 ? "pizza" : "pizze"}</span>
                          <b style={{ fontVariantNumeric: "tabular-nums", fontSize: 17 }}>{Number(o.totale).toFixed(2).replace(".", ",")} €</b>
                        </div>
                      ))}
                    </td>
                  </tr>
                ),
              ];
            })}
          </tbody>
        </table>
      </div>

      {modifica && (
        <div onClick={() => setModifica(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
          <div className="carta" onClick={(e) => e.stopPropagation()} style={{ width: 320, maxWidth: "calc(100vw - 32px)", padding: 18, textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, fontFamily: "Oswald, sans-serif", textTransform: "uppercase", letterSpacing: ".06em" }}>
              <span>{modifica.tipo === "produzione" ? "pizze" : "rider"}</span>
              <span>{modifica.ora.slice(0, 5)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, margin: "18px 0 8px" }}>
              <button onClick={() => setModifica({ ...modifica, massimo: Math.max(0, modifica.massimo - 1) })} style={{ width: 52, height: 52, borderRadius: 999, fontSize: 26 }}>−</button>
              <div style={{ fontSize: 44, fontWeight: 800, color: "var(--vino)", fontVariantNumeric: "tabular-nums", fontFamily: "Oswald, sans-serif" }}>
                {modifica.reali}<span style={{ fontSize: 20, color: "var(--muto)" }}> / {modifica.massimo}</span>
              </div>
              <button onClick={() => setModifica({ ...modifica, massimo: modifica.massimo + 1 })} style={{ width: 52, height: 52, borderRadius: 999, fontSize: 26 }}>+</button>
            </div>
            <div style={{ border: "1px solid var(--oro)", borderRadius: 10, padding: 6, color: "var(--muto)" }}>
              {modifica.reali} reali · massimo <input type="number" min={0} value={modifica.massimo}
                onChange={(e) => setModifica({ ...modifica, massimo: Math.max(0, Number(e.target.value) || 0) })}
                style={{ width: 64, minHeight: 40, fontSize: 16, textAlign: "center" }} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "space-between" }}>
              <button onClick={() => salvaMassimo(modifica, true)} className="muto" style={{ fontSize: 14, minHeight: 44 }}>Torna alla regola</button>
              <span style={{ flex: 1 }} />
              <button onClick={() => setModifica(null)} style={{ minHeight: 44, fontSize: 15 }}>Annulla</button>
              <button onClick={() => salvaMassimo(modifica)} className="primario" style={{ minHeight: 44, fontSize: 16, padding: "0 22px" }}>OK</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function aggiungi15(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const t = h * 60 + m + 15;
  return String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0");
}

/** La cella «occupate/massimo»: grigia, arancio da 70 su 100, rossa quando è piena o bloccata. */
function Pillola({ n, max, bloccata, onClick }: { n: number; max: number; bloccata: boolean; onClick: () => void }) {
  const piena = bloccata || (max > 0 ? n >= max : n > 0);
  const quasi = !piena && max > 0 && n / max >= .7;
  const vuota = n === 0 && max === 0;
  const sfondo = piena ? "var(--vino)" : quasi ? "var(--oro)" : "var(--bordo)";
  const colore = piena ? "#fff" : "var(--testo)";
  return (
    <button onClick={onClick} style={{
      border: "none", borderRadius: 999, padding: "6px 12px", minWidth: 64, minHeight: 40, fontWeight: 700, fontSize: 16,
      fontVariantNumeric: "tabular-nums", background: sfondo, color: colore, opacity: vuota ? .45 : 1,
    }}>
      {bloccata ? "✕ " : ""}{n}/{max}
    </button>
  );
}
