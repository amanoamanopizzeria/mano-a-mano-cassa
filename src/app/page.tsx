"use client";

// La Home è la cassa dei ragazzi (Edoardo, 30/10/2026): «la cassa deve sapere quello che sta uscendo, quindi la
// schermata home è il quarto d'ora con le prossime comande, sempre lì, poi nuovo ordine, poi la mappa rider, e a
// fine serata i conti solo col CSV» (il CSV sta nella Dashboard, 03:28Z). In alto il quarto d'ora di adesso (pizze e consegne sui posti), il tasto
// grande «Nuovo ordine», sotto i prossimi quarti d'ora con le comande dentro. Riepiloghi e il resto: /dashboard.
// I numeri sono gli stessi del planner (capacita_giorno, ordini_per_fascia). 03:26Z: «noi lavoriamo molto più sulla
// schermata di quarto d'ora, quella che trovi in tutti gli ordini: quella è la parte principale» → a sinistra c'è la
// stessa colonna dei quarti d'ora di /cassa (Nuovo ordine, l'ultima chiamata, i posti, i −/+ della serata).
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";
import type { CapacitaFascia } from "@/lib/types";
import ColonnaCassa from "./cassa/ColonnaCassa";

interface OrdineFascia {
  fascia: string; id: string; numero: number; tipo: string; canale: string; stato: string;
  ora_consegna: string | null; creato_il: string; totale: number; pizze: number;
  cliente: string | null; telefono: string | null; indirizzo: string | null; note: string | null;
}

const TIPO: Record<string, string> = { domicilio: "Domicilio", ritiro: "Ritiro", tavolo: "Tavolo", banco: "Banco" };
const CHIUSI = ["consegnato", "ritirato", "annullato"];
// Il giro del domicilio (Edoardo, 03:27Z): in uscita → il rider se lo prende = «In consegna», col suo nome →
// «Consegnato». Lo stato lo scrive l'app rider (consegna), la Home lo legge in tempo reale.
interface Giro { stato: "da_assegnare" | "assegnata" | "ritirata" | "consegnata" | string; rider: { nome: string } | null }
const STATO: Record<string, string> = {
  ricevuto: "Ricevuto", in_preparazione: "In preparazione", pronto: "Pronto", in_consegna: "In consegna",
  consegnato: "Consegnato", ritirato: "Ritirato",
};
function statoDi(o: { tipo: string; stato: string }, g?: Giro): string {
  if (o.stato === "consegnato" || g?.stato === "consegnata") return "Consegnato";
  if (o.tipo === "domicilio" && g?.rider) return g.stato === "assegnata" ? "Assegnato" : "In consegna";
  return STATO[o.stato] ?? o.stato;
}
const QUARTI_AVANTI = 16;  // quattro ore di quarti d'ora dopo quello di adesso (Edoardo, 03:27Z)

const oggi = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
const adessoRoma = () => new Date().toLocaleTimeString("sv-SE", { timeZone: "Europe/Rome" }).slice(0, 5);
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
  const [giri, setGiri] = useState<Map<string, Giro>>(new Map());
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
    const domicili = ((o.data ?? []) as OrdineFascia[]).filter((x) => x.tipo === "domicilio").map((x) => x.id);
    if (domicili.length > 0) {
      const { data: g } = await supabase.from("consegna").select("id_ordine, stato, rider(nome)").in("id_ordine", domicili);
      setGiri(new Map(((g ?? []) as unknown as (Giro & { id_ordine: string })[]).map((x) => [x.id_ordine, x])));
    } else setGiri(new Map());
  }, [giorno]);

  useEffect(() => {
    carica();
    const supabase = supabaseBrowser();
    const canale = supabase
      .channel("home-" + giorno)
      .on("postgres_changes", { event: "*", schema: "public", table: "ordine" }, () => carica())
      .on("postgres_changes", { event: "*", schema: "public", table: "consegna" }, () => carica())
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

  const quartoOra = quartoDi(adesso);
  const attuale = fasce.find((f) => f.ora.slice(0, 5) === quartoOra) ?? null;
  // I prossimi quarti d'ora, più quelli già passati che hanno ancora comande non uscite (in ritardo).
  const prossimi = fasce.filter((f) => f.ora.slice(0, 5) > quartoOra).slice(0, QUARTI_AVANTI);
  const indietro = fasce.filter((f) => f.ora.slice(0, 5) < quartoOra
    && (perFascia.get(f.ora.slice(0, 5)) ?? []).some((o) => !CHIUSI.includes(o.stato)));

  const riga = (f: CapacitaFascia, ritardo = false) => {
    const k = f.ora.slice(0, 5);
    // nei quarti già passati restano solo le comande che non sono uscite: quelle sono il ritardo
    const comande = (perFascia.get(k) ?? []).filter((o) => !ritardo || !CHIUSI.includes(o.stato));
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
                  <span className={"st st-" + statoDi(o, giri.get(o.id)).toLowerCase().replace(/\s+/g, "-")}>
                    {statoDi(o, giri.get(o.id))}{o.tipo === "domicilio" && giri.get(o.id)?.rider ? ` · ${giri.get(o.id)?.rider?.nome}` : ""}
                  </span>
                </li>
              ))}
            </ul>}
      </section>
    );
  };

  return (
    <div className="cassa-casa">
    <ColonnaCassa />
    <main className="home-cassa">
      {errore && <p className="errore">{errore}</p>}

      <nav className="hq-tasti">
        <Link href="/cassa/tavoli">Tavoli</Link>
        <Link href="/cassa/mappa">Mappa rider</Link>
        <Link href="/cassa">Tutti gli ordini</Link>
        <Link href="/dashboard">Fine serata · Dashboard</Link>
      </nav>

      <h2 className="hq-titolo">Le prossime comande, quarto d&apos;ora per quarto d&apos;ora</h2>
      {indietro.length > 0 && <h3 className="hq-ritardo-titolo">In ritardo</h3>}
      {indietro.map((f) => riga(f, true))}
      {attuale && riga(attuale)}
      {prossimi.length === 0 ? <p className="muto">Nessun altro quarto d&apos;ora oggi.</p> : prossimi.map((f) => riga(f))}
    </main>
    </div>
  );
}
