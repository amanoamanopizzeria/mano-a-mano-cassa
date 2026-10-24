"use client";

// Riepilogo della giornata: ordini per canale e stato, pizze, consegne, incasso.
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";
import type { Ordine, OrdineRiga } from "@/lib/types";

type OrdineConRighe = Ordine & { ordine_riga: OrdineRiga[]; pagamento?: "contanti" | "pos" | null; pagato_online?: boolean };

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
  // La chiusura di cassa: gli stessi numeri che diamo all'OS (vendite_giornata_totali, mig. 0044),
  // così il riepilogo e l'export non dicono due cifre per la stessa cosa. «Incassato» = dove stanno i
  // soldi: in cassa (contanti, POS), ai rider (contanti, POS), online nostro, piattaforme; e quanto
  // è ancora aperto. In più i contanti ancora in mano a ogni rider (rider_borsello).
  type Incassato = { contantiInCassa: number; posInCassa: number; contantiAiRider: number; posAiRider: number; onlineNostro: number; piattaforme: number; ancoraAperti: number };
  const [incassato, setIncassato] = useState<Incassato | null>(null);
  const [riderDaSaldare, setRiderDaSaldare] = useState<{ nome: string; da_saldare: number }[]>([]);
  useEffect(() => {
    // la giornata lavorativa: dopo mezzanotte è ancora la sera prima (taglio alle 06:00 di Roma)
    const roma = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Rome" }));
    roma.setHours(roma.getHours() - 6);
    const giornata = `${roma.getFullYear()}-${String(roma.getMonth() + 1).padStart(2, "0")}-${String(roma.getDate()).padStart(2, "0")}`;
    supabaseBrowser().rpc("vendite_giornata_totali", { p_giornata: giornata }).then(({ data }) => {
      const d = data as { incassato?: Incassato } | null;
      setIncassato(d?.incassato ?? null);
    });
    supabaseBrowser().rpc("rider_borsello").then(({ data }) => {
      setRiderDaSaldare(((data ?? []) as { nome: string; da_saldare: number }[]).filter((r) => Number(r.da_saldare) > 0).map((r) => ({ nome: r.nome, da_saldare: Number(r.da_saldare) })));
    });
  }, [ordini]);
  const eur = (n: number) => n.toFixed(2).replace(".", ",") + " €";

  const perCanale = new Map<string, number>();
  for (const o of validi) perCanale.set(o.canale, (perCanale.get(o.canale) ?? 0) + 1);

  return (
    <main className="riepilogo">
      <h1>Riepilogo di oggi</h1>
      {errore && <p style={{ color: "var(--accento)" }}>{errore}</p>}

      <div className="griglia r-cima">
        <div className="carta numero"><div className="eti">Ordini</div><strong>{validi.length}</strong></div>
        <div className="carta numero"><div className="eti">Pizze</div><strong>{pizze}</strong></div>
        <div className="carta numero"><div className="eti">Consegne</div><strong>{consegne}</strong></div>
        <div className="carta numero vino"><div className="eti">Venduto</div><strong>{eur(incasso)}</strong></div>
      </div>

      <h2>Cassa</h2>
      {incassato ? (
        <div className="griglia r-cima">
          <div className="carta numero vino"><div className="eti">In cassa · contanti</div><strong>{eur(Number(incassato.contantiInCassa))}</strong></div>
          <div className="carta numero"><div className="eti">In cassa · POS</div><strong>{eur(Number(incassato.posInCassa))}</strong></div>
          <div className="carta numero"><div className="eti">Ai rider · contanti</div><strong>{eur(Number(incassato.contantiAiRider))}</strong></div>
          <div className="carta numero"><div className="eti">Ai rider · POS</div><strong>{eur(Number(incassato.posAiRider))}</strong></div>
          <div className="carta numero"><div className="eti">Online nostro</div><strong>{eur(Number(incassato.onlineNostro))}</strong></div>
          {Number(incassato.piattaforme) > 0 && <div className="carta numero"><div className="eti">Piattaforme</div><strong>{eur(Number(incassato.piattaforme))}</strong></div>}
          <div className="carta numero"><div className="eti">Ancora aperti</div><strong>{eur(Number(incassato.ancoraAperti))}</strong></div>
          {riderDaSaldare.map((r) => <div key={r.nome} className="carta numero"><div className="eti">In mano a {r.nome}</div><strong>{eur(r.da_saldare)}</strong></div>)}
        </div>
      ) : <p className="muto">Leggo la cassa…</p>}

      <h2>Per canale</h2>
      <div className="griglia">
        {[...perCanale.entries()].map(([canale, n]) => (
          <div key={canale} className="carta numero"><div className="eti">{canale}</div><strong>{n}<small> {n === 1 ? "ordine" : "ordini"}</small></strong></div>
        ))}
        {perCanale.size === 0 && <p className="muto">Nessun ordine oggi.</p>}
      </div>

      <h2>Ordini</h2>
      <div className="griglia r-ordini">
        {ordini.map((o) => (
          <article key={o.id} className={"carta r-ordine " + o.stato}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <strong style={{ fontSize: 26, fontFamily: "Oswald, sans-serif", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{o.numero_visibile ?? `#${o.numero}`}</strong>
              <span className={`badge ${o.stato}`}>{o.stato.replace("_", " ")}</span>
            </div>
            <div className="muto" style={{ fontSize: 15 }}>
              {o.canale} · {o.tipo}
              {o.ora_consegna && " · per le " + new Date(o.ora_consegna).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" })}
            </div>
            <div style={{ marginTop: 4, fontWeight: 600, fontSize: 24, fontFamily: "Oswald, sans-serif", fontVariantNumeric: "tabular-nums", color: "var(--vino)" }}>{Number(o.totale).toFixed(2).replace(".", ",")} €</div>
          </article>
        ))}
      </div>
    </main>
  );
}
