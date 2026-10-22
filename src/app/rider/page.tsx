"use client";

// App Rider: consegne libere e mie, prendi/ritirata/consegnata, naviga e chiama,
// posizione inviata in automatico al cloud (per la mappa live della cassa).
import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";
import type { ConsegnaRider } from "@/lib/types";

export default function RiderPagina() {
  return (
    <AuthGate>
      <Rider />
    </AuthGate>
  );
}

function Rider() {
  const [consegne, setConsegne] = useState<ConsegnaRider[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const [gps, setGps] = useState<string>("GPS spento");
  const supabaseRef = useRef<ReturnType<typeof supabaseBrowser> | null>(null);

  const carica = useCallback(async () => {
    const supabase = supabaseRef.current!;
    const { data, error } = await supabase.rpc("consegne_rider");
    if (error) setErrore(error.message);
    else setConsegne((data ?? []) as ConsegnaRider[]);
  }, []);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setErrore("Supabase non configurato.");
      return;
    }
    supabaseRef.current = supabaseBrowser();
    carica();

    // ogni cambio sulle consegne ricarica la lista (libere + mie)
    const canale = supabaseRef.current
      .channel("rider-consegne")
      .on("postgres_changes", { event: "*", schema: "public", table: "consegna" }, () => carica())
      .subscribe();

    // posizione: inviata quando cambia, al massimo una volta ogni 10 secondi
    let ultimoInvio = 0;
    let watchId: number | null = null;
    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const ora = Date.now();
          if (ora - ultimoInvio < 10_000) return;
          ultimoInvio = ora;
          const { latitude: lat, longitude: lng } = pos.coords;
          setGps(`GPS attivo · ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          await supabaseRef.current!.rpc("segnala_posizione", { p_lat: lat, p_lng: lng });
        },
        (e) => setGps(`GPS non disponibile: ${e.message}`),
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
    }

    return () => {
      supabaseRef.current?.removeChannel(canale);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [carica]);

  async function prendi(id: string) {
    const { error } = await supabaseRef.current!.rpc("prendi_consegna", { p_id: id });
    if (error) setErrore(error.message);
    else carica();
  }

  async function aggiorna(id: string, stato: "ritirata" | "consegnata") {
    const { error } = await supabaseRef.current!.rpc("aggiorna_consegna", { p_id: id, p_stato: stato });
    if (error) setErrore(error.message);
    else carica();
  }

  const libere = consegne.filter((c) => c.stato === "da_assegnare");
  const mie = consegne.filter((c) => c.stato !== "da_assegnare");

  return (
    <main>
      <h1>Rider — consegne</h1>
      <p className="muto">{gps}</p>
      {errore && <p style={{ color: "var(--accento)" }}>{errore}</p>}

      <h2 style={{ fontSize: 16 }}>Le mie ({mie.length})</h2>
      {mie.length === 0 && <p className="muto">Nessuna consegna in corso.</p>}
      <div className="griglia">
        {mie.map((c) => (
          <SchedaConsegna key={c.id} c={c}>
            {c.stato === "assegnata" && (
              <button className="primario" onClick={() => aggiorna(c.id, "ritirata")}>Ritirata</button>
            )}
            {c.stato === "ritirata" && (
              <button className="primario" onClick={() => aggiorna(c.id, "consegnata")}>Consegnata</button>
            )}
          </SchedaConsegna>
        ))}
      </div>

      <h2 style={{ fontSize: 16, marginTop: 20 }}>Disponibili ({libere.length})</h2>
      {libere.length === 0 && <p className="muto">Nessuna consegna libera. Quando arriva, compare qui.</p>}
      <div className="griglia">
        {libere.map((c) => (
          <SchedaConsegna key={c.id} c={c}>
            <button className="primario" onClick={() => prendi(c.id)}>Prendi</button>
          </SchedaConsegna>
        ))}
      </div>
    </main>
  );
}

function SchedaConsegna({ c, children }: { c: ConsegnaRider; children: React.ReactNode }) {
  const indirizzo = [c.via, c.civico, c.cap, c.citta].filter(Boolean).join(" ");
  const naviga = c.lat && c.lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`
    : indirizzo
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(indirizzo)}`
      : null;
  return (
    <article className="carta">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <strong>#{c.numero}</strong>
        <span className={`badge ${c.stato === "da_assegnare" ? "ricevuto" : "in_consegna"}`}>{c.stato.replace("_", " ")}</span>
      </div>
      <div className="muto">
        {c.zona ?? "—"} ·{" "}
        {c.ora_consegna
          ? "per le " + new Date(c.ora_consegna).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
          : "appena pronto"}
      </div>
      {indirizzo && <div style={{ marginTop: 6 }}>{indirizzo}</div>}
      {c.cliente_nome && <div className="muto">{c.cliente_nome}</div>}
      <div style={{ margin: "8px 0", fontSize: 18 }}>
        {Number(c.contanti_da_incassare).toFixed(2)} € <span className="muto" style={{ fontSize: 13 }}>da incassare</span>
      </div>
      <ul className="muto" style={{ margin: "4px 0 8px", paddingLeft: 18 }}>
        {c.righe.map((r, i) => (
          <li key={i}>{Number(r.quantita)}× {r.descrizione}</li>
        ))}
      </ul>
      {c.note && <div className="muto">Note: {c.note}</div>}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
        {children}
        {naviga && <a href={naviga} target="_blank" rel="noreferrer"><button>Naviga</button></a>}
        {c.cliente_telefono && <a href={`tel:${c.cliente_telefono}`}><button>Chiama</button></a>}
      </div>
    </article>
  );
}
