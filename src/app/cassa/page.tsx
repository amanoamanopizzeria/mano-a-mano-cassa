"use client";

// Cassa: gli ordini compaiono e cambiano da soli (Supabase Realtime), senza
// ricaricare la pagina. Primo mattone della PWA cassa.
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { CANALE_COMANDA } from "@/lib/comanda";
import AuthGate from "@/components/AuthGate";
import ColonnaCassa from "./ColonnaCassa";
import { TRANSIZIONI_ORDINE, type Ordine, type StatoOrdine, type CapacitaFascia } from "@/lib/types";

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
/**
 * Quando si stampa la comanda (Edoardo, 25/10/2026): la cucina ha davanti la mezz'ora. Consegne (anche Just Eat)
 * e ordini con un'ora si stampano a blocchi: alle 18:30 tutto il quarto d'ora delle 19:00, alle 18:45 quello delle
 * 19:15. Quello che entra in un blocco già partito esce subito. Senza ora (banco, «subito») e i ritiri di Glovo e
 * Deliveroo, che passano in 12–13 minuti, si stampano appena entrano: null vuol dire «adesso».
 */
const stampaAlle = (o: { ora_consegna?: string | null; canale?: string }) => {
  if (!o.ora_consegna || o.canale === "glovo" || o.canale === "deliveroo") return null;
  const quarto = Math.floor(new Date(o.ora_consegna).getTime() / (15 * 60_000)) * 15 * 60_000;
  return new Date(quarto - ATTESA_MIN * 60_000);
};
const daStampareOra = (o: { ora_consegna?: string | null; canale?: string }, adesso: number) => { const q = stampaAlle(o); return !q || q.getTime() <= adesso; };
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
  pronto_il?: string | null;
  nome_cliente?: string | null; pagamento?: "contanti" | "pos" | null; paga_con?: number | null;
  cliente?: { nome: string | null; telefono: string | null; note: string | null } | null;
  indirizzo?: { via: string; civico: string | null } | null;
  zona?: { nome: string } | null; costo_consegna?: number | null;
  tavolo?: { numero: string } | null; sconto?: number | null; modificato_il?: string | null;
};
/** I passi di stato offerti sulla carta: un domicilio non si «ritira», banco/tavolo/asporto non vanno «in consegna». */
// I colori di 2Bit (Edoardo, 25/10/2026): gialle le consegne dei nostri rider (anche Just Eat, che
// portiamo noi), rosa/arancio i ritiri di Glovo e Deliveroo, che portano i loro rider.
const coloreTipo = (o: OrdineCassa) =>
  o.canale === "glovo" || o.canale === "deliveroo" ? " col-piattaforma" : o.tipo === "domicilio" ? " col-consegna" : "";

const FILTRI = {
  aperti: { t: "Da fare", s: ["ricevuto", "in_preparazione", "pronto", "in_consegna"] },
  preparare: { t: "Da preparare", s: ["ricevuto", "in_preparazione"] },
  pronti: { t: "Pronti", s: ["pronto"] },
  uscita: { t: "In uscita", s: ["in_consegna"] },
  chiusi: { t: "Chiusi", s: ["consegnato", "ritirato", "annullato"] },
} as const;
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
  // gli ordini divisi per stato, come le colonne di 2Bit (Edoardo, 25/10/2026)
  const [filtro, setFiltro] = useState<keyof typeof FILTRI>("aperti");

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
              // un ordine per un quarto d'ora non ancora arrivato non si stampa all'arrivo: lo fa l'orologio col suo blocco
              try { if (localStorage.getItem(STAMPA_LS) === "1" && daStampareOra(n, Date.now())) { stampatiDaMe.current.add(n.id); stampa(n.id); } } catch {}
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
  // L'orologio a destra di ogni ordine (Edoardo, 25/10/2026): «questa me la metti in quell'altro quarto d'ora».
  const [spostaId, setSpostaId] = useState<string | null>(null);
  const [fasceSposta, setFasceSposta] = useState<CapacitaFascia[]>([]);
  async function apriSposta(id: string) {
    if (spostaId === id) { setSpostaId(null); return; }
    setSpostaId(id);
    const supabase = supabaseBrowser();
    const { data: prof } = await supabase.from("profilo").select("id_negozio").maybeSingle();
    const giorno = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
    const { data } = await supabase.rpc("capacita_giorno", { p_negozio: prof?.id_negozio, p_giorno: giorno });
    const ora = new Date().toLocaleTimeString("sv-SE", { timeZone: "Europe/Rome" }).slice(0, 5);
    setFasceSposta(((data ?? []) as CapacitaFascia[]).filter((f) => f.ora.slice(0, 5) >= ora.slice(0, 3) + String(Math.floor(Number(ora.slice(3)) / 15) * 15).padStart(2, "0")));
  }
  async function sposta(id: string, ora: string) {
    const giorno = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
    const { error } = await supabaseBrowser().rpc("ordine_sposta", { p_id: id, p_ora: new Date(`${giorno}T${ora.slice(0, 5)}:00`).toISOString() });
    if (error) setErrore(error.message);
    else { setSpostaId(null); setOrdini((os) => os.map((o) => (o.id === id ? { ...o, ora_consegna: new Date(`${giorno}T${ora.slice(0, 5)}:00`).toISOString() } : o))); }
  }
  const pannelloSposta = (o: OrdineCassa) => spostaId === o.id && (
    <div className="lo-sposta" role="dialog" aria-label="Sposta in un altro quarto d'ora">
      <div className="lo-sposta-titolo">Sposta {o.numero_visibile ?? `#${o.numero}`} alle…</div>
      <div className="lo-sposta-fasce">
        {fasceSposta.map((f) => {
          const piena = (o.tipo === "domicilio" ? f.bloccata_consegne || f.consegne_occupate >= f.consegne_max : false) || f.bloccata_produzione || f.pizze_occupate >= f.pizze_max;
          const attuale = !!o.ora_consegna && oraDi(o.ora_consegna) === f.ora.slice(0, 5);
          return (
            <button key={f.ora} className={"lo-sposta-f" + (piena ? " piena" : "") + (attuale ? " attuale" : "")} onClick={() => sposta(o.id, f.ora)} disabled={attuale}>
              <b>{f.ora.slice(0, 5)}</b>
              <span>{f.pizze_occupate}/{f.pizze_max} pizze</span>
              {o.tipo === "domicilio" && <span>{f.consegne_occupate}/{f.consegne_max} cons.</span>}
            </button>
          );
        })}
        {fasceSposta.length === 0 && <span className="muto">Nessun quarto d&apos;ora aperto da adesso.</span>}
      </div>
    </div>
  );
  async function segnaPronto(id: string) {
    const { data, error } = await supabaseBrowser().rpc("ordine_segna_pronto", { p_id: id });
    if (error) setErrore(error.message);
    else setOrdini((os) => os.map((o) => (o.id === id ? { ...o, pronto_il: data as string } : o)));
  }
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
    <div className="cassa-casa">
    <ColonnaCassa />
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
              <article className={"carta ordine-c preordine" + coloreTipo(o)} key={o.id}>
                <header>
                  <strong className="num">{o.numero_visibile ?? `#${o.numero}`}</strong>
                  <b className="tempo attesa">{quando(o.ora_consegna!)}</b>
                  <button className="lo-orologio" aria-label="Sposta in un altro quarto d'ora" title="Sposta orario" onClick={() => apriSposta(o.id)}>🕒</button>
                </header>
                {pannelloSposta(o)}
                <div className="riga">{o.tipo}{o.tavolo?.numero && <b> {o.tavolo.numero}</b>}{o.modificato_il && <b className="vino"> · modificata {oraDi(o.modificato_il)}</b>} · {o.pagamento ? (o.pagamento === "pos" ? "POS" : "contanti") : "pagamento ?"}{o.zona?.nome && <> · {o.zona.nome}{Number(o.costo_consegna) > 0 ? ` (consegna ${euro(Number(o.costo_consegna))})` : ""}</>}</div>
                <div className="chi">{o.cliente?.nome ?? o.nome_cliente ?? ""}</div>
                {o.indirizzo && <div className="via">{o.indirizzo.via} {o.indirizzo.civico ?? ""}</div>}
            {o.consegna?.[0]?.rider?.nome && <div className="riga">rider <b>{o.consegna[0].rider.nome}</b></div>}
                {o.note && <div className="nota">Note: {o.note}</div>}
                <div className="tot">{euro(o.totale)}</div>
                <div className="riga">{stampaAlle(o) ? <>stampa alle {oraDi(stampaAlle(o)!.toISOString())}</> : "si stampa subito"}{o.stampato_il ? " · già stampata" : ""}</div>
                <div className="azioni">
                  <a href={`/cassa/comanda/${o.id}`} target="_blank" rel="noreferrer"><button>Comanda</button></a>
                  <button onClick={() => stampa(o.id)}>Stampa ora</button>
                  {!["ritirata", "consegnata"].includes(o.consegna?.[0]?.stato ?? "") && <a href={`/cassa/nuovo?modifica=${o.id}`}><button>Modifica</button></a>}
                  {o.tipo === "domicilio" && <button onClick={() => copiaLink(o.id)}>{linkCopiato === o.id ? "Link copiato" : "Link per il cliente"}</button>}
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
      <div className="lo-filtri" role="tablist">
        {(Object.keys(FILTRI) as (keyof typeof FILTRI)[]).map((k) => {
          const n = ordini.filter((o) => (!ePreordine(o, adesso) || !PREORDINE_ATTIVO(o)) && diStasera(o, adesso) && (FILTRI[k].s as readonly string[]).includes(o.stato)).length;
          return <button key={k} role="tab" aria-selected={filtro === k} className={"lo-filtro" + (filtro === k ? " attivo" : "")} onClick={() => setFiltro(k)}>{FILTRI[k].t} <b>{n}</b></button>;
        })}
      </div>
      {ordini.some((o) => !diStasera(o, adesso) && !ePreordine(o, adesso)) && (
        <button className="vecchi" onClick={() => setVecchiAperti((v) => !v)}>{vecchiAperti ? "Nascondi ieri e prima" : `Ieri e prima (${ordini.filter((o) => !diStasera(o, adesso) && !ePreordine(o, adesso)).length})`}</button>
      )}
      <div className="griglia">
        {ordini.filter((o) => (!ePreordine(o, adesso) || !PREORDINE_ATTIVO(o)) && (diStasera(o, adesso) || vecchiAperti) && (FILTRI[filtro].s as readonly string[]).includes(o.stato))
          // i più urgenti prima: chi ha l'ora più vicina (o è entrato prima) in cima
          .sort((a, b) => (a.ora_consegna ?? a.creato_il).localeCompare(b.ora_consegna ?? b.creato_il) * (filtro === "chiusi" ? -1 : 1))
          .map((o) => (
          <article className={"carta ordine-c " + o.stato + coloreTipo(o) + ((() => { const c = (o.stato === "ricevuto" || o.stato === "in_preparazione" || o.stato === "pronto" || o.stato === "in_consegna") ? contoAllaRovescia(o, adesso) : null; return c?.ritardo ? " ritardo" : ""; })())} key={o.id}>
            <header>
              <strong className="num">{o.numero_visibile ?? `#${o.numero}`}</strong>
              <span className={`badge ${o.stato}`}>{ETICHETTE[o.stato]}</span>
              {(o.stato === "ricevuto" || o.stato === "in_preparazione" || o.stato === "pronto" || o.stato === "in_consegna") && (() => { const c = contoAllaRovescia(o, adesso); return c ? <b className={"tempo" + (c.ritardo ? " ritardo" : "")}>{c.testo}</b> : null; })()}
              {PREORDINE_ATTIVO(o) && <button className="lo-orologio" aria-label="Sposta in un altro quarto d'ora" title="Sposta orario" onClick={() => apriSposta(o.id)}>🕒</button>}
            </header>
            {pannelloSposta(o)}
            <div className="riga">
              {o.tipo}{o.tavolo?.numero && <b> {o.tavolo.numero}</b>} · <b className={"origine o-" + o.canale}>{CANALE_COMANDA[o.canale] ?? o.canale}</b>{(o.canale === "glovo" || o.canale === "deliveroo") && " (ritira il loro rider)"} · {new Date(o.creato_il).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}{o.modificato_il && <> · <b className="vino">modificata {new Date(o.modificato_il).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</b></>}
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
              <button onClick={() => stampa(o.id)} disabled={inStampa.includes(o.id)}>{inStampa.includes(o.id) ? "Stampo…" : o.stampato_il ? "Ristampa comanda" : "Stampa comanda"}</button>
              {o.tipo === "domicilio" && o.stato !== "annullato" && <button onClick={() => copiaLink(o.id)}>{linkCopiato === o.id ? "Link copiato" : "Link per il cliente"}</button>}
              {(o.stato === "ricevuto" || o.stato === "in_preparazione" || o.stato === "pronto") && <a href={`/cassa/nuovo?modifica=${o.id}`}><button>Modifica</button></a>}
              {/* critico giro 25: il rider la prende mentre le pizze sono in forno; la cucina deve poter dire «pronto» lo stesso */}
              {o.stato === "in_consegna" && !o.pronto_il && o.consegna?.[0]?.stato === "assegnata" && <button className="azione" onClick={() => segnaPronto(o.id)}>Pronto</button>}
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
    </div>
  );
}
