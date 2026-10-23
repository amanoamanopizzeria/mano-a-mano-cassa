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
    <main>
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
              <strong style={{ fontSize: 18 }}>{r.nome}</strong>
              <span style={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{euro(r.in_mano)}</span>
            </div>
            <div className="muto" style={{ fontSize: 13 }}>
              {r.in_corso > 0 && <>{r.in_corso} in corso · </>}
              {r.n_da_saldare} da saldare ({euro(r.da_saldare)}) · prelievi {euro(r.prelievi)} · depositi {euro(r.depositi)}
            </div>
            {aperto === r.id ? (
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                <input inputMode="decimal" placeholder="Importo €" value={importo} onChange={(e) => setImporto(e.target.value)} style={{ padding: 8, fontSize: 16 }} />
                <input placeholder="Note (es. fondo serata)" value={note} onChange={(e) => setNote(e.target.value)} style={{ padding: 8, fontSize: 14 }} />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button onClick={() => movimento(r.id, "prelievo", true)}>Fondo</button>
                  <button onClick={() => movimento(r.id, "prelievo")}>Prelievo</button>
                  <button onClick={() => movimento(r.id, "deposito")}>Deposito</button>
                  <button onClick={() => setAperto(null)}>Chiudi</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                <button className="primario" onClick={() => salda(r)} disabled={r.n_da_saldare === 0}>Salda {r.n_da_saldare > 0 ? euro(r.da_saldare) : ""}</button>
                <button onClick={() => { setAperto(r.id); setImporto(""); setNote(""); }}>Fondo / prelievo / deposito</button>
              </div>
            )}
          </article>
        ))}
        {rider.length === 0 && <p className="muto">Nessun rider in anagrafica.</p>}
      </div>

      <h2 style={{ fontSize: 16, marginTop: 20 }}>Movimenti di oggi</h2>
      {movimenti.length === 0 && <p className="muto">Nessun movimento oggi.</p>}
      {movimenti.map((m) => (
        <div key={m.id} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--bordo)", fontSize: 14 }}>
          <span className="muto">{new Date(m.creato_il).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</span>
          <span style={{ flex: 1 }}>{rider.find((r) => r.id === m.id_rider)?.nome ?? "?"} · {m.fondo_cassa ? "fondo" : m.tipo}{m.note ? ` · ${m.note}` : ""}</span>
          <span style={{ fontWeight: 700, color: m.tipo === "deposito" ? "var(--ok)" : "inherit" }}>{m.tipo === "deposito" ? "+" : "−"} {euro(m.importo)}</span>
        </div>
      ))}
    </main>
  );
}
