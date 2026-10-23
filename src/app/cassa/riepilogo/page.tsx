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

const giornoRoma = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
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
        .or(`creato_il.gte.${inizioGiorno()},ora_consegna.gte.${inizioGiorno()}`)
        .order("creato_il", { ascending: false });
      if (error) setErrore(error.message);
      // «di oggi» = per la sera di oggi: un preordine di domani non conta (critico giro 4b);
      // un ordine fatto oggi senza ora è di oggi.
      else setOrdini(((data ?? []) as OrdineConRighe[]).filter((o) => giornoRoma(o.ora_consegna ?? o.creato_il) === giornoRoma(new Date().toISOString())));
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
    <main className="riepilogo">
      <h1>Riepilogo di oggi</h1>
      {errore && <p style={{ color: "var(--accento)" }}>{errore}</p>}

      <div className="griglia">
        <div className="carta numero"><div className="eti">Ordini</div><strong>{validi.length}</strong></div>
        <div className="carta numero"><div className="eti">Pizze</div><strong>{pizze}</strong></div>
        <div className="carta numero"><div className="eti">Consegne</div><strong>{consegne}</strong></div>
        <div className="carta numero vino"><div className="eti">Totale</div><strong>{incasso.toFixed(2).replace(".", ",")} €</strong></div>
      </div>

      <h2>Per canale</h2>
      <div className="griglia">
        {[...perCanale.entries()].map(([canale, n]) => (
          <div key={canale} className="carta numero"><div className="eti">{canale}</div><strong>{n}<small> {n === 1 ? "ordine" : "ordini"}</small></strong></div>
        ))}
        {perCanale.size === 0 && <p className="muto">Nessun ordine oggi.</p>}
      </div>

      <h2>Ordini</h2>
      <div className="griglia">
        {ordini.map((o) => (
          <article key={o.id} className="carta">
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong style={{ fontSize: 20, fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>#{o.numero}</strong>
              <span className={`badge ${o.stato}`}>{o.stato.replace("_", " ")}</span>
            </div>
            <div className="muto">
              {o.canale} · {o.tipo}
              {o.ora_consegna && " · per le " + new Date(o.ora_consegna).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" })}
            </div>
            <div style={{ marginTop: 4, fontWeight: 800, fontSize: 18, color: "var(--vino)" }}>{Number(o.totale).toFixed(2).replace(".", ",")} €</div>
          </article>
        ))}
      </div>
    </main>
  );
}
