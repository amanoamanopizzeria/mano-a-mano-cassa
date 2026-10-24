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
  // La chiusura di cassa (critico giro 10): quanto è davvero entrato (ordini chiusi), diviso per come è stato pagato,
  // e quanto è ancora in giro (ordini aperti, contanti in mano ai rider).
  const chiusi = validi.filter((o) => o.stato === "consegnato" || o.stato === "ritirato");
  const aperti = validi.filter((o) => o.stato !== "consegnato" && o.stato !== "ritirato");
  const somma = (xs: OrdineConRighe[]) => xs.reduce((s, o) => s + Number(o.totale), 0);
  const perPagamento = (xs: OrdineConRighe[], p: "contanti" | "pos" | "online" | "ignoto") => somma(xs.filter((o) => (o.pagato_online ? "online" : o.pagamento ?? "ignoto") === p));
  const [riderDaSaldare, setRiderDaSaldare] = useState<{ nome: string; da_saldare: number }[]>([]);
  useEffect(() => {
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
      <div className="griglia r-cima">
        <div className="carta numero vino"><div className="eti">Incassato · {chiusi.length} chiusi</div><strong>{eur(somma(chiusi))}</strong></div>
        <div className="carta numero"><div className="eti">Contanti</div><strong>{eur(perPagamento(chiusi, "contanti"))}</strong></div>
        <div className="carta numero"><div className="eti">POS</div><strong>{eur(perPagamento(chiusi, "pos"))}</strong></div>
        <div className="carta numero"><div className="eti">Online</div><strong>{eur(perPagamento(chiusi, "online"))}</strong></div>
        {perPagamento(chiusi, "ignoto") > 0 && <div className="carta numero"><div className="eti">Senza pagamento segnato</div><strong>{eur(perPagamento(chiusi, "ignoto"))}</strong></div>}
        <div className="carta numero"><div className="eti">Ancora aperti · {aperti.length}</div><strong>{eur(somma(aperti))}</strong></div>
        {riderDaSaldare.map((r) => <div key={r.nome} className="carta numero"><div className="eti">In mano a {r.nome}</div><strong>{eur(r.da_saldare)}</strong></div>)}
      </div>

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
