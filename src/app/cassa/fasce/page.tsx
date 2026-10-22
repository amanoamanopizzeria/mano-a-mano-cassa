"use client";

// Lo scadenzario: il giorno come scaletta di quarti d'ora. In ogni fascia gli ordini che cadono lì
// (sull'ora richiesta dal cliente, o di creazione), con le barre dei posti: pizze sulla capacità
// dei pizzaioli, consegne sui rider. Si aggiorna da solo quando entra o cambia un ordine.
// I posti vengono da capacita_giorno (la stessa regola di /cassa/capacita e dell'accettazione).
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

function oggi(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
}
function oraRoma(iso: string) {
  return new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
}

function Fasce() {
  const [giorno, setGiorno] = useState(oggi());
  const [fasce, setFasce] = useState<CapacitaFascia[]>([]);
  const [ordini, setOrdini] = useState<OrdineFascia[]>([]);
  const [soloPiene, setSoloPiene] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const carica = useCallback(async () => {
    const supabase = supabaseBrowser();
    const { data: prof } = await supabase.from("profilo").select("id_negozio").single();
    const negozio = prof?.id_negozio as string | undefined;
    if (!negozio) { setErrore("Nessun negozio collegato al tuo profilo."); return; }
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
      .subscribe();
    return () => { supabase.removeChannel(canale); };
  }, [carica, giorno]);

  const perFascia = useMemo(() => {
    const m = new Map<string, OrdineFascia[]>();
    for (const o of ordini) { const k = o.fascia.slice(0, 5); m.set(k, [...(m.get(k) ?? []), o]); }
    return m;
  }, [ordini]);

  const totali = useMemo(() => ({
    ordini: ordini.filter((o) => o.stato !== "annullato").length,
    pizze: ordini.filter((o) => o.stato !== "annullato").reduce((s, o) => s + o.pizze, 0),
    consegne: ordini.filter((o) => o.stato !== "annullato" && o.tipo === "domicilio").length,
    euro: ordini.filter((o) => o.stato !== "annullato").reduce((s, o) => s + Number(o.totale), 0),
  }), [ordini]);

  const adesso = new Date().toLocaleTimeString("sv-SE", { timeZone: "Europe/Rome" }).slice(0, 5);
  const fuoriOrario = ordini.filter((o) => !fasce.some((f) => f.ora.slice(0, 5) === o.fascia.slice(0, 5)));

  return (
    <main style={{ maxWidth: 1000 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Scadenzario — quarti d&apos;ora</h1>
        <input type="date" value={giorno} onChange={(e) => setGiorno(e.target.value)} />
        <label className="muto"><input type="checkbox" checked={soloPiene} onChange={(e) => setSoloPiene(e.target.checked)} /> solo fasce con ordini</label>
        <Link href="/cassa/capacita" className="muto">Imposta pizzaioli e rider →</Link>
      </div>
      {errore && <p style={{ color: "var(--accento)" }}>{errore}</p>}

      <div className="carta" style={{ margin: "12px 0", display: "flex", gap: 24, flexWrap: "wrap" }}>
        <Numero t="Ordini" v={String(totali.ordini)} />
        <Numero t="Pizze" v={String(totali.pizze)} />
        <Numero t="Consegne" v={String(totali.consegne)} />
        <Numero t="Incasso" v={totali.euro.toFixed(2).replace(".", ",") + " €"} />
        <span className="muto" style={{ alignSelf: "end" }}>
          per fascia: fino a {fasce[0]?.pizze_max ?? 0} pizze e {fasce[0]?.consegne_max ?? 0} consegne
        </span>
      </div>

      {fasce.map((f) => {
        const ora = f.ora.slice(0, 5);
        const lista = perFascia.get(ora) ?? [];
        if (soloPiene && lista.length === 0) return null;
        const pienoP = f.pizze_max > 0 && f.pizze_occupate >= f.pizze_max;
        const pienoC = f.consegne_max > 0 && f.consegne_occupate >= f.consegne_max;
        const chiusa = f.bloccata_produzione || f.bloccata_consegne;
        const passata = giorno === oggi() && ora < adesso;
        const corrente = giorno === oggi() && ora <= adesso && adesso < aggiungi15(ora);
        return (
          <div key={ora} style={{ display: "grid", gridTemplateColumns: "72px 1fr", gap: 10, padding: "6px 0", borderTop: "1px solid var(--bordo)", opacity: passata && lista.length === 0 ? .45 : 1 }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: corrente ? "var(--accento)" : "inherit" }}>{ora}</div>
            <div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: lista.length ? 6 : 0 }}>
                <Barra t="Pizze" n={f.pizze_occupate} max={f.pizze_max} pieno={pienoP || f.bloccata_produzione} />
                <Barra t="Consegne" n={f.consegne_occupate} max={f.consegne_max} pieno={pienoC || f.bloccata_consegne} />
                {(pienoP || pienoC || chiusa) && <span className="badge annullato">{chiusa ? "BLOCCATA" : "SOLD OUT"}</span>}
              </div>
              {lista.map((o) => (
                <div key={o.id} className="carta" style={{ padding: "6px 10px", marginBottom: 4, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", opacity: o.stato === "annullato" ? .5 : 1 }}>
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
                  <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{Number(o.totale).toFixed(2).replace(".", ",")} €</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {fuoriOrario.length > 0 && (
        <div className="carta" style={{ marginTop: 12 }}>
          <strong>Fuori dalle fasce (prima delle 11 o dopo le 23:45)</strong>
          {fuoriOrario.map((o) => <div key={o.id} className="muto">#{o.numero} · {oraRoma(o.creato_il)} · {TIPO[o.tipo]} · {Number(o.totale).toFixed(2)} €</div>)}
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

function Numero({ t, v }: { t: string; v: string }) {
  return <div><div className="muto">{t}</div><div style={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{v}</div></div>;
}

function Barra({ t, n, max, pieno }: { t: string; n: number; max: number; pieno: boolean }) {
  const q = max > 0 ? Math.min(1, n / max) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 190 }}>
      <span className="muto" style={{ width: 62 }}>{t}</span>
      <div style={{ flex: 1, height: 10, borderRadius: 999, background: "#e8e4dc", overflow: "hidden" }}>
        <div style={{ width: `${q * 100}%`, height: "100%", background: pieno ? "var(--accento)" : q > .7 ? "var(--attesa)" : "var(--ok)" }} />
      </div>
      <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 13, width: 44 }}>{n}/{max}</span>
    </div>
  );
}
