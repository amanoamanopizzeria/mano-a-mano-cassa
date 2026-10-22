"use client";

// La cassa del ragazzo, a tutto schermo e touch, come la schermata della cassa vera:
// barra delle categorie colorate in alto, griglia di tessere grandi, comanda a destra con
// tastierino (il numero digitato è la quantità del prossimo tocco), varianti CON / SENZA a gruppi.
// Passa dalla stessa capacità di app, sito e totem (funzione ordine_da_cassa).
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";
import {
  aggiungiRiga, chiaveRiga, euro, gruppiDi, leggiMenu, nuovaRiga, prezzoRiga, righePerInvio, totaleRighe, variantiPer,
  type CategoriaMenu, type ProdottoMenu, type RigaOrdine, type VarianteMenu,
} from "@/lib/menu";
import type { Variazione } from "@/lib/types";

interface Tavolo { id: string; numero: string; stato: string }
type Tipo = "banco" | "tavolo" | "ritiro" | "domicilio";
const TIPI: { v: Tipo; t: string }[] = [
  { v: "banco", t: "Banco" }, { v: "tavolo", t: "Tavolo" }, { v: "ritiro", t: "Asporto" }, { v: "domicilio", t: "Domicilio" },
];

export default function NuovoOrdinePagina() {
  return (
    <AuthGate barra={false}>
      <Cassa />
    </AuthGate>
  );
}

function Cassa() {
  const [categorie, setCategorie] = useState<CategoriaMenu[]>([]);
  const [prodotti, setProdotti] = useState<ProdottoMenu[]>([]);
  const [varianti, setVarianti] = useState<VarianteMenu[]>([]);
  const [tavoli, setTavoli] = useState<Tavolo[]>([]);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [righe, setRighe] = useState<RigaOrdine[]>([]);
  const [selezionata, setSelezionata] = useState<string | null>(null);   // chiave della riga
  const [modoVarianti, setModoVarianti] = useState(false);
  const [segno, setSegno] = useState<"con" | "senza">("con");
  const [gruppo, setGruppo] = useState<string | null>(null);
  const [digitato, setDigitato] = useState("");
  const [tipo, setTipo] = useState<Tipo>("banco");
  const [idTavolo, setIdTavolo] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [esito, setEsito] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);

  useEffect(() => {
    (async () => {
      const [m, t] = await Promise.all([leggiMenu(), supabaseBrowser().from("tavolo").select("id, numero, stato").order("numero")]);
      if (m.errore) setErrore(m.errore);
      setCategorie(m.categorie); setProdotti(m.prodotti); setVarianti(m.varianti);
      setTavoli((t.data ?? []) as Tavolo[]);
      setCategoria(m.categorie[0]?.id ?? null);
    })();
  }, []);

  const catCorrente = categorie.find((c) => c.id === categoria);
  const rigaSel = righe.find((r) => r.chiave === selezionata) ?? null;
  const prodottoSel = rigaSel ? prodotti.find((p) => p.id === rigaSel.id_prodotto) : undefined;
  const variantiSel = useMemo(() => variantiPer(varianti, prodottoSel?.id_categoria ?? null), [varianti, prodottoSel]);
  const gruppi = gruppiDi(variantiSel);
  const gruppoAttivo = gruppo && gruppi.includes(gruppo) ? gruppo : gruppi[0] ?? null;
  const totale = totaleRighe(righe);
  const quantitaDigitata = Math.max(1, parseInt(digitato || "1", 10) || 1);

  function toccaProdotto(p: ProdottoMenu) {
    setEsito(null);
    const cat = categorie.find((c) => c.id === p.id_categoria);
    const r = nuovaRiga(p, cat, quantitaDigitata, []);
    setRighe((prev) => aggiungiRiga(prev, r));
    setSelezionata(r.chiave);
    setDigitato("");
  }

  function toccaRiga(r: RigaOrdine) {
    if (selezionata === r.chiave && !modoVarianti) { setModoVarianti(true); return; }
    setSelezionata(r.chiave);
  }

  function cambiaQuantita(delta: number) {
    if (!rigaSel) return;
    const n = digitato ? quantitaDigitata : rigaSel.quantita + delta;
    setDigitato("");
    setRighe((prev) => prev.map((r) => (r.chiave === rigaSel.chiave ? { ...r, quantita: n } : r)).filter((r) => r.quantita > 0));
    if (n <= 0) { setSelezionata(null); setModoVarianti(false); }
  }

  function togliRiga() {
    if (!rigaSel) return;
    setRighe((prev) => prev.filter((r) => r.chiave !== rigaSel.chiave));
    setSelezionata(null); setModoVarianti(false);
  }

  // Una variante sulla riga scelta. Se la riga ha quantità > 1 si stacca una sola unità
  // (la variante vale per una pizza, non per tutte).
  function toccaVariante(v: VarianteMenu) {
    if (!rigaSel) return;
    const nuova: Variazione = segno === "con"
      ? { nome: v.nome, prezzo: v.prezzo, tipo: "aggiunta" }
      : { nome: "senza " + v.nome, prezzo: 0, tipo: "rimozione" };
    const gia = rigaSel.variazioni.some((x) => x.nome === nuova.nome && x.tipo === nuova.tipo);
    const variazioni = gia ? rigaSel.variazioni.filter((x) => !(x.nome === nuova.nome && x.tipo === nuova.tipo)) : [...rigaSel.variazioni, nuova];
    const chiave = chiaveRiga(rigaSel.id_prodotto, variazioni);
    setRighe((prev) => {
      let out = prev;
      if (rigaSel.quantita > 1) {
        out = out.map((r) => (r.chiave === rigaSel.chiave ? { ...r, quantita: r.quantita - 1 } : r));
        return aggiungiRiga(out, { ...rigaSel, quantita: 1, variazioni, chiave });
      }
      out = out.filter((r) => r.chiave !== rigaSel.chiave);
      return aggiungiRiga(out, { ...rigaSel, variazioni, chiave });
    });
    setSelezionata(chiave);
  }

  function tasto(k: string) {
    if (k === "C") { setDigitato(""); return; }
    setDigitato((d) => (d + k).replace(/^0+(?=\d)/, "").slice(0, 3));
  }

  function svuota() { setRighe([]); setSelezionata(null); setModoVarianti(false); setDigitato(""); setNote(""); setEsito(null); setErrore(null); }

  async function invia() {
    setErrore(null); setInvio(true);
    const { data, error } = await supabaseBrowser().rpc("ordine_da_cassa", {
      p_tipo: tipo, p_righe: righePerInvio(righe),
      p_id_tavolo: tipo === "tavolo" ? idTavolo : null, p_id_cliente: null, p_note: note || null,
    });
    setInvio(false);
    if (error) { setErrore(error.message); return; }
    const r = data as { esito: string; numero?: number; libere?: number; motivo?: string };
    if (r.esito === "accettato") { svuota(); setEsito(`Ordine n. ${r.numero} inviato in cucina.`); }
    else if (r.esito === "pieno") setErrore(`Quarto d'ora al completo${r.motivo ? ` (${r.motivo})` : ""}${r.libere !== undefined ? `: ne restano ${r.libere}` : ""}.`);
    else setErrore("Ordine non inserito: " + r.esito);
  }

  const scheda = { display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "#fff", borderBottom: "1px solid var(--bordo)" } as const;

  return (
    <div className="schermo" style={{ flexDirection: "row" }}>
      {/* ===== Sinistra: categorie e tessere ===== */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={scheda}>
          <Link href="/cassa" style={{ textDecoration: "none" }}><button>⌂</button></Link>
          <Link href="/cassa/cliente" style={{ textDecoration: "none" }}><button>Dati cliente</button></Link>
          <button className="primario">Ordine</button>
          <Link href="/cassa/tavoli" style={{ textDecoration: "none" }}><button>Sala</button></Link>
          <span style={{ marginLeft: 12, fontWeight: 800, fontSize: 16, textTransform: "uppercase" }}>
            {modoVarianti ? `Varianti · ${rigaSel?.descrizione ?? ""}` : catCorrente?.nome}
          </span>
          <span style={{ flex: 1 }} />
          {esito && <span style={{ color: "var(--ok)", fontWeight: 600 }}>{esito}</span>}
          {errore && <span style={{ color: "var(--accento)", fontWeight: 600 }}>{errore}</span>}
        </div>

        {!modoVarianti ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, padding: 6, background: "#eceae4" }}>
              {categorie.map((c) => (
                <button key={c.id} className="tessera" onClick={() => setCategoria(c.id)} style={{
                  minHeight: 40, padding: "6px 4px", fontSize: 12, background: c.colore ?? "#ddd",
                  outline: c.id === categoria ? "3px solid #1d1b17" : "none", outlineOffset: -3,
                }}>{c.nome}</button>
              ))}
            </div>
            <div className="scorri" style={{ flex: 1, padding: 6, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, alignContent: "start" }}>
              {prodotti.filter((p) => p.id_categoria === categoria).map((p) => (
                <button key={p.id} className="tessera" onClick={() => toccaProdotto(p)} style={{ background: chiaro(catCorrente?.colore), flexDirection: "column", gap: 4 }}>
                  <span>{p.nome}</span>
                  <span style={{ fontWeight: 500, fontSize: 12, textTransform: "none", opacity: .8 }}>{p.prezzo > 0 ? euro(p.prezzo) : "da impostare"}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: `auto repeat(${Math.max(gruppi.length, 1)}, 1fr)`, gap: 4, padding: 6, background: "#eceae4" }}>
              <button className="tessera" onClick={() => setModoVarianti(false)} style={{ minHeight: 40, padding: "6px 14px", fontSize: 12, background: "#2d7ff9", color: "#fff" }}>← Prodotti</button>
              {gruppi.map((g) => (
                <button key={g} className="tessera" onClick={() => setGruppo(g)} style={{
                  minHeight: 40, padding: "6px 4px", fontSize: 12, background: "#9ad36a",
                  outline: g === gruppoAttivo ? "3px solid #1d1b17" : "none", outlineOffset: -3,
                }}>{g}</button>
              ))}
            </div>
            <div className="scorri" style={{ flex: 1, padding: 6, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, alignContent: "start" }}>
              <button className="tessera" onClick={() => setSegno("con")} style={{ background: "#f39c2b", outline: segno === "con" ? "3px solid #1d1b17" : "none", outlineOffset: -3 }}>CON</button>
              <button className="tessera" onClick={() => setSegno("senza")} style={{ background: "#f39c2b", outline: segno === "senza" ? "3px solid #1d1b17" : "none", outlineOffset: -3 }}>SENZA</button>
              {variantiSel.filter((v) => v.gruppo === gruppoAttivo).map((v) => {
                const nome = segno === "con" ? v.nome : "senza " + v.nome;
                const on = rigaSel?.variazioni.some((x) => x.nome === nome);
                return (
                  <button key={v.id} className="tessera" onClick={() => toccaVariante(v)} style={{ background: on ? "#ffe08a" : "#f4f2ec", textTransform: "none", flexDirection: "column", gap: 2 }}>
                    <span>{v.nome}</span>
                    {segno === "con" && v.prezzo > 0 && <span style={{ fontWeight: 500, fontSize: 12, opacity: .8 }}>+ {euro(v.prezzo)}</span>}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ===== Destra: comanda, tastierino, invio ===== */}
      <aside style={{ width: 340, display: "flex", flexDirection: "column", background: "#fff", borderLeft: "1px solid var(--bordo)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, padding: 6 }}>
          {TIPI.map((t) => (
            <button key={t.v} onClick={() => setTipo(t.v)} className={tipo === t.v ? "primario" : ""} style={{ padding: "8px 2px", fontSize: 13 }}>{t.t}</button>
          ))}
        </div>
        {tipo === "tavolo" && (
          <select value={idTavolo ?? ""} onChange={(e) => setIdTavolo(e.target.value || null)} style={{ margin: "0 6px 6px", padding: 8, fontSize: 15 }}>
            <option value="">Scegli il tavolo</option>
            {tavoli.map((t) => <option key={t.id} value={t.id}>{t.numero} · {t.stato}</option>)}
          </select>
        )}

        <div className="scorri" style={{ flex: 1, borderTop: "1px solid var(--bordo)", borderBottom: "1px solid var(--bordo)" }}>
          {righe.length === 0 && <p className="muto" style={{ padding: 12 }}>Tocca un prodotto per iniziare la comanda.</p>}
          {righe.map((r) => (
            <button key={r.chiave} onClick={() => toccaRiga(r)} style={{
              width: "100%", display: "flex", gap: 8, alignItems: "flex-start", textAlign: "left", border: "none", borderRadius: 0,
              borderBottom: "1px solid var(--bordo)", padding: "8px 10px", background: r.chiave === selezionata ? "#fff3c4" : "#fff",
            }}>
              <span style={{ fontWeight: 800, minWidth: 28 }}>{r.quantita}×</span>
              <span style={{ flex: 1 }}>
                <span style={{ fontWeight: 600 }}>{r.descrizione}</span>
                {r.variazioni.map((v, i) => (
                  <span key={i} style={{ display: "block", fontSize: 13, color: v.tipo === "rimozione" ? "var(--accento)" : "var(--muto)" }}>
                    {v.tipo === "rimozione" ? v.nome : "+ " + v.nome}{v.prezzo > 0 ? ` (${euro(v.prezzo)})` : ""}
                  </span>
                ))}
              </span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{euro(prezzoRiga(r))}</span>
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, padding: 6 }}>
          <button onClick={() => cambiaQuantita(-1)} disabled={!rigaSel}>−</button>
          <button onClick={() => cambiaQuantita(1)} disabled={!rigaSel}>+</button>
          <button onClick={() => setModoVarianti(true)} disabled={!rigaSel}>Varianti</button>
          <button onClick={togliRiga} disabled={!rigaSel} style={{ color: "var(--accento)" }}>Togli</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr) 1.4fr", gap: 4, padding: "0 6px 6px" }}>
          {["7", "8", "9", "1", "2", "3", "4", "5", "6", "0", "00", "C"].map((k, i) => (
            <button key={k} onClick={() => tasto(k)} style={{ padding: "10px 0", fontSize: 17, fontWeight: 700, gridColumn: i % 3 === 0 && i > 0 ? undefined : undefined }}>{k}</button>
          ))}
          <div style={{ gridColumn: "4", gridRow: "1 / span 4", display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ flex: 1, border: "1px solid var(--bordo)", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8f6f1" }}>
              <span className="muto" style={{ fontSize: 11 }}>quantità</span>
              <span style={{ fontSize: 28, fontWeight: 800 }}>{digitato || "1"}</span>
            </div>
          </div>
        </div>

        <input placeholder="Note (es. ben cotta)" value={note} onChange={(e) => setNote(e.target.value)} style={{ margin: "0 6px 6px", padding: 8, fontSize: 14 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 6px 6px" }}>
          <button onClick={svuota} disabled={righe.length === 0}>Svuota</button>
          <span style={{ flex: 1, textAlign: "right", fontSize: 26, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{euro(totale)}</span>
        </div>
        <button onClick={invia} className="primario" disabled={invio || righe.length === 0 || (tipo === "tavolo" && !idTavolo)} style={{ margin: 6, padding: 16, fontSize: 18, fontWeight: 800, borderRadius: 10 }}>
          {invio ? "Invio…" : "Invia in cucina"}
        </button>
      </aside>
    </div>
  );
}

/** Il colore della categoria, schiarito per le tessere dei prodotti. */
function chiaro(hex: string | null | undefined) {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return "#f4f2ec";
  const n = parseInt(hex.slice(1), 16);
  const m = (c: number) => Math.round(c + (255 - c) * 0.45);
  return `rgb(${m(n >> 16)}, ${m((n >> 8) & 255)}, ${m(n & 255)})`;
}
