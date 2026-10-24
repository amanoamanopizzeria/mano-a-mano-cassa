"use client";

// Sala: 20 tavoli dentro e 15 fuori. Si apre un tavolo con i coperti, si chiude quando paga.
// Il colore cambia dopo 60 minuti dall'apertura (alert per proporre il dessert o un altro giro).
import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";
import type { Variazione } from "@/lib/types";

// Il conto: le righe di tutti gli ordini aperti del tavolo, con le varianti, e il totale.
interface RigaConto { id: string; descrizione: string; quantita: number; prezzo_unit: number; variazioni: Variazione[] | null; id_riga_padre: string | null }
interface OrdineConto { id: string; numero_visibile: string | null; numero: number; totale: number; stato: string; sconto: number | null; ordine_riga: RigaConto[] }
const euro = (n: number) => n.toFixed(2).replace(".", ",") + " €";
const prezzoRiga = (r: RigaConto) => (Number(r.prezzo_unit) + (r.variazioni ?? []).reduce((a, v) => a + Number(v.prezzo ?? 0), 0)) * Number(r.quantita);

interface Tavolo {
  id: string;
  numero: string;
  zona: "dentro" | "fuori";
  posti: number;
  stato: "libero" | "occupato" | "conto";
  aperto_il: string | null;
  coperti: number;
}

const ALERT_MINUTI = 60;

export default function TavoliPagina() {
  return (
    <AuthGate>
      <Tavoli />
    </AuthGate>
  );
}

function minutiDa(iso: string | null): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

function Tavoli() {
  const [tavoli, setTavoli] = useState<Tavolo[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const [, setOra] = useState(0);
  const [conto, setConto] = useState<{ tavolo: Tavolo; ordini: OrdineConto[] } | null>(null);
  const [chiudo, setChiudo] = useState(false);

  const carica = useCallback(async () => {
    const { data, error } = await supabaseBrowser()
      .from("tavolo").select("*").eq("attivo", true).order("numero");   // 10 dentro e 5 fuori (mig. 0031)
    if (error) setErrore(error.message);
    else setTavoli((data ?? []) as Tavolo[]);
  }, []);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) { setErrore("Supabase non configurato."); return; }
    carica();
    const supabase = supabaseBrowser();
    const canale = supabase
      .channel("sala")
      .on("postgres_changes", { event: "*", schema: "public", table: "tavolo" }, () => carica())
      .subscribe();
    const timer = setInterval(() => setOra((n) => n + 1), 30000); // ricalcola i minuti
    return () => { clearInterval(timer); supabase.removeChannel(canale); };
  }, [carica]);

  async function apri(t: Tavolo) {
    const coperti = Number(window.prompt(`Coperti al tavolo ${t.numero}?`, "2"));
    if (!coperti || coperti < 1) return;
    const { error } = await supabaseBrowser().from("tavolo").update({
      stato: "occupato", aperto_il: new Date().toISOString(), coperti,
    }).eq("id", t.id);
    if (error) setErrore(error.message);
  }

  async function chiudi(t: Tavolo) {
    const { error } = await supabaseBrowser().from("tavolo").update({
      stato: "libero", aperto_il: null, coperti: 0,
    }).eq("id", t.id);
    if (error) setErrore(error.message);
  }

  // «Conto»: si segna il tavolo «al conto» e si apre il conto vero (critico giro 10: «Conto senza conto»).
  async function passaAlConto(t: Tavolo) {
    if (t.stato === "occupato") await supabaseBrowser().from("tavolo").update({ stato: "conto" }).eq("id", t.id);
    const { data, error } = await supabaseBrowser().from("ordine")
      .select("id, numero_visibile, numero, totale, stato, sconto, ordine_riga(id, descrizione, quantita, prezzo_unit, variazioni, id_riga_padre)")
      .eq("id_tavolo", t.id).not("stato", "in", "(annullato,ritirato,consegnato)").order("creato_il");
    if (error) { setErrore(error.message); return; }
    setConto({ tavolo: t, ordini: (data ?? []) as unknown as OrdineConto[] });
  }

  // Si incassa (contanti o POS): gli ordini si chiudono e il tavolo si libera, in una transazione (mig. 0041).
  async function incassa(pagamento: "contanti" | "pos") {
    if (!conto) return;
    setChiudo(true);
    const { data, error } = await supabaseBrowser().rpc("tavolo_conto_chiudi", { p_id_tavolo: conto.tavolo.id, p_pagamento: pagamento });
    setChiudo(false);
    if (error) { setErrore(error.message); return; }
    const r = data as { esito: string };
    if (r.esito !== "chiuso") { setErrore("Conto non chiuso (" + r.esito + ")."); return; }
    setConto(null);
  }

  const sezioni: { titolo: string; zona: "dentro" | "fuori" }[] = [
    { titolo: "Dentro", zona: "dentro" },
    { titolo: "Fuori", zona: "fuori" },
  ];

  return (
    <main className="sala">
      <h1>Sala</h1>
      {errore && <p style={{ color: "var(--accento)" }}>{errore}</p>}
      {sezioni.map((s) => (
        <section key={s.zona} style={{ marginTop: 14 }}>
          <h2>{s.titolo}</h2>
          <div className="griglia sala-griglia">
            {tavoli.filter((t) => t.zona === s.zona).sort((a, b) => a.numero.localeCompare(b.numero, "it", { numeric: true })).map((t) => {
              const min = minutiDa(t.aperto_il);
              const allarme = t.stato !== "libero" && min >= ALERT_MINUTI;
              return (
                <div
                  key={t.id}
                  className={"carta tavolo " + t.stato + (allarme ? " allarme" : "")}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}>
                    <strong className="num">{t.numero}</strong>
                    <span className={`badge stato-${t.stato}`}>{t.stato === "occupato" ? "occ." : t.stato}</span>
                  </div>
                  {t.stato !== "libero" && (
                    <div className="muto riga-min">
                      {t.coperti} cop. · <b style={allarme ? { color: "var(--vino)" } : undefined}>{min} min</b>{allarme ? " · da troppo" : ""}
                    </div>
                  )}
                  <div className="azioni" style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                    {t.stato === "libero" && <button className="primario" onClick={() => apri(t)}>Apri</button>}
                    {t.stato !== "libero" && <button className={t.stato === "conto" ? "primario" : ""} onClick={() => passaAlConto(t)}>Conto</button>}
                    {t.stato !== "libero" && <button onClick={() => chiudi(t)}>Libera</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {conto && (() => {
        const righe = conto.ordini.flatMap((o) => o.ordine_riga);
        const padri = righe.filter((r) => !r.id_riga_padre);
        const totale = conto.ordini.reduce((a, o) => a + Number(o.totale), 0);
        return (
          <div className="conto-velo" onClick={() => setConto(null)}>
            <section className="carta conto" onClick={(e) => e.stopPropagation()}>
              <header>
                <strong className="num">Tavolo {conto.tavolo.numero}</strong>
                <span className="muto">{conto.tavolo.coperti} coperti · {minutiDa(conto.tavolo.aperto_il)} min</span>
                <button className="chiudi-conto" onClick={() => setConto(null)}>✕</button>
              </header>
              {padri.length === 0 ? (
                <p className="muto">Nessun ordine aperto su questo tavolo.</p>
              ) : (
                <ul className="righe">
                  {conto.ordini.map((o) => [
                    <li key={o.id + "-num"} className="ordine-num" aria-label="Ordine"><span className="q" /><span className="d">Ordine <b>{o.numero_visibile ?? `#${o.numero}`}</b>{conto.ordini.length > 1 && <small>{euro(Number(o.totale))}</small>}</span><span className="p" /></li>,
                    ...o.ordine_riga.filter((r) => !r.id_riga_padre).map((r) => (
                    <li key={r.id}>
                      <span className="q">{Number(r.quantita)}×</span>
                      <span className="d">
                        {r.descrizione}
                        {(r.variazioni ?? []).length > 0 && <small> {(r.variazioni ?? []).map((v) => (v.tipo === "rimozione" ? "senza " : "+ ") + v.nome).join(", ")}</small>}
                        {righe.filter((f) => f.id_riga_padre === r.id).map((f) => <small key={f.id} className="figlia">· {f.descrizione}</small>)}
                      </span>
                      <span className="p">{euro(prezzoRiga(r))}</span>
                    </li>
                    )),
                  ])}
                </ul>
              )}
              {conto.ordini.some((o) => Number(o.sconto) > 0) && <div className="muto" style={{ textAlign: "right" }}>sconti −{euro(conto.ordini.reduce((a, o) => a + Number(o.sconto ?? 0), 0))}</div>}
              <div className="totale"><span>Totale</span><strong>{euro(totale)}</strong></div>
              <div className="azioni-conto">
                <button onClick={() => window.print()}>Stampa</button>
                <button className="primario" disabled={chiudo || padri.length === 0} onClick={() => incassa("contanti")}>Contanti</button>
                <button className="primario" disabled={chiudo || padri.length === 0} onClick={() => incassa("pos")}>POS</button>
              </div>
            </section>
          </div>
        );
      })()}
    </main>
  );
}
