"use client";

// Totem self-order per i clienti, stile chiosco McDonald's: schermata d'avvio «Ordina qui»,
// categorie in colonna a sinistra, schede grandi con foto e prezzo, scheda prodotto con quantità
// e ingredienti a gruppi, carrello in basso, conferma. Torna all'avvio da solo dopo 90 s fermo.
// Passa dalla stessa capacità di app, sito e cassa (funzione ordine_da_totem).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";
import {
  aggiungiRiga, euro, gruppiDi, leggiMenu, nuovaRiga, prezzoRiga, righePerInvio, totaleRighe, variantiPer,
  type CategoriaMenu, type ProdottoMenu, type RigaOrdine, type VarianteMenu,
} from "@/lib/menu";
import type { Variazione } from "@/lib/types";

const FERMO_MS = 90_000;
const ROSSO = "#c8102e";

export default function TotemPagina() {
  return (
    <AuthGate barra={false}>
      <Totem />
    </AuthGate>
  );
}

type Passo = "avvio" | "menu" | "carrello" | "fatto";

function Totem() {
  const [categorie, setCategorie] = useState<CategoriaMenu[]>([]);
  const [prodotti, setProdotti] = useState<ProdottoMenu[]>([]);
  const [varianti, setVarianti] = useState<VarianteMenu[]>([]);
  const [passo, setPasso] = useState<Passo>("avvio");
  const [categoria, setCategoria] = useState<string | null>(null);
  const [aperto, setAperto] = useState<ProdottoMenu | null>(null);
  const [carrello, setCarrello] = useState<RigaOrdine[]>([]);
  const [esito, setEsito] = useState<{ ok: boolean; testo: string } | null>(null);
  const [invio, setInvio] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    leggiMenu(true).then((m) => {
      setCategorie(m.categorie.filter((c) => m.prodotti.some((p) => p.id_categoria === c.id)));
      setProdotti(m.prodotti); setVarianti(m.varianti);
    });
  }, []);

  const ricomincia = useCallback(() => {
    setPasso("avvio"); setCarrello([]); setAperto(null); setEsito(null);
  }, []);

  // Fermo per 90 secondi: si torna all'avvio, come i chioschi dei fast food.
  useEffect(() => {
    function tocco() {
      if (timer.current) clearTimeout(timer.current);
      if (passo !== "avvio") timer.current = setTimeout(ricomincia, FERMO_MS);
    }
    tocco();
    window.addEventListener("pointerdown", tocco);
    return () => { window.removeEventListener("pointerdown", tocco); if (timer.current) clearTimeout(timer.current); };
  }, [passo, ricomincia]);

  const catCorrente = useMemo(() => categorie.find((c) => c.id === categoria), [categorie, categoria]);
  const articoli = carrello.reduce((s, r) => s + r.quantita, 0);
  const totale = totaleRighe(carrello);

  function inizia() {
    setCategoria(categorie[0]?.id ?? null);
    setPasso("menu");
  }

  function aggiungi(p: ProdottoMenu, quantita: number, variazioni: Variazione[]) {
    const cat = categorie.find((c) => c.id === p.id_categoria);
    setCarrello((prev) => aggiungiRiga(prev, nuovaRiga(p, cat, quantita, variazioni)));
    setAperto(null);
  }

  function cambiaQuantita(chiave: string, delta: number) {
    setCarrello((prev) => prev.map((r) => (r.chiave === chiave ? { ...r, quantita: r.quantita + delta } : r)).filter((r) => r.quantita > 0));
  }

  async function conferma() {
    setInvio(true);
    const { data, error } = await supabaseBrowser().rpc("ordine_da_totem", { p_righe: righePerInvio(carrello) });
    setInvio(false);
    if (error) { setEsito({ ok: false, testo: "Non siamo riusciti a inviare l'ordine. Chiedi alla cassa." }); setPasso("fatto"); return; }
    const r = data as { esito: string; numero?: number };
    if (r.esito === "accettato") { setEsito({ ok: true, testo: `Ordine n. ${r.numero}` }); setCarrello([]); }
    else if (r.esito === "pieno") setEsito({ ok: false, testo: "In questo momento la cucina è al completo. Chiedi alla cassa per un altro orario." });
    else setEsito({ ok: false, testo: "Ordine non inviato. Chiedi alla cassa." });
    setPasso("fatto");
  }

  // Dopo l'ordine, torna all'avvio da solo.
  useEffect(() => {
    if (passo !== "fatto") return;
    const t = setTimeout(ricomincia, 10_000);
    return () => clearTimeout(t);
  }, [passo, ricomincia]);

  if (passo === "avvio") {
    return (
      <div className="schermo" onPointerDown={inizia} style={{ alignItems: "center", justifyContent: "center", background: "#fbf7ef", cursor: "pointer" }}>
        <Logo grande />
        <div style={{ marginTop: 48, background: ROSSO, color: "#fff", borderRadius: 999, padding: "26px 56px", fontSize: 34, fontWeight: 800, letterSpacing: 1 }}>
          ORDINA QUI
        </div>
        <p className="muto" style={{ marginTop: 24, fontSize: 18 }}>Tocca lo schermo per iniziare</p>
      </div>
    );
  }

  if (passo === "fatto") {
    return (
      <div className="schermo" style={{ alignItems: "center", justifyContent: "center", textAlign: "center", padding: 32 }}>
        <Logo />
        <div style={{ fontSize: 64, marginTop: 24 }}>{esito?.ok ? "✓" : "!"}</div>
        <h1 style={{ fontSize: 36, margin: "16px 0 8px" }}>{esito?.ok ? "Grazie!" : "Ops"}</h1>
        <p style={{ fontSize: 24, maxWidth: 560 }}>{esito?.testo}</p>
        {esito?.ok && <p style={{ fontSize: 20 }} className="muto">Paga e ritira lo scontrino alla cassa.</p>}
        <button onClick={ricomincia} style={{ marginTop: 32, fontSize: 20, padding: "14px 28px", borderRadius: 999 }}>Nuovo ordine</button>
      </div>
    );
  }

  if (passo === "carrello") {
    return (
      <div className="schermo">
        <Testata titolo="Il tuo ordine" indietro={() => setPasso("menu")} />
        <div className="scorri" style={{ flex: 1, padding: "8px 24px" }}>
          {carrello.length === 0 && <p className="muto" style={{ fontSize: 20 }}>Il carrello è vuoto.</p>}
          {carrello.map((r) => (
            <div key={r.chiave} className="carta" style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 10, padding: 16 }}>
              <Foto p={prodotti.find((p) => p.id === r.id_prodotto)} lato={72} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 20 }}>{r.descrizione}</div>
                {r.variazioni.length > 0 && <div className="muto" style={{ fontSize: 15 }}>{r.variazioni.map((v) => v.nome).join(" · ")}</div>}
                <div style={{ fontSize: 17, marginTop: 4 }}>{euro(prezzoRiga(r))}</div>
              </div>
              <Contatore n={r.quantita} meno={() => cambiaQuantita(r.chiave, -1)} piu={() => cambiaQuantita(r.chiave, 1)} />
            </div>
          ))}
        </div>
        <div style={{ padding: 20, borderTop: "1px solid var(--bordo)", background: "#fff", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div className="muto" style={{ fontSize: 15 }}>{articoli} articoli</div>
            <div style={{ fontSize: 30, fontWeight: 800 }}>{euro(totale)}</div>
          </div>
          <button onClick={() => setPasso("menu")} style={{ fontSize: 18, padding: "16px 22px", borderRadius: 999 }}>Aggiungi altro</button>
          <button onClick={conferma} disabled={carrello.length === 0 || invio} className="primario" style={{ fontSize: 20, padding: "16px 32px", borderRadius: 999, fontWeight: 800 }}>
            {invio ? "Invio…" : "Conferma ordine"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="schermo">
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <nav className="scorri" style={{ width: 150, background: "#fff", borderRight: "1px solid var(--bordo)", padding: "12px 8px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}><Logo piccolo /></div>
          {categorie.map((c) => {
            const attiva = c.id === categoria;
            return (
              <button key={c.id} onClick={() => setCategoria(c.id)} style={{
                width: "100%", border: "none", background: attiva ? "#fff3f4" : "transparent", borderRadius: 12,
                padding: "10px 4px", marginBottom: 4, display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                borderLeft: attiva ? `4px solid ${ROSSO}` : "4px solid transparent",
              }}>
                <Foto p={prodotti.find((p) => p.id_categoria === c.id)} lato={64} tondo />
                <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.1, textAlign: "center", textTransform: "uppercase" }}>{c.nome}</span>
              </button>
            );
          })}
        </nav>

        <section className="scorri" style={{ flex: 1, padding: "20px 24px" }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, textTransform: "uppercase", margin: "0 0 16px" }}>{catCorrente?.nome}</h1>
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))" }}>
            {prodotti.filter((p) => p.id_categoria === categoria).map((p) => (
              <button key={p.id} onClick={() => setAperto(p)} className="carta" style={{ padding: 14, textAlign: "left", display: "flex", flexDirection: "column", gap: 8, cursor: "pointer" }}>
                <Foto p={p} lato={150} largo />
                <div style={{ fontWeight: 700, fontSize: 16, textTransform: "uppercase", lineHeight: 1.15 }}>{p.nome}</div>
                <div style={{ fontSize: 16 }}>{p.prezzo > 0 ? euro(p.prezzo) : <span className="muto">prezzo alla cassa</span>}</div>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div style={{ padding: "14px 24px", borderTop: "1px solid var(--bordo)", background: "#fff", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={ricomincia} style={{ fontSize: 16, padding: "12px 18px", borderRadius: 999 }}>Annulla</button>
        <div style={{ flex: 1 }}>
          <div className="muto" style={{ fontSize: 14 }}>Il tuo ordine · {articoli} {articoli === 1 ? "articolo" : "articoli"}</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{euro(totale)}</div>
        </div>
        <button onClick={() => setPasso("carrello")} disabled={carrello.length === 0} className="primario" style={{ fontSize: 20, padding: "16px 32px", borderRadius: 999, fontWeight: 800 }}>
          Vedi ordine
        </button>
      </div>

      {aperto && (
        <SchedaProdotto
          p={aperto}
          varianti={variantiPer(varianti, aperto.id_categoria)}
          chiudi={() => setAperto(null)}
          aggiungi={(q, v) => aggiungi(aperto, q, v)}
        />
      )}
    </div>
  );
}

function SchedaProdotto({ p, varianti, chiudi, aggiungi }: {
  p: ProdottoMenu; varianti: VarianteMenu[]; chiudi: () => void; aggiungi: (q: number, v: Variazione[]) => void;
}) {
  const [q, setQ] = useState(1);
  const [scelte, setScelte] = useState<VarianteMenu[]>([]);
  const gruppi = gruppiDi(varianti);
  const extra = scelte.reduce((s, v) => s + v.prezzo, 0);

  function alterna(v: VarianteMenu) {
    setScelte((prev) => (prev.some((x) => x.id === v.id) ? prev.filter((x) => x.id !== v.id) : [...prev, v]));
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 10 }} onClick={chiudi}>
      <div className="schermo" style={{ height: "94dvh", maxWidth: 720, borderRadius: "24px 24px 0 0", background: "#fff" }} onClick={(e) => e.stopPropagation()}>
        <div className="scorri" style={{ flex: 1, padding: "20px 28px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center" }}><Foto p={p} lato={220} largo /></div>
          <h2 style={{ fontSize: 28, fontWeight: 800, textTransform: "uppercase", margin: "16px 0 6px" }}>{p.nome}</h2>
          {p.descrizione && <p className="muto" style={{ fontSize: 17, margin: "0 auto 10px", maxWidth: 520 }}>{p.descrizione}</p>}
          <div style={{ fontSize: 20, fontWeight: 700 }}>{p.prezzo > 0 ? euro(p.prezzo) : "prezzo alla cassa"}</div>

          <h3 style={{ fontSize: 22, margin: "28px 0 10px" }}>Quantità</h3>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Contatore n={q} meno={() => setQ(Math.max(1, q - 1))} piu={() => setQ(q + 1)} grande />
          </div>

          {gruppi.length > 0 && <h3 style={{ fontSize: 22, margin: "32px 0 4px" }}>Aggiungi ingredienti</h3>}
          {gruppi.map((g) => (
            <div key={g} style={{ textAlign: "left", maxWidth: 520, margin: "0 auto" }}>
              <div style={{ textAlign: "center", fontWeight: 800, fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase", margin: "18px 0 6px" }}>{g}</div>
              {varianti.filter((v) => v.gruppo === g).map((v) => {
                const on = scelte.some((x) => x.id === v.id);
                return (
                  <button key={v.id} onClick={() => alterna(v)} style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 10px", border: "none",
                    borderBottom: "1px solid var(--bordo)", background: on ? "#fff3f4" : "transparent", textAlign: "left", fontSize: 17,
                  }}>
                    <span style={{ width: 26, height: 26, borderRadius: 999, border: `2px solid ${on ? ROSSO : "#bbb"}`, background: on ? ROSSO : "#fff", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{on ? "✓" : ""}</span>
                    <span style={{ flex: 1 }}>{v.nome}</span>
                    <span className="muto" style={{ fontSize: 15 }}>{v.prezzo > 0 ? "+ " + euro(v.prezzo) : ""}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ padding: 18, borderTop: "1px solid var(--bordo)", display: "flex", gap: 12 }}>
          <button onClick={chiudi} style={{ fontSize: 18, padding: "16px 22px", borderRadius: 999 }}>Annulla</button>
          <button onClick={() => aggiungi(q, scelte.map((v) => ({ nome: v.nome, prezzo: v.prezzo, tipo: "aggiunta" as const })))} className="primario" style={{ flex: 1, fontSize: 20, padding: 16, borderRadius: 999, fontWeight: 800 }}>
            Aggiungi all&apos;ordine · {euro((p.prezzo + extra) * q)}
          </button>
        </div>
      </div>
    </div>
  );
}

function Contatore({ n, meno, piu, grande }: { n: number; meno: () => void; piu: () => void; grande?: boolean }) {
  const d = grande ? 56 : 44;
  const tondo = { width: d, height: d, borderRadius: 999, fontSize: grande ? 28 : 22, fontWeight: 700, padding: 0 } as const;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <button onClick={meno} style={tondo}>−</button>
      <span style={{ fontSize: grande ? 30 : 22, fontWeight: 800, minWidth: 32, textAlign: "center" }}>{n}</span>
      <button onClick={piu} style={{ ...tondo, background: ROSSO, color: "#fff", borderColor: ROSSO }}>+</button>
    </div>
  );
}

function Testata({ titolo, indietro }: { titolo: string; indietro: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 24px", background: "#fff", borderBottom: "1px solid var(--bordo)" }}>
      <button onClick={indietro} style={{ fontSize: 18, borderRadius: 999, padding: "10px 18px" }}>← Menù</button>
      <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, textTransform: "uppercase" }}>{titolo}</h1>
    </div>
  );
}

/** Foto del prodotto, o un disco col colore della pizzeria e l'iniziale finché la foto non c'è. */
function Foto({ p, lato, largo, tondo }: { p?: ProdottoMenu; lato: number; largo?: boolean; tondo?: boolean }) {
  const stile = { width: largo ? "100%" : lato, height: lato, borderRadius: tondo ? 999 : 14, objectFit: "cover" as const, flexShrink: 0 };
  if (p?.foto_url) return <img src={p.foto_url} alt="" style={stile} />;
  return (
    <div style={{ ...stile, background: "linear-gradient(135deg, #f3e2c7, #e3b98a)", display: "flex", alignItems: "center", justifyContent: "center", color: "#8a5a2b", fontSize: lato / 2.6, fontWeight: 800 }}>
      {(p?.nome ?? "?").replace(/^(la|il|le|i|l')\s+/i, "").charAt(0).toUpperCase()}
    </div>
  );
}

function Logo({ grande, piccolo }: { grande?: boolean; piccolo?: boolean }) {
  const d = grande ? 220 : piccolo ? 80 : 140;
  return (
    <div style={{ width: d, height: d, borderRadius: 999, border: `${grande ? 6 : 3}px solid #1d1b17`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", lineHeight: 1 }}>
      <div style={{ fontSize: d / 16, letterSpacing: 2 }}>PIZZA ITALIANA</div>
      <div style={{ fontSize: d / 9, fontWeight: 900, margin: `${d / 30}px 0` }}>A MANO A MANO</div>
      <div style={{ fontSize: d / 11, fontWeight: 800, color: ROSSO }}>PUGLIESE</div>
      <div style={{ fontSize: d / 16, letterSpacing: 2 }}>FORNO A LEGNA</div>
    </div>
  );
}
