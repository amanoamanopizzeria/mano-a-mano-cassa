"use client";

// Sala: 20 tavoli dentro e 15 fuori. Si apre un tavolo con i coperti, si chiude quando paga.
// Il colore cambia dopo 60 minuti dall'apertura (alert per proporre il dessert o un altro giro).
import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";

interface Tavolo {
  id: string;
  numero: string;
  zona: "dentro" | "fuori";
  posti: number;
  stato: "libero" | "occupato" | "conto";
  aperto_il: string | null;
  coperti: number;
}

const ALERT_MINUTI = 60;

export default function TavoliPagina() {
  return (
    <AuthGate>
      <Tavoli />
    </AuthGate>
  );
}

function minutiDa(iso: string | null): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

function Tavoli() {
  const [tavoli, setTavoli] = useState<Tavolo[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const [, setOra] = useState(0);

  const carica = useCallback(async () => {
    const { data, error } = await supabaseBrowser()
      .from("tavolo").select("*").order("numero");
    if (error) setErrore(error.message);
    else setTavoli((data ?? []) as Tavolo[]);
  }, []);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) { setErrore("Supabase non configurato."); return; }
    carica();
    const supabase = supabaseBrowser();
    const canale = supabase
      .channel("sala")
      .on("postgres_changes", { event: "*", schema: "public", table: "tavolo" }, () => carica())
      .subscribe();
    const timer = setInterval(() => setOra((n) => n + 1), 30000); // ricalcola i minuti
    return () => { clearInterval(timer); supabase.removeChannel(canale); };
  }, [carica]);

  async function apri(t: Tavolo) {
    const coperti = Number(window.prompt(`Coperti al tavolo ${t.numero}?`, "2"));
    if (!coperti || coperti < 1) return;
    const { error } = await supabaseBrowser().from("tavolo").update({
      stato: "occupato", aperto_il: new Date().toISOString(), coperti,
    }).eq("id", t.id);
    if (error) setErrore(error.message);
  }

  async function chiudi(t: Tavolo) {
    const { error } = await supabaseBrowser().from("tavolo").update({
      stato: "libero", aperto_il: null, coperti: 0,
    }).eq("id", t.id);
    if (error) setErrore(error.message);
  }

  async function passaAlConto(t: Tavolo) {
    const { error } = await supabaseBrowser().from("tavolo").update({ stato: "conto" }).eq("id", t.id);
    if (error) setErrore(error.message);
  }

  const sezioni: { titolo: string; zona: "dentro" | "fuori" }[] = [
    { titolo: "Dentro", zona: "dentro" },
    { titolo: "Fuori", zona: "fuori" },
  ];

  return (
    <main>
      <h1>Sala</h1>
      {errore && <p style={{ color: "var(--accento)" }}>{errore}</p>}
      {sezioni.map((s) => (
        <section key={s.zona} style={{ marginTop: 14 }}>
          <h2 style={{ fontSize: 16 }}>{s.titolo}</h2>
          <div className="griglia">
            {tavoli.filter((t) => t.zona === s.zona).map((t) => {
              const min = minutiDa(t.aperto_il);
              const allarme = t.stato !== "libero" && min >= ALERT_MINUTI;
              return (
                <div
                  key={t.id}
                  className="carta"
                  style={{
                    borderColor: allarme ? "var(--accento)" : undefined,
                    background: t.stato === "conto" ? "var(--sfondo-tenue, #f4ead8)" : undefined,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong>{t.numero}</strong>
                    <span className={`badge ${t.stato === "libero" ? "ricevuto" : "in_preparazione"}`}>{t.stato}</span>
                  </div>
                  {t.stato !== "libero" && (
                    <div className="muto">
                      {t.coperti} coperti · {min} min{allarme ? " · alert" : ""}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                    {t.stato === "libero" && <button className="primario" onClick={() => apri(t)}>Apri</button>}
                    {t.stato === "occupato" && <button onClick={() => passaAlConto(t)}>Conto</button>}
                    {t.stato !== "libero" && <button onClick={() => chiudi(t)}>Libera</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
