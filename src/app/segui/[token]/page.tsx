"use client";

// La pagina che riceve il cliente quando il rider parte (mig. 0032, avviso «è partito, seguilo qui»).
// Pubblica, senza login: si apre col token della consegna e mostra a che punto è, il rider sulla
// mappa che si muove mentre è in viaggio, e il tasto per aprire lo stesso punto in Google Maps.
// Si rilegge ogni 5 secondi: il telefono del rider manda la posizione ogni 10.
import { use, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const PIZZERIA: [number, number] = [41.9176, 12.5037];   // Via Novara 5/7

interface Stato {
  numero: string | null; stato: "da_assegnare" | "assegnata" | "ritirata" | "consegnata" | "annullata";
  stato_ordine: string; ora_consegna: string | null;
  assegnata_il: string | null; partita_il: string | null; consegnata_il: string | null;
  rider: string | null;
  rider_pos: { lat: number; lng: number; il: string } | null;
  destinazione: { lat: number; lng: number } | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global { interface Window { L?: any } }
function caricaLeaflet(): Promise<any> {
  return new Promise((ok, ko) => {
    if (window.L) return ok(window.L);
    const css = document.createElement("link"); css.rel = "stylesheet"; css.href = LEAFLET_CSS; document.head.appendChild(css);
    const s = document.createElement("script"); s.src = LEAFLET_JS; s.onload = () => ok(window.L); s.onerror = () => ko(new Error("mappa")); document.head.appendChild(s);
  });
}
const ora = (s: string) => new Date(s).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

const PASSI = [
  { k: "ricevuto", t: "Ordine ricevuto" },
  { k: "assegnata", t: "In preparazione, il rider è pronto" },
  { k: "ritirata", t: "In viaggio verso di te" },
  { k: "consegnata", t: "Consegnato. Buon appetito!" },
];

export default function Segui({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [s, setS] = useState<Stato | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const div = useRef<HTMLDivElement>(null);
  const mappa = useRef<any>(null);
  const segni = useRef<{ rider?: any; casa?: any; linea?: any }>({});

  useEffect(() => {
    let vivo = true;
    async function leggi() {
      const { data, error } = await supabaseBrowser().rpc("segui_consegna", { p_token: token });
      if (!vivo) return;
      if (error) setErrore("Non riesco a leggere la consegna: riprova fra poco.");
      else if (!data) setErrore("Questo link non corrisponde a nessuna consegna.");
      else { setErrore(null); setS(data as Stato); }
    }
    leggi();
    const t = setInterval(leggi, 5000);
    return () => { vivo = false; clearInterval(t); };
  }, [token]);

  // la mappa: pizzeria, casa del cliente, rider quando è in viaggio
  useEffect(() => {
    if (!s || !div.current) return;
    caricaLeaflet().then((L) => {
      if (!mappa.current) {
        mappa.current = L.map(div.current, { zoomControl: false, attributionControl: true }).setView(PIZZERIA, 14);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(mappa.current);
        L.marker(PIZZERIA, { icon: L.divIcon({ className: "", html: '<div class="sg-pin sg-pizzeria"><img src="/brand/bollino.png" alt=""/></div>', iconSize: [44, 44], iconAnchor: [22, 22] }) }).addTo(mappa.current);
      }
      const m = mappa.current;
      const punti: [number, number][] = [PIZZERIA];
      if (s.destinazione) {
        const d: [number, number] = [s.destinazione.lat, s.destinazione.lng];
        if (!segni.current.casa) segni.current.casa = L.marker(d, { icon: L.divIcon({ className: "", html: '<div class="sg-pin sg-casa">🏠</div>', iconSize: [40, 40], iconAnchor: [20, 20] }) }).addTo(m);
        punti.push(d);
      }
      if (s.rider_pos && s.stato === "ritirata") {
        const r: [number, number] = [s.rider_pos.lat, s.rider_pos.lng];
        if (!segni.current.rider) segni.current.rider = L.marker(r, { icon: L.divIcon({ className: "", html: '<div class="sg-pin sg-rider">🛵</div>', iconSize: [48, 48], iconAnchor: [24, 24] }) }).addTo(m);
        else segni.current.rider.setLatLng(r);
        if (s.destinazione) {
          const linea: [number, number][] = [r, [s.destinazione.lat, s.destinazione.lng]];
          if (!segni.current.linea) segni.current.linea = L.polyline(linea, { color: "#8a1538", weight: 3, dashArray: "6 8" }).addTo(m);
          else segni.current.linea.setLatLngs(linea);
        }
        punti.push(r);
      } else if (segni.current.rider) { m.removeLayer(segni.current.rider); segni.current.rider = undefined; }
      if (punti.length > 1) m.fitBounds(punti, { padding: [40, 40], maxZoom: 16 });
    }).catch(() => {});
  }, [s]);

  const indice = !s ? 0 : s.stato === "consegnata" ? 3 : s.stato === "ritirata" ? 2 : s.stato === "assegnata" ? 1 : 0;
  const google = s?.rider_pos && s.stato === "ritirata" ? `https://www.google.com/maps/search/?api=1&query=${s.rider_pos.lat},${s.rider_pos.lng}` : null;

  return (
    <div className="sg">
      <style>{CSS}</style>
      <header className="sg-testa">
        <div className="sg-sabbia">
          <img src="/brand/logo-amanoamano.png" alt="A Mano A Mano Pugliese" />
          <img src="/brand/bollino.png" alt="" className="bollino" />
        </div>
        <div className="sg-vino"><h1>{s?.numero ? `Ordine ${s.numero}` : "Il tuo ordine"}</h1></div>
      </header>
      <div className="sg-corpo">

      {errore && <p className="sg-errore">{errore}</p>}

      {s && s.stato === "annullata" && <p className="sg-errore">Questo ordine è stato annullato. Per qualsiasi cosa chiamaci.</p>}

      {s && s.stato !== "annullata" && (
        <>
          <div className={"sg-grande " + s.stato}>
            {s.stato === "ritirata" && <span className="sg-icona" aria-hidden>🛵</span>}
            {PASSI[indice].t}
            {s.stato === "ritirata" && s.rider && <span> con {s.rider}</span>}
          </div>
          <div className="sg-sotto">
            {s.stato === "consegnata" && s.consegnata_il ? `alle ${ora(s.consegnata_il)}`
              : s.stato === "ritirata" && s.partita_il ? `partito alle ${ora(s.partita_il)}${s.ora_consegna ? ` · previsto per le ${ora(s.ora_consegna)}` : ""}`
              : s.ora_consegna ? `previsto per le ${ora(s.ora_consegna)}` : ""}
          </div>

          <div ref={div} className="sg-mappa" />
          {s.stato === "ritirata" && !s.rider_pos && <p className="sg-nota">La posizione del rider arriva appena il suo telefono la manda.</p>}
          {google && <a className="sg-google" href={google} target="_blank" rel="noreferrer">Apri in Google Maps</a>}

          <ol className="sg-passi">
            {PASSI.map((p, i) => (
              <li key={p.k} className={i < indice ? "fatto" : i === indice ? "ora" : ""}>
                <span className="pallino">{i < indice ? "✓" : i + 1}</span>{p.t}
              </li>
            ))}
          </ol>
        </>
      )}
      </div>
    </div>
  );
}

/* Giro 11 del grafico (24/10/2026): la veste dell'app come /ordina (docs/grafico/APP_RIFERIMENTO.md):
   fascia sabbia col logo lineare e il bollino, barra vino col titolo, fondo bianco, lo stato grande in vino,
   la mappa, i passi a righe col filo, il pulsante sabbia per Google Maps. Niente sotto i 13 px. */
const CSS = `
.sg { --vino: #8d0536; --sabbia: #c9a981; --sabbia-scura: #a88a64; --sabbia-chiara: #f1e8da; --nero: #1a1715; --testo2: #4b4640; --linea: #e6e6e6; --tassello: #ededed; --ok: #2e7d4f;
  min-height: 100dvh; background: #fff; color: var(--nero); font-family: Figtree, system-ui, sans-serif; margin: 0; }
.sg-testa { position: sticky; top: 0; z-index: 5; }
.sg-sabbia { background: var(--sabbia); height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; }
.sg-sabbia img { height: 26px; }
.sg-sabbia .bollino { height: 34px; width: 34px; border-radius: 999px; background: #fff; padding: 2px; }
.sg-vino { background: var(--vino); color: #fff; min-height: 44px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,.18); }
.sg h1 { margin: 0; font-size: 17px; font-weight: 700; }
.sg-corpo { padding: 14px 16px 28px; max-width: 760px; margin: 0 auto; box-sizing: border-box; }
.sg-grande { margin-top: 4px; font-family: Oswald, sans-serif; font-weight: 600; font-size: 30px; line-height: 1.1; text-transform: uppercase; letter-spacing: .02em; color: var(--vino); display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.sg-grande.consegnata { color: var(--ok); }
.sg-grande .sg-icona { font-family: system-ui, sans-serif; font-size: 34px; line-height: 1; }
.sg-sotto { margin-top: 6px; font-size: 16px; color: var(--testo2); font-variant-numeric: tabular-nums; }
.sg-mappa { margin: 14px -16px 0; height: 46vh; min-height: 280px; overflow: hidden; border-top: 1px solid var(--linea); border-bottom: 1px solid var(--linea); }
@media (min-width: 760px) { .sg-mappa { margin: 14px 0 0; border-radius: 12px; border: 1px solid var(--linea); } }
.sg-pin { display: flex; align-items: center; justify-content: center; border-radius: 999px; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.25); font-size: 22px; width: 100%; height: 100%; }
.sg-pizzeria { border: 3px solid var(--sabbia); }
/* Leaflet mette width:auto sulle immagini dei marker e vinceva: il bollino copriva mezza mappa (critico giro 7) */
.leaflet-marker-pane .sg-pizzeria img { width: 32px !important; height: 32px !important; max-width: none; }
.sg-rider { background: var(--vino); border: 3px solid #fff; font-size: 26px; }
.sg-casa { border: 3px solid var(--vino); }
.sg .leaflet-control-attribution { font-size: 13px; }
.sg-google { display: flex; align-items: center; justify-content: center; margin-top: 12px; min-height: 52px; padding: 0 16px; border-radius: 4px; background: var(--sabbia); color: var(--nero); font-weight: 700; text-decoration: none; font-size: 17px; box-shadow: 0 2px 6px rgba(0,0,0,.12); }
.sg-nota { color: var(--testo2); font-size: 15px; margin: 10px 0 0; }
.sg-sez { text-align: center; font-weight: 700; font-size: 16px; padding-bottom: 5px; border-bottom: 1.5px solid var(--nero); margin: 18px 0 4px; }
.sg-passi { list-style: none; padding: 0; margin: 14px 0 0; border-top: 1.5px solid var(--nero); }
.sg-passi li { display: flex; align-items: center; gap: 12px; min-height: 52px; padding: 6px 2px; border-bottom: 1px solid var(--linea); font-size: 16px; color: var(--testo2); }
.sg-passi .pallino { width: 34px; height: 34px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; background: var(--tassello); font-weight: 800; flex: none; font-size: 15px; }
.sg-passi li.fatto .pallino { background: var(--sabbia); color: #fff; }
.sg-passi li.ora { color: var(--nero); font-weight: 700; font-size: 17px; } .sg-passi li.ora .pallino { background: var(--vino); color: #fff; }
.sg-errore { margin-top: 12px; padding: 12px 14px; border-radius: 4px; background: #fbeef2; color: var(--vino); font-weight: 600; font-size: 15px; line-height: 1.35; }
`;
