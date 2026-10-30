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

// Dal 30/10/2026 è anche la Home (/): Edoardo, «la schermata corretta è quella che raggiungi da tutti gli ordini»
// (toccando un quarto d'ora). La stessa pagina, con in più il tasto «Nuovo ordine» in testa.
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
    <main className="fasce-pagina">
      {ultimo && (
        <div role="status" className="f-salvato">
          <span className="testo"><b className="ora">{ultimo.ora.slice(0, 5)}</b> {ultimo.tipo === "produzione" ? "pizze" : "consegne"} {ultimo.prima} → <b>{ultimo.dopo}</b> <span className="ok">✓ salvato</span></span>
          <button onClick={annullaUltimo}>Annulla</button>
        </div>
      )}
      <div className="f-testa">
        <Link href="/cassa/nuovo" className="f-nuovo">+ Nuovo ordine</Link>
        <h1>Planner — fasce</h1>
        <input type="date" value={giorno} onChange={(e) => setGiorno(e.target.value)} className="f-giorno" />
        <Link href="/cassa/capacita" className="f-turno">
          {turno ? <><b>{turno.pizzaioli}</b> pizzaioli · <b>{turno.rider}</b> rider</> : "Imposta pizzaioli e rider"} →
        </Link>
        <span className="f-totale">
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
      {errore && <p className="f-errore">{errore}</p>}

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

      <div className="carta f-carta">
        <table className="f-tabella">
          <thead>
            <tr>
              <th className="f-col-ora">Ora</th>
              <th>Pizze</th>
              <th>Consegne</th>
              <th className="f-col-ord">Ordini</th>
            </tr>
          </thead>
          <tbody>
            {fasce.map((f) => {
              const ora = f.ora.slice(0, 5);
              const lista = perFascia.get(ora) ?? [];
              const corrente = eOggi && ora <= adesso && adesso < aggiungi15(ora);
              const passata = eOggi && ora < adesso && !corrente;
              return [
                <tr key={ora} className={"f-riga" + (corrente ? " corrente" : "") + (passata ? " passata" : "") + (aperta === ora ? " aperta" : "")}>
                  <td className="f-col-ora">
                    {corrente && <span className="f-punto" />}{ora}
                  </td>
                  <td className="f-cella"><span className="f-cella-in">
                    <button className="f-passo" onClick={() => passo(f, "produzione", -1)} aria-label={`Una pizza in meno alle ${ora}`}>−</button>
                    <Pillola n={f.pizze_occupate} max={f.pizze_max} bloccata={f.bloccata_produzione}
                      onClick={() => setModifica({ ora: f.ora, tipo: "produzione", massimo: f.pizze_max, reali: f.pizze_occupate })} />
                    <button className="f-passo" onClick={() => passo(f, "produzione", 1)} aria-label={`Una pizza in più alle ${ora}`}>+</button>
                  </span></td>
                  <td className="f-cella"><span className="f-cella-in">
                    <button className="f-passo" onClick={() => passo(f, "consegne", -1)} aria-label={`Una consegna in meno alle ${ora}`}>−</button>
                    <Pillola n={f.consegne_occupate} max={f.consegne_max} bloccata={f.bloccata_consegne}
                      onClick={() => setModifica({ ora: f.ora, tipo: "consegne", massimo: f.consegne_max, reali: f.consegne_occupate })} />
                    <button className="f-passo" onClick={() => passo(f, "consegne", 1)} aria-label={`Una consegna in più alle ${ora}`}>+</button>
                  </span></td>
                  <td className="f-col-ord">
                    <button onClick={() => setAperta(aperta === ora ? null : ora)} title={lista.length === 1 ? "1 ordine in questa fascia: tocca per vederlo" : `${lista.length} ordini in questa fascia: tocca per vederli`}
                      className={"f-lente" + (lista.length ? " con" : "")}>
                      🔍{lista.length > 0 && <> {lista.length}<span className="sr">{lista.length === 1 ? " ordine" : " ordini"}</span></>}
                    </button>
                  </td>
                </tr>,
                aperta === ora && (
                  <tr key={ora + "-ordini"} className="f-ordini">
                    <td colSpan={4}>
                      {lista.length === 0 && <span className="muto">Nessun ordine in questa fascia.</span>}
                      {lista.map((o) => (
                        <div key={o.id} className={"f-ordine" + (o.stato === "annullato" ? " annullato" : "")}>
                          <b>#{o.numero}</b>
                          <span className={"badge " + o.stato}>{STATO[o.stato] ?? o.stato}</span>
                          <span>{TIPO[o.tipo] ?? o.tipo}{o.ora_consegna ? " · " + oraRoma(o.ora_consegna) : ""}</span>
                          <span className="chi">
                            {o.cliente ?? (o.telefono ? "" : <span className="muto">senza cliente</span>)}
                            {o.telefono && <span className="muto"> {o.telefono}</span>}
                            {o.indirizzo && <span className="muto"> · {o.indirizzo}</span>}
                            {o.note && <span className="muto"> · {o.note}</span>}
                          </span>
                          <span className="muto">{o.pizze} {o.pizze === 1 ? "pizza" : "pizze"}</span>
                          <b className="tot">{Number(o.totale).toFixed(2).replace(".", ",")} €</b>
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
        <div onClick={() => setModifica(null)} className="f-velo">
          <div className="carta f-modifica" onClick={(e) => e.stopPropagation()}>
            <div className="testa">
              <span>{modifica.tipo === "produzione" ? "pizze" : "rider"}</span>
              <span>{modifica.ora.slice(0, 5)}</span>
            </div>
            <div className="conta">
              <button onClick={() => setModifica({ ...modifica, massimo: Math.max(0, modifica.massimo - 1) })} className="passo">−</button>
              <div className="cifra">
                {modifica.reali}<span> / {modifica.massimo}</span>
              </div>
              <button onClick={() => setModifica({ ...modifica, massimo: modifica.massimo + 1 })} className="passo">+</button>
            </div>
            <div className="massimo">
              {modifica.reali} reali · massimo <input type="number" min={0} value={modifica.massimo}
                onChange={(e) => setModifica({ ...modifica, massimo: Math.max(0, Number(e.target.value) || 0) })} />
            </div>
            <div className="azioni">
              <button onClick={() => salvaMassimo(modifica, true)} className="muto regola">Torna alla regola</button>
              <span className="spazio" />
              <button onClick={() => setModifica(null)} className="annulla">Annulla</button>
              <button onClick={() => salvaMassimo(modifica)} className="primario ok">OK</button>
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
  return (
    <button onClick={onClick} className={"f-pillola" + (piena ? " piena" : quasi ? " quasi" : "") + (vuota ? " vuota" : "")}>
      {bloccata ? "✕ " : ""}{n}/{max}
    </button>
  );
}
