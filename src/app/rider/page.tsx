"use client";

// App Rider: consegne libere e mie, prendi/ritirata/consegnata, naviga e chiama,
// posizione inviata in automatico al cloud (per la mappa live della cassa).
// Come l'app Velocissimo RIDER (REA, docs/rea/04_RIDER.md): il rider si prende da solo la prima
// comanda, vede le note fisse del cliente e come paga («paga con 50 → resto 26,50»), e in fondo lo
// storico delle consegne fatte e non ancora saldate alla cassa: dopo il dare-avere spariscono.
import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";
import type { ConsegnaRider, RiderBorsello } from "@/lib/types";

const euro = (n: number) => n.toFixed(2).replace(".", ",") + " €";

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
  const [borsello, setBorsello] = useState<RiderBorsello | null>(null);
  const supabaseRef = useRef<ReturnType<typeof supabaseBrowser> | null>(null);

  const carica = useCallback(async () => {
    const supabase = supabaseRef.current!;
    const [{ data, error }, b] = await Promise.all([supabase.rpc("consegne_rider2"), supabase.rpc("rider_borsello")]);
    if (error) setErrore(error.message);
    else setConsegne((data ?? []) as ConsegnaRider[]);
    const mio = ((b.data ?? []) as RiderBorsello[])[0];
    if (mio) setBorsello({ ...mio, in_mano: Number(mio.in_mano), da_saldare: Number(mio.da_saldare) });
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
  const mie = consegne.filter((c) => c.stato === "assegnata" || c.stato === "ritirata");
  const daSaldare = consegne.filter((c) => c.stato === "consegnata");

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
        {libere.map((c, i) => (
          <SchedaConsegna key={c.id} c={c}>
            <button className="primario" onClick={() => prendi(c.id)}>{i === 0 ? "La prendo io" : "Prendi"}</button>
          </SchedaConsegna>
        ))}
      </div>

      <h2 style={{ fontSize: 16, marginTop: 20 }}>Da saldare alla cassa ({daSaldare.length})</h2>
      {borsello && (
        <p className="muto">
          Hai in mano <b style={{ color: "var(--testo)" }}>{euro(borsello.in_mano)}</b>
          {borsello.da_saldare > 0 && <> · di cui {euro(borsello.da_saldare)} delle consegne fatte</>}
          . A fine serata si fa il dare-avere in cassa e queste spariscono.
        </p>
      )}
      {daSaldare.length === 0 && <p className="muto">Niente da saldare.</p>}
      <div className="griglia">
        {daSaldare.map((c) => (
          <article key={c.id} className="carta" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span><strong>#{c.numero}</strong> <span className="muto">{c.consegnata_il ? new Date(c.consegnata_il).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : ""} · {[c.via, c.civico].filter(Boolean).join(" ")}</span></span>
            <span style={{ fontWeight: 700 }}>{euro(Number(c.contanti_da_incassare))}</span>
          </article>
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
      {c.cliente_note && <div style={{ marginTop: 4, padding: "4px 8px", borderRadius: 6, background: "#fff3c4", fontSize: 14 }}>⚠ {c.cliente_note}</div>}
      <div style={{ margin: "8px 0", fontSize: 18 }}>
        {c.pagato_online || Number(c.contanti_da_incassare) === 0
          ? <>Già pagato <span className="muto" style={{ fontSize: 13 }}>niente da incassare</span></>
          : c.pagamento === "pos"
            ? <>{euro(Number(c.contanti_da_incassare))} <span className="muto" style={{ fontSize: 13 }}>col POS</span></>
            : <>{euro(Number(c.contanti_da_incassare))} <span className="muto" style={{ fontSize: 13 }}>in contanti</span>
                {c.paga_con != null && Number(c.paga_con) > Number(c.contanti_da_incassare) && (
                  <div style={{ fontSize: 14, fontWeight: 700 }}>paga con {euro(Number(c.paga_con))} → resto {euro(Number(c.paga_con) - Number(c.contanti_da_incassare))}</div>
                )}</>}
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
