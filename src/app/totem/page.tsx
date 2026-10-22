"use client";

// Totem self-order per i clienti, nella veste dell'app iOS «A Mano A Mano Pugliese»:
// bianco, vino e oro, il bollino, Oswald per i titoli. Avvio «Ordina qui» sulla foto
// delle mani nell'impasto, categorie con la foto tonda, schede grandi, scheda prodotto
// con quantità e ingredienti a gruppi, carrello, conferma. Torna all'avvio da solo
// dopo 90 s fermo. Passa dalla stessa capacità di app, sito e cassa (ordine_da_totem).
// Il totem vero è in piedi, 9:16: in verticale le categorie stanno in una striscia in
// alto e i prodotti su tre colonne; in orizzontale (un tablet) la colonna a sinistra.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";
import {
  aggiungiRiga, euro, gruppiDi, leggiMenu, nuovaRiga, prezzoRiga, righePerInvio, totaleRighe, variantiPer,
  type CategoriaMenu, type ProdottoMenu, type RigaOrdine, type VarianteMenu,
} from "@/lib/menu";
import type { Variazione } from "@/lib/types";
import "@fontsource/oswald/500.css";
import "@fontsource/oswald/600.css";
import "@fontsource/oswald/700.css";
import "@fontsource/figtree/400.css";
import "@fontsource/figtree/600.css";
import "@fontsource/figtree/800.css";
import "./totem.css";

const FERMO_MS = 90_000;

/** Vero quando lo schermo è più alto che largo (il totem in piedi). */
function usaVerticale() {
  const [verticale, setVerticale] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const agg = () => setVerticale(mq.matches);
    agg();
    mq.addEventListener("change", agg);
    return () => mq.removeEventListener("change", agg);
  }, []);
  return verticale;
}

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
  const [esito, setEsito] = useState<{ ok: boolean; testo: string; numero?: number } | null>(null);
  const [invio, setInvio] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const verticale = usaVerticale();

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
  const inCategoria = prodotti.filter((p) => p.id_categoria === categoria);

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
    if (r.esito === "accettato") { setEsito({ ok: true, testo: "Paga e ritira lo scontrino alla cassa.", numero: r.numero }); setCarrello([]); }
    else if (r.esito === "pieno") setEsito({ ok: false, testo: "In questo momento la cucina è al completo. Chiedi alla cassa per un altro orario." });
    else setEsito({ ok: false, testo: "Ordine non inviato. Chiedi alla cassa." });
    setPasso("fatto");
  }

  // Dopo l'ordine, torna all'avvio da solo.
  useEffect(() => {
    if (passo !== "fatto") return;
    const t = setTimeout(ricomincia, 12_000);
    return () => clearTimeout(t);
  }, [passo, ricomincia]);

  if (passo === "avvio") {
    return (
      <div className="schermo totem t-avvio" onPointerDown={inizia}>
        <img className="foto" src="/brand/impasto-mani.jpg" alt="" />
        <div className="velo" />
        <div className="corpo">
          <img className="bollino" src="/brand/bollino.png" alt="A Mano A Mano Pugliese" />
          <div className="t-ordina pulsa">Ordina qui</div>
          <div className="sotto">Tocca lo schermo per iniziare</div>
        </div>
      </div>
    );
  }

  if (passo === "fatto") {
    return (
      <div className="schermo totem t-fatto">
        <img src="/brand/bollino.png" alt="" style={{ width: 160 }} />
        <div className={"cerchio" + (esito?.ok ? "" : " no")}>{esito?.ok ? "✓" : "!"}</div>
        <h1>{esito?.ok ? "Grazie!" : "Ops"}</h1>
        {esito?.numero != null && <div className="numero">Ordine n. {esito.numero}</div>}
        <p style={{ fontSize: 22, maxWidth: 560, color: "var(--grigio)" }}>{esito?.testo}</p>
        <button onClick={ricomincia} className="t-b-vino" style={{ marginTop: 28 }}>Nuovo ordine</button>
      </div>
    );
  }

  if (passo === "carrello") {
    return (
      <div className="schermo totem">
        <Testata indietro={() => setPasso("menu")} />
        <div className="scorri" style={{ flex: 1, padding: "18px 22px" }}>
          <h1 className="t-titolo">Il tuo ordine <small>{articoli} {articoli === 1 ? "articolo" : "articoli"}</small></h1>
          {carrello.length === 0 && <p style={{ fontSize: 20, color: "var(--grigio)" }}>Il carrello è vuoto.</p>}
          {carrello.map((r) => (
            <div key={r.chiave} className="t-riga">
              <Foto p={prodotti.find((p) => p.id === r.id_prodotto)} classe="foto" />
              <div style={{ flex: 1 }}>
                <div className="nome">{r.descrizione}</div>
                {r.variazioni.length > 0 && <div className="var">{r.variazioni.map((v) => v.nome).join(" · ")}</div>}
                <div className="prezzo">{euro(prezzoRiga(r))}</div>
              </div>
              <Contatore n={r.quantita} meno={() => cambiaQuantita(r.chiave, -1)} piu={() => cambiaQuantita(r.chiave, 1)} />
            </div>
          ))}
        </div>
        <div className="t-barra">
          <button onClick={() => setPasso("menu")} className="t-b-ghost">Aggiungi altro</button>
          <div className="tot"><small>Totale</small><b>{euro(totale)}</b></div>
          <button onClick={conferma} disabled={carrello.length === 0 || invio} className="t-b-oro">
            {invio ? "Invio…" : "Conferma"}
          </button>
        </div>
      </div>
    );
  }

  const strisciaCategorie = (
    <nav className={verticale ? "t-cat-striscia" : "t-cat-colonna scorri"}>
      {categorie.map((c) => (
        <button key={c.id} onClick={() => setCategoria(c.id)} className={"t-cat" + (c.id === categoria ? " attiva" : "")}>
          <Foto p={prodotti.find((p) => p.id_categoria === c.id && p.foto_url) ?? prodotti.find((p) => p.id_categoria === c.id)} classe="tondo" tondo />
          <span className="nome">{c.nome}</span>
        </button>
      ))}
    </nav>
  );

  return (
    <div className="schermo totem">
      <Testata annulla={ricomincia} />
      <div style={{ flex: 1, display: "flex", flexDirection: verticale ? "column" : "row", minHeight: 0 }}>
        {strisciaCategorie}
        <section className="scorri" style={{ flex: 1, padding: verticale ? "18px 22px 24px" : "18px 24px" }}>
          <h1 className="t-titolo">{catCorrente?.nome} <small>{inCategoria.length} {inCategoria.length === 1 ? "proposta" : "proposte"}</small></h1>
          <div className="t-griglia" style={{ gridTemplateColumns: verticale ? "repeat(3, 1fr)" : "repeat(auto-fill, minmax(210px, 1fr))" }}>
            {inCategoria.map((p) => (
              <button key={p.id} onClick={() => setAperto(p)} className="t-carta">
                <Foto p={p} classe="foto" />
                {catCorrente && /novit/i.test(catCorrente.nome) && <span className="t-etichetta">Novità</span>}
                <div className="nome">{p.nome}</div>
                <div className="descr">{p.descrizione ?? ""}</div>
                <div className="prezzo">
                  <span>{p.prezzo > 0 ? euro(p.prezzo) : "alla cassa"}</span>
                  <span className="piu">+</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="t-barra">
        <div className="tot"><small>Il tuo ordine · {articoli} {articoli === 1 ? "articolo" : "articoli"}</small><b>{euro(totale)}</b></div>
        <button onClick={() => setPasso("carrello")} disabled={carrello.length === 0} className="t-b-oro">Vedi ordine</button>
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
    <div className="t-velo" onClick={chiudi}>
      <div className="t-scheda" onClick={(e) => e.stopPropagation()}>
        <div className="corpo">
          <Foto p={p} classe="foto-grande" />
          <h2>{p.nome}</h2>
          {p.descrizione && <p className="descr">{p.descrizione}</p>}
          <div className="prezzo">{p.prezzo > 0 ? euro(p.prezzo) : "prezzo alla cassa"}</div>

          <h3>Quantità</h3>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Contatore n={q} meno={() => setQ(Math.max(1, q - 1))} piu={() => setQ(q + 1)} grande />
          </div>

          {gruppi.length > 0 && <h3 style={{ marginTop: 34 }}>Aggiungi ingredienti</h3>}
          {gruppi.map((g) => (
            <div key={g} style={{ maxWidth: 560, margin: "0 auto" }}>
              <div className="t-gruppo">{g}</div>
              {varianti.filter((v) => v.gruppo === g).map((v) => {
                const on = scelte.some((x) => x.id === v.id);
                return (
                  <button key={v.id} onClick={() => alterna(v)} className={"t-opz" + (on ? " on" : "")}>
                    <span className="spunta">{on ? "✓" : ""}</span>
                    <span>{v.nome}</span>
                    <span className="extra">{v.prezzo > 0 ? "+ " + euro(v.prezzo) : ""}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="piede">
          <button onClick={chiudi} className="t-b-linea">Annulla</button>
          <button onClick={() => aggiungi(q, scelte.map((v) => ({ nome: v.nome, prezzo: v.prezzo, tipo: "aggiunta" as const })))} className="t-b-vino" style={{ flex: 1, fontSize: 22 }}>
            Aggiungi · {euro((p.prezzo + extra) * q)}
          </button>
        </div>
      </div>
    </div>
  );
}

function Contatore({ n, meno, piu, grande }: { n: number; meno: () => void; piu: () => void; grande?: boolean }) {
  return (
    <div className={"t-cont" + (grande ? " grande" : "")}>
      <button onClick={meno}>−</button>
      <span>{n}</span>
      <button onClick={piu} className="piu">+</button>
    </div>
  );
}

/** La fascia vino con il logo, come l'app: «← Menù» a sinistra quando si può tornare, «Annulla» quando si ricomincia. */
function Testata({ indietro, annulla }: { indietro?: () => void; annulla?: () => void }) {
  return (
    <>
      <div className="t-testata">
        {indietro && <button className="indietro" onClick={indietro}>← Menù</button>}
        {annulla && <button className="indietro" onClick={annulla}>Annulla</button>}
        <img src="/brand/logo-amanoamano-chiaro.png" alt="A Mano A Mano" />
      </div>
      <div className="t-oro-linea" />
    </>
  );
}

/** Foto del prodotto, o un disco oro con l'iniziale finché la foto non c'è. */
function Foto({ p, classe, tondo }: { p?: ProdottoMenu; classe: string; tondo?: boolean }) {
  if (p?.foto_url) return <img src={p.foto_url} alt="" className={classe} />;
  return (
    <div className={"t-manca" + (tondo ? " tondo" : "")}>
      {(p?.nome ?? "?").replace(/^(la|il|le|i|l')\s+/i, "").charAt(0).toUpperCase()}
    </div>
  );
}
