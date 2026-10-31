"use client";

// Lo specchio del 2Bit, solo per Edoardo (31/10/2026 01:45Z: «mi devi far vedere domani che gli ordini, gli stessi
// che ti entrano nel sistema 2Bit, ti entrano anche in cassa in automatico»). Il copiatore sul PC di cassa legge
// in sola lettura gli ordini del 2Bit e ce li manda come COPIE (mig. 0083, copia_2bit): qui compaiono da soli
// appena arrivano, con quanti secondi dopo il 2Bit, il canale (Glovo, Deliveroo, Just Eat, app e sito, cassa,
// telefono, tavoli) e il riepilogo della serata. Sono copie: non stampano, non contano nei conti, non vanno
// all'OS. La serata si legge come nel riepilogo: dopo mezzanotte è ancora la sera prima, taglio alle 06:00.
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";
import SoloAdmin from "@/components/SoloAdmin";

interface RigaCopia { Descrizione?: string; qta?: number; prezzo?: number; variazione?: string | null; idTipoRiga?: number; Eliminato?: number | boolean | null }
interface Copia {
  id: number; id_2bit: string; origine: string | null; tipo: string | null; numero: string | null; stato: string | null;
  totale: number | null; cliente: string | null; ora_consegna: string | null; creato_2bit: string | null;
  righe: RigaCopia[] | null; corpo: Record<string, unknown>; ricevuto_il: string; aggiornato_il: string; versioni: number;
}

export default function SpecchioPagina() {
  return (
    <AuthGate>
      <SoloAdmin>
        <Specchio />
      </SoloAdmin>
    </AuthGate>
  );
}

const giornataDi = (iso: string) => new Date(new Date(iso).getTime() - 6 * 3_600_000).toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
const giornataOggi = () => giornataDi(new Date().toISOString());
const spostaGiorno = (g: string, n: number) => new Date(Date.parse(g + "T12:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);
const oraDi = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" }) : "—");
const dataLunga = (g: string) => new Date(g + "T12:00:00Z").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Rome" });
const euro = (n: number | null | undefined) => (n ?? 0).toLocaleString("it-IT", { style: "currency", currency: "EUR" });

// il canale lo scrive il copiatore in corpo.canale (come canale_2bit_nome, mig. 0085); le copie vecchie hanno solo l'origine
const CANALI: Record<string, string> = {
  glovo: "Glovo", deliveroo: "Deliveroo", just_eat: "Just Eat", app_web: "app e sito", cassa: "cassa 2Bit",
  telefono: "telefono", totem: "totem", tavolo: "tavoli", altro: "altro",
};
const ORIGINI: Record<string, string> = { "0": "cassa 2Bit", "1": "app", "2": "sito", "3": "Just Eat", "4": "telefono", "5": "totem", "100": "Deliveroo", "101": "Uber Eats", "199": "Glovo" };
const TIPI: Record<string, string> = { "0": "ritiro", "1": "domicilio", "2": "banco", "3": "tavolo" };
const STATI: Record<string, string> = { aperto: "aperto", chiuso: "chiuso", consegnato: "consegnato", in_consegna: "in consegna", sospeso: "sospeso", eliminato: "eliminato" };
const canaleDi = (c: Copia) => CANALI[String(c.corpo?.canale ?? "")] ?? ORIGINI[c.origine ?? ""] ?? c.origine ?? "?";
const secondiDopo = (c: Copia) => (c.creato_2bit ? Math.max(0, Math.round((Date.parse(c.ricevuto_il) - Date.parse(c.creato_2bit)) / 1000)) : null);
const daQuanto = (s: number) => (s < 60 ? `${s} s` : s < 3600 ? `${Math.round(s / 60)} min` : `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`);

function Specchio() {
  const [giornata, setGiornata] = useState(giornataOggi);
  const [copie, setCopie] = useState<Copia[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [aperta, setAperta] = useState<number | null>(null);
  const [adesso, setAdesso] = useState(() => Date.now());
  const stasera = giornataOggi();
  const inCorso = giornata === stasera;
  const richiesta = useRef(0);

  useEffect(() => {
    const supabase = supabaseBrowser();
    const mia = ++richiesta.current;
    async function carica() {
      const { data, error } = await supabase.from("copia_2bit")
        .select("id, id_2bit, origine, tipo, numero, stato, totale, cliente, ora_consegna, creato_2bit, righe, corpo, ricevuto_il, aggiornato_il, versioni")
        .eq("giornata", giornata).order("creato_2bit", { ascending: false, nullsFirst: false });
      if (mia !== richiesta.current) return;
      if (error) { setErrore(error.message); return; }
      setErrore(null);
      setCopie((data ?? []) as Copia[]);
    }
    carica();
    if (!inCorso) return;
    // stasera le copie nuove, e i cambi di stato, compaiono da soli
    const canale = supabase.channel("cassa-specchio-2bit")
      .on("postgres_changes", { event: "*", schema: "public", table: "copia_2bit" }, () => carica())
      .subscribe();
    const orologio = setInterval(() => setAdesso(Date.now()), 10_000);
    return () => { supabase.removeChannel(canale); clearInterval(orologio); };
  }, [giornata, inCorso]);

  const vive = (copie ?? []).filter((c) => c.stato !== "eliminato");
  const eliminate = (copie ?? []).length - vive.length;
  const totale = vive.reduce((s, c) => s + (c.totale ?? 0), 0);
  const inCorsoOra = vive.filter((c) => c.stato === "aperto" || c.stato === "in_consegna" || c.stato === "sospeso").length;
  const ultima = (copie ?? []).reduce<string | null>((m, c) => (!m || c.ricevuto_il > m ? c.ricevuto_il : m), null);
  const perCanale = new Map<string, { n: number; euro: number }>();
  for (const c of vive) { const k = canaleDi(c); const v = perCanale.get(k) ?? { n: 0, euro: 0 }; v.n++; v.euro += c.totale ?? 0; perCanale.set(k, v); }
  const ritardi = vive.map(secondiDopo).filter((s): s is number => s !== null && s < 3600);
  const ritardoMedio = ritardi.length ? Math.round(ritardi.reduce((a, b) => a + b, 0) / ritardi.length) : null;

  return (
    <main className="riepilogo specchio">
      <h1>Specchio 2Bit</h1>
      <p className="muto">Gli ordini così come entrano nel 2Bit, copiati da soli nella cassa nuova. Sono copie: non stampano, non contano nei conti.</p>
      <div className="r-giorno">
        <button type="button" onClick={() => setGiornata(spostaGiorno(giornata, -1))}>‹ Prima</button>
        <strong>{inCorso ? "Stasera" : dataLunga(giornata)}</strong>
        <button type="button" disabled={giornata >= stasera} onClick={() => setGiornata(spostaGiorno(giornata, 1))}>Dopo ›</button>
        {inCorso && ultima && <span className="muto sp-vivo">ultimo arrivo {daQuanto(Math.max(0, Math.round((adesso - Date.parse(ultima)) / 1000)))} fa</span>}
      </div>
      {errore && <p className="r-errore">{errore}</p>}
      {copie === null ? <p className="muto">Leggo le copie…</p> : copie.length === 0 ? (
        <p className="muto">
          {inCorso ? "Nessun ordine copiato stasera. Il copiatore sul PC di cassa è acceso? Appena entra un ordine nel 2Bit compare qui." : "Nessuna copia per quella sera."}
        </p>
      ) : (
        <>
          <div className="griglia r-cima">
            <div className="carta numero vino"><span className="eti">Ordini nel 2Bit</span><strong>{vive.length}{eliminate > 0 && <small> +{eliminate} eliminat{eliminate === 1 ? "o" : "i"}</small>}</strong></div>
            <div className="carta numero"><span className="eti">Totale</span><strong>{euro(totale)}</strong></div>
            <div className="carta numero"><span className="eti">In corso</span><strong>{inCorsoOra}</strong></div>
            <div className="carta numero"><span className="eti">Da noi dopo</span><strong>{ritardoMedio === null ? "—" : daQuanto(ritardoMedio)}<small> in media</small></strong></div>
          </div>
          <h2>Per canale</h2>
          <div className="griglia r-canali">
            {[...perCanale.entries()].sort((a, b) => b[1].n - a[1].n).map(([k, v]) => (
              <div key={k} className="carta numero"><span className="eti">{k}</span><strong>{v.n}<small> · {euro(v.euro)}</small></strong></div>
            ))}
          </div>
          <h2>Gli ordini <small className="muto">dall&apos;ultimo entrato</small></h2>
          <ul className="sp-lista">
            {copie.map((c) => {
              const s = secondiDopo(c);
              const righe = (c.righe ?? []).filter((r) => !r.Eliminato);
              const apertaQui = aperta === c.id;
              return (
                <li key={c.id} className={"carta sp-riga" + (c.stato === "eliminato" ? " sp-eliminata" : "")}>
                  <button type="button" className="sp-testa" onClick={() => setAperta(apertaQui ? null : c.id)} aria-expanded={apertaQui}>
                    <span className="sp-ora">{oraDi(c.creato_2bit)}</span>
                    <span className="sp-chi">
                      <strong>#{c.numero ?? "—"} · {canaleDi(c)} · {TIPI[c.tipo ?? ""] ?? c.tipo ?? "?"}</strong>
                      <span className="muto">
                        {c.tipo === "3" && c.cliente ? c.cliente + " · " : ""}
                        {c.ora_consegna ? `per le ${oraDi(c.ora_consegna)} · ` : ""}
                        {s === null ? "copiato" : `da noi ${daQuanto(s)} dopo il 2Bit`}
                        {c.versioni > 1 ? ` · ${c.versioni} versioni` : ""}
                      </span>
                    </span>
                    <span className={"sp-stato " + (c.stato ?? "")}>{STATI[c.stato ?? ""] ?? c.stato ?? "?"}</span>
                    <span className="sp-tot">{euro(c.totale)}</span>
                  </button>
                  {apertaQui && (
                    <div className="sp-dentro">
                      {righe.length === 0 ? <p className="muto">Righe non ancora copiate.</p> : (
                        <ul>
                          {righe.map((r, i) => (
                            <li key={i}>
                              <span>{r.qta ?? 1} × {r.Descrizione ?? "?"}{r.variazione ? <em className="muto"> {r.variazione}</em> : null}</span>
                              <span>{euro((r.prezzo ?? 0) * (r.qta ?? 1))}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="muto">
                        id 2Bit {c.id_2bit}{typeof c.corpo?.id_esterno === "number" && c.corpo.id_esterno > 0 ? ` · ordine esterno ${c.corpo.id_esterno}` : ""}
                        {typeof c.corpo?.partito === "string" ? ` · partito ${oraDi(c.corpo.partito)}` : ""}
                        {typeof c.corpo?.arrivato === "string" ? ` · arrivato ${oraDi(c.corpo.arrivato)}` : ""}
                        {" · copiato alle "}{oraDi(c.ricevuto_il)}{c.aggiornato_il !== c.ricevuto_il ? `, aggiornato alle ${oraDi(c.aggiornato_il)}` : ""}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </main>
  );
}
