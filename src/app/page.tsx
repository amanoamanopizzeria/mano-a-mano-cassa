"use client";

// La Home è la cassa dei ragazzi (Edoardo, 30/10/2026): «la cassa deve sapere quello che sta uscendo, quindi la
// schermata home è il quarto d'ora con le prossime comande, sempre lì, poi nuovo ordine, poi la mappa rider, e a
// fine serata i conti solo col CSV». In alto il quarto d'ora di adesso (pizze e consegne sui posti), il tasto
// grande «Nuovo ordine», sotto i prossimi quarti d'ora con le comande dentro. Riepiloghi e il resto: /dashboard.
// I numeri sono gli stessi del planner (capacita_giorno, ordini_per_fascia).
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";
import type { CapacitaFascia } from "@/lib/types";

interface OrdineFascia {
  fascia: string; id: string; numero: number; tipo: string; canale: string; stato: string;
  ora_consegna: string | null; creato_il: string; totale: number; pizze: number;
  cliente: string | null; telefono: string | null; indirizzo: string | null; note: string | null;
}

const TIPO: Record<string, string> = { domicilio: "Domicilio", ritiro: "Ritiro", tavolo: "Tavolo", banco: "Banco" };
const CHIUSI = ["consegnato", "ritirato", "annullato"];
const QUARTI_AVANTI = 8;   // due ore di quarti d'ora dopo quello di adesso

const oggi = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
const adessoRoma = () => new Date().toLocaleTimeString("sv-SE", { timeZone: "Europe/Rome" }).slice(0, 5);
// La serata finisce alle 06: dopo mezzanotte il CSV è ancora quello della sera prima (come la dashboard).
const serataDi = (t: number) => new Date(t - 6 * 3_600_000).toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
const quartoDi = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${String(h).padStart(2, "0")}:${String(m - (m % 15)).padStart(2, "0")}`;
};

export default function HomeCassa() {
  return (
    <AuthGate>
      <Home />
    </AuthGate>
  );
}

function Home() {
  const [fasce, setFasce] = useState<CapacitaFascia[]>([]);
  const [ordini, setOrdini] = useState<OrdineFascia[]>([]);
  const [adesso, setAdesso] = useState(adessoRoma());
  const [errore, setErrore] = useState<string | null>(null);
  const giorno = oggi();

  const carica = useCallback(async () => {
    const supabase = supabaseBrowser();
    const { data: prof } = await supabase.from("profilo").select("id_negozio").single();
    const negozio = prof?.id_negozio as string | undefined;
    if (!negozio) { setErrore("Nessun negozio collegato al tuo profilo."); return; }
    const [c, o] = await Promise.all([
      supabase.rpc("capacita_giorno", { p_negozio: negozio, p_giorno: giorno }),
      supabase.rpc("ordini_per_fascia", { p_negozio: negozio, p_giorno: giorno }),
    ]);
    if (c.error) setErrore(c.error.message); else if (o.error) setErrore(o.error.message);
    else { setErrore(null); setFasce((c.data ?? []) as CapacitaFascia[]); setOrdini((o.data ?? []) as OrdineFascia[]); }
  }, [giorno]);

  useEffect(() => {
    carica();
    const supabase = supabaseBrowser();
    const canale = supabase
      .channel("home-" + giorno)
      .on("postgres_changes", { event: "*", schema: "public", table: "ordine" }, () => carica())
      .on("postgres_changes", { event: "*", schema: "public", table: "turno_giorno" }, () => carica())
      .on("postgres_changes", { event: "*", schema: "public", table: "fascia_capacita" }, () => carica())
      .on("postgres_changes", { event: "*", schema: "public", table: "fascia_bloccata" }, () => carica())
      .subscribe();
    const orologio = setInterval(() => setAdesso(adessoRoma()), 30_000);
    return () => { supabase.removeChannel(canale); clearInterval(orologio); };
  }, [carica, giorno]);

  const perFascia = useMemo(() => {
    const m = new Map<string, OrdineFascia[]>();
    for (const o of ordini) {
      if (o.stato === "annullato") continue;
      const k = o.fascia.slice(0, 5);
      m.set(k, [...(m.get(k) ?? []), o]);
    }
    return m;
  }, [ordini]);

  // Fine serata: il CSV a 40 colonne per mano-a-mano-os, lo stesso che legge l'OS (/api/ordini/csv).
  async function scaricaCsv() {
    const serata = serataDi(Date.now());
    const { data } = await supabaseBrowser().auth.getSession();
    const r = await fetch(`/api/ordini/csv?giornata=${serata}`, { headers: { authorization: `Bearer ${data.session?.access_token ?? ""}` } });
    if (!r.ok) { setErrore(`CSV non scaricato (${r.status}).`); return; }
    const el = document.createElement("a");
    el.href = URL.createObjectURL(await r.blob());
    const [a, m, g] = serata.split("-");
    el.download = `export_${g}-${m}-${a}.csv`;
    el.click(); URL.revokeObjectURL(el.href);
  }

  const quartoOra = quartoDi(adesso);
  const attuale = fasce.find((f) => f.ora.slice(0, 5) === quartoOra) ?? null;
  // I prossimi quarti d'ora, più quelli già passati che hanno ancora comande non uscite (in ritardo).
  const prossimi = fasce.filter((f) => f.ora.slice(0, 5) > quartoOra).slice(0, QUARTI_AVANTI);
  const indietro = fasce.filter((f) => f.ora.slice(0, 5) < quartoOra
    && (perFascia.get(f.ora.slice(0, 5)) ?? []).some((o) => !CHIUSI.includes(o.stato)));

  const riga = (f: CapacitaFascia, ritardo = false) => {
    const k = f.ora.slice(0, 5);
    const comande = perFascia.get(k) ?? [];
    const pieno = f.pizze_occupate >= f.pizze_max || f.bloccata_produzione;
    return (
      <section key={k} className={"hq-quarto" + (ritardo ? " ritardo" : "") + (pieno ? " pieno" : "")}>
        <div className="hq-ora">
          <b>{k}</b>
          <span className="hq-posti">🍕 {f.pizze_occupate}/{f.pizze_max} · 🛵 {f.consegne_occupate}/{f.consegne_max}</span>
          {ritardo && <span className="hq-tag">da far uscire</span>}
          {pieno && !ritardo && <span className="hq-tag">pieno</span>}
        </div>
        {comande.length === 0
          ? <div className="hq-vuoto">—</div>
          : <ul className="hq-comande">
              {comande.map((o) => (
                <li key={o.id} className={"t-" + o.tipo + (CHIUSI.includes(o.stato) ? " uscita" : "")}>
                  <span className="n">#{o.numero}</span>
                  <span className="tipo">{TIPO[o.tipo] ?? o.tipo}</span>
                  <span className="chi">{o.cliente ?? ""}{o.tipo === "domicilio" && o.indirizzo ? ` · ${o.indirizzo}` : ""}</span>
                  <span className="pz">{o.pizze} pz</span>
                </li>
              ))}
            </ul>}
      </section>
    );
  };

  return (
    <main className="home-cassa">
      {errore && <p className="errore">{errore}</p>}

      <div className="hq-testa">
        <div className="hq-adesso">
          <small>Adesso · {quartoOra}</small>
          {attuale
            ? <div className="hq-numeri">
                <span><b>{attuale.pizze_occupate}</b>/{attuale.pizze_max} <em>pizze</em></span>
                <span><b>{attuale.consegne_occupate}</b>/{attuale.consegne_max} <em>consegne</em></span>
              </div>
            : <div className="hq-numeri muto">Fuori orario</div>}
        </div>
        <Link href="/cassa/nuovo" className="hq-nuovo">＋ Nuovo ordine</Link>
      </div>

      <nav className="hq-tasti">
        <Link href="/cassa/tavoli">Tavoli</Link>
        <Link href="/cassa/mappa">Mappa rider</Link>
        <Link href="/cassa">Tutti gli ordini</Link>
        <a href="#" onClick={(e) => { e.preventDefault(); scaricaCsv(); }}>Fine serata · CSV</a>
      </nav>

      {indietro.map((f) => riga(f, true))}
      {attuale && riga(attuale)}
      <h2 className="hq-titolo">Prossimi quarti d&apos;ora</h2>
      {prossimi.length === 0 ? <p className="muto">Nessun altro quarto d&apos;ora oggi.</p> : prossimi.map((f) => riga(f))}
    </main>
  );
}
