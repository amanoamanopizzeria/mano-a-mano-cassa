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

  const carica = useCallback(async () => {
    const supabase = supabaseBrowser();
    const { data: prof } = await supabase.from("profilo").select("id_negozio").single();
    const negozio = prof?.id_negozio as string | undefined;
    if (!negozio) { setErrore("Nessun negozio collegato al tuo profilo."); return; }
    setIdNegozio(negozio);
    const [c, o] = await Promise.all([
      supabase.rpc("capacita_giorno", { p_negozio: negozio, p_giorno: giorno }),
      supabase.rpc("ordini_per_fascia", { p_negozio: negozio, p_giorno: giorno }),
    ]);
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

  const eOggi = giorno === oggi();

  return (
    <main style={{ maxWidth: 980 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Planner — fasce</h1>
        <input type="date" value={giorno} onChange={(e) => setGiorno(e.target.value)} />
        <Link href="/cassa/capacita" className="muto">Pizzaioli e rider del giorno →</Link>
        <span className="muto" style={{ marginLeft: "auto" }}>
          {totali.ordini} ordini · {totali.pizze} pizze · {totali.consegne} consegne · {totali.euro.toFixed(2).replace(".", ",")} €
        </span>
      </div>
      {errore && <p style={{ color: "var(--accento)" }}>{errore}</p>}

      <div className="carta" style={{ marginTop: 12, padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#eceae4", color: "var(--muto)", fontSize: 12, textTransform: "uppercase", letterSpacing: .5 }}>
              <th style={{ textAlign: "left", padding: "8px 12px", width: 70 }}>Ora</th>
              <th style={{ padding: 8 }}>Pizze</th>
              <th style={{ padding: 8 }}>Rider</th>
              <th style={{ padding: 8, width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {fasce.map((f) => {
              const ora = f.ora.slice(0, 5);
              const lista = perFascia.get(ora) ?? [];
              const corrente = eOggi && ora <= adesso && adesso < aggiungi15(ora);
              const passata = eOggi && ora < adesso && !corrente;
              return [
                <tr key={ora} style={{ borderTop: corrente ? "2px solid #d32f2f" : "1px solid var(--bordo)", opacity: passata ? .55 : 1, background: aperta === ora ? "#faf7f0" : undefined }}>
                  <td style={{ padding: "6px 12px", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: corrente ? "#d32f2f" : undefined }}>
                    {corrente && <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 999, background: "#d32f2f", marginRight: 6 }} />}{ora}
                  </td>
                  <td style={{ textAlign: "center", padding: 4 }}>
                    <Pillola n={f.pizze_occupate} max={f.pizze_max} bloccata={f.bloccata_produzione}
                      onClick={() => setModifica({ ora: f.ora, tipo: "produzione", massimo: f.pizze_max, reali: f.pizze_occupate })} />
                  </td>
                  <td style={{ textAlign: "center", padding: 4 }}>
                    <Pillola n={f.consegne_occupate} max={f.consegne_max} bloccata={f.bloccata_consegne}
                      onClick={() => setModifica({ ora: f.ora, tipo: "consegne", massimo: f.consegne_max, reali: f.consegne_occupate })} />
                  </td>
                  <td style={{ textAlign: "center", padding: 4 }}>
                    <button onClick={() => setAperta(aperta === ora ? null : ora)} title="Gli ordini di questa fascia"
                      style={{ border: "none", background: lista.length ? "#fff3f4" : "transparent", borderRadius: 999, padding: "4px 10px", fontWeight: 700, color: lista.length ? "var(--accento)" : "var(--muto)" }}>
                      🔍{lista.length > 0 && " " + lista.length}
                    </button>
                  </td>
                </tr>,
                aperta === ora && (
                  <tr key={ora + "-ordini"} style={{ background: "#faf7f0" }}>
                    <td colSpan={4} style={{ padding: "4px 12px 10px" }}>
                      {lista.length === 0 && <span className="muto">Nessun ordine in questa fascia.</span>}
                      {lista.map((o) => (
                        <div key={o.id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "5px 0", borderTop: "1px solid var(--bordo)", opacity: o.stato === "annullato" ? .5 : 1 }}>
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
                          <b style={{ fontVariantNumeric: "tabular-nums" }}>{Number(o.totale).toFixed(2).replace(".", ",")} €</b>
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
      <p className="muto" style={{ marginTop: 8 }}>
        Grigio: posti liberi · arancio: quasi piena · rosso: sold out. Tocca una cella per cambiare il massimo solo di quella fascia.
      </p>

      {modifica && (
        <div onClick={() => setModifica(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
          <div className="carta" onClick={(e) => e.stopPropagation()} style={{ width: 300, padding: 18, textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
              <span>{modifica.tipo === "produzione" ? "pizze" : "rider"}</span>
              <span>{modifica.ora.slice(0, 5)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, margin: "18px 0 8px" }}>
              <button onClick={() => setModifica({ ...modifica, massimo: Math.max(0, modifica.massimo - 1) })} style={{ width: 44, height: 44, borderRadius: 999, fontSize: 22 }}>−</button>
              <div style={{ fontSize: 40, fontWeight: 800, color: "#d32f2f", fontVariantNumeric: "tabular-nums" }}>
                {modifica.reali}<span style={{ fontSize: 20, color: "var(--muto)" }}> / {modifica.massimo}</span>
              </div>
              <button onClick={() => setModifica({ ...modifica, massimo: modifica.massimo + 1 })} style={{ width: 44, height: 44, borderRadius: 999, fontSize: 22 }}>+</button>
            </div>
            <div style={{ border: "1px solid #d32f2f", borderRadius: 6, padding: 6, color: "var(--muto)" }}>
              {modifica.reali} reali · massimo <input type="number" min={0} value={modifica.massimo}
                onChange={(e) => setModifica({ ...modifica, massimo: Math.max(0, Number(e.target.value) || 0) })}
                style={{ width: 56, textAlign: "center" }} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "space-between" }}>
              <button onClick={() => salvaMassimo(modifica, true)} className="muto" style={{ fontSize: 12 }}>Torna alla regola</button>
              <span style={{ flex: 1 }} />
              <button onClick={() => setModifica(null)}>Annulla</button>
              <button onClick={() => salvaMassimo(modifica)} className="primario">OK</button>
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
  const sfondo = piena ? "#d32f2f" : quasi ? "#f6a21b" : "#e3e0d8";
  const colore = piena || quasi ? "#fff" : "#2b2823";
  return (
    <button onClick={onClick} style={{
      border: "none", borderRadius: 999, padding: "3px 12px", minWidth: 64, fontWeight: 700, fontSize: 13,
      fontVariantNumeric: "tabular-nums", background: sfondo, color: colore, opacity: vuota ? .45 : 1,
    }}>
      {bloccata ? "✕ " : ""}{n}/{max}
    </button>
  );
}
