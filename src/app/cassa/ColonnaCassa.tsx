"use client";

// La colonna a sinistra della prima schermata, come in 2Bit (Edoardo, 25/10/2026: «la prima schermata prima
// di prendere l'ordine è questa: dove stanno, quante pizze a quarto d'ora possiamo fare, quali ordini sono
// entrati»). In cima il tasto per un ordine nuovo e l'ultima chiamata, sotto i quarti d'ora di oggi da adesso
// in poi: pizze e consegne «occupate/massimo», rosso quando è pieno. I numeri sono quelli di capacita_giorno,
// gli stessi di /cassa/fasce e dell'ordine dal sito.
// Sotto, i −/+ della serata (Edoardo, 26/10/2026: «numero di consegne 2 a quarto d'ora più, diventano 3
// rider… così come il numero di pizze meno o più in base al personale che sta in cucina»): un tocco cambia di
// uno il massimo di TUTTI i quarti d'ora da adesso a fine serata, con imposta_fascia, la stessa regola che
// leggono il sito e gli ordini esterni: un quarto d'ora che si riempie sparisce subito da /ordina.
import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { CapacitaFascia } from "@/lib/types";

// la serata, non il giorno del calendario: dopo mezzanotte è ancora la sera prima (taglio alle 06:00, come
// giornata_lavorativa). Critico giro 30: alle 00:30 i −/+ cambiavano i quarti della sera dopo.
const oggi = () => new Date(Date.now() - 6 * 3_600_000).toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
const calendario = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
const adessoRoma = () => new Date().toLocaleTimeString("sv-SE", { timeZone: "Europe/Rome" }).slice(0, 5);
const oraDi = (iso: string) => new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

type Reparto = "produzione" | "consegne";
interface Chiamata { numero: string; ricevuta_il: string; gestita: boolean }

export default function ColonnaCassa() {
  const [fasce, setFasce] = useState<CapacitaFascia[]>([]);
  const [chiamata, setChiamata] = useState<Chiamata | null>(null);
  const [adesso, setAdesso] = useState(adessoRoma());
  const [negozio, setNegozio] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  // «Annulla» rimette i numeri di prima quarto per quarto (critico giro 30: rifare il passo al contrario
  // riapriva un quarto chiuso a 0, perché il − si ferma a 0 e il + dopo no)
  const [ultimo, setUltimo] = useState<{ tipo: Reparto; prima: { ora: string; massimo: number }[]; quanti: number } | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  const carica = useCallback(async () => {
    const supabase = supabaseBrowser();
    const { data: prof } = await supabase.from("profilo").select("id_negozio").maybeSingle();
    if (!prof?.id_negozio) return;
    setNegozio(prof.id_negozio);
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
  // dopo mezzanotte la serata è finita: i quarti di stasera sono tutti passati
  const dopoMezzanotte = oggi() !== calendario();
  const corrente = fasce.filter((f) => f.ora.slice(0, 5) <= adesso).at(-1)?.ora;
  const vista = dopoMezzanotte ? [] : fasce.filter((f) => !corrente || f.ora >= corrente);

  // il quarto d'ora in corso decide il numero che si vede: è quello che conta adesso
  const primo = vista[0];

  async function cambia(tipo: Reparto, delta: number, annulla?: { ora: string; massimo: number }[]) {
    if (!negozio || salvo || vista.length === 0) return;
    setSalvo(true); setErrore(null);
    const supabase = supabaseBrowser();
    const prima = vista.map((f) => ({ ora: f.ora, massimo: tipo === "produzione" ? f.pizze_max : f.consegne_max }));
    const nuovi = annulla ?? prima.map((p) => ({ ora: p.ora, massimo: Math.max(0, p.massimo + delta) }));
    // solo i quarti che cambiano davvero
    const daSalvare = nuovi.filter((n) => prima.find((p) => p.ora === n.ora)?.massimo !== n.massimo);
    const risultati = await Promise.all(daSalvare.map((n) => supabase.rpc("imposta_fascia", {
      p_negozio: negozio, p_giorno: oggi(), p_ora: n.ora, p_tipo: tipo, p_massimo: n.massimo,
    })));
    const sbagliato = risultati.find((r) => r.error);
    if (sbagliato?.error) setErrore("Non salvato: " + sbagliato.error.message);
    else if (!annulla) {
      // per 6 secondi resta «Annulla»: con le dita del servizio il + si tocca per sbaglio (come in /cassa/fasce)
      const u = { tipo, prima, quanti: Date.now() };
      setUltimo(u);
      setTimeout(() => setUltimo((x) => (x?.quanti === u.quanti ? null : x)), 6000);
    } else setUltimo(null);
    await carica();
    setSalvo(false);
  }

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
      {primo && (
        <div className="cc-serata">
          <span className="cc-etichetta">Da adesso a fine serata, a quarto d&apos;ora</span>
          {(["produzione", "consegne"] as const).map((tipo) => {
            const n = tipo === "produzione" ? primo.pizze_max : primo.consegne_max;
            return (
              <div className="cc-passo" key={tipo}>
                <span className="cc-passo-nome">{tipo === "produzione" ? "Pizze" : "Consegne"}<small>{tipo === "consegne" ? (n === 1 ? "1 rider" : `${n} rider`) : "in base alla cucina"}</small></span>
                <button type="button" onClick={() => cambia(tipo, -1)} disabled={salvo || vista.every((f) => (tipo === "produzione" ? f.pizze_max : f.consegne_max) <= 0)} aria-label={tipo === "produzione" ? "Una pizza in meno" : "Una consegna in meno"}>−</button>
                <b>{n}</b>
                <button type="button" onClick={() => cambia(tipo, 1)} disabled={salvo} aria-label={tipo === "produzione" ? "Una pizza in più" : "Una consegna in più"}>+</button>
              </div>
            );
          })}
          {ultimo && (
            <button type="button" className="cc-annulla" disabled={salvo} onClick={() => cambia(ultimo.tipo, 0, ultimo.prima)}>
              Salvato · Annulla
            </button>
          )}
          {errore && <span className="cc-errore">{errore}</span>}
        </div>
      )}
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
