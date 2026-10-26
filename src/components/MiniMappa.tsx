"use client";

// La mappa piccola della scheda cliente (Edoardo, 26/10/2026: «una mini anteprima di Google Maps quando il
// ragazzo compila la scheda»): il portone scelto e la pizzeria, così si vede subito se il punto è quello
// giusto. Le tessere sono di OpenStreetMap come in /cassa/mappa (le mappe di Google nella pagina vorrebbero
// la chiave nel browser); il tocco su «Apri in Google Maps» porta alla mappa vera.
import { useEffect, useRef } from "react";

const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
// Via Novara 5/7: le stesse coordinate di /cassa/mappa e di PIZZERIA in src/lib/indirizzi.ts
const PIZZERIA: [number, number] = [41.91380, 12.50734];

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global { interface Window { L?: any } }

function caricaLeaflet(): Promise<any> {
  return new Promise((ok, ko) => {
    if (window.L) return ok(window.L);
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const css = document.createElement("link");
      css.rel = "stylesheet"; css.href = LEAFLET_CSS;
      document.head.appendChild(css);
    }
    const gia = document.querySelector(`script[src="${LEAFLET_JS}"]`);
    if (gia) { gia.addEventListener("load", () => ok(window.L)); return; }
    const s = document.createElement("script");
    s.src = LEAFLET_JS;
    s.onload = () => ok(window.L);
    s.onerror = () => ko(new Error("Mappa non caricata"));
    document.head.appendChild(s);
  });
}

export default function MiniMappa({ lat, lng, titolo }: { lat: number; lng: number; titolo?: string }) {
  const div = useRef<HTMLDivElement>(null);
  const mappa = useRef<any>(null);
  const punto = useRef<any>(null);

  useEffect(() => {
    let vivo = true;
    caricaLeaflet().then((L) => {
      if (!vivo || !div.current) return;
      if (!mappa.current) {
        mappa.current = L.map(div.current, { zoomControl: false, attributionControl: true, scrollWheelZoom: false });
        mappa.current.attributionControl?.setPrefix("");
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap" }).addTo(mappa.current);
        L.marker(PIZZERIA, { icon: L.divIcon({ className: "", html: `<div class="mm-pizzeria"><img src="/brand/bollino.png" alt=""/></div>`, iconSize: [30, 30], iconAnchor: [15, 15] }) }).addTo(mappa.current);
      }
      const icona = L.divIcon({ className: "", html: `<div class="mm-casa"></div>`, iconSize: [22, 22], iconAnchor: [11, 22] });
      if (punto.current) punto.current.setLatLng([lat, lng]);
      else punto.current = L.marker([lat, lng], { icon: icona, title: titolo ?? "" }).addTo(mappa.current);
      mappa.current.fitBounds(L.latLngBounds([PIZZERIA, [lat, lng]]).pad(0.25), { maxZoom: 16 });
    }).catch(() => {});
    return () => { vivo = false; };
  }, [lat, lng, titolo]);

  useEffect(() => () => { mappa.current?.remove(); mappa.current = null; punto.current = null; }, []);

  return (
    <div className="mm">
      <div ref={div} className="mm-mappa" aria-label={titolo ? `Mappa: ${titolo}` : "Mappa dell'indirizzo"} />
      <a className="mm-apri" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}>Apri in Google Maps ↗</a>
    </div>
  );
}
