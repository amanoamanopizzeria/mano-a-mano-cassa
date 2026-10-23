"use client";

// La comanda cartacea, com'è oggi (Edoardo, 23/10/2026): la cucina legge TUTTE le righe, divise
// per reparto (le categorie: pizze classiche, pizze speciali, fritti, dolci…), su carta da 80 mm.
// Niente schermo in cucina per ora. Con ?stampa=1 la pagina si stampa da sola appena carica
// (dalla cassa, in una finestra nascosta): col Chrome in --kiosk-printing esce senza chiedere.
import { use, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";
import type { Variazione } from "@/lib/types";
import "./comanda.css";

interface RigaComanda {
  id?: string; id_riga_padre?: string | null; incluso?: string | null;
  descrizione: string; quantita: number; variazioni: Variazione[]; note: string | null;
  destinazione: "cucina" | "cassa" | "nessuna"; reparto: string; reparto_ordine: number;
  figlie?: RigaComanda[];
}
interface Comanda {
  id: string; numero: number; canale: string; tipo: string; stato: string;
  creato_il: string; ora_consegna: string | null; totale: number; note: string | null;
  pagamento: "contanti" | "pos" | null; costo_consegna: number; cliente: string | null; telefono: string | null;
  cliente_note?: string | null; paga_con?: number | null; pagato_online?: boolean; sconto?: number; codice_coupon?: string | null;
  tavolo: number | null; indirizzo: { via: string; civico: string | null; cap: string | null; citta: string | null; zona: string | null } | null;
  righe: RigaComanda[];
}

const TIPO: Record<string, string> = { banco: "AL BANCO", ritiro: "RITIRO", domicilio: "DOMICILIO", tavolo: "TAVOLO" };
const CANALE: Record<string, string> = { app: "App", web: "Sito", totem: "Totem", telefono: "Telefono", cassa: "Cassa", glovo: "Glovo", deliveroo: "Deliveroo", justeat: "Just Eat" };
const ora = (s: string) => new Date(s).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

export default function ComandaPagina({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ stampa?: string }> }) {
  const { id } = use(params);
  const { stampa } = use(searchParams);
  return <AuthGate><ComandaCarta id={id} stampaSubito={stampa === "1"} /></AuthGate>;
}

function ComandaCarta({ id, stampaSubito }: { id: string; stampaSubito: boolean }) {
  const [c, setC] = useState<Comanda | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    supabaseBrowser().rpc("comanda_ordine", { p_id: id }).then(({ data, error }) => {
      if (error || !data) { setErrore(error?.message ?? "Ordine non trovato"); return; }
      const d = data as Comanda;
      setC({ ...d, totale: Number(d.totale), costo_consegna: Number(d.costo_consegna ?? 0), righe: d.righe.map((r) => ({ ...r, quantita: Number(r.quantita) })) });
    });
  }, [id]);

  useEffect(() => {
    if (!c || !stampaSubito) return;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [c, stampaSubito]);

  if (errore) return <main><p style={{ color: "var(--accento)" }}>{errore}</p></main>;
  if (!c) return <main><p className="muto">Carico la comanda…</p></main>;

  // i reparti nell'ordine del menù; le righe «nessuna» (es. sconti) non vanno in cucina.
  // Le scelte di un menu (mig. 0023) stanno sotto il menu, non sparse nei reparti delle pizze.
  const figlieDi = (id?: string) => (id ? c.righe.filter((x) => x.id_riga_padre === id) : []);
  const reparti: { nome: string; righe: RigaComanda[] }[] = [];
  for (const r of c.righe.filter((r) => r.destinazione !== "nessuna" && !r.id_riga_padre)) {
    const riga = { ...r, figlie: figlieDi(r.id) };
    const g = reparti.find((x) => x.nome === r.reparto);
    if (g) g.righe.push(riga); else reparti.push({ nome: r.reparto, righe: [riga] });
  }
  // i pezzi in cucina: le pizze vere, non la riga «Menu» che le contiene
  const pezzi = c.righe.filter((r) => r.destinazione === "cucina" && !(r.id && c.righe.some((x) => x.id_riga_padre === r.id))).reduce((s, r) => s + r.quantita, 0);

  return (
    <div className="comanda-pagina">
      <div className="comanda-strumenti">
        <button className="primario" onClick={() => window.print()}>Stampa</button>
        <a href="/cassa"><button>Torna alla cassa</button></a>
      </div>

      <article className="comanda">
        <header>
          <div className="numero">#{c.numero}</div>
          <div className="tipo">{TIPO[c.tipo] ?? c.tipo}{c.tavolo != null && ` ${c.tavolo}`}</div>
          <div className="quando">
            {c.ora_consegna ? <>per le <b>{ora(c.ora_consegna)}</b></> : <>subito</>} · ricevuto {ora(c.creato_il)} · {CANALE[c.canale] ?? c.canale}
          </div>
        </header>

        {(c.cliente || c.telefono) && (
          <section className="chi">
            {c.cliente && <div className="nome">{c.cliente}</div>}
            {c.telefono && <div>{c.telefono}</div>}
            {c.cliente_note && <div className="nota" style={{ fontWeight: 900, fontStyle: "normal", paddingLeft: 0 }}>⚠ {c.cliente_note}</div>}
          </section>
        )}
        {c.indirizzo && (
          <section className="dove">
            <div className="nome">{c.indirizzo.via} {c.indirizzo.civico ?? ""}</div>
            <div>{[c.indirizzo.cap, c.indirizzo.citta].filter(Boolean).join(" ")}{c.indirizzo.zona && ` · zona ${c.indirizzo.zona}`}</div>
          </section>
        )}

        {reparti.map((g) => (
          <section key={g.nome} className="reparto">
            <h2>{g.nome}</h2>
            {g.righe.map((r, i) => (
              <div key={i} className="riga">
                <div className="q">{r.quantita}</div>
                <div className="cosa">
                  <div className="descr">{r.descrizione}</div>
                  {r.variazioni.filter((v) => v.tipo === "aggiunta").map((v, j) => <div key={"a" + j} className="con">CON {v.nome}</div>)}
                  {r.variazioni.filter((v) => v.tipo === "rimozione").map((v, j) => <div key={"s" + j} className="senza">SENZA {v.nome}</div>)}
                  {r.variazioni.filter((v) => v.tipo === "nota").map((v, j) => <div key={"n" + j} className="nota">{v.nome}</div>)}
                  {r.note && <div className="nota">{r.note}</div>}
                  {(r.figlie ?? []).map((f, k) => (
                    <div key={"f" + k} className="figlia">
                      <div className="descr">{f.quantita > 1 ? `${f.quantita}× ` : "· "}{f.descrizione}</div>
                      {f.variazioni.filter((v) => v.tipo === "aggiunta").map((v, j) => <div key={"a" + j} className="con">CON {v.nome}</div>)}
                      {f.variazioni.filter((v) => v.tipo === "rimozione").map((v, j) => <div key={"s" + j} className="senza">SENZA {v.nome}</div>)}
                    </div>
                  ))}
                  {r.incluso && <div className="incluso">+ {r.incluso.toUpperCase()}</div>}
                </div>
              </div>
            ))}
          </section>
        ))}

        {c.note && <section className="note"><b>NOTE:</b> {c.note}</section>}

        <footer>
          <div>{pezzi} {pezzi === 1 ? "pezzo" : "pezzi"} in cucina</div>
          <div className="totale">{c.costo_consegna > 0 && <>consegna {c.costo_consegna.toFixed(2).replace(".", ",")} € · </>}{Number(c.sconto ?? 0) > 0 && <>sconto {c.codice_coupon ?? ""} −{Number(c.sconto).toFixed(2).replace(".", ",")} € · </>}Totale {c.totale.toFixed(2).replace(".", ",")} €{c.pagato_online ? " · GIÀ PAGATO" : c.pagamento && ` · ${c.pagamento === "pos" ? "POS" : "CONTANTI"}`}{!c.pagato_online && c.paga_con != null && Number(c.paga_con) > c.totale && ` · PAGA CON ${Number(c.paga_con).toFixed(2).replace(".", ",")} → RESTO ${(Number(c.paga_con) - c.totale).toFixed(2).replace(".", ",")}`}</div>
        </footer>
      </article>
    </div>
  );
}
