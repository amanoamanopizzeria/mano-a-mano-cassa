"use client";

// Totem self-order per i clienti, nella veste dell'app iOS «A Mano A Mano Pugliese»:
// bianco, vino e oro, il bollino, Oswald per i titoli. Avvio «Ordina qui» sulla foto
// delle mani nell'impasto, categorie con la foto tonda, schede grandi, scheda prodotto
// con quantità e ingredienti a gruppi, carrello, conferma. Torna all'avvio da solo
// dopo 90 s fermo. Passa dalla stessa capacità di app, sito e cassa (ordine_da_totem_api).
// Non ha un utente (Edoardo, 23/10/2026): è un ordine al banco che il cliente fa da solo. Si attiva
// una volta con un codice (resta nel browser del totem), alla fine chiede il nome e contanti o POS.
// Il totem vero è in piedi, 9:16: in verticale le categorie stanno in una striscia in
// alto e i prodotti su tre colonne; in orizzontale (un tablet) la colonna a sinistra.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  aggiungiRiga, euro, figlieDaScelte, gruppiDi, gruppiPacchetto, menuCompleto, nuovaRiga, prezzoRiga, righePerInvio, totaleRighe, variantiPer,
  type CategoriaMenu, type GruppoCategoria, type PacchettoGruppo, type ProdottoMenu, type RigaFiglia, type RigaOrdine, type VarianteMenu,
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

const CHIAVE_LS = "totem:chiave";

export default function TotemPagina() {
  const [chiave, setChiave] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    try { setChiave(localStorage.getItem(CHIAVE_LS)); } catch {}
    setPronto(true);
  }, []);
  if (!pronto) return null;
  if (!chiave) return <Attivazione fatto={(c) => { try { localStorage.setItem(CHIAVE_LS, c); } catch {} setChiave(c); }} />;
  return <Totem chiave={chiave} disattiva={() => { try { localStorage.removeItem(CHIAVE_LS); } catch {} setChiave(null); }} />;
}

/** La prima volta: il codice di attivazione (lo ha Edoardo). Da qui in poi il totem parte da solo. */
function Attivazione({ fatto }: { fatto: (c: string) => void }) {
  const [codice, setCodice] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [verifica, setVerifica] = useState(false);
  async function conferma() {
    setVerifica(true); setErrore(null);
    const c = codice.trim().toUpperCase();
    const { data, error } = await supabaseBrowser().rpc("totem_chiave_valida", { p_chiave: c });
    setVerifica(false);
    if (error || !data) { setErrore("Codice non valido."); return; }
    fatto(c);
  }
  return (
    <div className="schermo totem t-fatto">
      <img src="/brand/bollino.png" alt="" style={{ width: 150 }} />
      <h1 style={{ fontSize: 32 }}>Attiva questo totem</h1>
      <p style={{ color: "var(--grigio)", fontSize: 18, maxWidth: 420 }}>Scrivi il codice di attivazione. Si fa una volta sola.</p>
      <input value={codice} onChange={(e) => setCodice(e.target.value)} placeholder="XXXX-XXXX-XXXX" autoFocus
        style={{ fontSize: 28, textAlign: "center", letterSpacing: 4, padding: 12, borderRadius: 12, border: "2px solid var(--linea)", width: 340, textTransform: "uppercase", fontFamily: "inherit" }}
        onKeyDown={(e) => { if (e.key === "Enter") conferma(); }} />
      {errore && <p style={{ color: "var(--vino)", fontWeight: 700 }}>{errore}</p>}
      <button onClick={conferma} disabled={verifica || codice.length < 8} className="t-b-vino" style={{ marginTop: 20 }}>{verifica ? "Controllo…" : "Attiva"}</button>
    </div>
  );
}

type Passo = "avvio" | "menu" | "carrello" | "nome" | "pagamento" | "fatto";
type Pagamento = "contanti" | "pos";

function Totem({ chiave, disattiva }: { chiave: string; disattiva: () => void }) {
  const [categorie, setCategorie] = useState<CategoriaMenu[]>([]);
  const [prodotti, setProdotti] = useState<ProdottoMenu[]>([]);
  const [varianti, setVarianti] = useState<VarianteMenu[]>([]);
  const [gruppiCat, setGruppiCat] = useState<GruppoCategoria[]>([]);
  const [pacchetti, setPacchetti] = useState<PacchettoGruppo[]>([]);
  const [orario, setOrario] = useState<{ dalle: string; alle: string; aperto: boolean } | null>(null);
  const [passo, setPasso] = useState<Passo>("avvio");
  const [categoria, setCategoria] = useState<string | null>(null);
  const [aperto, setAperto] = useState<ProdottoMenu | null>(null);
  const [carrello, setCarrello] = useState<RigaOrdine[]>([]);
  const [esito, setEsito] = useState<{ ok: boolean; testo: string; numero?: number } | null>(null);
  const [invio, setInvio] = useState(false);
  const [nome, setNome] = useState("");
  const [pagamento, setPagamento] = useState<Pagamento | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const verticale = usaVerticale();

  useEffect(() => {
    supabaseBrowser().rpc("totem_menu", { p_chiave: chiave }).then(({ data, error }) => {
      if (error) { if (error.code === "42501") disattiva(); return; }
      const m = data as { categorie: CategoriaMenu[]; prodotti: ProdottoMenu[]; varianti: VarianteMenu[]; gruppi?: GruppoCategoria[]; pacchetti?: PacchettoGruppo[]; orario?: { dalle: string; alle: string; aperto: boolean } | null };
      const prodotti = m.prodotti.map((x) => ({ ...x, prezzo: Number(x.prezzo), prezzo_tavolo: x.prezzo_tavolo == null ? null : Number(x.prezzo_tavolo) }));
      setCategorie(m.categorie.filter((c) => prodotti.some((p) => p.id_categoria === c.id)));
      setProdotti(prodotti);
      setVarianti(m.varianti.map((x) => ({ ...x, prezzo: Number(x.prezzo) })));
      setGruppiCat(m.gruppi ?? []);
      setPacchetti(m.pacchetti ?? []);
      setOrario(m.orario ?? null);
    });
  }, [chiave, disattiva]);

  const ricomincia = useCallback(() => {
    setPasso("avvio"); setCarrello([]); setAperto(null); setEsito(null); setNome(""); setPagamento(null);
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

  // Fuori orario il totem lo dice all'avvio e non fa cominciare (critico giro 3, n. 6: lo diceva dopo venti tocchi).
  const chiuso = orario != null && !orario.aperto;
  function inizia() {
    if (chiuso) return;
    setCategoria(categorie[0]?.id ?? null);
    setPasso("menu");
  }

  function aggiungi(p: ProdottoMenu, quantita: number, variazioni: Variazione[], figlie?: RigaFiglia[]) {
    const cat = categorie.find((c) => c.id === p.id_categoria);
    setCarrello((prev) => aggiungiRiga(prev, nuovaRiga(p, cat, quantita, variazioni, "asporto", figlie)));
    setAperto(null);
  }

  function cambiaQuantita(chiave: string, delta: number) {
    setCarrello((prev) => prev.map((r) => (r.chiave === chiave ? { ...r, quantita: r.quantita + delta } : r)).filter((r) => r.quantita > 0));
  }

  async function conferma() {
    const pag = pagamento;
    if (!pag) return;
    setInvio(true);
    const { data, error } = await supabaseBrowser().rpc("ordine_da_totem_api", {
      p_chiave: chiave, p_righe: righePerInvio(carrello), p_nome: nome, p_pagamento: pag,
    });
    setInvio(false);
    if (error) { setEsito({ ok: false, testo: "Non siamo riusciti a inviare l'ordine. Chiedi alla cassa." }); setPasso("fatto"); return; }
    const r = data as { esito: string; numero?: number };
    if (r.esito === "accettato") { setEsito({ ok: true, testo: pag === "pos" ? "Vai alla cassa e paga col POS: lo scontrino è lì." : "Vai alla cassa e paga in contanti: lo scontrino è lì.", numero: r.numero }); setCarrello([]); }
    else if (r.esito === "pieno") setEsito({ ok: false, testo: "In questo momento la cucina è al completo. Chiedi alla cassa per un altro orario." });
    else if (r.esito === "fuori_orario") setEsito({ ok: false, testo: "A quest'ora la cucina è chiusa. Chiedi alla cassa." });
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
        <img className="logo-alto" src="/brand/logo-amanoamano-chiaro.png" alt="" />
        <div className="corpo t-entra">
          <img className="bollino" src="/brand/bollino.png" alt="A Mano A Mano Pugliese" />
          {chiuso ? (
            <>
              <div className="t-ordina">Siamo chiusi</div>
              <div className="sotto"><span>La cucina apre alle {orario!.dalle.slice(0, 5)}</span></div>
              <div className="lapide">Torna a trovarci</div>
            </>
          ) : (
            <>
              <div className="t-ordina pulsa">Ordina qui</div>
              <div className="sotto"><span>Tocca lo schermo per iniziare</span><span className="freccia" /></div>
              <div className="lapide">Ordina e ritira al banco</div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (passo === "fatto") {
    return (
      <div className="schermo totem t-fatto t-entra">
        <img src="/brand/bollino.png" alt="" style={{ width: 150 }} />
        <div className={"cerchio" + (esito?.ok ? "" : " no")}>
          {esito?.ok
            ? <svg viewBox="0 0 64 64" aria-hidden><path d="M14 34 L27 47 L50 18" /></svg>
            : <span>!</span>}
        </div>
        <h1>{esito?.ok ? (nome ? `Grazie ${nome}!` : "Grazie!") : "Ops"}</h1>
        {esito?.numero != null && <div className="numero"><small>Il tuo ordine</small><b>{esito.numero}</b></div>}
        <p style={{ fontSize: 22, maxWidth: 560, color: "var(--grigio)" }}>{esito?.testo}</p>
        <button onClick={ricomincia} className="t-b-vino" style={{ marginTop: 28 }}>Nuovo ordine</button>
        <div className="ritorno" />
      </div>
    );
  }

  if (passo === "carrello") {
    return (
      <div className="schermo totem">
        <Testata indietro={() => setPasso("menu")} />
        <div className="scorri t-entra" style={{ flex: 1, padding: "18px 22px" }}>
          <h1 className="t-titolo">Il tuo ordine <small>{articoli} {articoli === 1 ? "articolo" : "articoli"}</small></h1>
          {carrello.length === 0 && <div className="t-vuoto"><img src="/brand/bollino.png" alt="" /><span>Il carrello è vuoto.</span></div>}
          {carrello.map((r) => (
            <div key={r.chiave} className="t-riga">
              <Foto p={prodotti.find((p) => p.id === r.id_prodotto)} classe="foto" />
              <div style={{ flex: 1 }}>
                <div className="nome">{r.descrizione}</div>
                {r.variazioni.length > 0 && <div className="var">{r.variazioni.map((v) => v.nome).join(" · ")}</div>}
                {r.figlie && <div className="var">{r.figlie.map((f) => (f.quantita > 1 ? `${f.quantita}× ` : "") + f.descrizione).join(" · ")}</div>}
                <div className="prezzo">{euro(prezzoRiga(r))}</div>
              </div>
              <Contatore n={r.quantita} meno={() => cambiaQuantita(r.chiave, -1)} piu={() => cambiaQuantita(r.chiave, 1)} />
            </div>
          ))}
        </div>
        <div className="t-barra">
          <button onClick={() => setPasso("menu")} className="t-b-ghost">Aggiungi altro</button>
          <div className="tot"><small>Totale</small><b>{euro(totale)}</b></div>
          <button onClick={() => setPasso("nome")} disabled={carrello.length === 0} className="t-b-oro">
            Avanti
          </button>
        </div>
      </div>
    );
  }

  if (passo === "nome") {
    return (
      <div className="schermo totem">
        <Testata indietro={() => setPasso("carrello")} />
        <div className="t-nome t-entra">
          <h1 style={{ fontSize: 36, margin: "0 0 6px" }}>Come ti chiami?</h1>
          <p style={{ color: "var(--grigio)", fontSize: 19, margin: "0 0 18px" }}>Ti chiamiamo con questo nome quando l&apos;ordine è pronto.</p>
          <div className="campo">{nome || <span style={{ color: "#bbb" }}>Il tuo nome</span>}</div>
          <Tastiera testo={nome} cambia={setNome} />
        </div>
        <div className="t-barra">
          <div className="tot"><small>{articoli} {articoli === 1 ? "articolo" : "articoli"}</small><b>{euro(totale)}</b></div>
          <button onClick={() => setPasso("pagamento")} disabled={nome.trim().length < 2} className="t-b-oro">Avanti</button>
        </div>
      </div>
    );
  }

  if (passo === "pagamento") {
    return (
      <div className="schermo totem">
        <Testata indietro={() => setPasso("nome")} />
        <div className="t-nome t-entra">
          <h1 style={{ fontSize: 36, margin: "0 0 6px" }}>Come vuoi pagare?</h1>
          <p style={{ color: "var(--grigio)", fontSize: 19, margin: "0 0 26px" }}>Si paga alla cassa, quando ritiri. Totale <b style={{ color: "var(--vino)" }}>{euro(totale)}</b>.</p>
          <div className="t-paga">
            <button onClick={() => setPagamento("contanti")} disabled={invio} className={pagamento === "contanti" ? "on" : ""}>
              <span className="icona"><IconaContanti /></span><span>Contanti</span><small>paghi alla cassa</small>
            </button>
            <button onClick={() => setPagamento("pos")} disabled={invio} className={pagamento === "pos" ? "on" : ""}>
              <span className="icona"><IconaCarta /></span><span>Carta · POS</span><small>paghi alla cassa</small>
            </button>
          </div>
          {/* Il riepilogo e la conferma: come «Ordina» online, niente parte al primo tocco (critico giro 1, lavoro 6). */}
          <div style={{ margin: "26px auto 0", maxWidth: 560, textAlign: "left" }}>
            <div className="t-gruppo">Il tuo ordine · {nome}</div>
            {carrello.map((r) => (
              <div key={r.chiave} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid #eee", fontSize: 18 }}>
                <b style={{ minWidth: 34 }}>{r.quantita}×</b>
                <span style={{ flex: 1 }}>{r.descrizione}{r.variazioni.length > 0 && <small style={{ display: "block", color: "var(--grigio)" }}>{r.variazioni.map((v) => v.nome).join(" · ")}</small>}{r.figlie && <small style={{ display: "block", color: "var(--grigio)" }}>{r.figlie.map((f) => (f.quantita > 1 ? `${f.quantita}× ` : "") + f.descrizione).join(" · ")}</small>}</span>
                <span>{euro(prezzoRiga(r))}</span>
              </div>
            ))}
          </div>
          <button onClick={conferma} disabled={invio || !pagamento} className="t-b-vino" style={{ marginTop: 26, fontSize: 24, minWidth: 320 }}>
            {invio ? "Invio l'ordine…" : pagamento ? `Conferma · ${euro(totale)}` : "Scegli come paghi"}
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
        <section key={categoria} className="scorri t-entra" style={{ flex: 1, padding: verticale ? "18px 22px 24px" : "18px 24px" }}>
          <h1 className="t-titolo">{catCorrente?.nome} <small>{inCategoria.length} {inCategoria.length === 1 ? "proposta" : "proposte"}</small></h1>
          <div className="t-griglia" style={{ gridTemplateColumns: verticale ? "repeat(3, 1fr)" : "repeat(auto-fill, minmax(210px, 1fr))" }}>
            {inCategoria.map((p) => {
              const nel = carrello.filter((r) => r.id_prodotto === p.id).reduce((s, r) => s + r.quantita, 0);
              return (
                <button key={p.id} onClick={() => setAperto(p)} className="t-carta">
                  <div className="fotobox">
                    <Foto p={p} classe="foto" />
                    {catCorrente && /novit/i.test(catCorrente.nome) && <span className="t-etichetta">Novità</span>}
                    {nel > 0 && <span className="nel-carrello">×{nel}</span>}
                    <span className={"bollo" + (p.prezzo > 0 ? "" : " vuoto")}>{p.prezzo > 0 ? euro(p.prezzo) : "alla cassa"}</span>
                  </div>
                  <div className="nome">{p.nome}</div>
                  <div className="descr">{p.descrizione ?? ""}</div>
                  <div className="prezzo">
                    <span>Tocca per aggiungere</span>
                    <span className="piu">+</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <div className="t-barra">
        <div className="tot"><small>Il tuo ordine · {articoli} {articoli === 1 ? "articolo" : "articoli"}</small><b>{euro(totale)}</b></div>
        <button onClick={() => setPasso("carrello")} disabled={carrello.length === 0} className="t-b-oro">Vedi ordine{articoli > 0 && <span className="conto">{articoli}</span>}</button>
      </div>

      {aperto && (
        <SchedaProdotto
          p={aperto}
          varianti={variantiPer(varianti, aperto.id_categoria, gruppiCat)}
          gruppiMenu={gruppiPacchetto(pacchetti, aperto.id)}
          prodotti={prodotti}
          categorie={categorie}
          chiudi={() => setAperto(null)}
          aggiungi={(q, v, f) => aggiungi(aperto, q, v, f)}
        />
      )}
    </div>
  );
}

function SchedaProdotto({ p, varianti, gruppiMenu, prodotti, categorie, chiudi, aggiungi }: {
  p: ProdottoMenu; varianti: VarianteMenu[]; gruppiMenu: PacchettoGruppo[]; prodotti: ProdottoMenu[]; categorie: CategoriaMenu[];
  chiudi: () => void; aggiungi: (q: number, v: Variazione[], figlie?: RigaFiglia[]) => void;
}) {
  const [q, setQ] = useState(1);
  const [scelte, setScelte] = useState<VarianteMenu[]>([]);
  // Le scelte di un menu, gruppo per gruppo («Scegli le 2 pizze», «Scegli la bibita»), come online (mig. 0023).
  const [scelteMenu, setScelteMenu] = useState<ProdottoMenu[][]>(() => gruppiMenu.map(() => []));
  const gruppi = gruppiDi(varianti);
  const extra = scelte.reduce((s, v) => s + v.prezzo, 0);
  const completo = menuCompleto(gruppiMenu, scelteMenu);

  function alterna(v: VarianteMenu) {
    setScelte((prev) => (prev.some((x) => x.id === v.id) ? prev.filter((x) => x.id !== v.id) : [...prev, v]));
  }
  function scegli(i: number, prod: ProdottoMenu) {
    const g = gruppiMenu[i];
    setScelteMenu((prev) => prev.map((s, j) => {
      if (j !== i) return s;
      const k = s.findIndex((x) => x.id === prod.id);
      if (g.quantita === 1) return k >= 0 ? [] : [prod];
      if (k >= 0 && s.length >= g.quantita) return s.filter((_x, idx) => idx !== k);   // pieno: un tocco toglie
      return s.length < g.quantita ? [...s, prod] : s;
    }));
  }

  return (
    <div className="t-velo" onClick={chiudi}>
      <div className="t-scheda" onClick={(e) => e.stopPropagation()}>
        <div className="corpo">
          <div className="fotobox-grande"><Foto p={p} classe="foto-grande" /></div>
          <h2>{p.nome}</h2>
          {p.descrizione && <p className="descr">{p.descrizione}</p>}
          <div className="prezzo">{p.prezzo > 0 ? euro(p.prezzo) : "prezzo alla cassa"}</div>
          {p.incluso && <p className="descr" style={{ fontWeight: 700 }}>Inclusi nel menu: {p.incluso}</p>}

          {gruppiMenu.map((g, i) => (
            <div key={g.id} style={{ maxWidth: 560, margin: "0 auto" }}>
              <h3 style={{ marginTop: 28 }}>{g.etichetta} <small style={{ fontWeight: 400, color: "var(--grigio)" }}>{scelteMenu[i].length}/{g.quantita}</small></h3>
              {prodotti.filter((x) => g.scelte.includes(x.id)).map((x) => {
                const n = scelteMenu[i].filter((y) => y.id === x.id).length;
                return (
                  <button key={x.id} onClick={() => scegli(i, x)} className={"t-opz" + (n > 0 ? " on" : "")}>
                    <span className="spunta">{n > 0 ? (g.quantita > 1 ? `×${n}` : "✓") : ""}</span>
                    <span>{x.nome}</span>
                    <span className="extra"></span>
                  </button>
                );
              })}
            </div>
          ))}

          <h3 style={{ marginTop: gruppiMenu.length > 0 ? 28 : undefined }}>Quantità</h3>
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
          <button
            disabled={!completo}
            onClick={() => aggiungi(q, scelte.map((v) => ({ nome: v.nome, prezzo: v.prezzo, tipo: "aggiunta" as const })), gruppiMenu.length > 0 ? figlieDaScelte(gruppiMenu, scelteMenu, categorie) : undefined)}
            className="t-b-vino" style={{ flex: 1, fontSize: 22 }}>
            {completo ? `Aggiungi · ${euro((p.prezzo + extra) * q)}` : "Completa le scelte"}
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
  // Senza foto: il bollino, non l'iniziale (il critico leggeva «CBurgeria», «SInsalate»).
  return (
    <div className={"t-manca" + (tondo ? " tondo" : "")} aria-hidden>
      <img src="/brand/bollino.png" alt="" style={{ width: tondo ? "70%" : "45%", opacity: .55 }} />
    </div>
  );
}

/** Tastiera sullo schermo: il totem non ha quella vera. */
function Tastiera({ testo, cambia }: { testo: string; cambia: (t: string) => void }) {
  const file = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
  const scrivi = (c: string) => { if (testo.length < 20) cambia(testo + (testo.length === 0 || testo.endsWith(" ") ? c : c.toLowerCase())); };
  return (
    <div className="t-tastiera">
      {file.map((f, i) => (
        <div key={i} className="fila" style={{ paddingLeft: i * 18 }}>
          {f.split("").map((c) => <button key={c} onClick={() => scrivi(c)}>{c}</button>)}
          {i === 2 && <button className="largo" onClick={() => cambia(testo.slice(0, -1))}>⌫</button>}
        </div>
      ))}
      <div className="fila">
        <button className="spazio" onClick={() => { if (testo && !testo.endsWith(" ")) cambia(testo + " "); }}>spazio</button>
      </div>
    </div>
  );
}

/** Banconota e carta disegnate a linea, nel vino: le emoji cambiano faccia da un telefono all'altro. */
function IconaContanti() {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="6" y="18" width="52" height="30" rx="5" />
      <circle cx="32" cy="33" r="8" />
      <path d="M14 26h.01M50 40h.01" strokeWidth="5" />
      <path d="M10 14h44" opacity=".5" />
    </svg>
  );
}
function IconaCarta() {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="6" y="16" width="52" height="34" rx="6" />
      <path d="M6 26h52" strokeWidth="6" />
      <path d="M14 40h12M44 40h6" />
    </svg>
  );
}
