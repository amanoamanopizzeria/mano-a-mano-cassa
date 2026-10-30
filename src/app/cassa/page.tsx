"use client";

// Cassa: gli ordini compaiono e cambiano da soli (Supabase Realtime), senza
// ricaricare la pagina. Primo mattone della PWA cassa.
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { CANALE_COMANDA } from "@/lib/comanda";
import AuthGate from "@/components/AuthGate";
import ColonnaCassa from "./ColonnaCassa";
import { TRANSIZIONI_ORDINE, type Ordine, type StatoOrdine, type CapacitaFascia } from "@/lib/types";
import { coloreZona } from "@/lib/zone-colori";
import MiniMappa from "@/components/MiniMappa";

// Via Novara 5/7 (la stessa di src/lib/indirizzi.ts, che è solo del server)
const PIZZERIA = { lat: 41.9138, lng: 12.50734 };
interface Punto { lat: number; lng: number }
// i minuti per strada fra due punti, chiesti una volta per pagina aperta (critico giro 38, G-1). Una stima in
// linea d'aria (Google che non risponde) vale 10 minuti, poi si richiede.
const TEMPI = new Map<string, { min: number; google: boolean; il: number }>();
const chiaveP = (p: Punto) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
function tempoFra(a: Punto, b: Punto) {
  const t = TEMPI.get(chiaveP(a) + ">" + chiaveP(b)) ?? TEMPI.get(chiaveP(b) + ">" + chiaveP(a));
  return t && (t.google || Date.now() - t.il < 10 * 60_000) ? t : null;
}

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
const SELECT_ORDINE = "*, cliente(nome, telefono, note), indirizzo(via, civico, note, lat, lng), zona(nome), tavolo(numero), consegna(stato, id_rider, ritirata_il, in_viaggio_il, rider(nome))";
type OrdineCassa = Ordine & {
  consegna?: { stato: string; id_rider?: string | null; ritirata_il?: string | null; in_viaggio_il?: string | null; rider: { nome: string } | null }[] | null;
  pronto_il?: string | null;
  nome_cliente?: string | null; pagamento?: "contanti" | "pos" | null; paga_con?: number | null;
  cliente?: { nome: string | null; telefono: string | null; note: string | null } | null;
  indirizzo?: { via: string; civico: string | null; note?: string | null; lat?: number | null; lng?: number | null } | null;
  zona?: { nome: string } | null; costo_consegna?: number | null;
  tavolo?: { numero: string } | null; sconto?: number | null; modificato_il?: string | null;
};
/** I passi di stato offerti sulla carta: un domicilio non si «ritira», banco/tavolo/asporto non vanno «in consegna». */
// I colori di 2Bit (Edoardo, 25/10/2026): gialle le consegne dei nostri rider (anche Just Eat, che
// portiamo noi), rosa/arancio i ritiri di Glovo e Deliveroo, che portano i loro rider.
const coloreTipo = (o: OrdineCassa) =>
  o.canale === "glovo" || o.canale === "deliveroo" ? " col-piattaforma" : o.tipo === "domicilio" ? " col-consegna" : "";

const FILTRI = {
  quarti: { t: "In uscita a quarto d'ora", s: ["ricevuto", "in_preparazione", "pronto"] },
  aperti: { t: "Da fare", s: ["ricevuto", "in_preparazione", "pronto", "in_consegna"] },
  preparare: { t: "Da preparare", s: ["ricevuto", "in_preparazione"] },
  pronti: { t: "Pronti", s: ["pronto"] },
  uscita: { t: "In uscita", s: ["in_consegna"] },
  chiusi: { t: "Chiusi", s: ["consegnato", "ritirato", "annullato"] },
} as const;
const passiOrdine = (o: OrdineCassa): StatoOrdine[] =>
  TRANSIZIONI_ORDINE[o.stato].filter((s) => (o.tipo === "domicilio" ? s !== "ritirato" : s !== "in_consegna"))
    // un ordine al tavolo si chiude dal conto della sala, con coperto e pagamento (critico giro 29)
    .filter((s) => !(o.tipo === "tavolo" && s === "ritirato"));
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
  // la mappa piccola di un ordine (Edoardo 26/10: «per ogni ordine può aprire un Google Maps per capire dove si trova»)
  const [mappaDi, setMappaDi] = useState<string | null>(null);
  // gli ordini divisi per stato, come le colonne di 2Bit (Edoardo, 25/10/2026)
  const [filtro, setFiltro] = useState<keyof typeof FILTRI>("quarti");
  // la lente del 2Bit (REA 21 §2, REA 30 C2): numero, nome, telefono o via, su tutti gli ordini caricati
  const [cerca, setCerca] = useState("");

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

  // Correggere un ordine già chiuso (Edoardo, 30/10/2026, risposta C): «solo un admin, con un motivo». Il tasto
  // compare solo a chi è admin; il database rifà il controllo e scrive il registro (ordine_correzione).
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    supabaseBrowser().from("profilo").select("ruolo").maybeSingle().then(({ data }) => setAdmin(data?.ruolo === "admin"));
  }, []);
  const [correggi, setCorreggi] = useState<{ id: string; azione: "pagamento" | "riapri" | "annulla"; pagamento: string; motivo: string } | null>(null);
  async function confermaCorrezione() {
    if (!correggi) return;
    const { data, error } = await supabaseBrowser().rpc("ordine_correggi", {
      p_id_ordine: correggi.id, p_azione: correggi.azione, p_motivo: correggi.motivo,
      p_pagamento: correggi.azione === "pagamento" ? correggi.pagamento : null,
    });
    if (error) { setErrore(/ordine_correggi/.test(error.message) ? "La correzione non è ancora accesa nel database." : error.message); return; }
    const r = data as { esito: string; messaggio?: string };
    if (r.esito !== "ok") { setErrore(r.messaggio ?? "Correzione non fatta (" + r.esito + ")."); return; }
    setErrore(null); setCorreggi(null); completa(correggi.id);
  }
  const pannelloCorreggi = (o: OrdineCassa) => correggi?.id === o.id && (
    <div className="correggi">
      <div className="scelte">
        {(["pagamento", "riapri", "annulla"] as const).filter((a) => a !== "riapri" || o.tipo !== "domicilio").map((a) => (
          <button key={a} type="button" className={correggi.azione === a ? "primario" : ""} onClick={() => setCorreggi({ ...correggi, azione: a })}>
            {a === "pagamento" ? "Cambia pagamento" : a === "riapri" ? "Riapri (torna pronto)" : "Annulla l'ordine"}
          </button>
        ))}
      </div>
      {correggi.azione === "pagamento" && (
        <select value={correggi.pagamento} onChange={(e) => setCorreggi({ ...correggi, pagamento: e.target.value })}>
          {[["contanti", "Contanti"], ["pos", "POS"], ["buono_pasto", "Buono pasto"], ["satispay", "Satispay"]].filter(([v]) => v !== o.pagamento).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
        </select>
      )}
      <input placeholder="Motivo (obbligatorio)" value={correggi.motivo} onChange={(e) => setCorreggi({ ...correggi, motivo: e.target.value })} />
      <div className="scelte">
        <button type="button" onClick={() => setCorreggi(null)}>Lascia stare</button>
        <button type="button" className="primario" disabled={correggi.motivo.trim().length < 5} onClick={confermaCorrezione}>Correggi</button>
      </div>
    </div>
  );
  const [daConfermare, setDaConfermare] = useState<string | null>(null);   // id dell'ordine su cui «Annullato» aspetta il secondo tocco
  // L'orologio a destra di ogni ordine (Edoardo, 25/10/2026): «questa me la metti in quell'altro quarto d'ora».
  const [spostaId, setSpostaId] = useState<string | null>(null);
  const [fasceSposta, setFasceSposta] = useState<CapacitaFascia[]>([]);
  // il giorno è quello dell'ordine (critico giro 26: un preordine di domani finiva a oggi)
  const giornoDi = (id: string) => { const o = ordini.find((x) => x.id === id); return new Date(o?.ora_consegna ?? Date.now()).toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" }); };
  async function apriSposta(id: string) {
    if (spostaId === id) { setSpostaId(null); return; }
    setSpostaId(id);
    const supabase = supabaseBrowser();
    const { data: prof } = await supabase.from("profilo").select("id_negozio").maybeSingle();
    const giorno = giornoDi(id);
    const oggi = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
    const { data } = await supabase.rpc("capacita_giorno", { p_negozio: prof?.id_negozio, p_giorno: giorno });
    const ora = new Date().toLocaleTimeString("sv-SE", { timeZone: "Europe/Rome" }).slice(0, 5);
    const dal = giorno > oggi ? "00:00" : ora.slice(0, 3) + String(Math.floor(Number(ora.slice(3)) / 15) * 15).padStart(2, "0");
    setFasceSposta(((data ?? []) as CapacitaFascia[]).filter((f) => f.ora.slice(0, 5) >= dal));
  }
  // Un quarto d'ora pieno non si prende per sbaglio (controllo ECC 26/10, punto 7): il database
  // risponde «pieno» e la cassa sposta lo stesso solo al secondo tocco sullo stesso quarto.
  const [forzaOra, setForzaOra] = useState<string | null>(null);
  async function sposta(id: string, ora: string) {
    const giorno = giornoDi(id);
    const quando = new Date(`${giorno}T${ora.slice(0, 5)}:00`).toISOString();
    const forza = forzaOra === id + ora;
    const { data, error } = await supabaseBrowser().rpc(forza ? "ordine_sposta_forzato" : "ordine_sposta", { p_id: id, p_ora: quando });
    if (error) { setErrore(error.message); return; }
    const r = data as { esito: string; motivo?: string; occupate?: number; massimo?: number };
    if (r.esito === "pieno") {
      setForzaOra(id + ora);
      setErrore(`Alle ${ora.slice(0, 5)} è pieno (${r.motivo === "consegne" ? "consegne" : "pizze"} ${r.occupate}/${r.massimo}): tocca di nuovo per spostarlo lo stesso.`);
      return;
    }
    setForzaOra(null); setErrore(null);
    setSpostaId(null); setOrdini((os) => os.map((o) => (o.id === id ? { ...o, ora_consegna: quando } : o)));
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

  const carta = (o: OrdineCassa) => (
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
            {o.indirizzo && <div className="via">{o.indirizzo.via} {o.indirizzo.civico ?? ""}{o.indirizzo.note && <b className="vino"> · {o.indirizzo.note}</b>}
              {o.indirizzo.lat != null && o.indirizzo.lng != null && (
                <button type="button" className="lo-mappa" onClick={(e) => { e.stopPropagation(); setMappaDi((x) => (x === o.id ? null : o.id)); }}>{mappaDi === o.id ? "Chiudi mappa" : "Mappa"}</button>
              )}</div>}
            {mappaDi === o.id && o.indirizzo?.lat != null && o.indirizzo.lng != null && <MiniMappa lat={o.indirizzo.lat} lng={o.indirizzo.lng} titolo={`${o.indirizzo.via} ${o.indirizzo.civico ?? ""}`} />}
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
              {admin && (o.stato === "consegnato" || o.stato === "ritirato") && <button onClick={() => setCorreggi(correggi?.id === o.id ? null : { id: o.id, azione: "pagamento", pagamento: o.pagamento === "contanti" ? "pos" : "contanti", motivo: "" })}>Correggi</button>}
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
            {pannelloCorreggi(o)}
          </article>
  );

  // Gli ordini in uscita, una riga per quarto d'ora e un blocco per giorno (Edoardo, 26/10/2026): «a destra gli
  // ordini che vanno in uscita con le varie tempistiche per ogni quarto d'ora… orizzontalmente… divisi in fascia
  // oraria di ogni giorno». Ci sono tutti gli stati fino all'uscita: ricevuto, pronto, in consegna col rider.
  // Un ordine sparisce quando è consegnato, ritirato o annullato. La sala ha la sua pagina e qui non c'è.
  // La fascia del cliente è di mezz'ora: chi sceglie le 19:00 aspetta la consegna entro le 19:30, quindi il
  // ritardo si conta dalla fine della mezz'ora (il ritiro dall'ora scelta).
  const quartoDi = (o: OrdineCassa) => Math.floor(new Date(o.ora_consegna ?? o.creato_il).getTime() / 900_000) * 900_000;
  const entroLe = (o: OrdineCassa) => o.ora_consegna
    ? quartoDi(o) + (o.tipo === "domicilio" ? 30 : 0) * 60_000
    : new Date(o.creato_il).getTime() + ATTESA_MIN * 60_000;
  const inUscita = ordini.filter((o) =>
    o.tipo !== "tavolo" && ["ricevuto", "in_preparazione", "pronto"].includes(o.stato)
    && !["assegnata", "ritirata"].includes(o.consegna?.[0]?.stato ?? "")
    // quelli rimasti aperti da ieri si vedono col tasto «Ieri e prima» (critico giro 30: sparivano)
    && (diStasera(o, adesso) || quartoDi(o) >= inizioSerata(adesso) || vecchiAperti));
  const quartoAdesso = Math.floor(adesso / 900_000) * 900_000;
  // In consegna (Edoardo 26/10): appena un rider la prende esce dalle righe e sta qui, con chi la porta, dov'è e
  // fra quanto arriva, così se il cliente chiama si sa rispondere. Consegnata, va fra i Chiusi.
  const inConsegna = ordini.filter((o) => o.tipo === "domicilio" && o.stato !== "annullato" && o.stato !== "consegnato"
    && (o.stato === "in_consegna" || ["assegnata", "ritirata"].includes(o.consegna?.[0]?.stato ?? "")))
    .sort((a, b) => (a.ora_consegna ?? a.creato_il).localeCompare(b.ora_consegna ?? b.creato_il));
  const giornoRoma = (t: number) => new Date(t - 6 * 3_600_000).toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
  const righeQuarti = [...new Set(inUscita.map(quartoDi))].sort((a, b) => a - b).map((q) => ({
    q, giorno: giornoRoma(q),
    ordini: inUscita.filter((o) => quartoDi(o) === q).sort((a, b) => (a.ora_consegna ?? a.creato_il).localeCompare(b.ora_consegna ?? b.creato_il)),
  }));
  // il giorno col suo nome e la data, sempre: dopo mezzanotte «domani» e «stasera» si confondono
  const etichettaGiorno = (g: string) => {
    const nome = new Date(g + "T12:00:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
    return g === giornoRoma(adesso) ? `${nome} · serata in corso` : nome;
  };
  const parolaCercata = cerca.trim().toLowerCase().replace(/^#/, "");
  const soloCifre = parolaCercata.replace(/\D/g, "");
  const trovati = parolaCercata.length === 0 ? null : ordini.filter((o) => {
    const numero = String(o.numero_visibile ?? o.numero).toLowerCase();
    if (numero === parolaCercata || String(o.numero) === parolaCercata) return true;
    if (soloCifre.length >= 4 && (o.cliente?.telefono ?? "").replace(/\D/g, "").includes(soloCifre)) return true;
    const testo = [o.cliente?.nome, o.nome_cliente, o.indirizzo?.via, o.note].filter(Boolean).join(" ").toLowerCase();
    return parolaCercata.length >= 2 && testo.includes(parolaCercata);
  }).sort((a, b) => b.creato_il.localeCompare(a.creato_il));
  const preordiniVisti = ordini.filter((o) => ePreordine(o, adesso) && PREORDINE_ATTIVO(o) && filtro !== "quarti");
  const [riderPos, setRiderPos] = useState<Map<string, { lat: number; lng: number; il: string }>>(new Map());
  const [strada, setStrada] = useState<Map<string, { min: number; google: boolean; il: number }>>(new Map());
  const ultimaStrada = useRef(0);
  const inConsegnaRef = useRef(inConsegna);
  inConsegnaRef.current = inConsegna;
  useEffect(() => {
    if (inConsegna.length === 0) return;
    let vivo = true;
    const leggi = async () => {
      const { data } = await supabaseBrowser().rpc("rider_in_mappa");
      if (!vivo) return;
      const m = new Map<string, { lat: number; lng: number; il: string }>();
      for (const r of (data ?? []) as { id: string; lat: number | null; lng: number | null; aggiornata_il: string | null }[]) {
        if (r.lat != null && r.lng != null && r.aggiornata_il) m.set(r.id, { lat: r.lat, lng: r.lng, il: r.aggiornata_il });
      }
      setRiderPos(m);
      // il tempo per strada da Google (Routes, col traffico) una volta al minuto: ogni 15 s costerebbe
      // quattro volte tanto e il numero non cambia. Senza Google la stessa rotta dà la linea d'aria.
      if (Date.now() - ultimaStrada.current < 60_000) return;
      const coppie = inConsegnaRef.current.flatMap((o) => {
        const k = o.consegna?.[0]; const pos = k?.id_rider ? m.get(k.id_rider) : undefined;
        return pos && k?.stato !== "assegnata" && o.indirizzo?.lat != null && o.indirizzo?.lng != null
          ? [{ id: o.id, da: { lat: pos.lat, lng: pos.lng }, a: { lat: o.indirizzo.lat, lng: o.indirizzo.lng } }] : [];
      }).slice(0, 10);
      if (coppie.length === 0) return;
      ultimaStrada.current = Date.now();
      const r = await fetch("/api/indirizzi/tempi", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origini: coppie.map((c) => c.da), destinazioni: coppie.map((c) => c.a), coppie: true }) }).catch(() => null);
      const t = r?.ok ? (await r.json()) as { fonte: string; minuti: (number | null)[][] } : null;
      if (!vivo || !t) return;
      setStrada(new Map(coppie.flatMap((c, i) => (t.minuti[i]?.[i] != null ? [[c.id, { min: t.minuti[i][i]!, google: t.fonte === "google", il: Date.now() }]] : []))));
    };
    leggi();
    const t = setInterval(leggi, 15_000);
    return () => { vivo = false; clearInterval(t); };
  }, [inConsegna.length]);
  /** «arriva fra 6 min (19:42)» dalla posizione del rider; senza posizione fresca si dice e basta. */
  const arrivo = (o: OrdineCassa) => {
    const k = o.consegna?.[0];
    if (!k || k.stato === "assegnata") return { testo: "deve ancora partire dalla pizzeria", pos: null as string | null };
    const p = k.id_rider ? riderPos.get(k.id_rider) : undefined;
    const fresca = p && adesso - new Date(p.il).getTime() < 3 * 60_000;
    const quando = p ? `posizione ${Math.max(0, Math.round((adesso - new Date(p.il).getTime()) / 60_000))} min fa` : "nessuna posizione dal rider";
    if (!fresca || o.indirizzo?.lat == null || o.indirizzo?.lng == null) return { testo: "in viaggio", pos: quando };
    // Google Maps col traffico se c'è e ha meno di 2 minuti, più 2 minuti per parcheggiare; se no la linea
    // d'aria × 1,4 a 22 km/h (la stessa stima della mappa)
    const g = strada.get(o.id);
    const daGoogle = g && g.google && adesso - g.il < 2 * 60_000;
    const min = daGoogle ? g.min + 2 : Math.round(Math.hypot((p!.lat - o.indirizzo.lat) * 111, (p!.lng - o.indirizzo.lng) * 83) * 1.4 / 22 * 60 + 2);
    return { testo: `arriva fra ${min} min (verso le ${oraDi(new Date(adesso + min * 60_000).toISOString())})`, pos: quando + (daGoogle ? " · Google Maps" : " · stima") };
  };
  const [apertoQ, setApertoQ] = useState<string | null>(null);

  // Le doppie (Edoardo 26/10): due consegne dello stesso quarto d'ora (o di quello accanto) che un rider
  // porta in un giro solo. Si guarda il giro dalla pizzeria, non solo la distanza fra le due case (critico
  // giro 38, M-1: Piazza Fiume e Spallanzani stanno a 8 minuti ma da noi vanno da parti opposte): la doppia
  // c'è se il secondo cliente aspetta al massimo 5 minuti in più che se andasse da solo. Ogni consegna è in
  // una coppia sola e le due si nominano a vicenda.
  // Google si paga a coppia di punti (G-1): i minuti fra due case non cambiano, quindi si chiedono una volta
  // sola, senza traffico, solo per le case nuove, e solo con la vista a quarti aperta e lo schermo acceso.
  const daAbbinare = inUscita.filter((o) => o.tipo === "domicilio" && o.canale !== "glovo" && o.canale !== "deliveroo"
    && o.indirizzo?.lat != null && o.indirizzo?.lng != null)
    // le più vicine nel tempo prima: oltre 9 restano fuori le ultime, non quelle del quarto di adesso (G-2)
    .sort((a, b) => quartoDi(a) - quartoDi(b)).slice(0, 9);
  const puntoDi = (o: OrdineCassa): Punto => ({ lat: o.indirizzo!.lat!, lng: o.indirizzo!.lng! });
  const chiaveAbbina = daAbbinare.map((o) => chiaveP(puntoDi(o))).join(";");
  const [, setTempiNuovi] = useState(0);
  const [riprova, setRiprova] = useState(0);
  useEffect(() => {
    if (filtro !== "quarti" || daAbbinare.length < 2) return;
    const punti = [PIZZERIA, ...daAbbinare.map(puntoDi)];
    const nuovi = punti.filter((x) => punti.some((y) => y !== x && chiaveP(y) !== chiaveP(x) && !tempoFra(x, y)));
    if (!nuovi.length) return;
    let vivo = true;
    const vai = async () => {
      if (document.visibilityState !== "visible") return;
      const r = await fetch("/api/indirizzi/tempi", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origini: nuovi, destinazioni: punti, traffico: false }) }).catch(() => null);
      const t = r?.ok ? (await r.json()) as { fonte: string; minuti: (number | null)[][] } : null;
      if (!vivo) return;
      if (!t) { setTimeout(() => vivo && setRiprova((x) => x + 1), 60_000); return; }
      nuovi.forEach((x, i) => punti.forEach((y, j) => {
        const min = t.minuti[i]?.[j];
        if (min != null) TEMPI.set(chiaveP(x) + ">" + chiaveP(y), { min, google: t.fonte === "google", il: Date.now() });
      }));
      setTempiNuovi((x) => x + 1);
      // senza Google la stima vale 10 minuti, poi si riprova
      if (t.fonte !== "google") setTimeout(() => vivo && setRiprova((x) => x + 1), 10 * 60_000 + 1000);
    };
    vai();
    document.addEventListener("visibilitychange", vai);
    return () => { vivo = false; document.removeEventListener("visibilitychange", vai); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chiaveAbbina, filtro, riprova]);
  const vicine = new Map<string, { con: string; min: number; google: boolean }>();
  {
    const coppie: { a: OrdineCassa; b: OrdineCassa; inPiu: number; google: boolean }[] = [];
    daAbbinare.forEach((a, i) => daAbbinare.forEach((b, j) => {
      if (j <= i || Math.abs(quartoDi(a) - quartoDi(b)) > 15 * 60_000) return;
      const pa = tempoFra(PIZZERIA, puntoDi(a)), pb = tempoFra(PIZZERIA, puntoDi(b)), ab = tempoFra(puntoDi(a), puntoDi(b));
      if (!pa || !pb || !ab) return;
      // prima la casa più vicina, poi l'altra: quanto aspetta in più il secondo cliente
      const inPiu = Math.max(0, Math.min(pa.min, pb.min) + ab.min - Math.max(pa.min, pb.min));
      if (inPiu <= 5) coppie.push({ a, b, inPiu, google: pa.google && pb.google && ab.google });
    }));
    for (const c of coppie.sort((x, y) => x.inPiu - y.inPiu)) {
      if (vicine.has(c.a.id) || vicine.has(c.b.id)) continue;
      vicine.set(c.a.id, { con: c.b.numero_visibile ?? `#${c.b.numero}`, min: c.inPiu, google: c.google });
      vicine.set(c.b.id, { con: c.a.numero_visibile ?? `#${c.a.numero}`, min: c.inPiu, google: c.google });
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
      {preordiniVisti.length > 0 && (
        <details className="preordini" open>
          <summary>Preordini <small>{preordiniVisti.length} · si stampano da soli {ATTESA_MIN} minuti prima</small></summary>
          <div className="griglia">
            {preordiniVisti.sort((a, b) => (a.ora_consegna ?? "").localeCompare(b.ora_consegna ?? "")).map((o) => (
              <article className={"carta ordine-c preordine" + coloreTipo(o)} key={o.id}>
                <header>
                  <strong className="num">{o.numero_visibile ?? `#${o.numero}`}</strong>
                  <b className="tempo attesa">{quando(o.ora_consegna!)}</b>
                  <button className="lo-orologio" aria-label="Sposta in un altro quarto d'ora" title="Sposta orario" onClick={() => apriSposta(o.id)}>🕒</button>
                </header>
                {pannelloSposta(o)}
                <div className="riga">{o.tipo}{o.tavolo?.numero && <b> {o.tavolo.numero}</b>}{o.modificato_il && <b className="vino"> · modificata {oraDi(o.modificato_il)}</b>} · {o.pagamento ? (o.pagamento === "pos" ? "POS" : "contanti") : "pagamento ?"}{o.zona?.nome && <> · {o.zona.nome}{Number(o.costo_consegna) > 0 ? ` (consegna ${euro(Number(o.costo_consegna))})` : ""}</>}</div>
                <div className="chi">{o.cliente?.nome ?? o.nome_cliente ?? ""}</div>
                {o.indirizzo && <div className="via">{o.indirizzo.via} {o.indirizzo.civico ?? ""}{o.indirizzo.note && <b className="vino"> · {o.indirizzo.note}</b>}
              {o.indirizzo.lat != null && o.indirizzo.lng != null && (
                <button type="button" className="lo-mappa" onClick={(e) => { e.stopPropagation(); setMappaDi((x) => (x === o.id ? null : o.id)); }}>{mappaDi === o.id ? "Chiudi mappa" : "Mappa"}</button>
              )}</div>}
            {mappaDi === o.id && o.indirizzo?.lat != null && o.indirizzo.lng != null && <MiniMappa lat={o.indirizzo.lat} lng={o.indirizzo.lng} titolo={`${o.indirizzo.via} ${o.indirizzo.civico ?? ""}`} />}
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
          const diQui = k === "quarti" ? [] : ordini.filter((o) => (!ePreordine(o, adesso) || !PREORDINE_ATTIVO(o)) && diStasera(o, adesso) && (FILTRI[k].s as readonly string[]).includes(o.stato));
          // gli annullati stanno fra i Chiusi ma non si contano come chiusi (REA 21 §3, critico giro 29)
          const annullati = diQui.filter((o) => o.stato === "annullato").length;
          const n = k === "quarti" ? inUscita.length + inConsegna.length : diQui.length - annullati;
          return <button key={k} role="tab" aria-selected={filtro === k && !trovati} className={"lo-filtro" + (filtro === k && !trovati ? " attivo" : "")} onClick={() => { setFiltro(k); setCerca(""); }}>{FILTRI[k].t} <b>{n}</b>{annullati > 0 && <small> + {annullati} annullati</small>}</button>;
        })}
        <input className="lo-cerca" type="search" inputMode="search" placeholder="Cerca n°, nome, telefono, via" value={cerca}
          onChange={(e) => setCerca(e.target.value)} aria-label="Cerca un ordine" />
      </div>
      {trovati && (
        <section aria-label="Ordini trovati">
          <h2 className="lo-giorno">{trovati.length === 0 ? `Nessun ordine con «${cerca.trim()}»` : `Trovati ${trovati.length}`} <button className="lo-cerca-via" onClick={() => setCerca("")}>Chiudi la ricerca</button></h2>
          <div className="griglia">{trovati.map((o) => carta(o))}</div>
        </section>
      )}
      {ordini.some((o) => !diStasera(o, adesso) && !ePreordine(o, adesso)) && (
        <button className="vecchi" onClick={() => setVecchiAperti((v) => !v)}>{vecchiAperti ? "Nascondi ieri e prima" : `Ieri e prima (${ordini.filter((o) => !diStasera(o, adesso) && !ePreordine(o, adesso)).length})`}</button>
      )}
      {!trovati && filtro === "quarti" && inConsegna.length > 0 && (
        <section className="lo-consegna" aria-label="In consegna">
          <h2 className="lo-giorno">In consegna ({inConsegna.length}) <a href="/cassa/mappa" className="lo-mappa">Mappa dei rider ↗</a></h2>
          <div className="lo-quarto-fila">
            {inConsegna.map((o) => {
              const a = arrivo(o);
              const ritardo = o.ora_consegna ? Math.round((adesso - (quartoDi(o) + 30 * 60_000)) / 60_000) : 0;
              return (
                <button key={o.id} className={"lo-pillola in_consegna" + (ritardo > 0 ? " ritardo" : "") + (apertoQ === o.id ? " scelta" : "")} onClick={() => setApertoQ((x) => (x === o.id ? null : o.id))}>
                  <span className="lo-p-testa"><b>{o.numero_visibile ?? `#${o.numero}`}</b><em>{o.consegna?.[0]?.rider?.nome ?? "rider ?"}</em></span>
                  <span className="lo-p-chi">{o.cliente?.nome ?? o.nome_cliente ?? "—"}{o.cliente?.telefono && <small> · {o.cliente.telefono}</small>}</span>
                  <span className="lo-p-via">{o.indirizzo ? `${o.indirizzo.via} ${o.indirizzo.civico ?? ""}` : "—"}</span>
                  <span className="lo-p-arrivo"><b>{a.testo}</b></span>
                  {a.pos && <span className="lo-p-rider">{a.pos}</span>}
                  <span className="lo-p-tot">{euro(o.totale)}{ritardo > 0 ? <> · <b>in ritardo di {ritardo} min</b></> : o.ora_consegna ? ` · entro le ${oraDi(new Date(quartoDi(o) + 30 * 60_000).toISOString())}` : ""}</span>
                </button>
              );
            })}
          </div>
          {(() => { const x = inConsegna.find((o) => o.id === apertoQ); return x ? <div className="lo-quarto-carta">{carta(x)}</div> : null; })()}
        </section>
      )}
      {!trovati && filtro === "quarti" && (
        <div className="lo-quarti">
          {righeQuarti.length === 0 && <p className="muto">Niente da far uscire: gli ordini nuovi compaiono qui nel loro quarto d&apos;ora.</p>}
          {righeQuarti.map(({ q, giorno, ordini: os }, i) => {
            const consegne = os.filter((o) => o.tipo === "domicilio" && o.canale !== "glovo" && o.canale !== "deliveroo").length;
            const aperto = os.find((o) => o.id === apertoQ);
            const nuovoGiorno = i === 0 || righeQuarti[i - 1].giorno !== giorno;
            return (
              <div key={q}>
                {nuovoGiorno && <h2 className="lo-giorno">{etichettaGiorno(giorno)}</h2>}
                <section className={"lo-quarto" + (q < quartoAdesso ? " passato" : q === quartoAdesso ? " adesso" : "")}>
                  <header className="lo-quarto-ora">
                    <b>{oraDi(new Date(q).toISOString())}</b>
                    <span>{consegne > 0 ? `consegna entro le ${oraDi(new Date(q + 30 * 60_000).toISOString())}` : q < quartoAdesso ? "passato" : q - adesso <= 120 * 60_000 ? `fra ${Math.round((q - adesso) / 60_000)} min` : ""}</span>
                    <span>{os.length === 1 ? "1 ordine" : `${os.length} ordini`}{consegne > 0 ? ` · ${consegne} ${consegne === 1 ? "consegna" : "consegne"}` : ""}</span>
                  </header>
                  <div className="lo-quarto-fila">
                    {os.map((o) => {
                      const ritardo = Math.round((adesso - entroLe(o)) / 60_000);
                      const z = o.tipo === "domicilio" ? coloreZona(o.zona?.nome) : null;
                      const v = vicine.get(o.id);
                      return (
                        <button key={o.id} className={"lo-pillola " + o.stato + coloreTipo(o) + (ritardo > 0 ? " ritardo" : "") + (apertoQ === o.id ? " scelta" : "")} onClick={() => setApertoQ((x) => (x === o.id ? null : o.id))}
                          style={z ? { borderLeftColor: z.colore, ["--zona" as string]: z.colore } : undefined}>
                          {z && <span className="lo-p-zona"><i aria-hidden style={{ background: z.colore }} />{z.corto}</span>}
                          <span className="lo-p-testa"><b>{o.numero_visibile ?? `#${o.numero}`}</b><em className={`badge ${o.stato}`}>{ETICHETTE[o.stato]}</em></span>
                          <span className="lo-p-chi">{o.cliente?.nome ?? o.nome_cliente ?? (o.tipo === "banco" ? "Banco" : "—")}</span>
                          <span className="lo-p-via">{o.tipo === "domicilio" ? (o.indirizzo ? `${o.indirizzo.via} ${o.indirizzo.civico ?? ""}` : "domicilio") : o.canale === "glovo" || o.canale === "deliveroo" ? CANALE_COMANDA[o.canale] ?? o.canale : o.tipo}</span>
                          {o.consegna?.[0]?.rider?.nome && <span className="lo-p-rider">rider {o.consegna[0].rider.nome}</span>}
                          {v && <span className="lo-p-doppia" title={`In un giro solo dalla pizzeria il secondo cliente aspetta ${v.min} min in più · ${v.google ? "Google Maps" : "stima in linea d'aria"}`}>doppia con <b>{v.con}</b> · +{v.min} min{v.google ? "" : " (stima)"}</span>}
                          <span className="lo-p-tot">{euro(o.totale)} · {ritardo > 0 ? <b>in ritardo di {ritardo} min</b> : o.ora_consegna ? `entro le ${oraDi(new Date(entroLe(o)).toISOString())}` : "subito"}</span>
                        </button>
                      );
                    })}
                  </div>
                  {aperto && <div className="lo-quarto-carta">{carta(aperto)}</div>}
                </section>
              </div>
            );
          })}
        </div>
      )}
      {!trovati && filtro !== "quarti" && <div className="griglia">
        {ordini.filter((o) => (!ePreordine(o, adesso) || !PREORDINE_ATTIVO(o)) && (diStasera(o, adesso) || vecchiAperti) && (FILTRI[filtro].s as readonly string[]).includes(o.stato))
          // i più urgenti prima: chi ha l'ora più vicina (o è entrato prima) in cima
          .sort((a, b) => (a.ora_consegna ?? a.creato_il).localeCompare(b.ora_consegna ?? b.creato_il) * (filtro === "chiusi" ? -1 : 1))
          .map((o) => carta(o))}
      </div>}
    </main>
    </div>
  );
}
