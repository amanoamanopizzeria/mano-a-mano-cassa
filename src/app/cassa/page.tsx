"use client";

// Cassa: gli ordini compaiono e cambiano da soli (Supabase Realtime), senza
// ricaricare la pagina. Primo mattone della PWA cassa.
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";
import { TRANSIZIONI_ORDINE, type Ordine, type StatoOrdine } from "@/lib/types";

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
  const [ordini, setOrdini] = useState<Ordine[]>([]);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setErrore("Supabase non configurato (vedi .env.example).");
      return;
    }
    const supabase = supabaseBrowser();

    supabase
      .from("ordine")
      .select("*")
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
              return [payload.new as Ordine, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              const n = payload.new as Ordine;
              return prev.map((o) => (o.id === n.id ? n : o));
            }
            if (payload.eventType === "DELETE") {
              const v = payload.old as Partial<Ordine>;
              return prev.filter((o) => o.id !== v.id);
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canale);
    };
  }, []);

  async function cambiaStato(id: string, stato: StatoOrdine) {
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
    <main>
      <h1>Cassa — ordini</h1>
      {errore && <p style={{ color: "var(--accento)" }}>{errore}</p>}
      {ordini.length === 0 && !errore && (
        <p className="muto">Nessun ordine. Quando arriva, compare qui da solo.</p>
      )}
      <div className="griglia">
        {ordini.map((o) => (
          <article className="carta" key={o.id}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>#{o.numero}</strong>
              <span className={`badge ${o.stato}`}>{ETICHETTE[o.stato]}</span>
            </div>
            <div className="muto">
              {o.tipo} · {o.canale} ·{" "}
              {new Date(o.creato_il).toLocaleTimeString("it-IT", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {o.ora_consegna && (
                <>
                  {" "}· per le{" "}
                  {new Date(o.ora_consegna).toLocaleTimeString("it-IT", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </>
              )}
            </div>
            <div style={{ margin: "8px 0", fontSize: 18 }}>
              {o.totale.toFixed(2)} €
            </div>
            {o.note && <div className="muto">Note: {o.note}</div>}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {TRANSIZIONI_ORDINE[o.stato].map((s) => (
                <button
                  key={s}
                  className={s === "annullato" ? "" : "primario"}
                  onClick={() => cambiaStato(o.id, s)}
                >
                  {ETICHETTE[s]}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
