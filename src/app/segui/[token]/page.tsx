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
        <img src="/brand/bollino.png" alt="A Mano a Mano" />
        <div>
          <div className="sg-lapide">A Mano a Mano · Pugliese</div>
          <h1>{s?.numero ? `Ordine ${s.numero}` : "Il tuo ordine"}</h1>
        </div>
      </header>

      {errore && <p className="sg-errore">{errore}</p>}

      {s && s.stato === "annullata" && <p className="sg-errore">Questo ordine è stato annullato. Per qualsiasi cosa chiamaci.</p>}

      {s && s.stato !== "annullata" && (
        <>
          <div className="sg-grande">
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
  );
}

const CSS = `
.sg { min-height: 100dvh; background: #fbf7f0; color: #1a1715; font-family: Figtree, system-ui, sans-serif; padding: 16px; max-width: 560px; margin: 0 auto; }
.sg-testa { display: flex; align-items: center; gap: 12px; padding-bottom: 12px; border-bottom: 2px solid #c9973f; }
.sg-testa img { width: 56px; height: 56px; }
.sg-lapide { font-family: Oswald, sans-serif; text-transform: uppercase; letter-spacing: .18em; font-size: 13px; color: #c9973f; }
.sg h1 { margin: 2px 0 0; font-family: Oswald, sans-serif; text-transform: uppercase; font-size: 26px; color: #8a1538; }
.sg-grande { margin-top: 18px; font-family: Oswald, sans-serif; font-size: 28px; line-height: 1.15; text-transform: uppercase; color: #8a1538; }
.sg-sotto { margin-top: 4px; font-size: 17px; color: #6f6a63; }
.sg-mappa { margin-top: 14px; height: 52vh; min-height: 300px; border-radius: 18px; overflow: hidden; box-shadow: 0 6px 24px rgba(26,23,21,.12); }
.sg-pin { display: flex; align-items: center; justify-content: center; border-radius: 999px; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.25); font-size: 22px; width: 100%; height: 100%; }
.sg-pizzeria { border: 3px solid #c9973f; } .sg-pizzeria img { width: 80%; }
.sg-rider { background: #8a1538; border: 3px solid #fff; font-size: 26px; }
.sg-casa { border: 3px solid #8a1538; }
.sg-google { display: block; margin-top: 12px; text-align: center; padding: 14px; border-radius: 999px; background: #fff; border: 2px solid #8a1538; color: #8a1538; font-weight: 700; text-decoration: none; font-size: 17px; }
.sg-nota { color: #6f6a63; font-size: 15px; }
.sg-passi { list-style: none; padding: 0; margin: 18px 0 0; }
.sg-passi li { display: flex; align-items: center; gap: 10px; padding: 8px 0; font-size: 17px; color: #6f6a63; }
.sg-passi .pallino { width: 30px; height: 30px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; background: #e9e1d2; font-weight: 800; }
.sg-passi li.fatto .pallino { background: #c9973f; color: #fff; }
.sg-passi li.ora { color: #1a1715; font-weight: 700; } .sg-passi li.ora .pallino { background: #8a1538; color: #fff; }
.sg-errore { margin-top: 16px; padding: 12px; border-radius: 12px; background: #fff3f4; border: 2px solid #c8102e; color: #c8102e; font-weight: 700; }
`;
