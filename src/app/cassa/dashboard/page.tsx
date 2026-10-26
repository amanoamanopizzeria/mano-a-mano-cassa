"use client";

// Il cruscotto dei conti (Edoardo, 26/10/2026: «per questi conti ci serve tutta la dashboard che abbiamo già su
// Velocissimo, così come il CSV con tutti gli ordini, in un'altra pagina»; 22:20Z: «ricostruire i conti dal
// database… completa tutte le funzioni che abbiamo visto da Velocissimo»). REA 24: le dashboard Riepilogo,
// Vendite, Andamento, KPI e i report prodotti, categorie, sconti, rider, zone, clienti, coupon e punti.
// I conti li fa il database (cruscotto(), mig. 0075): una chiamata per periodo, anche per un anno intero.
// Il periodo si sceglie come in Velocissimo (serata… anno, ultimi 7/30 giorni, 12 mesi, dal–al), il confronto
// col periodo prima o con l'anno prima, i filtri per origine e tipo. Sotto, l'elenco degli ordini, solo da
// leggere, coi filtri e la scheda di ognuno. Il margine NON c'è: quello vero lo fa mano-a-mano-os.
import { useEffect, useMemo, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { supabaseBrowser } from "@/lib/supabase/client";
import { CANALE_COMANDA } from "@/lib/comanda";

export default function DashboardPagina() {
  return (
    <AuthGate>
      <Dashboard />
    </AuthGate>
  );
}

type Periodo = "serata" | "settimana" | "mese" | "anno" | "7" | "30" | "12m" | "libero";
type Confronto = "prima" | "anno";
interface Voce { k: string; n: number; euro: number }
interface Conti {
  totali: { venduto: number; ordini: number; annullati: number; annullati_euro: number; medio: number; coperti: number; sconti: number; consegna: number;
    clienti: number; puntuali: number; misurate: number; in_anticipo?: number; venduto_coperti?: number; ritardo_medio: number | null; viaggio_medio: number | null };
  per_canale: Voce[]; per_tipo: Voce[]; per_pagamento: Voce[]; per_stato: { k: string; n: number }[];
  per_ora: { h: number; n: number; euro: number }[];
  per_giorno_settimana: { d: number; n: number; euro: number; sere: number }[];
  per_giorno: { g: string; n: number; euro: number }[];
  per_mese: { m: string; n: number; euro: number }[];
  prodotti: { nome: string; categoria: string | null; pezzi: number; nei_menu: number | null; euro: number }[];
  categorie: { nome: string; pezzi: number; euro: number }[];
  sconti: { voce: string; n: number; euro: number }[];
  rider: { nome: string; consegne: number; euro: number; contanti: number; in_ritardo: number; ritardo_medio: number | null; viaggio_medio: number | null; annullate: number }[];
  zone: { nome: string; n: number; euro: number; medio: number; consegna: number; ritardo_medio: number | null }[];
  clienti: { con_scheda: number; nuovi: number; ricorrenti: number; senza_scheda: number; migliori: { nome: string; telefono: string; n: number; euro: number }[] };
  punti: { dati: number; spesi: number; tolti_annulli: number };
  coupon: { emessi: number; usati: number; ordini_con_coupon: number };
}

const GIORNO = 86_400_000;
// la serata va dalle 6 di mattina alle 6 del giorno dopo, ora di Roma (come giornata_lavorativa, mig. 0040)
const giornataDi = (t: number) => new Date(t - 6 * 3_600_000).toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
function inizio(g: string) {
  for (const off of ["+02:00", "+01:00"]) {
    const d = new Date(`${g}T06:00:00${off}`);
    if (d.toLocaleTimeString("it-IT", { hour: "2-digit", timeZone: "Europe/Rome" }).startsWith("06")) return d.getTime();
  }
  return new Date(`${g}T05:00:00Z`).getTime();
}
const piu = (g: string, giorni: number) => new Date(new Date(g + "T12:00:00Z").getTime() + giorni * GIORNO).toISOString().slice(0, 10);
const giorniFra = (a: string, b: string) => Math.round((new Date(b + "T12:00:00Z").getTime() - new Date(a + "T12:00:00Z").getTime()) / GIORNO);
// il 29 febbraio di un anno prima è il 28 (critico giro 40: prima diventava il 1° marzo)
const annoSpostato = (g: string, n: number) => {
  const a = String(Number(g.slice(0, 4)) + n);
  return g.slice(5) === "02-29" && !(Number(a) % 4 === 0 && (Number(a) % 100 !== 0 || Number(a) % 400 === 0)) ? `${a}-02-28` : a + g.slice(4);
};
const unAnnoPrima = (g: string) => annoSpostato(g, -1);
const fineMese = (g: string) => piu(piu(g.slice(0, 8) + "01", 32).slice(0, 8) + "01", -1);

/** Il periodo scelto e quello del confronto. La serata si confronta con lo stesso giorno della settimana prima. */
function intervallo(p: Periodo, g: string, liberoDal: string, liberoAl: string, confronto: Confronto) {
  let dal = g, al = g, primaDal: string, primaAl: string;
  if (p === "settimana") { const dow = (new Date(g + "T12:00:00Z").getUTCDay() + 6) % 7; dal = piu(g, -dow); al = piu(dal, 6); }
  else if (p === "mese") { dal = g.slice(0, 8) + "01"; al = fineMese(g); }
  else if (p === "anno") { dal = g.slice(0, 4) + "-01-01"; al = g.slice(0, 4) + "-12-31"; }
  else if (p === "7") { al = g; dal = piu(g, -6); }
  else if (p === "30") { al = g; dal = piu(g, -29); }
  else if (p === "12m") { al = g; dal = piu(unAnnoPrima(g), 1); }
  else if (p === "libero") { dal = liberoDal <= liberoAl ? liberoDal : liberoAl; al = liberoDal <= liberoAl ? liberoAl : liberoDal; }
  // il mese o l'anno in corso si confronta coi giorni passati, non col periodo intero prima (critico giro 40)
  const oggi = giornataDi(Date.now());
  const fino = (p === "mese" || p === "anno") && al > oggi && dal <= oggi ? oggi : al;
  if (confronto === "anno") { primaDal = unAnnoPrima(dal); primaAl = unAnnoPrima(fino); }
  else if (p === "serata") { primaDal = piu(dal, -7); primaAl = piu(al, -7); }
  else if (p === "mese") { primaDal = piu(dal, -1).slice(0, 8) + "01"; primaAl = fino === al ? piu(dal, -1) : [piu(primaDal, giorniFra(dal, fino)), piu(dal, -1)].sort()[0]; }
  else if (p === "anno") { primaDal = unAnnoPrima(dal); primaAl = unAnnoPrima(fino); }
  else { const n = giorniFra(dal, al) + 1; primaDal = piu(dal, -n); primaAl = piu(dal, -1); }
  const parziale = fino !== al ? " negli stessi giorni" : "";
  const nomePrima = (confronto === "anno" ? "l'anno prima" : p === "serata" ? "lo stesso giorno della settimana scorsa"
    : p === "settimana" ? "la settimana prima" : p === "mese" ? "il mese prima" : p === "anno" ? "l'anno prima" : "i giorni subito prima") + parziale;
  return { dal, al, primaDal, primaAl, nomePrima };
}

const euro = (n: number) => Number(n ?? 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const minuti = (n: number) => Number(n).toLocaleString("it-IT", { maximumFractionDigits: 1 });
const euroTondo = (n: number) => Math.round(Number(n ?? 0)).toLocaleString("it-IT") + " €";
const dataBreve = (g: string) => new Date(g + "T12:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "short" });
const TIPO: Record<string, string> = { domicilio: "Consegna", ritiro: "Ritiro", tavolo: "Tavolo", banco: "Banco" };
const STATO: Record<string, string> = { ricevuto: "Ricevuto", in_preparazione: "In preparazione", pronto: "Pronto", in_consegna: "In consegna", consegnato: "Consegnato", ritirato: "Ritirato", annullato: "Annullato" };
const GIORNI = ["", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];
const PERIODI: [Periodo, string][] = [["serata", "Serata"], ["settimana", "Settimana"], ["mese", "Mese"], ["anno", "Anno"], ["7", "Ultimi 7 giorni"], ["30", "Ultimi 30 giorni"], ["12m", "Ultimi 12 mesi"], ["libero", "Dal… al…"]];

async function leggiConti(dal: string, al: string, canali: string[], tipi: string[]): Promise<Conti> {
  const { data, error } = await supabaseBrowser().rpc("cruscotto", { p_dal: dal, p_al: al, p_canali: canali.length ? canali : null, p_tipi: tipi.length ? tipi : null });
  if (error) throw new Error(error.message);
  return data as Conti;
}

function Dashboard() {
  const oggi = giornataDi(Date.now());
  const [periodo, setPeriodo] = useState<Periodo>("serata");
  const [giorno, setGiorno] = useState(oggi);
  const [liberoDal, setLiberoDal] = useState(piu(oggi, -13));
  const [liberoAl, setLiberoAl] = useState(oggi);
  const [confronto, setConfronto] = useState<Confronto>("prima");
  const [canali, setCanali] = useState<string[]>([]);
  const [tipi, setTipi] = useState<string[]>([]);
  const [c, setC] = useState<Conti | null>(null);
  const [p, setP] = useState<Conti | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const iv = useMemo(() => intervallo(periodo, giorno, liberoDal, liberoAl, confronto), [periodo, giorno, liberoDal, liberoAl, confronto]);

  useEffect(() => {
    let vivo = true;
    setC(null); setP(null); setErrore(null);
    Promise.all([leggiConti(iv.dal, iv.al, canali, tipi), leggiConti(iv.primaDal, iv.primaAl, canali, tipi)])
      .then(([a, b]) => { if (vivo) { setC(a); setP(b); } })
      .catch((e: Error) => vivo && setErrore(e.message));
    return () => { vivo = false; };
  }, [iv, canali, tipi]);

  const diff = (a: number, b: number | undefined) => {
    if (b == null || b === 0) return null;
    const d = Math.round(((a - b) / b) * 100);
    return <small className={d >= 0 ? "db-su" : "db-giu"}>{d >= 0 ? "▲" : "▼"} {Math.abs(d)}% <span className="muto">({typeof b === "number" && b % 1 ? euro(b) : b.toLocaleString("it-IT")})</span></small>;
  };
  const scorre = periodo === "serata" || periodo === "settimana" || periodo === "mese" || periodo === "anno" || periodo === "7" || periodo === "30" || periodo === "12m";
  function sposta(verso: 1 | -1) {
    if (periodo === "mese") setGiorno(verso < 0 ? piu(iv.dal, -1) : piu(iv.al, 1));
    else if (periodo === "anno") setGiorno(annoSpostato(giorno, verso));
    else if (periodo === "12m") setGiorno(verso < 0 ? unAnnoPrima(giorno) : piu(giorno, 365));
    else setGiorno(piu(giorno, verso * (periodo === "serata" ? 1 : periodo === "30" ? 30 : 7)));
  }
  const titolo = iv.dal === iv.al
    ? new Date(iv.dal + "T12:00:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : periodo === "mese" ? new Date(iv.dal + "T12:00:00").toLocaleDateString("it-IT", { month: "long", year: "numeric" })
    : periodo === "anno" ? iv.dal.slice(0, 4)
    : `dal ${new Date(iv.dal + "T12:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "short", year: iv.dal.slice(0, 4) !== iv.al.slice(0, 4) ? "numeric" : undefined })} al ${new Date(iv.al + "T12:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}`;
  const giorni = giorniFra(iv.dal, iv.al) + 1;
  const t = c?.totali;
  const tp = p?.totali;
  const venduto = Number(t?.venduto ?? 0);
  const commuta = (xs: string[], x: string) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);

  return (
    <main className="db-pagina">
      <div className="db-testa">
        <h1>Conti e cruscotto</h1>
        {/* anche da casa: dalla dashboard si cambia il menù (Edoardo, 26/10/2026) */}
        <a href="/cassa/menu" className="db-menu">Cambia il menù →</a>
      </div>

      <div className="db-scelte">
        <select value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)} aria-label="Periodo">
          {PERIODI.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
        </select>
        {periodo === "libero" ? (
          <span className="db-giorno">
            <input type="date" value={liberoDal} onChange={(e) => e.target.value && setLiberoDal(e.target.value)} aria-label="Dal" />
            <input type="date" value={liberoAl} onChange={(e) => e.target.value && setLiberoAl(e.target.value)} aria-label="Al" />
          </span>
        ) : scorre && (
          <span className="db-giorno">
            <button onClick={() => sposta(-1)} aria-label="Prima">‹</button>
            <input type="date" value={giorno} onChange={(e) => e.target.value && setGiorno(e.target.value)} aria-label="Giorno" />
            <button onClick={() => sposta(1)} aria-label="Dopo">›</button>
            {giorno !== oggi && <button className="db-oggi" onClick={() => setGiorno(oggi)}>Oggi</button>}
          </span>
        )}
        <span className="db-periodi" role="group" aria-label="Confronto">
          <button className={confronto === "prima" ? "on" : ""} onClick={() => setConfronto("prima")}>Col periodo prima</button>
          <button className={confronto === "anno" ? "on" : ""} onClick={() => setConfronto("anno")}>Con l&apos;anno prima</button>
        </span>
      </div>
      <div className="db-filtri">
        <span className="muto">Origine</span>
        {Object.entries(CANALE_COMANDA).map(([k, n]) => (
          <button key={k} className={canali.includes(k) ? "on" : ""} aria-pressed={canali.includes(k)} onClick={() => setCanali((x) => commuta(x, k))}>{n}</button>
        ))}
        <span className="muto">Tipo</span>
        {Object.entries(TIPO).map(([k, n]) => (
          <button key={k} className={tipi.includes(k) ? "on" : ""} aria-pressed={tipi.includes(k)} onClick={() => setTipi((x) => commuta(x, k))}>{n}</button>
        ))}
        {(canali.length > 0 || tipi.length > 0) && <button onClick={() => { setCanali([]); setTipi([]); }}>Tutti</button>}
      </div>

      <p className="db-titolo">{titolo} <span className="muto">· confronto con {iv.nomePrima} ({iv.primaDal === iv.primaAl ? dataBreve(iv.primaDal) : `${dataBreve(iv.primaDal)}–${dataBreve(iv.primaAl)}`})</span></p>
      {errore && <p className="lo-errore">Non riesco a leggere i conti: {errore}</p>}
      {!c && !errore && <p className="muto">Calcolo i conti…</p>}

      {c && t && (
        <>
          <p className="db-frase">
            {t.ordini === 0 ? "Nessun ordine in questo periodo." : <>
              Hai venduto <b>{euroTondo(venduto)}</b> in <b>{t.ordini}</b> ordini{giorni > 1 ? <>, <b>{euroTondo(venduto / Math.max(1, c.per_giorno.length))}</b> a sera aperta</> : null}
              {tp && tp.venduto > 0 ? <>: {venduto >= tp.venduto ? "+" : "−"}{euroTondo(Math.abs(venduto - tp.venduto))} rispetto a {iv.nomePrima}.</> : "."}
            </>}
          </p>
          <div className="db-kpi">
            <div className="carta"><span>Venduto</span><b>{euro(venduto)}</b>{diff(venduto, tp ? Number(tp.venduto) : undefined)}</div>
            <div className="carta"><span>Ordini</span><b>{t.ordini}</b>{diff(t.ordini, tp?.ordini)}</div>
            <div className="carta"><span>Scontrino medio</span><b>{euro(t.medio)}</b>{diff(Number(t.medio), tp ? Number(tp.medio) : undefined)}</div>
          </div>

          <div className="db-rami">
            <Ramo titolo="Gli altri numeri" riassunto={`${t.coperti} persone · ${t.annullati} annullati`} aperto>
              <div className="db-kpi db-kpi-piccoli">
                <div className="carta"><span>Persone servite (coperti)</span><b>{t.coperti}</b>{diff(t.coperti, tp?.coperti)}</div>
                <div className="carta"><span>Spesa a persona</span><b>{t.coperti && t.venduto_coperti ? euro(Number(t.venduto_coperti) / t.coperti) : "—"}</b><small className="muto">{t.coperti ? "sugli ordini coi coperti" : "nessun ordine coi coperti"}</small></div>
                <div className="carta"><span>Sconti fatti</span><b>{euro(t.sconti)}</b>{diff(Number(t.sconti), tp ? Number(tp.sconti) : undefined)}</div>
                <div className="carta"><span>Consegne pagate dai clienti</span><b>{euro(t.consegna)}</b></div>
                <div className="carta"><span>Annullati</span><b>{t.annullati}</b><small className="muto">{euro(t.annullati_euro)}, fuori dai conti</small></div>
                <div className="carta"><span>Clienti con la scheda</span><b>{t.clienti}</b></div>
                <div className="carta"><span>Consegne puntuali</span><b>{t.misurate ? `${Math.round((t.puntuali / t.misurate) * 100)}%` : "—"}</b><small className="muto">{t.misurate} consegne con l&apos;ora · entro la mezz&apos;ora scelta{t.in_anticipo ? ` · ${t.in_anticipo} consegnate molto prima, da guardare` : ""}</small></div>
                <div className="carta"><span>Ritardo medio</span><b>{t.ritardo_medio == null ? "—" : `${minuti(t.ritardo_medio)} min`}</b><small className="muto">dopo la mezz&apos;ora scelta</small></div>
                <div className="carta"><span>Viaggio medio del rider</span><b>{t.viaggio_medio == null ? "—" : `${minuti(t.viaggio_medio)} min`}</b><small className="muto">dalla partenza alla consegna</small></div>
              </div>
            </Ramo>

            <Ramo titolo="Da dove arrivano gli ordini" riassunto={primo(c.per_canale, (k) => CANALE_COMANDA[k] ?? k)}>
              <Barre voci={c.per_canale.map((x) => ({ k: CANALE_COMANDA[x.k] ?? x.k, n: x.n, euro: x.euro }))} totale={venduto} />
            </Ramo>
            <Ramo titolo="Come ordinano" riassunto={primo(c.per_tipo, (k) => TIPO[k] ?? k)}>
              <Barre voci={c.per_tipo.map((x) => ({ k: TIPO[x.k] ?? x.k, n: x.n, euro: x.euro }))} totale={venduto} />
            </Ramo>
            <Ramo titolo="Come pagano" riassunto={primo(c.per_pagamento, (k) => k)}>
              <Barre voci={c.per_pagamento} totale={venduto} />
            </Ramo>
            <Ramo titolo="Ordini per stato" riassunto={`${c.per_stato.reduce((s, x) => s + x.n, 0)} in tutto`}>
              {c.per_stato.map((x) => <div className="db-riga2" key={x.k}><span>{STATO[x.k] ?? x.k}</span><span className="db-num">{x.n}</span></div>)}
            </Ramo>

            <Ramo titolo="Per ora" riassunto={c.per_ora.length ? `il picco alle ${String([...c.per_ora].sort((a, b) => b.n - a.n)[0].h).padStart(2, "0")}:00` : "—"}>
              <Colonne voci={oreConZeri(c.per_ora).map((x) => ({ k: `${String(x.h).padStart(2, "0")}`, n: x.n, euro: x.euro }))} />
            </Ramo>
            <Ramo titolo="Giorni della settimana" riassunto={c.per_giorno_settimana.length ? `il più forte: ${GIORNI[[...c.per_giorno_settimana].sort((a, b) => b.euro / b.sere - a.euro / a.sere)[0].d].toLowerCase()}` : "—"}>
              <p className="muto">La media a sera, per giorno della settimana.</p>
              <Barre voci={c.per_giorno_settimana.map((x) => ({ k: GIORNI[x.d], n: Math.round(x.n / x.sere), euro: x.euro / x.sere }))} totale={Math.max(...c.per_giorno_settimana.map((x) => x.euro / x.sere), 1)} ordinate={false} />
            </Ramo>
            {giorni > 1 && (
              <Ramo titolo="Andamento" riassunto={giorni > 62 ? `${c.per_mese.length} mesi` : `${c.per_giorno.length} sere aperte`}>
                {giorni > 62
                  ? <Colonne voci={c.per_mese.map((x) => ({ k: new Date(x.m + "-15T12:00:00").toLocaleDateString("it-IT", { month: "short", year: "2-digit" }), n: x.n, euro: x.euro }))} euroSopra />
                  : <Colonne voci={c.per_giorno.map((x) => ({ k: giorni > 31 ? `${Number(x.g.slice(8))}/${Number(x.g.slice(5, 7))}` : x.g.slice(8), n: x.n, euro: x.euro }))} euroSopra />}
                <Progressivo righe={giorni > 62 ? c.per_mese.map((x) => x.euro) : c.per_giorno.map((x) => x.euro)} />
              </Ramo>
            )}

            <Ramo titolo="Prodotti più venduti" riassunto={c.prodotti[0] ? `${c.prodotti[0].nome}, ${euroTondo(c.prodotti[0].euro)}` : "—"}>
              <p className="muto">I pezzi contano anche quelli dentro i menu; gli euro sono il prezzo della riga (dentro un menu il prezzo sta sul menu).{c.prodotti.length >= 60 ? " Qui i primi 60." : ""}</p>
              <div className="db-tabella"><table>
                <thead><tr><th>Prodotto</th><th>Categoria</th><th className="num">Pezzi</th><th className="num">nei menu</th><th className="num">Euro</th></tr></thead>
                <tbody>{c.prodotti.map((x) => <tr key={x.nome}><td>{x.nome}</td><td className="muto">{x.categoria ?? ""}</td><td className="num">{x.pezzi}</td><td className="num">{x.nei_menu ?? ""}</td><td className="num">{euro(x.euro)}</td></tr>)}</tbody>
              </table></div>
            </Ramo>
            <Ramo titolo="Categorie" riassunto={c.categorie[0] ? `${c.categorie[0].nome}, ${euroTondo(c.categorie[0].euro)}` : "—"}>
              <Barre voci={c.categorie.map((x) => ({ k: x.nome, n: x.pezzi, euro: x.euro }))} totale={c.categorie.reduce((s, x) => s + Number(x.euro), 0)} pezzi />
            </Ramo>

            <Ramo titolo="Sconti" riassunto={`${euroTondo(t.sconti)} in ${c.sconti.reduce((s, x) => s + x.n, 0)} ordini`}>
              {c.sconti.length === 0 ? <p className="muto">Nessuno sconto.</p>
                : c.sconti.map((x) => <div className="db-riga2" key={x.voce}><span>{x.voce}</span><span className="db-num">{x.n} volte · −{euro(x.euro)}</span></div>)}
            </Ramo>
            <Ramo titolo="Rider" riassunto={`${c.rider.reduce((s, x) => s + x.consegne, 0)} consegne`}>
              {c.rider.length === 0 ? <p className="muto">Nessuna consegna.</p> : (
                <div className="db-tabella"><table>
                  <thead><tr><th>Rider</th><th className="num">Consegne</th><th className="num">Euro</th><th className="num">Contanti</th><th className="num">In ritardo</th><th className="num">Ritardo medio</th><th className="num">Viaggio medio</th><th className="num">Annullate</th></tr></thead>
                  <tbody>{c.rider.map((x) => <tr key={x.nome}><td>{x.nome}</td><td className="num">{x.consegne}</td><td className="num">{euro(x.euro)}</td><td className="num">{euro(x.contanti)}</td><td className="num">{x.in_ritardo}</td><td className="num">{x.ritardo_medio == null ? "" : `${minuti(x.ritardo_medio)} min`}</td><td className="num">{x.viaggio_medio == null ? "" : `${minuti(x.viaggio_medio)} min`}</td><td className="num">{x.annullate}</td></tr>)}</tbody>
                </table></div>
              )}
              {periodo === "serata" && <p className="muto">Il dare-avere della serata coi rider è in <a href="/cassa/riepilogo">Riepilogo</a>.</p>}
            </Ramo>
            <Ramo titolo="Zone" riassunto={c.zone[0] ? `${c.zone[0].nome.toLowerCase()} prima, ${c.zone[0].n} consegne` : "—"}>
              {c.zone.length === 0 ? <p className="muto">Nessuna consegna.</p> : (
                <div className="db-tabella"><table>
                  <thead><tr><th>Zona</th><th className="num">Ordini</th><th className="num">Euro</th><th className="num">Scontrino medio</th><th className="num">Consegne pagate</th><th className="num">Ritardo medio</th></tr></thead>
                  <tbody>{c.zone.map((x) => <tr key={x.nome}><td>{x.nome}</td><td className="num">{x.n}</td><td className="num">{euro(x.euro)}</td><td className="num">{euro(x.medio)}</td><td className="num">{euro(x.consegna)}</td><td className="num">{x.ritardo_medio == null ? "" : `${minuti(x.ritardo_medio)} min`}</td></tr>)}</tbody>
                </table></div>
              )}
            </Ramo>
            <Ramo titolo="Clienti" riassunto={`${c.clienti.nuovi} nuovi · ${c.clienti.ricorrenti} tornati`}>
              <div className="db-kpi db-kpi-piccoli">
                <div className="carta"><span>Nuovi (primo ordine)</span><b>{c.clienti.nuovi}</b></div>
                <div className="carta"><span>Tornati</span><b>{c.clienti.ricorrenti}</b></div>
                <div className="carta"><span>Ordini senza scheda</span><b>{c.clienti.senza_scheda}</b></div>
              </div>
              <p className="muto">Contano gli ordini della cassa nuova: lo storico di Velocissimo non c&apos;è ancora.</p>
              {c.clienti.migliori.length > 0 && <>
                <h3>I migliori del periodo</h3>
                {c.clienti.migliori.map((x) => <div className="db-riga2" key={x.telefono}><span>{x.nome} <span className="muto">{x.telefono}</span></span><span className="db-num">{x.n} ordini · {euro(x.euro)}</span></div>)}
              </>}
              <DaRiconquistare />
            </Ramo>
            <Ramo titolo="Punti e coupon" riassunto={`${c.punti.dati} punti dati · ${c.coupon.ordini_con_coupon} coupon`}>
              <div className="db-kpi db-kpi-piccoli">
                <div className="carta"><span>Punti dati</span><b>{c.punti.dati}</b></div>
                <div className="carta"><span>Punti spesi in premi</span><b>{c.punti.spesi}</b></div>
                <div className="carta"><span>Tolti per annulli</span><b>{c.punti.tolti_annulli}</b></div>
                <div className="carta"><span>Ordini con coupon</span><b>{c.coupon.ordini_con_coupon}</b></div>
                <div className="carta"><span>Coupon emessi / usati</span><b>{c.coupon.emessi} / {c.coupon.usati}</b></div>
              </div>
            </Ramo>
            <Ramo titolo="Tutti gli ordini" riassunto="cerca, filtra, scarica">
              <Ordini dal={iv.dal} al={iv.al} canali={canali} tipi={tipi} serata={periodo === "serata" ? giorno : null} />
            </Ramo>
          </div>
        </>
      )}
    </main>
  );
}

/** Le ore dalla prima all'ultima con ordini, anche quelle vuote (a zero): il grafico non deve sembrare continuo. */
function oreConZeri(xs: { h: number; n: number; euro: number }[]) {
  if (xs.length === 0) return xs;
  const pos = (h: number) => (h + 18) % 24;   // dalle 6 alle 6
  const da = Math.min(...xs.map((x) => pos(x.h))), a = Math.max(...xs.map((x) => pos(x.h)));
  return Array.from({ length: a - da + 1 }, (_, i) => { const h = (da + i + 6) % 24; return xs.find((x) => x.h === h) ?? { h, n: 0, euro: 0 }; });
}

function primo(xs: Voce[], nome: (k: string) => string) {
  const tot = xs.reduce((s, x) => s + Number(x.euro), 0);
  return xs[0] && tot > 0 ? `${nome(xs[0].k)} ${Math.round((Number(xs[0].euro) / tot) * 100)}%` : "—";
}

// il contenuto si monta solo a ramo aperto: l'elenco degli ordini non si scarica se nessuno lo guarda (critico giro 40)
function Ramo({ titolo, riassunto, aperto, children }: { titolo: string; riassunto: string; aperto?: boolean; children: React.ReactNode }) {
  const [su, setSu] = useState(!!aperto);
  return (
    <details className="carta db-ramo" open={aperto} onToggle={(e) => setSu((e.target as HTMLDetailsElement).open)}>
      <summary><span>{titolo}</span><span className="muto">{riassunto}</span></summary>
      {su && <div className="db-ramo-dentro">{children}</div>}
    </details>
  );
}

function Barre({ voci, totale, ordinate = true, pezzi }: { voci: Voce[]; totale: number; ordinate?: boolean; pezzi?: boolean }) {
  if (voci.length === 0) return <p className="muto">Nessun ordine.</p>;
  const max = Math.max(1, ...voci.map((x) => Number(x.euro)));
  return (
    <>
      {(ordinate ? [...voci].sort((a, b) => b.euro - a.euro) : voci).map((x) => (
        <div className="db-barra" key={x.k}>
          <span className="db-nome">{x.k}</span>
          <span className="db-fondo"><span style={{ width: `${Math.round((Number(x.euro) / max) * 100)}%` }} /></span>
          <span className="db-num">{x.n}{pezzi ? " pz" : ""} · {euro(x.euro)}{totale > 0 && ordinate ? <span className="muto"> · {Math.round((Number(x.euro) / totale) * 100)}%</span> : null}</span>
        </div>
      ))}
    </>
  );
}

function Colonne({ voci, euroSopra }: { voci: Voce[]; euroSopra?: boolean }) {
  if (voci.length === 0) return <p className="muto">Nessun ordine.</p>;
  const max = Math.max(1, ...voci.map((x) => Number(x.euro)));
  return (
    <div className="db-colonne" role="img" aria-label="Grafico a colonne">
      {voci.map((x) => (
        <div className="db-col" key={x.k} title={`${x.k}: ${x.n} ordini, ${euro(x.euro)}`}>
          <small>{euroSopra ? euroTondo(x.euro) : x.n}</small>
          <span style={{ height: `${Math.max(2, Math.round((Number(x.euro) / max) * 100))}%` }} />
          <b>{x.k}</b>
        </div>
      ))}
    </div>
  );
}

function Progressivo({ righe }: { righe: number[] }) {
  let s = 0;
  const cum = righe.map((x) => (s += Number(x)));
  if (cum.length < 2) return null;
  return <p className="muto">Progressivo: {cum.map((x, i) => (i === cum.length - 1 || i % Math.ceil(cum.length / 6) === 0 ? euroTondo(x) : null)).filter(Boolean).join(" → ")}</p>;
}

/** «Clienti da riconquistare» (Velocissimo, Marketing e Clienti), ma solo chi ha ordinato almeno due volte. */
function DaRiconquistare() {
  const [giorni, setGiorni] = useState(45);
  const [righe, setRighe] = useState<{ id: string; nome: string | null; telefono: string; ordini: number; speso: number; giorni: number; consenso: boolean }[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  async function leggi() {
    setErrore(null);
    const { data, error } = await supabaseBrowser().rpc("clienti_da_riconquistare", { p_giorni: giorni, p_min: 2 });
    if (error) setErrore(error.message); else setRighe((data ?? []) as typeof righe);
  }
  return (
    <div className="db-riconquista">
      <h3>Da riconquistare</h3>
      <p>Chi ha ordinato almeno due volte e non torna da più di{" "}
        <select value={giorni} onChange={(e) => { setGiorni(Number(e.target.value)); setRighe(null); }}>
          {[30, 45, 60, 90, 180].map((g) => <option key={g} value={g}>{g}</option>)}
        </select> giorni. <button onClick={leggi}>Mostra</button></p>
      {errore && <p className="lo-errore">{errore}</p>}
      {righe && (righe.length === 0 ? <p className="muto">Nessuno.</p> : righe.map((x) => (
        <div className="db-riga2" key={x.id}><span>{x.nome ?? "—"} <span className="muto">{x.telefono}{x.consenso ? " · ok marketing" : ""}</span></span><span className="db-num">{x.ordini} ordini · {euro(x.speso)} · {x.giorni} giorni fa</span></div>
      )))}
    </div>
  );
}

interface RigaOrd {
  id: string; numero: number; numero_visibile: string | null; tipo: string; canale: string; stato: string;
  totale: number; sconto: number | null; costo_consegna: number | null; pagamento: string | null; pagato_online: boolean;
  coperti: number | null; creato_il: string; ora_consegna: string | null; note: string | null; nome_cliente: string | null;
  cliente: { nome: string | null; telefono: string | null } | null;
  indirizzo: { via: string; civico: string | null } | null;
  zona: { nome: string } | null;
  consegna: { stato: string; consegnata_il: string | null; rider: { nome: string } | null }[] | null;
}
const SELECT = "id, numero, numero_visibile, tipo, canale, stato, totale, sconto, costo_consegna, pagamento, pagato_online, coperti, creato_il, ora_consegna, note, nome_cliente, cliente(nome, telefono), indirizzo(via, civico), zona(nome), consegna(stato, consegnata_il, rider(nome))";
const pagamentoDi = (r: RigaOrd) => (r.pagato_online ? "online" : r.pagamento === "pos" ? "POS" : r.pagamento === "contanti" ? "contanti" : "non indicato");
const ora = (s: string | null) => (s ? new Date(s).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" }) : "");

/** L'elenco degli ordini del periodo: solo da leggere (in Velocissimo lo stato si cambia dalla riga: qui no). */
function Ordini({ dal, al, canali, tipi, serata }: { dal: string; al: string; canali: string[]; tipi: string[]; serata: string | null }) {
  const [righe, setRighe] = useState<RigaOrd[] | null>(null);
  const [troppi, setTroppi] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [cerca, setCerca] = useState("");
  const [stato, setStato] = useState("");
  const [aperto, setAperto] = useState<string | null>(null);
  const [quanti, setQuanti] = useState(200);

  useEffect(() => {
    let vivo = true;
    setRighe(null); setErrore(null); setTroppi(false);
    (async () => {
      const da = new Date(inizio(dal)).toISOString(), a = new Date(inizio(piu(al, 1))).toISOString();
      const tutte: RigaOrd[] = [];
      // a pagine da 1000, al massimo 5.000: per un anno si filtra prima
      for (let pg = 0; pg < 5; pg++) {
        let q = supabaseBrowser().from("ordine").select(SELECT).gte("creato_il", da).lt("creato_il", a);
        if (canali.length) q = q.in("canale", canali);
        if (tipi.length) q = q.in("tipo", tipi);
        const { data, error } = await q.order("creato_il", { ascending: false }).range(pg * 1000, pg * 1000 + 999);
        if (error) { if (vivo) setErrore(error.message); return; }
        tutte.push(...((data ?? []) as unknown as RigaOrd[]).map((r) => ({ ...r, totale: Number(r.totale) })));
        if ((data ?? []).length < 1000) break;
        if (pg === 4) setTroppi(true);
      }
      if (vivo) setRighe(tutte);
    })();
    return () => { vivo = false; };
  }, [dal, al, canali, tipi]);

  const filtrate = useMemo(() => {
    if (!righe) return [];
    const s = cerca.trim().toLowerCase();
    return righe.filter((r) => (!stato || r.stato === stato) && (!s || [r.numero_visibile, String(r.numero), r.cliente?.nome, r.cliente?.telefono, r.nome_cliente, r.note,
      r.indirizzo?.via, r.zona?.nome, r.consegna?.[0]?.rider?.nome].some((x) => x && x.toLowerCase().includes(s))));
  }, [righe, cerca, stato]);

  function scarica() {
    const intesta = ["Numero", "Data", "Ora", "Per le", "Tipo", "Origine", "Stato", "Cliente", "Telefono", "Indirizzo", "Zona", "Pagamento", "Coperti", "Sconto", "Consegna", "Totale", "Rider", "Note"];
    // una nota che comincia con = + - @ in Excel diventerebbe una formula (critico giro 40): si mette un apostrofo
    const q = (v: unknown) => { const t = String(v ?? ""); return `"${(/^[=+\-@\t\r]/.test(t) ? "'" + t : t).replace(/"/g, '""')}"`; };
    const n2 = (x: number | null) => Number(x ?? 0).toFixed(2).replace(".", ",");
    const righeCsv = filtrate.map((r) => [
      r.numero_visibile ?? r.numero, new Date(r.creato_il).toLocaleDateString("it-IT", { timeZone: "Europe/Rome" }), ora(r.creato_il), ora(r.ora_consegna),
      TIPO[r.tipo] ?? r.tipo, CANALE_COMANDA[r.canale] ?? r.canale, STATO[r.stato] ?? r.stato,
      r.cliente?.nome ?? r.nome_cliente ?? "", r.cliente?.telefono ?? "", r.indirizzo ? `${r.indirizzo.via} ${r.indirizzo.civico ?? ""}`.trim() : "", r.zona?.nome ?? "",
      pagamentoDi(r), r.coperti ?? "", n2(r.sconto), n2(r.costo_consegna), n2(r.totale), r.consegna?.[0]?.rider?.nome ?? "", r.note ?? "",
    ].map(q).join(";"));
    // il punto e virgola e il BOM: Excel in italiano lo apre già in colonne
    const blob = new Blob(["﻿" + [intesta.map(q).join(";"), ...righeCsv].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const el = document.createElement("a");
    el.href = URL.createObjectURL(blob);
    el.download = `ordini_${dal}${al !== dal ? "_" + al : ""}.csv`;
    el.click();
    URL.revokeObjectURL(el.href);
  }

  if (errore) return <p className="lo-errore">{errore}</p>;
  if (!righe) return <p className="muto">Leggo gli ordini…</p>;
  return (
    <>
      <div className="db-ordini-testa">
        <input className="db-cerca" placeholder="Cerca numero, cliente, telefono, via, note, rider…" value={cerca} onChange={(e) => setCerca(e.target.value)} />
        <select value={stato} onChange={(e) => setStato(e.target.value)} aria-label="Stato">
          <option value="">Tutti gli stati</option>
          {Object.entries(STATO).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
        </select>
        <div className="db-scarica">
          <button onClick={scarica}>Scarica CSV ({filtrate.length})</button>
          {serata && <a href={`/api/ordini/csv?giornata=${serata}`}><button>CSV per mano-a-mano-os (40 colonne)</button></a>}
        </div>
      </div>
      {troppi && <p className="muto">Più di 5.000 ordini: ne mostro 5.000. Scegli un periodo più corto o un filtro.</p>}
      <div className="db-tabella">
        <table>
          <thead><tr><th>N.</th><th>Quando</th><th>Per le</th><th>Tipo</th><th>Origine</th><th>Cliente</th><th>Pagamento</th><th>Stato</th><th>Rider</th><th className="num">Totale</th></tr></thead>
          <tbody>
            {filtrate.slice(0, quanti).map((r) => (
              <FilaOrdine key={r.id} r={r} aperto={aperto === r.id} onApri={() => setAperto((x) => (x === r.id ? null : r.id))} />
            ))}
          </tbody>
        </table>
      </div>
      {filtrate.length > quanti && <button onClick={() => setQuanti((x) => x + 500)}>Mostra altri ({filtrate.length - quanti})</button>}
    </>
  );
}

function FilaOrdine({ r, aperto, onApri }: { r: RigaOrd; aperto: boolean; onApri: () => void }) {
  return (
    <>
      <tr className={(r.stato === "annullato" ? "annullato " : "") + "db-fila"} onClick={onApri} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onApri()} aria-expanded={aperto}>
        <td>{r.numero_visibile ?? r.numero}</td>
        <td>{new Date(r.creato_il).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" })}</td>
        <td>{ora(r.ora_consegna)}</td>
        <td>{TIPO[r.tipo] ?? r.tipo}</td>
        <td>{CANALE_COMANDA[r.canale] ?? r.canale}</td>
        <td>{r.cliente?.nome ?? r.nome_cliente ?? ""}</td>
        <td>{pagamentoDi(r)}</td>
        <td>{STATO[r.stato] ?? r.stato}</td>
        <td>{r.consegna?.[0]?.rider?.nome ?? ""}</td>
        <td className="num">{euro(r.totale)}</td>
      </tr>
      {aperto && <tr className="db-scheda-riga"><td colSpan={10}><SchedaOrdine r={r} /></td></tr>}
    </>
  );
}

/** La scheda di un ordine: le righe, gli sconti, la storia degli stati. Solo da leggere. */
function SchedaOrdine({ r }: { r: RigaOrd }) {
  const [d, setD] = useState<{ righe: { id: string; descrizione: string; quantita: number; prezzo_unit: number; variazioni: { nome: string; prezzo: number; tipo: string }[] | null; note: string | null; id_riga_padre: string | null }[];
    storia: { da: string | null; a: string; quando: string }[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    const s = supabaseBrowser();
    Promise.all([
      s.from("ordine_riga").select("id, descrizione, quantita, prezzo_unit, variazioni, note, id_riga_padre").eq("id_ordine", r.id),
      s.from("ordine_stato_log").select("da, a, quando").eq("id_ordine", r.id).order("quando"),
    ]).then(([a, b]) => (a.error || b.error ? setErr((a.error ?? b.error)!.message) : setD({ righe: (a.data ?? []) as never, storia: (b.data ?? []) as never })));
  }, [r.id]);
  if (err) return <p className="lo-errore">{err}</p>;
  if (!d) return <p className="muto">Leggo l&apos;ordine…</p>;
  const madri = d.righe.filter((x) => !x.id_riga_padre);
  return (
    <div className="db-scheda">
      <div>
        {madri.map((x) => (
          <div key={x.id} className="db-scheda-voce">
            <b>{Number(x.quantita)} × {x.descrizione}</b> <span className="db-num">{euro(Number(x.quantita) * (Number(x.prezzo_unit) + (x.variazioni ?? []).reduce((t, v) => t + Number(v.prezzo || 0), 0)))}</span>
            {(x.variazioni ?? []).length > 0 && <div className="muto">{(x.variazioni ?? []).map((v) => `${v.tipo === "rimozione" ? "senza " : "+ "}${v.nome}${Number(v.prezzo) ? ` ${euro(v.prezzo)}` : ""}`).join(", ")}</div>}
            {d.righe.filter((f) => f.id_riga_padre === x.id).map((f) => <div key={f.id} className="muto">· {Number(f.quantita)} × {f.descrizione}</div>)}
            {x.note && <div className="muto">nota: {x.note}</div>}
          </div>
        ))}
      </div>
      <div className="muto">
        {r.indirizzo && <div>{r.indirizzo.via} {r.indirizzo.civico ?? ""}{r.zona ? ` · ${r.zona.nome}` : ""}</div>}
        {r.cliente?.telefono && <div>tel. {r.cliente.telefono}</div>}
        {Number(r.sconto) > 0 && <div>sconto −{euro(Number(r.sconto))}</div>}
        {Number(r.costo_consegna) > 0 && <div>consegna {euro(Number(r.costo_consegna))}</div>}
        {r.note && <div>note: {r.note}</div>}
        <div><b>Totale {euro(r.totale)}</b> · {pagamentoDi(r)}</div>
        <div className="db-storia">{d.storia.map((x, i) => <span key={i}>{new Date(x.quando).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" })} {STATO[x.a] ?? x.a}</span>)}</div>
      </div>
    </div>
  );
}
