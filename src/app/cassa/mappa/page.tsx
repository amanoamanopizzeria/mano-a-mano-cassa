"use client";

// Mappa live dei rider per la cassa: ogni posizione nuova sposta il segnaposto.
// Leaflet + OpenStreetMap (senza chiave API), caricati da CDN.
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";
import type { RiderInMappa } from "@/lib/types";
import "./mappa.css";

const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
// Via Novara 5/7, 00198 Roma: le stesse coordinate di PIZZERIA in src/lib/indirizzi.ts (che è server-only).
const CENTRO: [number, number] = [41.9176, 12.5037];

/** Una consegna in corso con il suo punto sulla mappa (letta da `consegna`, che lo staff può leggere). */
interface ConsegnaInMappa {
  id: string; stato: "da_assegnare" | "assegnata" | "ritirata"; id_rider: string | null;
  ordine: { numero: number; numero_visibile: string | null; ora_consegna: string | null; indirizzo: { via: string; civico: string | null; lat: number | null; lng: number | null } | null } | null;
}
const STATO_CONSEGNA: Record<ConsegnaInMappa["stato"], string> = { da_assegnare: "da assegnare", assegnata: "assegnata", ritirata: "in viaggio" };
const oraDi = (s: string) => new Date(s).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
const nomeOrdine = (o: ConsegnaInMappa["ordine"]) => o?.numero_visibile ?? `#${o?.numero ?? ""}`;
const iniziali = (nome: string) => nome.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join("");

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global { interface Window { L?: any } }

function caricaLeaflet(): Promise<any> {
  return new Promise((ok, ko) => {
    if (window.L) return ok(window.L);
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = LEAFLET_CSS;
      document.head.appendChild(css);
    }
    const s = document.createElement("script");
    s.src = LEAFLET_JS;
    s.onload = () => ok(window.L);
    s.onerror = () => ko(new Error("Mappa non caricata"));
    document.head.appendChild(s);
  });
}

export default function MappaPagina() {
  return (
    <AuthGate>
      <Mappa />
    </AuthGate>
  );
}

function Mappa() {
  const divRef = useRef<HTMLDivElement>(null);
  const mappaRef = useRef<any>(null);
  const segnapostiRef = useRef<Map<string, any>>(new Map());
  const consegneRef = useRef<Map<string, any>>(new Map());
  const lineeRef = useRef<any[]>([]);
  const [riders, setRiders] = useState<RiderInMappa[]>([]);
  const [erroreAssegna, setErroreAssegna] = useState<string | null>(null);
  // Assegna dalla cassa (mig. 0034): il rider la vede subito nella sua lista (realtime su consegna).
  async function assegna(idConsegna: string, idRider: string | null) {
    const { error } = await supabaseBrowser().rpc("assegna_consegna", { p_id: idConsegna, p_rider: idRider });
    setErroreAssegna(error ? error.message : null);
  }
  // Il rider più vicino alla consegna, fra quelli con una posizione fresca (10 minuti).
  function suggerito(k: ConsegnaInMappa): string | null {
    const i = k.ordine?.indirizzo;
    if (!i || i.lat == null || i.lng == null) return null;
    let best: { id: string; d: number } | null = null;
    for (const r of riders) {
      if (r.lat == null || r.lng == null || !r.aggiornata_il || Date.now() - new Date(r.aggiornata_il).getTime() > 10 * 60_000) continue;
      const d = Math.hypot((r.lat - i.lat) * 111, (r.lng - i.lng) * 83);
      if (!best || d < best.d) best = { id: r.id, d };
    }
    return best?.id ?? null;
  }
  const [consegne, setConsegne] = useState<ConsegnaInMappa[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  // Giro 12 del grafico: finché le tessere non arrivano (3–4 s al primo carico) si legge «Carico la mappa…».
  const [mappaPronta, setMappaPronta] = useState(false);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setErrore("Supabase non configurato.");
      return;
    }
    const supabase = supabaseBrowser();
    let vivo = true;

    async function carica(L: any) {
      const [{ data, error }, c] = await Promise.all([
        supabase.rpc("rider_in_mappa"),
        supabase.from("consegna").select("id, stato, id_rider, ordine(numero, numero_visibile, ora_consegna, indirizzo(via, civico, lat, lng))").in("stato", ["da_assegnare", "assegnata", "ritirata"]),
      ]);
      if (error) { setErrore(error.message); return; }
      const lista = (data ?? []) as RiderInMappa[];
      // solo la serata di oggi: quelle di domani stanno nei preordini della cassa (critico giro 10)
      const oggi = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
      const listaC = ((c.data ?? []) as unknown as ConsegnaInMappa[]).filter((k) => k.stato !== "da_assegnare" || !k.ordine?.ora_consegna || new Date(k.ordine.ora_consegna).toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" }) === oggi);
      if (!vivo) return;
      setRiders(lista);
      setConsegne(listaC);
      const mappa = mappaRef.current;
      // i rider: disco vino con le iniziali (grigio se non manda la posizione da più di 10 minuti)
      for (const r of lista) {
        if (r.lat == null || r.lng == null) continue;
        const pos: [number, number] = [r.lat, r.lng];
        const fermo = !r.aggiornata_il || Date.now() - new Date(r.aggiornata_il).getTime() > 10 * 60_000;
        const icona = L.divIcon({ className: "", html: `<div class="m-rider${fermo ? " fermo" : ""}" title="${r.nome}">${iniziali(r.nome)}</div>`, iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -22] });
        const testo = `<b>${r.nome}</b><span class="p-stato ${fermo ? "fermo" : "in_giro"}">${fermo ? "fermo" : "in giro"}</span><div class="p-riga">${r.consegne_in_corso} consegne in corso</div>${r.aggiornata_il ? `<div class="p-riga">posizione delle <b>${oraDi(r.aggiornata_il)}</b></div>` : ""}`;
        const m = segnapostiRef.current.get(r.id);
        if (m) m.setLatLng(pos).setIcon(icona).bindPopup(testo);
        else segnapostiRef.current.set(r.id, L.marker(pos, { icon: icona }).addTo(mappa).bindPopup(testo));
      }
      // le consegne: goccia oro (da assegnare), vino (assegnata), bianca col bordo vino (in viaggio)
      const vive = new Set<string>();
      for (const k of listaC) {
        const i = k.ordine?.indirizzo;
        if (!i || i.lat == null || i.lng == null) continue;
        vive.add(k.id);
        const pos: [number, number] = [i.lat, i.lng];
        const icona = L.divIcon({ className: "", html: `<div class="m-goccia ${k.stato}"><span>${k.ordine?.numero ?? ""}</span></div>`, iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -30] });
        const chi = k.id_rider ? lista.find((r) => r.id === k.id_rider)?.nome : null;
        const testo = `<b>${nomeOrdine(k.ordine)}</b><span class="p-stato ${k.stato}">${STATO_CONSEGNA[k.stato]}</span>${chi ? `<div class="p-riga">rider: <b>${chi}</b></div>` : ""}<div class="p-riga">${i.via} ${i.civico ?? ""}</div>${k.ordine?.ora_consegna ? `<div class="p-riga">per le <b>${oraDi(k.ordine.ora_consegna)}</b></div>` : ""}`;
        const m = consegneRef.current.get(k.id);
        if (m) m.setLatLng(pos).setIcon(icona).bindPopup(testo);
        else consegneRef.current.set(k.id, L.marker(pos, { icon: icona }).addTo(mappa).bindPopup(testo));
      }
      for (const [id, m] of consegneRef.current) if (!vive.has(id)) { m.remove(); consegneRef.current.delete(id); }
      // una linea tratteggiata dal rider alla consegna che sta portando
      for (const l of lineeRef.current) l.remove();
      lineeRef.current = [];
      for (const k of listaC) {
        const r = k.id_rider ? lista.find((x) => x.id === k.id_rider) : null;
        const i = k.ordine?.indirizzo;
        if (!r || r.lat == null || r.lng == null || !i || i.lat == null || i.lng == null) continue;
        lineeRef.current.push(L.polyline([[r.lat, r.lng], [i.lat, i.lng]], { color: "#8a1538", weight: 3, dashArray: "6 8", opacity: .7 }).addTo(mappa));
      }
    }

    let canale: any = null;
    caricaLeaflet()
      .then((L) => {
        if (!vivo || !divRef.current) return;
        mappaRef.current = L.map(divRef.current).setView(CENTRO, 13);
        const tessere = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap",
        }).addTo(mappaRef.current);
        tessere.once("load", () => { if (vivo) setMappaPronta(true); });
        // le scritte di Leaflet in italiano (erano «Zoom in», «Zoom out» e il rimando a Leaflet)
        mappaRef.current.attributionControl?.setPrefix("");
        const cont: HTMLElement = mappaRef.current.getContainer();
        cont.querySelector(".leaflet-control-zoom-in")?.setAttribute("title", "Avvicina");
        cont.querySelector(".leaflet-control-zoom-out")?.setAttribute("title", "Allontana");
        cont.querySelector(".leaflet-control-zoom-in")?.setAttribute("aria-label", "Avvicina");
        cont.querySelector(".leaflet-control-zoom-out")?.setAttribute("aria-label", "Allontana");
        // la pizzeria: il bollino in un disco bianco col bordo oro, sempre al centro della storia
        L.marker(CENTRO, { icon: L.divIcon({ className: "", html: `<div class="m-pizzeria" title="A Mano a Mano"><img src="/brand/bollino.png" alt=""/></div>`, iconSize: [46, 46], iconAnchor: [23, 23], popupAnchor: [0, -26] }), zIndexOffset: 1000 })
          .addTo(mappaRef.current).bindPopup(`<b>A Mano a Mano</b><div class="p-riga">Via Novara 5/7</div>`);
        carica(L);
        // ogni posizione nuova o cambio consegna aggiorna la mappa
        canale = supabase
          .channel("cassa-mappa")
          .on("postgres_changes", { event: "*", schema: "public", table: "rider" }, () => carica(L))
          .on("postgres_changes", { event: "*", schema: "public", table: "consegna" }, () => carica(L))
          .subscribe();
      })
      .catch((e) => setErrore(e.message));

    return () => {
      vivo = false;
      if (canale) supabase.removeChannel(canale);
      mappaRef.current?.remove();
      mappaRef.current = null;
      segnapostiRef.current.clear();
      consegneRef.current.clear();
      lineeRef.current = [];
    };
  }, []);

  const fermo = (r: RiderInMappa) => !r.aggiornata_il || Date.now() - new Date(r.aggiornata_il).getTime() > 10 * 60_000;
  const nomeRider = (id: string | null) => (id ? riders.find((r) => r.id === id)?.nome ?? null : null);

  return (
    <main className="mappa-pagina">
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Cassa — rider in mappa</h1>
        <span className="muto m-conta" style={{ fontSize: 15 }}><b>{riders.length}</b> rider · <b>{consegne.length}</b> consegne in corso</span>
      </div>
      {errore && <p style={{ color: "var(--accento)" }}>{errore}</p>}
      <div className="m-cornice">
        <div ref={divRef} className="mappa-mappa" />
        {!mappaPronta && !errore && <div className="m-carico" aria-live="polite"><img src="/brand/bollino.png" alt="" /><span>Carico la mappa…</span></div>}
      </div>
      <div className="carta m-legenda">
        <span className="voce"><span className="m-pizzeria"><img src="/brand/bollino.png" alt="" /></span>la pizzeria</span>
        <span className="voce"><span className="m-rider">R</span>rider</span>
        <span className="voce"><span className="m-rider fermo">R</span>rider senza posizione</span>
        <span className="voce"><span className="m-goccia"><span /></span>consegna da assegnare</span>
        <span className="voce"><span className="m-goccia assegnata"><span /></span>assegnata</span>
        <span className="voce"><span className="m-goccia ritirata"><span /></span>in viaggio</span>
      </div>

      <h2>Rider</h2>
      <div className="griglia">
        {riders.map((r) => (
          <div className="carta m-scheda" key={r.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className={"m-rider" + (fermo(r) ? " fermo" : "")}>{iniziali(r.nome)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ fontSize: 19 }}>{r.nome}</strong>
              <div className="muto">
                {r.consegne_in_corso} {r.consegne_in_corso === 1 ? "consegna" : "consegne"} in corso ·{" "}
                {r.aggiornata_il ? "posizione delle " + oraDi(r.aggiornata_il) : "nessuna posizione"}
              </div>
            </div>
            <span className={"m-stato " + (fermo(r) ? "fermo" : "in_giro")}>{fermo(r) ? "fermo" : "in giro"}</span>
          </div>
        ))}
        {riders.length === 0 && !errore && <p className="muto">Nessun rider attivo.</p>}
      </div>

      <h2>Consegne in corso</h2>
      {erroreAssegna && <p style={{ color: "var(--errore)", fontWeight: 700 }}>{erroreAssegna}</p>}
      <div className="griglia">
        {consegne.map((k) => (
          <div className="carta m-scheda" key={k.id} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span className={"m-goccia " + k.stato}><span>{k.ordine?.numero ?? ""}</span></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ fontSize: 19 }}>{nomeOrdine(k.ordine)}</strong>
              {k.ordine?.ora_consegna && <span className="muto"> · per le {oraDi(k.ordine.ora_consegna)}</span>}
              <div className="muto">{k.ordine?.indirizzo ? `${k.ordine.indirizzo.via} ${k.ordine.indirizzo.civico ?? ""}` : <b style={{ color: "var(--vino)" }}>senza indirizzo: da sistemare</b>}{nomeRider(k.id_rider) ? ` · ${nomeRider(k.id_rider)}` : ""}{k.ordine?.indirizzo && k.ordine.indirizzo.lat == null ? " · non sulla mappa" : ""}</div>
            </div>
            {k.stato !== "ritirata" && riders.length > 0 && (
              <select
                className="m-assegna"
                value={k.id_rider ?? ""}
                onChange={(e) => assegna(k.id, e.target.value || null)}
                aria-label={`Assegna ${nomeOrdine(k.ordine)} a un rider`}
              >
                <option value="">{k.id_rider ? "Togli il rider" : "Assegna a…"}</option>
                {riders.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome}{suggerito(k) === r.id ? " · il più vicino" : ""}{r.consegne_in_corso ? ` (${r.consegne_in_corso} in corso)` : ""}
                  </option>
                ))}
              </select>
            )}
            <span className={"m-stato " + k.stato}>{STATO_CONSEGNA[k.stato]}</span>
          </div>
        ))}
        {consegne.length === 0 && !errore && <p className="muto">Nessuna consegna in corso.</p>}
      </div>
    </main>
  );
}
