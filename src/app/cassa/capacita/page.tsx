"use client";

// Capacità per quarto d'ora: il giorno si imposta con pizzaioli e rider presenti,
// la capacità di ogni quarto d'ora viene dalla regola del numero di pizzaioli.
// Un quarto d'ora pieno diventa SOLD OUT; si può bloccare a mano produzione o consegne.
import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";
import type { CapacitaFascia, TipoBlocco } from "@/lib/types";

export default function CapacitaPagina() {
  return (
    <AuthGate>
      <Capacita />
    </AuthGate>
  );
}

function oggi(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
}

function Capacita() {
  const [giorno, setGiorno] = useState<string>(oggi());
  const [fasce, setFasce] = useState<CapacitaFascia[]>([]);
  const [pizzaioli, setPizzaioli] = useState(0);
  const [rider, setRider] = useState(0);
  const [idNegozio, setIdNegozio] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [salvato, setSalvato] = useState(false);

  const carica = useCallback(async () => {
    const supabase = supabaseBrowser();
    const { data: prof } = await supabase.from("profilo").select("id_negozio").single();
    const negozio = prof?.id_negozio as string | undefined;
    if (!negozio) { setErrore("Nessun negozio collegato al tuo profilo."); return; }
    setIdNegozio(negozio);

    const { data: t } = await supabase
      .from("turno_giorno").select("pizzaioli, rider")
      .eq("id_negozio", negozio).eq("giorno", giorno).maybeSingle();
    setPizzaioli(t?.pizzaioli ?? 0);
    setRider(t?.rider ?? 0);

    const { data, error } = await supabase.rpc("capacita_giorno", { p_negozio: negozio, p_giorno: giorno });
    if (error) setErrore(error.message);
    else { setErrore(null); setFasce((data ?? []) as CapacitaFascia[]); }
  }, [giorno]);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) { setErrore("Supabase non configurato."); return; }
    carica();
    const supabase = supabaseBrowser();
    const canale = supabase
      .channel("capacita-" + giorno)
      .on("postgres_changes", { event: "*", schema: "public", table: "turno_giorno" }, () => carica())
      .on("postgres_changes", { event: "*", schema: "public", table: "fascia_bloccata" }, () => carica())
      .subscribe();
    return () => { supabase.removeChannel(canale); };
  }, [carica, giorno]);

  async function salvaTurni() {
    if (!idNegozio) return;
    const { error } = await supabaseBrowser().from("turno_giorno").upsert({
      id_negozio: idNegozio, giorno, pizzaioli, rider, aggiornato_il: new Date().toISOString(),
    });
    if (error) setErrore(error.message);
    else { setSalvato(true); setTimeout(() => setSalvato(false), 1500); carica(); }
  }

  async function alterna(ora: string, tipo: TipoBlocco, bloccata: boolean) {
    if (!idNegozio) return;
    const supabase = supabaseBrowser();
    const res = bloccata
      ? await supabase.from("fascia_bloccata").delete()
          .eq("id_negozio", idNegozio).eq("giorno", giorno).eq("ora", ora).eq("tipo", tipo)
      : await supabase.from("fascia_bloccata").insert({ id_negozio: idNegozio, giorno, ora, tipo });
    if (res.error) setErrore(res.error.message);
    else carica();
  }

  return (
    <main>
      <h1>Capacità — quarti d&apos;ora</h1>
      {errore && <p style={{ color: "var(--accento)" }}>{errore}</p>}

      <div className="carta" style={{ marginBottom: 12 }}>
        <label>
          Giorno{" "}
          <input type="date" value={giorno} onChange={(e) => setGiorno(e.target.value)} />
        </label>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10, alignItems: "end" }}>
          <label>
            Pizzaioli
            <input type="number" min={0} value={pizzaioli} onChange={(e) => setPizzaioli(Number(e.target.value))} style={{ width: 80 }} />
          </label>
          <label>
            Rider
            <input type="number" min={0} value={rider} onChange={(e) => setRider(Number(e.target.value))} style={{ width: 80 }} />
          </label>
          <button className="primario" onClick={salvaTurni}>
            {salvato ? "Salvato" : "Salva turni"}
          </button>
        </div>
        <p className="muto" style={{ marginTop: 8 }}>
          Ogni quarto d&apos;ora: fino a {fasce[0]?.pizze_max ?? 0} pizze e {rider} consegne (un rider per consegna).
        </p>
      </div>

      <div className="griglia">
        {fasce.map((f) => {
          const pienoProd = f.pizze_max > 0 && f.pizze_occupate >= f.pizze_max;
          const pienoCons = f.consegne_max > 0 && f.consegne_occupate >= f.consegne_max;
          return (
            <div key={f.ora} className="carta" style={{ opacity: f.pizze_max === 0 && f.consegne_max === 0 ? 0.5 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{f.ora.slice(0, 5)}</strong>
                {(pienoProd || pienoCons || f.bloccata_produzione || f.bloccata_consegne) && (
                  <span className="badge annullato">SOLD OUT</span>
                )}
              </div>
              <div className="muto">
                Pizze {f.pizze_occupate} / {f.pizze_max}
                {f.bloccata_produzione && " · bloccata"}
              </div>
              <div className="muto">
                Consegne {f.consegne_occupate} / {f.consegne_max}
                {f.bloccata_consegne && " · bloccata"}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                <button onClick={() => alterna(f.ora, "produzione", f.bloccata_produzione)}>
                  {f.bloccata_produzione ? "Sblocca pizze" : "Blocca pizze"}
                </button>
                <button onClick={() => alterna(f.ora, "consegne", f.bloccata_consegne)}>
                  {f.bloccata_consegne ? "Sblocca consegne" : "Blocca consegne"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
