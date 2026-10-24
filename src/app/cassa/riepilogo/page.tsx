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

// La serata, come nel database (giornata_lavorativa, mig. 0040): dopo mezzanotte è ancora la sera
// prima, il taglio è alle 06:00 di Roma. Critico giro 19: a mezzanotte e mezza la testa del riepilogo
// leggeva da mezzanotte e il blocco Cassa la serata: due giorni uno sopra l'altro.
const giornataDi = (iso: string) => new Date(new Date(iso).getTime() - 6 * 3_600_000).toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
const giornataOggi = () => giornataDi(new Date().toISOString());
function inizioGiornata(g: string): string {
  // le 06:00 di Roma di quel giorno, in UTC, con l'ora legale o senza
  for (const off of ["+02:00", "+01:00"]) {
    const d = new Date(`${g}T06:00:00${off}`);
    if (d.toLocaleTimeString("it-IT", { hour: "2-digit", timeZone: "Europe/Rome" }).startsWith("06")) return d.toISOString();
  }
  return new Date(`${g}T05:00:00Z`).toISOString();
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
        .or(`creato_il.gte.${inizioGiornata(giornataOggi())},ora_consegna.gte.${inizioGiornata(giornataOggi())}`)
        .order("creato_il", { ascending: false });
      if (error) setErrore(error.message);
      // «di stasera» = per la serata in corso: un preordine di domani non conta (critico giro 4b);
      // un ordine senza ora è della serata in cui è stato fatto.
      else setOrdini(((data ?? []) as OrdineConRighe[]).filter((o) => giornataDi(o.ora_consegna ?? o.creato_il) === giornataOggi()));
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
    const giornata = giornataOggi();
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
      <h1>Riepilogo della serata</h1>
      {errore && <p className="r-errore">{errore}</p>}

      <div className="griglia r-cima">
        <div className="carta numero"><div className="eti">Ordini</div><strong>{validi.length}</strong></div>
        <div className="carta numero"><div className="eti">Pizze</div><strong>{pizze}</strong></div>
        <div className="carta numero"><div className="eti">Consegne</div><strong>{consegne}</strong></div>
        <div className="carta numero vino"><div className="eti">Venduto</div><strong>{eur(incasso)}</strong></div>
      </div>

      <h2>Cassa</h2>
      {incassato ? (
        <div className="r-cassa">
          <div className="carta numero vino principale"><div className="eti">In cassa · contanti</div><strong>{eur(Number(incassato.contantiInCassa))}</strong><small>quello che conti a fine serata</small></div>
          <div className="secondari">
            <div className="carta numero"><div className="eti">In cassa · POS</div><strong>{eur(Number(incassato.posInCassa))}</strong></div>
            <div className="carta numero"><div className="eti">Ai rider · contanti</div><strong>{eur(Number(incassato.contantiAiRider))}</strong></div>
            <div className="carta numero"><div className="eti">Ai rider · POS</div><strong>{eur(Number(incassato.posAiRider))}</strong></div>
            <div className="carta numero"><div className="eti">Online nostro</div><strong>{eur(Number(incassato.onlineNostro))}</strong></div>
            {Number(incassato.piattaforme) > 0 && <div className="carta numero"><div className="eti">Piattaforme</div><strong>{eur(Number(incassato.piattaforme))}</strong></div>}
            <div className={"carta numero" + (Number(incassato.ancoraAperti) > 0 ? " aperti" : "")}><div className="eti">Ancora aperti</div><strong>{eur(Number(incassato.ancoraAperti))}</strong></div>
          </div>
          {riderDaSaldare.length > 0 && (
            <div className="carta in-mano">
              <div className="eti">In mano ai rider</div>
              {riderDaSaldare.map((r) => <div key={r.nome} className="riga"><span>{r.nome}</span><strong>{eur(r.da_saldare)}</strong></div>)}
            </div>
          )}
        </div>
      ) : <p className="muto">Leggo la cassa…</p>}

      <h2>Per canale</h2>
      <div className="griglia r-canali">
        {[...perCanale.entries()].map(([canale, n]) => (
          <div key={canale} className="carta numero"><div className="eti">{canale}</div><strong>{n}<small> {n === 1 ? "ordine" : "ordini"}</small></strong></div>
        ))}
        {perCanale.size === 0 && <p className="muto">Nessun ordine oggi.</p>}
      </div>

      {/* Giro 17 del grafico: gli ordini uno per uno stanno in un ramo chiuso (sono la parte lunga: 47 carte
          la sera del critico). Nessun numero tolto: si apre e c'è tutto. */}
      <details className="r-ramo">
        <summary><h2>Ordini <small>{ordini.length} · {validi.length} validi</small></h2></summary>
        <div className="griglia r-ordini">
          {ordini.map((o) => (
            <article key={o.id} className={"carta r-ordine " + o.stato}>
              <div className="r-testa">
                <strong className="r-num">{o.numero_visibile ?? `#${o.numero}`}</strong>
                <span className={`badge ${o.stato}`}>{o.stato.replace("_", " ")}</span>
              </div>
              <div className="muto r-dove">
                {o.canale} · {o.tipo}
                {o.ora_consegna && " · per le " + new Date(o.ora_consegna).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" })}
              </div>
              <div className="r-tot">{Number(o.totale).toFixed(2).replace(".", ",")} €</div>
            </article>
          ))}
        </div>
      </details>
    </main>
  );
}
