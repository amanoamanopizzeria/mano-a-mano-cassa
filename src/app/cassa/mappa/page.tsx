"use client";

// Mappa live dei rider per la cassa: ogni posizione nuova sposta il segnaposto.
// Leaflet + OpenStreetMap (senza chiave API), caricati da CDN.
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";
import type { RiderInMappa } from "@/lib/types";

const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const CENTRO_ROMA: [number, number] = [41.9028, 12.4964];

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
  const [riders, setRiders] = useState<RiderInMappa[]>([]);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setErrore("Supabase non configurato.");
      return;
    }
    const supabase = supabaseBrowser();
    let vivo = true;

    async function carica(L: any) {
      const { data, error } = await supabase.rpc("rider_in_mappa");
      if (error) { setErrore(error.message); return; }
      const lista = (data ?? []) as RiderInMappa[];
      if (!vivo) return;
      setRiders(lista);
      for (const r of lista) {
        if (r.lat == null || r.lng == null) continue;
        const pos: [number, number] = [r.lat, r.lng];
        const testo = `<b>${r.nome}</b><br/>${r.consegne_in_corso} consegne in corso`;
        const m = segnapostiRef.current.get(r.id);
        if (m) m.setLatLng(pos).bindPopup(testo);
        else segnapostiRef.current.set(r.id, L.marker(pos).addTo(mappaRef.current).bindPopup(testo));
      }
    }

    let canale: any = null;
    caricaLeaflet()
      .then((L) => {
        if (!vivo || !divRef.current) return;
        mappaRef.current = L.map(divRef.current).setView(CENTRO_ROMA, 12);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap",
        }).addTo(mappaRef.current);
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
    };
  }, []);

  return (
    <main>
      <h1>Cassa — rider in mappa</h1>
      {errore && <p style={{ color: "var(--accento)" }}>{errore}</p>}
      <div ref={divRef} style={{ height: "60vh", borderRadius: 12, border: "1px solid var(--bordo)" }} />
      <div className="griglia" style={{ marginTop: 12 }}>
        {riders.map((r) => (
          <div className="carta" key={r.id}>
            <strong>{r.nome}</strong>
            <div className="muto">
              {r.consegne_in_corso} consegne in corso ·{" "}
              {r.aggiornata_il
                ? "posizione " + new Date(r.aggiornata_il).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
                : "nessuna posizione"}
            </div>
          </div>
        ))}
        {riders.length === 0 && !errore && <p className="muto">Nessun rider attivo.</p>}
      </div>
    </main>
  );
}
