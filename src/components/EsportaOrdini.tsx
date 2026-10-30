"use client";

// «Esporta tutti gli ordini di oggi» (Edoardo, 30/10/2026: il CSV di fine serata sta nella Dashboard ed è lo stesso
// che si estrae da Velocissimo: domicilio, asporto, tavoli, banco). È il CSV a 40 colonne di /api/ordini/csv,
// fatto sull'export «/weborder» di Velocissimo e provato col parser dell'OS (scripts/prova-csv-os.mts).
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

// La serata finisce alle 06: dopo mezzanotte si esporta ancora la sera prima.
const serataDi = (t: number) => new Date(t - 6 * 3_600_000).toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });

export default function EsportaOrdini({ className }: { className?: string }) {
  const [stato, setStato] = useState<string | null>(null);
  async function scarica() {
    const serata = serataDi(Date.now());
    setStato("Preparo il CSV…");
    const { data } = await supabaseBrowser().auth.getSession();
    const r = await fetch(`/api/ordini/csv?giornata=${serata}`, { headers: { authorization: `Bearer ${data.session?.access_token ?? ""}` } });
    if (!r.ok) { setStato(r.status === 401 ? "Entra con l'utenza della cassa per esportare." : `CSV non scaricato (${r.status}).`); return; }
    const el = document.createElement("a");
    el.href = URL.createObjectURL(await r.blob());
    const [a, m, g] = serata.split("-");
    el.download = `export_${g}-${m}-${a}.csv`;
    el.click(); URL.revokeObjectURL(el.href);
    setStato(null);
  }
  return (
    <div className={className}>
      <button type="button" className="primario" onClick={scarica}>Esporta tutti gli ordini di oggi (CSV)</button>
      {stato && <p className="muto">{stato}</p>}
    </div>
  );
}
