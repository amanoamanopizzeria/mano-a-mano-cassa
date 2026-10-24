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
  const [ereditato, setEreditato] = useState<string | null>(null);   // giorno da cui viene lo standard, se oggi non è impostato
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
    if (t) { setPizzaioli(t.pizzaioli); setRider(t.rider); setEreditato(null); }
    else {
      // come fa capacita_giorno (mig. 0028): senza turno del giorno vale l'ultimo impostato prima
      const { data: u } = await supabase.from("turno_giorno").select("giorno, pizzaioli, rider")
        .eq("id_negozio", negozio).lt("giorno", giorno).order("giorno", { ascending: false }).limit(1).maybeSingle();
      setPizzaioli(u?.pizzaioli ?? 0); setRider(u?.rider ?? 0); setEreditato(u?.giorno ?? null);
    }

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
    <main className="capacita">
      <h1>Capacità — quarti d&apos;ora</h1>
      {errore && <p className="c-errore">{errore}</p>}

      <div className="carta c-turno">
        <label className="c-campo">
          <span>Giorno</span>
          <input type="date" value={giorno} onChange={(e) => setGiorno(e.target.value)} />
        </label>
        <div className="c-fila">
          <label className="c-campo">
            <span>Pizzaioli</span>
            <input type="number" min={0} value={pizzaioli} onChange={(e) => setPizzaioli(Number(e.target.value))} />
          </label>
          <label className="c-campo">
            <span>Rider</span>
            <input type="number" min={0} value={rider} onChange={(e) => setRider(Number(e.target.value))} />
          </label>
          <button className={"primario c-salva" + (salvato ? " fatto" : "")} onClick={salvaTurni} aria-live="polite">
            {salvato ? "✓ Salvato" : "Salva turni"}
          </button>
        </div>
        {ereditato && <p className="muto c-eredita">Turno non impostato per questo giorno: vale quello del {new Date(ereditato + "T12:00").toLocaleDateString("it-IT", { day: "numeric", month: "long" })} finché non salvi.</p>}
        <p className="c-frase">
          Ogni quarto d&apos;ora: fino a <b>{fasce[0]?.pizze_max ?? 0}</b> pizze e <b>{rider}</b> consegne <small>(un rider per consegna)</small>
        </p>
      </div>

      <div className="griglia c-griglia">
        {fasce.map((f) => {
          const pienoProd = f.pizze_max > 0 && f.pizze_occupate >= f.pizze_max;
          const pienoCons = f.consegne_max > 0 && f.consegne_occupate >= f.consegne_max;
          return (
            <div key={f.ora} className={"carta c-fascia" + (pienoProd || pienoCons || f.bloccata_produzione || f.bloccata_consegne ? " piena" : "") + (f.pizze_max === 0 && f.consegne_max === 0 ? " spenta" : "")}>
              <div className="c-testa">
                <strong className="ora">{f.ora.slice(0, 5)}</strong>
                {(pienoProd || pienoCons || f.bloccata_produzione || f.bloccata_consegne) && (
                  <span className="badge ricevuto" title="SOLD OUT">
                    {f.bloccata_produzione ? "BLOCCATO" : f.bloccata_consegne ? "NO CONSEGNE" : pienoProd ? "PIZZE FINITE" : "RIDER PIENI"}
                  </span>
                )}
              </div>
              <div className="c-conta">
                Pizze <b>{f.pizze_occupate}</b> / {f.pizze_max}
                {f.bloccata_produzione && " · bloccata"}
              </div>
              <div className="c-conta">
                Consegne <b>{f.consegne_occupate}</b> / {f.consegne_max}
                {f.bloccata_consegne && " · bloccata"}
              </div>
              <div className="c-azioni">
                <button className={f.bloccata_produzione ? "primario" : "blocco"} onClick={() => alterna(f.ora, "produzione", f.bloccata_produzione)}>
                  {f.bloccata_produzione ? "✕ Pizze bloccate · sblocca" : "Blocca pizze"}
                </button>
                <button className={f.bloccata_consegne ? "primario" : "blocco"} onClick={() => alterna(f.ora, "consegne", f.bloccata_consegne)}>
                  {f.bloccata_consegne ? "✕ Consegne bloccate · sblocca" : "Blocca consegne"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
