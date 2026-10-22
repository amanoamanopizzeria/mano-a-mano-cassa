"use client";

// Riepilogo della giornata: ordini per canale e stato, pizze, consegne, incasso.
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";
import type { Ordine, OrdineRiga } from "@/lib/types";

type OrdineConRighe = Ordine & { ordine_riga: OrdineRiga[] };

export default function RiepilogoPagina() {
  return (
    <AuthGate>
      <Riepilogo />
    </AuthGate>
  );
}

function inizioGiorno(): string {
  // mezzanotte di oggi a Roma, in UTC
  const oggi = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
  return new Date(`${oggi}T00:00:00+02:00`).toISOString();
}

function Riepilogo() {
  const [ordini, setOrdini] = useState<OrdineConRighe[]>([]);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) { setErrore("Supabase non configurato."); return; }
    const supabase = supabaseBrowser();
    async function carica() {
      const { data, error } = await supabase
        .from("ordine")
        .select("*, ordine_riga(*)")
        .gte("creato_il", inizioGiorno())
        .order("creato_il", { ascending: false });
      if (error) setErrore(error.message);
      else setOrdini((data ?? []) as OrdineConRighe[]);
    }
    carica();
    const canale = supabase
      .channel("riepilogo")
      .on("postgres_changes", { event: "*", schema: "public", table: "ordine" }, () => carica())
      .subscribe();
    return () => { supabase.removeChannel(canale); };
  }, []);

  const validi = ordini.filter((o) => o.stato !== "annullato");
  const pizze = validi.reduce(
    (s, o) => s + o.ordine_riga.filter((r) => r.destinazione === "cucina").reduce((t, r) => t + Number(r.quantita), 0),
    0
  );
  const consegne = validi.filter((o) => o.tipo === "domicilio").length;
  const incasso = validi.reduce((s, o) => s + Number(o.totale), 0);

  const perCanale = new Map<string, number>();
  for (const o of validi) perCanale.set(o.canale, (perCanale.get(o.canale) ?? 0) + 1);

  return (
    <main>
      <h1>Riepilogo di oggi</h1>
      {errore && <p style={{ color: "var(--accento)" }}>{errore}</p>}

      <div className="griglia">
        <div className="carta"><div className="muto">Ordini</div><strong style={{ fontSize: 24 }}>{validi.length}</strong></div>
        <div className="carta"><div className="muto">Pizze</div><strong style={{ fontSize: 24 }}>{pizze}</strong></div>
        <div className="carta"><div className="muto">Consegne</div><strong style={{ fontSize: 24 }}>{consegne}</strong></div>
        <div className="carta"><div className="muto">Totale</div><strong style={{ fontSize: 24 }}>{incasso.toFixed(2)} €</strong></div>
      </div>

      <h2 style={{ fontSize: 16, marginTop: 16 }}>Per canale</h2>
      <div className="griglia">
        {[...perCanale.entries()].map(([canale, n]) => (
          <div key={canale} className="carta"><strong>{canale}</strong><div className="muto">{n} ordini</div></div>
        ))}
        {perCanale.size === 0 && <p className="muto">Nessun ordine oggi.</p>}
      </div>

      <h2 style={{ fontSize: 16, marginTop: 16 }}>Ordini</h2>
      <div className="griglia">
        {ordini.map((o) => (
          <article key={o.id} className="carta">
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>#{o.numero}</strong>
              <span className={`badge ${o.stato}`}>{o.stato.replace("_", " ")}</span>
            </div>
            <div className="muto">
              {o.canale} · {o.tipo}
              {o.ora_consegna && " · per le " + new Date(o.ora_consegna).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" })}
            </div>
            <div style={{ marginTop: 4 }}>{Number(o.totale).toFixed(2)} €</div>
          </article>
        ))}
      </div>
    </main>
  );
}
