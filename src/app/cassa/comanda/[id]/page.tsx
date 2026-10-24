"use client";

// La comanda cartacea, com'è oggi (Edoardo, 23/10/2026): la cucina legge TUTTE le righe, divise
// per reparto (le categorie: pizze classiche, pizze speciali, fritti, dolci…), su carta da 80 mm.
// Niente schermo in cucina per ora. Con ?stampa=1 la pagina si stampa da sola appena carica
// (dalla cassa, in una finestra nascosta): col Chrome in --kiosk-printing esce senza chiedere.
import { use, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";
import { normalizzaComanda, vistaComanda, quandoComanda, oraRoma as ora, TIPO_COMANDA as TIPO, CANALE_COMANDA as CANALE, type Comanda } from "@/lib/comanda";
import "./comanda.css";

function quando(iso: string) {
  const q = quandoComanda(iso);
  return q.forte ? <b>{q.testo}</b> : <>per le <b>{q.testo.replace("per le ", "")}</b></>;
}

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
      setC(normalizzaComanda(data as Comanda));
    });
  }, [id]);

  // Si segna «stampata» (mig. 0027) quando la stampa parte: da sola o col tasto.
  function stampa() {
    window.print();
    supabaseBrowser().rpc("ordine_stampato", { p_id: id }).then(() => {});
  }
  useEffect(() => {
    if (!c || !stampaSubito) return;
    const t = setTimeout(stampa, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c, stampaSubito]);

  if (errore) return <main><p style={{ color: "var(--accento)" }}>{errore}</p></main>;
  if (!c) return <main><p className="muto">Carico la comanda…</p></main>;

  // il modello è in src/lib/comanda.ts: la stampante di rete legge lo stesso (agente di stampa)
  const { reparti, tolte, pezzi } = vistaComanda(c);

  return (
    <div className="comanda-pagina">
      <div className="comanda-strumenti">
        <button className="primario" onClick={stampa}>Stampa</button>
        <a href="/cassa"><button>Torna alla cassa</button></a>
      </div>

      <article className="comanda">
        <header>
          <div className="numero">{c.numero_visibile ?? `#${c.numero}`}</div>
          {c.stato === "annullato" && <div className="modificata">ANNULLATO · NON FARE</div>}
          {c.modificato_il && <div className="modificata">MODIFICATA · RISTAMPA {ora(c.modificato_il)}</div>}
          <div className="tipo">{TIPO[c.tipo] ?? c.tipo}{c.tavolo != null && ` ${c.tavolo}`}</div>
          <div className="quando">
            {c.ora_consegna ? quando(c.ora_consegna) : <>subito</>} · ricevuto {ora(c.creato_il)} · {CANALE[c.canale] ?? c.canale}
          </div>
        </header>

        {(c.cliente || c.telefono) && (
          <section className="chi">
            {c.cliente && <div className="nome">{c.cliente}</div>}
            {c.telefono && <div>{c.telefono}</div>}
            {c.cliente_note && <div className="avviso">⚠ {c.cliente_note}</div>}
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
              <div key={i} className={"riga" + (r.segno ? " nuova" : "")}>
                <div className="q">{r.quantita}</div>
                <div className="cosa">
                  <div className="descr">{r.segno && <span className="segno">{r.segno}</span>}{r.descrizione}</div>
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

        {tolte.length > 0 && (
          <section className="tolte">
            <h2>TOLTE</h2>
            {tolte.map((t, i) => <div key={i} className="descr"><s>{t.quante} {t.descrizione}</s></div>)}
          </section>
        )}
        {c.note && <section className="note"><b>NOTE:</b> {c.note}</section>}

        <footer>
          <div>{pezzi} {pezzi === 1 ? "pezzo" : "pezzi"} in cucina</div>
          <div className="totale">
            {c.costo_consegna > 0 && <div className="voce">consegna {c.costo_consegna.toFixed(2).replace(".", ",")} €</div>}
            {Number(c.sconto ?? 0) > 0 && <div className="voce sconto">SCONTO {c.codice_coupon ?? ""} −{Number(c.sconto).toFixed(2).replace(".", ",")} €</div>}
            <div className="somma">Totale {c.totale.toFixed(2).replace(".", ",")} €{c.pagato_online ? " · GIÀ PAGATO" : c.pagamento && ` · ${c.pagamento === "pos" ? "POS" : "CONTANTI"}`}</div>
            {!c.pagato_online && c.paga_con != null && Number(c.paga_con) > c.totale && <div className="paga">PAGA CON {Number(c.paga_con).toFixed(2).replace(".", ",")} → RESTO {(Number(c.paga_con) - c.totale).toFixed(2).replace(".", ",")}</div>}
          </div>
        </footer>
      </article>
    </div>
  );
}
