"use client";

// La colonna a sinistra della prima schermata, come in 2Bit (Edoardo, 25/10/2026: «la prima schermata prima
// di prendere l'ordine è questa: dove stanno, quante pizze a quarto d'ora possiamo fare, quali ordini sono
// entrati»). In cima il tasto per un ordine nuovo e l'ultima chiamata, sotto i quarti d'ora di oggi da adesso
// in poi: pizze e consegne «occupate/massimo», rosso quando è pieno. I numeri sono quelli di capacita_giorno,
// gli stessi di /cassa/fasce e dell'ordine dal sito.
import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { CapacitaFascia } from "@/lib/types";

const oggi = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
const adessoRoma = () => new Date().toLocaleTimeString("sv-SE", { timeZone: "Europe/Rome" }).slice(0, 5);
const oraDi = (iso: string) => new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

interface Chiamata { numero: string; ricevuta_il: string; gestita: boolean }

export default function ColonnaCassa() {
  const [fasce, setFasce] = useState<CapacitaFascia[]>([]);
  const [chiamata, setChiamata] = useState<Chiamata | null>(null);
  const [adesso, setAdesso] = useState(adessoRoma());

  const carica = useCallback(async () => {
    const supabase = supabaseBrowser();
    const { data: prof } = await supabase.from("profilo").select("id_negozio").maybeSingle();
    if (!prof?.id_negozio) return;
    const [c, ch] = await Promise.all([
      supabase.rpc("capacita_giorno", { p_negozio: prof.id_negozio, p_giorno: oggi() }),
      supabase.from("chiamata").select("numero, ricevuta_il, gestita").order("ricevuta_il", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setFasce((c.data ?? []) as CapacitaFascia[]);
    // una chiamata conta per 15 minuti: dopo è storia
    const k = ch.data as Chiamata | null;
    setChiamata(k && Date.now() - new Date(k.ricevuta_il).getTime() < 15 * 60_000 ? k : null);
  }, []);

  useEffect(() => {
    carica();
    const supabase = supabaseBrowser();
    const canale = supabase
      .channel("cassa-colonna")
      .on("postgres_changes", { event: "*", schema: "public", table: "ordine" }, () => carica())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chiamata" }, () => carica())
      .on("postgres_changes", { event: "*", schema: "public", table: "fascia_bloccata" }, () => carica())
      .on("postgres_changes", { event: "*", schema: "public", table: "fascia_capacita" }, () => carica())
      .subscribe();
    const t = setInterval(() => { setAdesso(adessoRoma()); carica(); }, 60_000);
    return () => { supabase.removeChannel(canale); clearInterval(t); };
  }, [carica]);

  // dal quarto d'ora in corso in poi: quelli passati non servono a chi prende un ordine
  const corrente = fasce.filter((f) => f.ora.slice(0, 5) <= adesso).at(-1)?.ora;
  const vista = fasce.filter((f) => !corrente || f.ora >= corrente);

  return (
    <aside className="cc-colonna">
      <a href="/cassa/nuovo" className="cc-nuovo">+ Nuovo ordine</a>
      <div className={"cc-chiamata" + (chiamata ? " squilla" : "")}>
        {chiamata ? (
          <>
            <span className="cc-etichetta">Chiamata delle {oraDi(chiamata.ricevuta_il)}</span>
            <b className="cc-numero">{chiamata.numero}</b>
            <a href={"/cassa/cliente"} className="cc-apri">Apri la scheda</a>
          </>
        ) : (
          <span className="cc-etichetta">Nessuna chiamata ricevuta</span>
        )}
      </div>
      <div className="cc-fasce">
        <div className="cc-riga cc-intesta"><span>Ora</span><span>Pizze</span><span>Consegne</span></div>
        {vista.length === 0 && <p className="cc-vuoto">Nessun quarto d&apos;ora aperto oggi.</p>}
        {vista.map((f) => {
          const pienaP = f.bloccata_produzione || f.pizze_occupate >= f.pizze_max;
          const pienaC = f.bloccata_consegne || f.consegne_occupate >= f.consegne_max;
          return (
            <a href="/cassa/fasce" key={f.ora} className={"cc-riga" + (f.ora === corrente ? " adesso" : "")}>
              <span className="cc-ora">{f.ora.slice(0, 5)}</span>
              <span className={"cc-cella" + (pienaP ? " piena" : f.pizze_occupate > 0 ? " usata" : "")}>{f.bloccata_produzione ? "chiusa" : `${f.pizze_occupate}/${f.pizze_max}`}</span>
              <span className={"cc-cella" + (pienaC ? " piena" : f.consegne_occupate > 0 ? " usata" : "")}>{f.bloccata_consegne ? "chiusa" : `${f.consegne_occupate}/${f.consegne_max}`}</span>
            </a>
          );
        })}
      </div>
    </aside>
  );
}
