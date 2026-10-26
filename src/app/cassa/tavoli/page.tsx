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
  const [conto, setConto] = useState<{ tavolo: Tavolo; ordini: OrdineConto[]; prezzoCoperto: number } | null>(null);
  const [chiudo, setChiudo] = useState(false);
  // Il tastierino dei coperti sulla pagina (critico giro 29: la finestrella del browser bloccava la pagina).
  // «apri» un tavolo libero, «correggi» uno già occupato (anche aperto da /cassa/nuovo, che non li chiede).
  const [coperti, setCoperti] = useState<{ tavolo: Tavolo; scopo: "apri" | "correggi" } | null>(null);

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

  // I coperti si scrivono con tavolo_coperti (mig. 0068): apre il tavolo se è libero, li corregge se è occupato.
  async function scegliCoperti(n: number) {
    if (!coperti) return;
    const t = coperti.tavolo;
    setCoperti(null);
    const { data, error } = await supabaseBrowser().rpc("tavolo_coperti", { p_id_tavolo: t.id, p_coperti: n });
    if (error) { setErrore(error.message); return; }
    if ((data as { esito: string }).esito !== "ok") { setErrore("Coperti non validi."); return; }
    setErrore(null);
    setConto((c) => (c && c.tavolo.id === t.id ? { ...c, tavolo: { ...c.tavolo, coperti: n } } : c));
    carica();
  }

  // «Libera» non lascia ordini aperti al gruppo dopo (critico giro 29): se ce ne sono, prima si incassano o si annullano.
  async function chiudi(t: Tavolo) {
    const { data, error } = await supabaseBrowser().rpc("tavolo_libera", { p_id_tavolo: t.id });
    if (error) { setErrore(error.message); return; }
    const r = data as { esito: string; ordini?: number };
    if (r.esito === "ordini_aperti") setErrore(`Il tavolo ${t.numero} ha ${r.ordini} ${r.ordini === 1 ? "ordine aperto" : "ordini aperti"}: incassa il conto o annulla prima di liberarlo.`);
    else { setErrore(null); carica(); }
  }

  // «Conto»: si segna il tavolo «al conto» e si apre il conto vero (critico giro 10: «Conto senza conto»).
  async function passaAlConto(t: Tavolo) {
    if (t.stato === "occupato") await supabaseBrowser().from("tavolo").update({ stato: "conto" }).eq("id", t.id);
    const { data, error } = await supabaseBrowser().from("ordine")
      .select("id, numero_visibile, numero, totale, stato, sconto, ordine_riga(id, descrizione, quantita, prezzo_unit, variazioni, id_riga_padre)")
      .eq("id_tavolo", t.id).not("stato", "in", "(annullato,ritirato,consegnato)").order("creato_il");
    if (error) { setErrore(error.message); return; }
    // Il coperto (1,50 € a persona, Edoardo 25/10) lo aggiunge il database al conto (mig. 0065): qui si mostra prima.
    const { data: neg } = await supabaseBrowser().from("negozio").select("prezzo_coperto").limit(1).maybeSingle();
    setConto({ tavolo: t, ordini: (data ?? []) as unknown as OrdineConto[], prezzoCoperto: Number(neg?.prezzo_coperto ?? 1.5) });
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
      {errore && <p className="s-errore">{errore}</p>}
      {sezioni.map((s) => (
        <section key={s.zona} className="s-zona">
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
                  <div className="s-intesta">
                    <strong className="num">{t.numero}</strong>
                    <span className={`badge stato-${t.stato}`}>{t.stato === "occupato" ? "occ." : t.stato}</span>
                  </div>
                  {t.stato !== "libero" && (
                    <div className="muto riga-min">
                      <button className="link-coperti" onClick={() => setCoperti({ tavolo: t, scopo: "correggi" })} aria-label="Correggi i coperti">{t.coperti} cop.</button> · <b className={allarme ? "da-troppo" : undefined}>{min} min</b>{allarme ? " · da troppo" : ""}
                    </div>
                  )}
                  <div className="azioni">
                    {t.stato === "libero" && <button className="primario" onClick={() => setCoperti({ tavolo: t, scopo: "apri" })}>Apri</button>}
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
        const giaCoperto = righe.some((r) => r.descrizione === "Coperto");
        const coperto = padri.length > 0 && !giaCoperto ? conto.tavolo.coperti * conto.prezzoCoperto : 0;
        const totale = conto.ordini.reduce((a, o) => a + Number(o.totale), 0) + coperto;
        return (
          <div className="conto-velo" onClick={() => setConto(null)}>
            <section className="carta conto" onClick={(e) => e.stopPropagation()}>
              <header>
                <strong className="num">Tavolo {conto.tavolo.numero}</strong>
                <span className="muto">{conto.tavolo.coperti} {conto.tavolo.coperti === 1 ? "coperto" : "coperti"} · {minutiDa(conto.tavolo.aperto_il)} min</span>
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
                  {coperto > 0 && (
                    <li key="coperto" className="coperto">
                      <span className="q">{conto.tavolo.coperti}×</span>
                      <span className="d">Coperto <small>{euro(conto.prezzoCoperto)} a persona</small></span>
                      <span className="p">{euro(coperto)}</span>
                    </li>
                  )}
                </ul>
              )}
              {conto.ordini.some((o) => Number(o.sconto) > 0) && <div className="muto sconti">sconti −{euro(conto.ordini.reduce((a, o) => a + Number(o.sconto ?? 0), 0))}</div>}
              {padri.length > 0 && conto.tavolo.coperti === 0 && !giaCoperto && (
                <button className="mancano-coperti" onClick={() => setCoperti({ tavolo: conto.tavolo, scopo: "correggi" })}>Quanti coperti? Il coperto entra nel conto</button>
              )}
              <div className="totale"><span>Totale</span><strong>{euro(totale)}</strong></div>
              <div className="azioni-conto">
                <button onClick={() => window.print()}>Stampa</button>
                <button className="primario" disabled={chiudo || padri.length === 0 || (conto.tavolo.coperti === 0 && !giaCoperto)} onClick={() => incassa("contanti")}>Contanti</button>
                <button className="primario" disabled={chiudo || padri.length === 0 || (conto.tavolo.coperti === 0 && !giaCoperto)} onClick={() => incassa("pos")}>POS</button>
              </div>
            </section>
          </div>
        );
      })()}
      {coperti && (
        <div className="conto-velo coperti-velo" onClick={() => setCoperti(null)}>
          <section className="carta tastierino-coperti" role="dialog" aria-label="Coperti" onClick={(e) => e.stopPropagation()}>
            <header>
              <strong>Tavolo {coperti.tavolo.numero}: quanti coperti?</strong>
              <button className="chiudi-conto" onClick={() => setCoperti(null)}>✕</button>
            </header>
            <div className="numeri">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <button key={n} className={n === coperti.tavolo.coperti ? "primario" : ""} onClick={() => scegliCoperti(n)}>{n}</button>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
