"use client";

// Cassa: gli ordini compaiono e cambiano da soli (Supabase Realtime), senza
// ricaricare la pagina. Primo mattone della PWA cassa.
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";
import { TRANSIZIONI_ORDINE, type Ordine, type StatoOrdine } from "@/lib/types";

// La comanda si stampa da sola a ogni ordine nuovo, se la cassa lo vuole (resta nel browser della
// cassa): si apre la pagina /cassa/comanda/<id>?stampa=1 in un riquadro nascosto e quella chiama
// window.print(). Col Chrome della cassa avviato con --kiosk-printing esce senza chiedere.
const STAMPA_LS = "cassa:stampa-automatica";
type OrdineCassa = Ordine & {
  nome_cliente?: string | null; pagamento?: "contanti" | "pos" | null;
  cliente?: { nome: string | null; telefono: string | null; note: string | null } | null;
  indirizzo?: { via: string; civico: string | null } | null;
};
const euro = (n: number) => Number(n).toFixed(2).replace(".", ",") + " €";
const oraDi = (s: string) => new Date(s).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
/** «per le 20:30» se è oggi, «domani alle 20:30» o «sab 25 alle 20:30» se no (critico giro 4: la cucina faceva oggi il preordine di domani). */
function quando(iso: string) {
  const d = new Date(iso), oggi = new Date();
  const g = (x: Date) => x.toLocaleDateString("it-IT", { timeZone: "Europe/Rome" });
  if (g(d) === g(oggi)) return `per le ${oraDi(iso)}`;
  const domani = new Date(oggi); domani.setDate(domani.getDate() + 1);
  if (g(d) === g(domani)) return `DOMANI alle ${oraDi(iso)}`;
  return `${d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", timeZone: "Europe/Rome" })} alle ${oraDi(iso)}`;
}

const ETICHETTE: Record<StatoOrdine, string> = {
  ricevuto: "Ricevuto",
  in_preparazione: "In preparazione",
  pronto: "Pronto",
  in_consegna: "In consegna",
  consegnato: "Consegnato",
  ritirato: "Ritirato",
  annullato: "Annullato",
};

export default function CassaPagina() {
  return (
    <AuthGate>
      <Cassa />
    </AuthGate>
  );
}

function Cassa() {
  const [ordini, setOrdini] = useState<OrdineCassa[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const [stampaAuto, setStampaAuto] = useState(false);
  const [inStampa, setInStampa] = useState<string[]>([]);

  useEffect(() => { try { setStampaAuto(localStorage.getItem(STAMPA_LS) === "1"); } catch {} }, []);
  function cambiaStampaAuto(v: boolean) { setStampaAuto(v); try { localStorage.setItem(STAMPA_LS, v ? "1" : "0"); } catch {} }
  function completa(id: string) {
    supabaseBrowser().from("ordine").select("*, cliente(nome, telefono, note), indirizzo(via, civico)").eq("id", id).maybeSingle()
      .then(({ data }) => { if (data) setOrdini((prev) => prev.map((o) => (o.id === id ? (data as OrdineCassa) : o))); });
  }
  function stampa(id: string) { setInStampa((p) => (p.includes(id) ? p : [...p, id])); setTimeout(() => setInStampa((p) => p.filter((x) => x !== id)), 15_000); }

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setErrore("Supabase non configurato (vedi .env.example).");
      return;
    }
    const supabase = supabaseBrowser();

    supabase
      .from("ordine")
      .select("*, cliente(nome, telefono, note), indirizzo(via, civico)")
      .order("creato_il", { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (error) setErrore(error.message);
        else setOrdini((data ?? []) as Ordine[]);
      });

    // tempo reale: inserimenti e aggiornamenti arrivano qui
    const canale = supabase
      .channel("cassa-ordini")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ordine" },
        (payload) => {
          setOrdini((prev) => {
            if (payload.eventType === "INSERT") {
              const n = payload.new as OrdineCassa;
              try { if (localStorage.getItem(STAMPA_LS) === "1") stampa(n.id); } catch {}
              completa(n.id);   // il realtime non porta cliente e indirizzo: si rileggono
              return [n, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              const n = payload.new as OrdineCassa;
              return prev.map((o) => (o.id === n.id ? { ...o, ...n } : o));
            }
            if (payload.eventType === "DELETE") {
              const v = payload.old as Partial<Ordine>;
              return prev.filter((o) => o.id !== v.id);
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canale);
    };
  }, []);

  async function cambiaStato(id: string, stato: StatoOrdine) {
    const r = await fetch(`/api/ordini/${id}/stato`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stato }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErrore(j.errore ?? "Errore nel cambio stato");
    }
  }

  return (
    <main>
      <h1>Cassa — ordini</h1>
      <label className="muto" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <input type="checkbox" checked={stampaAuto} onChange={(e) => cambiaStampaAuto(e.target.checked)} />
        Stampa da sola la comanda di ogni ordine nuovo
      </label>
      {inStampa.map((id) => <iframe key={id} src={`/cassa/comanda/${id}?stampa=1`} title="comanda" style={{ position: "absolute", width: 0, height: 0, border: 0 }} />)}
      {errore && <p style={{ color: "var(--accento)" }}>{errore}</p>}
      {ordini.length === 0 && !errore && (
        <p className="muto">Nessun ordine. Quando arriva, compare qui da solo.</p>
      )}
      <div className="griglia">
        {ordini.map((o) => (
          <article className="carta" key={o.id}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong style={{ fontSize: 20, fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>{o.numero_visibile ?? `#${o.numero}`}</strong>
              <span className={`badge ${o.stato}`}>{ETICHETTE[o.stato]}</span>
            </div>
            <div className="muto">
              {o.tipo} · {o.canale} ·{" "}
              {new Date(o.creato_il).toLocaleTimeString("it-IT", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {o.ora_consegna && <> · <b style={quando(o.ora_consegna).startsWith("per") ? undefined : { color: "var(--vino)" }}>{quando(o.ora_consegna)}</b></>}
            </div>
            {(o.cliente?.nome || o.nome_cliente || o.cliente?.telefono || o.pagamento) && (
              <div style={{ marginTop: 6, fontWeight: 600 }}>
                {o.cliente?.nome ?? o.nome_cliente}{o.cliente?.telefono && <span className="muto" style={{ fontWeight: 400 }}> · {o.cliente.telefono}</span>}{o.pagamento && ` · ${o.pagamento === "pos" ? "POS" : "contanti"}`}
              </div>
            )}
            {o.indirizzo && <div>{o.indirizzo.via} {o.indirizzo.civico ?? ""}</div>}
            {o.cliente?.note && <div style={{ fontSize: 13, padding: "3px 8px", borderRadius: 8, background: "var(--oro-velo)", borderLeft: "3px solid var(--oro)" }}>⚠ {o.cliente.note}</div>}
            <div style={{ margin: "8px 0", fontSize: 20, fontWeight: 800, color: "var(--vino)" }}>
              {euro(o.totale)}
            </div>
            {o.note && <div className="muto">Note: {o.note}</div>}
            <div className="muto">
              {o.stampato_il
                ? <>stampata {new Date(o.stampato_il).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}{(o.stampe ?? 0) > 1 && ` (×${o.stampe})`}</>
                : o.stato === "ricevuto" || o.stato === "in_preparazione"
                  ? <span style={{ fontWeight: 700 }}>non stampata</span>
                  : <span>non stampata</span>}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              <a href={`/cassa/comanda/${o.id}`} target="_blank" rel="noreferrer"><button>Comanda</button></a>
              <button onClick={() => stampa(o.id)} disabled={inStampa.includes(o.id)}>{inStampa.includes(o.id) ? "Stampo…" : "Stampa"}</button>
              {TRANSIZIONI_ORDINE[o.stato].map((s) => (
                <button
                  key={s}
                  className={s === "annullato" ? "" : "primario"}
                  onClick={() => cambiaStato(o.id, s)}
                >
                  {ETICHETTE[s]}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
