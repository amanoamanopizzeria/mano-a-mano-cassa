"use client";

// I rider e il borsello, dalla cassa (mig. 0024): quanto ha in mano ciascuno (prelievi − depositi +
// contanti delle consegne fatte e non saldate), il fondo di inizio serata, un prelievo o un deposito a
// mano, e il dare-avere di fine serata («Salda»: un deposito solo con dentro le consegne, che poi
// spariscono dallo storico del rider). La stessa forma dell'API /borsello-rider di Velocissimo.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";
import type { RiderBorsello } from "@/lib/types";

const euro = (n: number) => n.toFixed(2).replace(".", ",") + " €";

interface Movimento { id: string; id_rider: string; tipo: "deposito" | "prelievo"; importo: number; fondo_cassa: boolean; note: string | null; creato_il: string }

export default function RiderCassaPagina() {
  return <AuthGate><RiderCassa /></AuthGate>;
}

function RiderCassa() {
  const [rider, setRider] = useState<RiderBorsello[]>([]);
  const [movimenti, setMovimenti] = useState<Movimento[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const [esito, setEsito] = useState<string | null>(null);
  const [aperto, setAperto] = useState<string | null>(null);
  const [importo, setImporto] = useState("");
  const [note, setNote] = useState("");

  const carica = useCallback(async () => {
    const s = supabaseBrowser();
    const da = new Date(); da.setHours(0, 0, 0, 0);
    const [r, m] = await Promise.all([
      s.rpc("rider_borsello"),
      s.from("rider_movimento").select("*").gte("creato_il", da.toISOString()).order("creato_il", { ascending: false }),
    ]);
    if (r.error) setErrore(r.error.message);
    setRider(((r.data ?? []) as RiderBorsello[]).map((x) => ({ ...x, prelievi: Number(x.prelievi), depositi: Number(x.depositi), da_saldare: Number(x.da_saldare), in_mano: Number(x.in_mano) })));
    setMovimenti(((m.data ?? []) as Movimento[]).map((x) => ({ ...x, importo: Number(x.importo) })));
  }, []);

  useEffect(() => {
    carica();
    const canale = supabaseBrowser().channel("cassa-rider")
      .on("postgres_changes", { event: "*", schema: "public", table: "consegna" }, () => carica())
      .on("postgres_changes", { event: "*", schema: "public", table: "rider_movimento" }, () => carica())
      .subscribe();
    return () => { supabaseBrowser().removeChannel(canale); };
  }, [carica]);

  async function movimento(idRider: string, tipo: "deposito" | "prelievo", fondo = false) {
    const n = Number(importo.replace(",", "."));
    if (!(n > 0)) { setErrore("Scrivi l'importo."); return; }
    setErrore(null);
    const { error } = await supabaseBrowser().rpc("rider_movimento_scrivi", { p_rider: idRider, p_tipo: tipo, p_importo: n, p_fondo: fondo, p_note: note || null });
    if (error) { setErrore(error.message); return; }
    setImporto(""); setNote(""); setEsito(`${fondo ? "Fondo" : tipo === "prelievo" ? "Prelievo" : "Deposito"} di ${euro(n)} registrato.`);
    carica();
  }

  async function salda(r: RiderBorsello) {
    setErrore(null);
    const { data, error } = await supabaseBrowser().rpc("rider_salda", { p_rider: r.id, p_note: note || null });
    if (error) { setErrore(error.message); return; }
    const x = data as { esito: string; consegne?: number; importo?: number };
    setEsito(x.esito === "saldato" ? `${r.nome}: saldate ${x.consegne} consegne, versati ${euro(Number(x.importo))}.` : `${r.nome}: niente da saldare.`);
    setNote("");
    carica();
  }

  return (
    <main className="borsello">
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Rider e borsello</h1>
        <Link href="/cassa/mappa" className="muto">Mappa →</Link>
        <Link href="/cassa" className="muto">Cassa →</Link>
      </div>
      <p className="muto">In mano = prelievi − depositi + contanti delle consegne fatte e non ancora saldate. A fine serata: «Salda».</p>
      {errore && <p style={{ color: "var(--accento)", fontWeight: 700 }}>{errore}</p>}
      {esito && <p style={{ color: "var(--ok)", fontWeight: 600 }}>{esito}</p>}

      <div className="griglia">
        {rider.map((r) => (
          <article key={r.id} className="carta" style={{ opacity: r.attivo ? 1 : 0.6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <strong style={{ fontSize: 18, fontFamily: "Oswald, sans-serif", textTransform: "uppercase", letterSpacing: ".03em", fontWeight: 600 }}>{r.nome}</strong>
              <span style={{ textAlign: "right" }}><span style={{ fontSize: 34, lineHeight: 1, fontWeight: 600, fontFamily: "Oswald, sans-serif", color: "var(--vino)", fontVariantNumeric: "tabular-nums" }}>{euro(r.in_mano)}</span><span className="muto" style={{ display: "block" }}>in mano</span></span>
            </div>
            <div className="b-voci">
              {r.in_corso > 0 && <span><b>{r.in_corso}</b> in corso</span>}
              <span><b>{r.n_da_saldare}</b> da saldare <b>{euro(r.da_saldare)}</b></span>
              <span>prelievi <b>{euro(r.prelievi)}</b></span>
              <span>depositi <b>{euro(r.depositi)}</b></span>
            </div>
            {aperto === r.id ? (
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                <input inputMode="decimal" placeholder="Importo €" value={importo} onChange={(e) => setImporto(e.target.value)} style={{ padding: 10, fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums" }} />
                <input placeholder="Note (es. fondo serata)" value={note} onChange={(e) => setNote(e.target.value)} style={{ padding: 8, fontSize: 14 }} />
                <div className="b-tasti">
                  <button className="b-fondo" onClick={() => movimento(r.id, "prelievo", true)}>Fondo<small>dalla cassa al rider, a inizio serata</small></button>
                  <button className="b-prelievo" onClick={() => movimento(r.id, "prelievo")}>Prelievo<small>dalla cassa al rider</small></button>
                  <button className="b-deposito" onClick={() => movimento(r.id, "deposito")}>Deposito<small>dal rider alla cassa</small></button>
                  <button className="b-chiudi" onClick={() => setAperto(null)}>Chiudi</button>
                </div>
              </div>
            ) : (
              <div className="b-tasti" style={{ marginTop: 10 }}>
                <button className="primario b-salda" onClick={() => salda(r)} disabled={r.n_da_saldare === 0}>Salda {r.n_da_saldare > 0 ? euro(r.da_saldare) : ""}<small>le consegne fatte tornano in cassa</small></button>
                <button className="b-apri" onClick={() => { setAperto(r.id); setImporto(""); setNote(""); }}>Fondo / prelievo / deposito</button>
              </div>
            )}
          </article>
        ))}
        {rider.length === 0 && <p className="muto">Nessun rider in anagrafica.</p>}
      </div>

      <h2 style={{ marginTop: 24 }}>Movimenti di oggi</h2>
      {movimenti.length === 0 && <p className="muto">Nessun movimento oggi.</p>}
      {movimenti.map((m) => (
        <div key={m.id} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--bordo)", fontSize: 15, alignItems: "baseline" }}>
          <span className="muto">{new Date(m.creato_il).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</span>
          <span style={{ flex: 1 }}><b>{rider.find((r) => r.id === m.id_rider)?.nome ?? "?"}</b> · {m.fondo_cassa ? "fondo" : m.tipo} <span className="muto">({m.tipo === "deposito" ? "dal rider alla cassa" : "dalla cassa al rider"})</span>{m.note ? ` · ${m.note}` : ""}</span>
          <span style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: m.tipo === "deposito" ? "var(--ok)" : "var(--vino)" }}>{m.tipo === "deposito" ? "+" : "−"} {euro(m.importo)}</span>
        </div>
      ))}
    </main>
  );
}
