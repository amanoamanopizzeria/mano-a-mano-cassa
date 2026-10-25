"use client";

// Cassa: gli ordini compaiono e cambiano da soli (Supabase Realtime), senza
// ricaricare la pagina. Primo mattone della PWA cassa.
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";
import { TRANSIZIONI_ORDINE, type Ordine, type StatoOrdine } from "@/lib/types";

// La comanda si stampa da sola a ogni ordine nuovo, se la cassa lo vuole (resta nel browser della
// cassa): si apre la pagina /cassa/comanda/<id>?stampa=1 in un riquadro nascosto e quella chiama
// window.print(). Col Chrome della cassa avviato con --kiosk-printing esce senza chiedere.
const STAMPA_LS = "cassa:stampa-automatica";
// Area preordini (REA cap. 10, lavoro 3; Velocissimo: flag «preordine» sullo stato, video 8:48):
// un ordine per fra più di un'ora è un preordine: sta nella sua area e NON si stampa da solo
// finché non manca mezz'ora (ATTESA) all'ora di consegna; poi passa fra quelli in corso e si stampa.
const PREORDINE_MIN = 60;
const ATTESA_MIN = 30;
const ePreordine = (o: { ora_consegna?: string | null }, adesso: number) =>
  !!o.ora_consegna && new Date(o.ora_consegna).getTime() - adesso > PREORDINE_MIN * 60_000;
/** Quando va stampato un preordine: all'ora di consegna meno l'attesa. */
const stampaAlle = (o: { ora_consegna?: string | null }) => (o.ora_consegna ? new Date(new Date(o.ora_consegna).getTime() - ATTESA_MIN * 60_000) : null);
/** «fra 12 min» / «in ritardo di 5 min» sugli ordini in corso (Velocissimo: minuti mancanti e colore del ritardo). */
function contoAllaRovescia(o: { ora_consegna?: string | null; creato_il: string; tipo?: string }, adesso: number): { testo: string; ritardo: boolean } | null {
  const scadenza = o.ora_consegna ? new Date(o.ora_consegna).getTime() : new Date(o.creato_il).getTime() + ATTESA_MIN * 60_000;
  const min = Math.round((scadenza - adesso) / 60_000);
  if (min > 180) return null;
  // Banco e tavolo «subito» non hanno un'ora promessa: si dice da quanto aspettano, senza il rosso
  // del ritardo (critico giro 12: «in ritardo di 227 min» su un banco battuto a cucina chiusa).
  if (!o.ora_consegna && (o.tipo === "banco" || o.tipo === "tavolo")) {
    const da = Math.round((adesso - new Date(o.creato_il).getTime()) / 60_000);
    return { testo: da < 1 ? "appena battuto" : `da ${da} min`, ritardo: false };
  }
  return min >= 0 ? { testo: `fra ${min} min`, ritardo: false } : { testo: `in ritardo di ${-min} min`, ritardo: true };
}
// la consegna col rider: la carta dice chi ce l'ha (critico giro 23)
const SELECT_ORDINE = "*, cliente(nome, telefono, note), indirizzo(via, civico), zona(nome), tavolo(numero), consegna(stato, rider(nome))";
type OrdineCassa = Ordine & {
  consegna?: { stato: string; rider: { nome: string } | null }[] | null;
  nome_cliente?: string | null; pagamento?: "contanti" | "pos" | null; paga_con?: number | null;
  cliente?: { nome: string | null; telefono: string | null; note: string | null } | null;
  indirizzo?: { via: string; civico: string | null } | null;
  zona?: { nome: string } | null; costo_consegna?: number | null;
  tavolo?: { numero: string } | null; sconto?: number | null; modificato_il?: string | null;
};
/** I passi di stato offerti sulla carta: un domicilio non si «ritira», banco/tavolo/asporto non vanno «in consegna». */
const passiOrdine = (o: OrdineCassa): StatoOrdine[] =>
  TRANSIZIONI_ORDINE[o.stato].filter((s) => (o.tipo === "domicilio" ? s !== "ritirato" : s !== "in_consegna"));
/** La serata parte alle 6 di mattina: quello che c'è prima va sotto «Ieri e prima». */
const inizioSerata = (adesso: number) => { const d = new Date(adesso); if (d.getHours() < 6) d.setDate(d.getDate() - 1); d.setHours(6, 0, 0, 0); return d.getTime(); };
const diStasera = (o: OrdineCassa, adesso: number) => new Date(o.creato_il).getTime() >= inizioSerata(adesso) || (!!o.ora_consegna && new Date(o.ora_consegna).getTime() >= inizioSerata(adesso));
const PREORDINE_ATTIVO = (o: OrdineCassa) => !["annullato", "consegnato", "ritirato"].includes(o.stato);
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
  const [vecchiAperti, setVecchiAperti] = useState(false);

  useEffect(() => { try { setStampaAuto(localStorage.getItem(STAMPA_LS) === "1"); } catch {} }, []);
  function cambiaStampaAuto(v: boolean) { setStampaAuto(v); try { localStorage.setItem(STAMPA_LS, v ? "1" : "0"); } catch {} }
  function completa(id: string) {
    supabaseBrowser().from("ordine").select(SELECT_ORDINE).eq("id", id).maybeSingle()
      .then(({ data }) => { if (data) setOrdini((prev) => prev.map((o) => (o.id === id ? (data as OrdineCassa) : o))); });
  }
  // il link «segui la consegna» anche per chi ordina al telefono: si copia e si manda (critico giro 23)
  const [linkCopiato, setLinkCopiato] = useState<string | null>(null);
  async function copiaLink(id: string) {
    const { data } = await supabaseBrowser().rpc("link_consegna", { p_id_ordine: id });
    if (!data) { setErrore("Questo ordine non ha ancora una consegna."); return; }
    try { await navigator.clipboard.writeText(String(data)); setLinkCopiato(id); setTimeout(() => setLinkCopiato((x) => (x === id ? null : x)), 4000); }
    catch { setErrore("Link per il cliente: " + String(data)); }
  }
  function stampa(id: string) { setInStampa((p) => (p.includes(id) ? p : [...p, id])); setTimeout(() => setInStampa((p) => p.filter((x) => x !== id)), 15_000); }
  const [adesso, setAdesso] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setAdesso(Date.now()), 30_000); return () => clearInterval(t); }, []);
  // i preordini si stampano da soli quando è ora (una volta: stampato_il lo segna ordine_stampato)
  const stampatiDaMe = useRef<Set<string>>(new Set());
  useEffect(() => {
    let auto = false; try { auto = localStorage.getItem(STAMPA_LS) === "1"; } catch {}
    if (!auto) return;
    for (const o of ordini) {
      const quando = stampaAlle(o);
      if (!quando || o.stampato_il || stampatiDaMe.current.has(o.id)) continue;
      if (o.stato === "annullato" || o.stato === "consegnato" || o.stato === "ritirato") continue;
      if (quando.getTime() <= adesso && new Date(o.ora_consegna!).getTime() > adesso - 60 * 60_000) { stampatiDaMe.current.add(o.id); stampa(o.id); }
    }
  }, [adesso, ordini]);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setErrore("Supabase non configurato (vedi .env.example).");
      return;
    }
    const supabase = supabaseBrowser();

    supabase
      .from("ordine")
      .select(SELECT_ORDINE)
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
              // un preordine non si stampa all'arrivo: lo fa l'orologio quando manca l'attesa
              try { if (localStorage.getItem(STAMPA_LS) === "1" && !ePreordine(n, Date.now())) stampa(n.id); } catch {}
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
      // il rider che prende o lascia la consegna: si rilegge l'ordine per il nome sulla carta
      .on("postgres_changes", { event: "*", schema: "public", table: "consegna" }, (payload) => {
        const id = ((payload.new ?? payload.old) as { id_ordine?: string } | null)?.id_ordine;
        if (id) completa(id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canale);
    };
  }, []);

  const [daConfermare, setDaConfermare] = useState<string | null>(null);   // id dell'ordine su cui «Annullato» aspetta il secondo tocco
  async function cambiaStato(id: string, stato: StatoOrdine) {
    if (stato === "annullato" && daConfermare !== id) { setDaConfermare(id); setTimeout(() => setDaConfermare((d) => (d === id ? null : d)), 4000); return; }
    setDaConfermare(null);
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
    <main className="lista-ordini">
      <div className="lo-testa">
        <h1>Cassa — ordini</h1>
        <label className={"lo-auto" + (stampaAuto ? " on" : "")}>
          <input type="checkbox" checked={stampaAuto} onChange={(e) => cambiaStampaAuto(e.target.checked)} />
          <span className="spunta" aria-hidden>{stampaAuto ? "✓" : ""}</span>
          Stampa da sola ogni comanda nuova
        </label>
      </div>
      {inStampa.map((id) => <iframe key={id} src={`/cassa/comanda/${id}?stampa=1`} title="comanda" className="lo-stampa" />)}
      {errore && <p className="lo-errore">{errore}</p>}
      {ordini.length === 0 && !errore && (
        <p className="muto">Nessun ordine. Quando arriva, compare qui da solo.</p>
      )}
      {ordini.some((o) => ePreordine(o, adesso) && PREORDINE_ATTIVO(o)) && (
        <details className="preordini" open>
          <summary>Preordini <small>{ordini.filter((o) => ePreordine(o, adesso) && PREORDINE_ATTIVO(o)).length} · si stampano da soli {ATTESA_MIN} minuti prima</small></summary>
          <div className="griglia">
            {ordini.filter((o) => ePreordine(o, adesso) && PREORDINE_ATTIVO(o)).sort((a, b) => (a.ora_consegna ?? "").localeCompare(b.ora_consegna ?? "")).map((o) => (
              <article className="carta ordine-c preordine" key={o.id}>
                <header>
                  <strong className="num">{o.numero_visibile ?? `#${o.numero}`}</strong>
                  <b className="tempo attesa">{quando(o.ora_consegna!)}</b>
                </header>
                <div className="riga">{o.tipo}{o.tavolo?.numero && <b> {o.tavolo.numero}</b>}{o.modificato_il && <b className="vino"> · modificata {oraDi(o.modificato_il)}</b>} · {o.pagamento ? (o.pagamento === "pos" ? "POS" : "contanti") : "pagamento ?"}{o.zona?.nome && <> · {o.zona.nome}{Number(o.costo_consegna) > 0 ? ` (consegna ${euro(Number(o.costo_consegna))})` : ""}</>}</div>
                <div className="chi">{o.cliente?.nome ?? o.nome_cliente ?? ""}</div>
                {o.indirizzo && <div className="via">{o.indirizzo.via} {o.indirizzo.civico ?? ""}</div>}
            {o.consegna?.[0]?.rider?.nome && <div className="riga">rider <b>{o.consegna[0].rider.nome}</b></div>}
                {o.note && <div className="nota">Note: {o.note}</div>}
                <div className="tot">{euro(o.totale)}</div>
                <div className="riga">stampa alle {oraDi(stampaAlle(o)!.toISOString())}{o.stampato_il ? " · già stampata" : ""}</div>
                <div className="azioni">
                  <a href={`/cassa/comanda/${o.id}`} target="_blank" rel="noreferrer"><button>Comanda</button></a>
                  <button onClick={() => stampa(o.id)}>Stampa ora</button>
                  <a href={`/cassa/nuovo?modifica=${o.id}`}><button>Modifica</button></a>
                  {/* critico giro 15: un preordine ritirato in anticipo non si poteva chiudere: gli stessi passi delle carte sotto */}
                  {passiOrdine(o).map((s) => (
                    <button key={s} className={s === "annullato" ? (daConfermare === o.id ? "primario annulla" : "annulla") : "azione"} onClick={() => cambiaStato(o.id, s)}>
                      {s === "annullato" && daConfermare === o.id ? "Sicuro? Tocca ancora" : ETICHETTE[s]}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </details>
      )}
      {/* un preordine già consegnato, ritirato o annullato esce dall'area Preordini e sta qui (critico giro 15).
          Critico giro 16: a 390 la pagina era 19,6 schermate con gli ordini di ieri «in ritardo di 930 min»: in griglia solo stasera. */}
      {ordini.some((o) => !diStasera(o, adesso) && !ePreordine(o, adesso)) && (
        <button className="vecchi" onClick={() => setVecchiAperti((v) => !v)}>{vecchiAperti ? "Nascondi ieri e prima" : `Ieri e prima (${ordini.filter((o) => !diStasera(o, adesso) && !ePreordine(o, adesso)).length})`}</button>
      )}
      <div className="griglia">
        {ordini.filter((o) => (!ePreordine(o, adesso) || !PREORDINE_ATTIVO(o)) && (diStasera(o, adesso) || vecchiAperti)).map((o) => (
          <article className={"carta ordine-c " + o.stato + ((() => { const c = (o.stato === "ricevuto" || o.stato === "in_preparazione" || o.stato === "pronto" || o.stato === "in_consegna") ? contoAllaRovescia(o, adesso) : null; return c?.ritardo ? " ritardo" : ""; })())} key={o.id}>
            <header>
              <strong className="num">{o.numero_visibile ?? `#${o.numero}`}</strong>
              <span className={`badge ${o.stato}`}>{ETICHETTE[o.stato]}</span>
              {(o.stato === "ricevuto" || o.stato === "in_preparazione" || o.stato === "pronto" || o.stato === "in_consegna") && (() => { const c = contoAllaRovescia(o, adesso); return c ? <b className={"tempo" + (c.ritardo ? " ritardo" : "")}>{c.testo}</b> : null; })()}
            </header>
            <div className="riga">
              {o.tipo}{o.tavolo?.numero && <b> {o.tavolo.numero}</b>} · {o.canale} · {new Date(o.creato_il).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}{o.modificato_il && <> · <b className="vino">modificata {new Date(o.modificato_il).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</b></>}
              {o.ora_consegna && <> · <b className={quando(o.ora_consegna).startsWith("per") ? "" : "vino"}>{quando(o.ora_consegna)}</b></>}
            </div>
            {(o.cliente?.nome || o.nome_cliente || o.cliente?.telefono || o.pagamento) && (
              <div className="chi">
                {o.cliente?.nome ?? o.nome_cliente}{o.cliente?.telefono && <span className="tel"> · {o.cliente.telefono}</span>}{o.pagamento && <span className="paga">{(o.cliente?.nome || o.nome_cliente || o.cliente?.telefono) ? " · " : ""}{o.pagamento === "pos" ? "POS" : "contanti"}</span>}{o.pagamento === "contanti" && o.paga_con && Number(o.paga_con) > Number(o.totale) && <span className="resto"> · paga con {euro(Number(o.paga_con))}, resto {euro(Number(o.paga_con) - Number(o.totale))}</span>}
              </div>
            )}
            {o.indirizzo && <div className="via">{o.indirizzo.via} {o.indirizzo.civico ?? ""}</div>}
            {o.consegna?.[0]?.rider?.nome && <div className="riga">rider <b>{o.consegna[0].rider.nome}</b></div>}
            {o.cliente?.note && <div className="avviso-cliente">⚠ {o.cliente.note}</div>}
            <div className="tot">{euro(o.totale)}{Number(o.sconto) > 0 && <small className="muto"> (sconto −{euro(Number(o.sconto))})</small>}</div>
            {o.note && <div className="nota">Note: {o.note}</div>}
            <div className="riga">
              {o.stampato_il
                ? <>stampata {new Date(o.stampato_il).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}{(o.stampe ?? 0) > 1 && ` (×${o.stampe})`}</>
                : o.stato === "ricevuto" || o.stato === "in_preparazione"
                  ? <b className="vino">non stampata</b>
                  : <span>non stampata</span>}
            </div>
            <div className="azioni">
              <a href={`/cassa/comanda/${o.id}`} target="_blank" rel="noreferrer"><button>Comanda</button></a>
              <button onClick={() => stampa(o.id)} disabled={inStampa.includes(o.id)}>{inStampa.includes(o.id) ? "Stampo…" : "Stampa"}</button>
              {o.tipo === "domicilio" && o.stato !== "annullato" && <button onClick={() => copiaLink(o.id)}>{linkCopiato === o.id ? "Link copiato" : "Link per il cliente"}</button>}
              {(o.stato === "ricevuto" || o.stato === "in_preparazione" || o.stato === "pronto") && <a href={`/cassa/nuovo?modifica=${o.id}`}><button>Modifica</button></a>}
              {passiOrdine(o).map((s) => (
                <button
                  key={s}
                  className={s === "annullato" ? (daConfermare === o.id ? "primario" : "") : "azione"}
                  onClick={() => cambiaStato(o.id, s)}
                >
                  {s === "annullato" && daConfermare === o.id ? "Sicuro? Tocca ancora" : ETICHETTE[s]}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
