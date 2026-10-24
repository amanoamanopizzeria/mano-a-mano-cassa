"use client";

// La pagina d'ordine NOSTRA, per il telefono del cliente (REA, docs/rea/10 punto 6): quando il sito
// amanoamano.it punterà qui invece che a Velocissimo, l'ordine entra in cassa senza passare da nessuno.
// Cinque passi, sempre nello stesso ordine: come lo vuoi (a casa o lo ritiri) → il menù → il carrello →
// quando (il giorno e il quarto d'ora libero) → chi sei e come paghi → conferma.
// A domicilio l'indirizzo si chiede PRIMA del menù: chi è fuori zona lo sa subito, non dopo venti tocchi.
// I prezzi li decide il database (ordine_dal_sito, mig. 0035): qui si mostrano e basta.
// Il carrello resta nel telefono (localStorage) per un'ora: chi chiude e riapre non ricomincia.
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
import "./ordina.css";

type Tipo = "domicilio" | "ritiro";
type Passo = "tipo" | "menu" | "carrello" | "quando" | "dati" | "fatto";
type Pagamento = "contanti" | "pos";
const BOZZA_LS = "ordina:bozza";
const BOZZA_MS = 60 * 60_000;

interface Zona { nome: string; costo_consegna: number; minimo_ordine: number }
interface Indirizzo { testo: string; via: string | null; civico: string | null; cap: string | null; citta: string | null; lat: number | null; lng: number | null; place_id: string | null; zona?: Zona | null; km?: number | null }
interface Fascia { ora: string; inizio: string; piena: boolean }
interface Negozio { nome: string; preordini_giorni: number; attesa_domicilio: number; attesa_ritiro: number }
interface Orario { giorno: number; tipo: string; dalle: string; alle: string }
interface Esito { ok: boolean; titolo: string; testo: string; numero?: string; segui?: string | null; righe?: RigaOrdine[]; totale?: number; consegna?: number }

const giornoRoma = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" }); // AAAA-MM-GG
const nomeZona = (n: string) => n.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
const NOMI_GIORNO = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];

export default function Ordina() {
  const [categorie, setCategorie] = useState<CategoriaMenu[]>([]);
  const [prodotti, setProdotti] = useState<ProdottoMenu[]>([]);
  const [varianti, setVarianti] = useState<VarianteMenu[]>([]);
  const [gruppiCat, setGruppiCat] = useState<GruppoCategoria[]>([]);
  const [pacchetti, setPacchetti] = useState<PacchettoGruppo[]>([]);
  const [negozio, setNegozio] = useState<Negozio | null>(null);
  const [orari, setOrari] = useState<Orario[]>([]);
  const [erroreMenu, setErroreMenu] = useState<string | null>(null);

  const [passo, setPasso] = useState<Passo>("tipo");
  const [tipo, setTipo] = useState<Tipo | null>(null);
  const [indirizzo, setIndirizzo] = useState<Indirizzo | null>(null);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [aperto, setAperto] = useState<ProdottoMenu | null>(null);
  const [carrello, setCarrello] = useState<RigaOrdine[]>([]);
  const [giorno, setGiorno] = useState<string>(() => giornoRoma(new Date()));
  const [fasce, setFasce] = useState<Fascia[] | null>(null);
  const [fasciaEsito, setFasciaEsito] = useState<string | null>(null);
  const [fascia, setFascia] = useState<Fascia | null>(null);
  const [nome, setNome] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [pagamento, setPagamento] = useState<Pagamento | null>(null);
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [esito, setEsito] = useState<Esito | null>(null);
  const bozzaLetta = useRef(false);

  // il menù
  useEffect(() => {
    supabaseBrowser().rpc("sito_menu").then(({ data, error }) => {
      if (error || !data) { setErroreMenu("Non riesco a leggere il menù: riprova fra poco."); return; }
      const m = data as { negozio: Negozio; categorie: CategoriaMenu[]; prodotti: ProdottoMenu[]; varianti: VarianteMenu[]; gruppi: GruppoCategoria[]; pacchetti: PacchettoGruppo[]; orari: Orario[] };
      const prod = m.prodotti.map((x) => ({ ...x, prezzo: Number(x.prezzo), prezzo_tavolo: null }));
      setCategorie(m.categorie.filter((c) => prod.some((p) => p.id_categoria === c.id)));
      setProdotti(prod);
      setVarianti(m.varianti.map((x) => ({ ...x, prezzo: Number(x.prezzo) })));
      setGruppiCat(m.gruppi ?? []);
      setPacchetti(m.pacchetti ?? []);
      setNegozio(m.negozio);
      setOrari(m.orari ?? []);
    });
  }, []);

  // la bozza nel telefono
  useEffect(() => {
    if (bozzaLetta.current) return;
    bozzaLetta.current = true;
    try {
      const b = JSON.parse(localStorage.getItem(BOZZA_LS) ?? "null") as { il: number; tipo: Tipo | null; indirizzo: Indirizzo | null; carrello: RigaOrdine[]; nome?: string; telefono?: string } | null;
      if (b && Date.now() - b.il < BOZZA_MS) {
        setTipo(b.tipo); setIndirizzo(b.indirizzo); setCarrello(b.carrello ?? []);
        setNome(b.nome ?? ""); setTelefono(b.telefono ?? "");
      }
    } catch {}
  }, []);
  useEffect(() => {
    if (!bozzaLetta.current) return;
    try { localStorage.setItem(BOZZA_LS, JSON.stringify({ il: Date.now(), tipo, indirizzo, carrello, nome, telefono })); } catch {}
  }, [tipo, indirizzo, carrello, nome, telefono]);

  // le fasce del giorno scelto
  useEffect(() => {
    if (passo !== "quando" || !tipo) return;
    setFasce(null); setFasciaEsito(null);
    supabaseBrowser().rpc("sito_fasce", { p_tipo: tipo, p_giorno: giorno }).then(({ data, error }) => {
      if (error || !data) { setFasciaEsito("errore"); setFasce([]); return; }
      const r = data as { esito: string; fasce?: Fascia[] };
      setFasciaEsito(r.esito); setFasce(r.fasce ?? []);
      const libere = (r.fasce ?? []).filter((x) => !x.piena);
      // «il prima possibile» è già scelto: chi vuole un'altra ora la tocca (critico giro 9: sedici quarti d'ora uguali e nessuno proposto)
      setFascia((f) => (f && libere.some((x) => x.inizio === f.inizio) ? f : libere[0] ?? null));
    });
  }, [passo, tipo, giorno]);

  const catCorrente = useMemo(() => categorie.find((c) => c.id === categoria), [categorie, categoria]);
  const inCategoria = prodotti.filter((p) => p.id_categoria === categoria);
  const articoli = carrello.reduce((s, r) => s + r.quantita, 0);
  const subtotale = totaleRighe(carrello);
  const costoConsegna = tipo === "domicilio" ? indirizzo?.zona?.costo_consegna ?? 0 : 0;
  const totale = subtotale + costoConsegna;
  const minimo = tipo === "domicilio" ? indirizzo?.zona?.minimo_ordine ?? 0 : 0;
  const sottoMinimo = tipo === "domicilio" && subtotale < minimo;
  const giorni = useMemo(() => {
    const out: { chiave: string; nome: string; numero: number; oggi: boolean; chiuso: boolean }[] = [];
    const n = negozio?.preordini_giorni ?? 7;
    for (let i = 0; i <= n; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      const chiave = giornoRoma(d);
      const dow = new Date(chiave + "T12:00:00").getDay();
      const chiuso = orari.length > 0 && !orari.some((o) => o.giorno === dow && o.tipo === tipo);
      out.push({ chiave, nome: i === 0 ? "oggi" : i === 1 ? "domani" : NOMI_GIORNO[dow], numero: Number(chiave.slice(8)), oggi: i === 0, chiuso });
    }
    return out;
  }, [negozio, orari, tipo]);

  const vai = useCallback((p: Passo) => { setErrore(null); setPasso(p); window.scrollTo({ top: 0 }); }, []);

  // Un tocco solo (Edoardo, 24/10/2026: «se clicco ordina a domicilio o ritira, già apre il menu»):
  // «Ritiro» va dritto al menù; «A casa» va al menù appena c'è un indirizzo in zona.
  function alMenu() {
    setCategoria((c) => c ?? categorie.find((x) => /classic/i.test(x.nome))?.id ?? categorie[0]?.id ?? null);
    vai("menu");
  }
  function scegliTipo(t: Tipo) {
    setTipo(t);
    if (t !== tipo) setFascia(null);
    if (t === "ritiro") { setIndirizzo(null); alMenu(); return; }
    if (indirizzo?.zona) alMenu();
  }
  function scegliIndirizzo(i: Indirizzo) {
    setIndirizzo(i);
    // senza numero civico non si va avanti: il rider non trova «Viale Regina Margherita» (critico giro 8)
    if (i.zona && i.civico) alMenu();
  }
  const [civicoScritto, setCivicoScritto] = useState("");
  const [cercoCivico, setCercoCivico] = useState(false);
  async function confermaCivico() {
    const c = civicoScritto.trim();
    if (!indirizzo || !c || cercoCivico) return;
    let i: Indirizzo = { ...indirizzo, civico: c, testo: `${indirizzo.via ?? indirizzo.testo} ${c}${indirizzo.citta ? ", " + indirizzo.citta : ""}` };
    // col numero si ricerca il punto vero: il centro del viale non è il portone (critico giro 9)
    setCercoCivico(true);
    try {
      const r = await fetch("/api/ordina/indirizzi?q=" + encodeURIComponent(`${indirizzo.via ?? indirizzo.testo} ${c}, ${indirizzo.citta ?? "Roma"}`));
      const j = (await r.json()) as { risultati?: Indirizzo[] };
      let t = (j.risultati ?? []).find((x) => x.civico === c) ?? null;
      if (t && t.lat == null && t.place_id) {
        const d = await fetch("/api/ordina/indirizzi?id=" + encodeURIComponent(t.place_id));
        if (d.ok) t = { ...(await d.json()) as Indirizzo, testo: t.testo };
      }
      if (t && t.lat != null && t.lng != null) i = { ...t, civico: t.civico ?? c, zona: t.zona ?? i.zona };
    } catch {}
    setCercoCivico(false);
    setIndirizzo(i); setCivicoScritto("");
    if (i.zona) alMenu();
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
    if (!tipo || !fascia || !pagamento || invio) return;
    setInvio(true); setErrore(null);
    const { data, error } = await supabaseBrowser().rpc("ordine_dal_sito", {
      p_tipo: tipo, p_righe: righePerInvio(carrello), p_nome: nome.trim(), p_telefono: telefono.trim(), p_ora: fascia.inizio,
      p_pagamento: pagamento, p_note: note.trim() || null,
      p_indirizzo: tipo === "domicilio" && indirizzo ? { via: indirizzo.via, civico: indirizzo.civico, cap: indirizzo.cap, citta: indirizzo.citta, lat: indirizzo.lat, lng: indirizzo.lng, place_id: indirizzo.place_id } : null,
      p_email: email.trim() || null,
    });
    setInvio(false);
    if (error) { setErrore("Non siamo riusciti a mandare l'ordine. Riprova, o chiamaci."); return; }
    const r = data as { esito: string; numero?: string; segui?: string | null; totale?: number; motivo?: string; minimo?: number; dalle?: string; alle?: string; libere?: number };
    switch (r.esito) {
      case "accettato":
        setEsito({ ok: true, titolo: `Grazie ${nome.trim().split(" ")[0]}!`, numero: r.numero, segui: r.segui, righe: carrello, totale: Number(r.totale ?? totale), consegna: costoConsegna,
          testo: tipo === "domicilio"
            ? `Te lo portiamo ${etichettaGiorno(giorno)} alle ${fascia.ora} a ${indirizzo?.testo ?? "casa tua"}. Paghi ${pagamento === "pos" ? "col POS" : "in contanti"} al rider.`
            : `Ti aspettiamo ${etichettaGiorno(giorno)} alle ${fascia.ora} in Via Novara 5/7. Paghi ${pagamento === "pos" ? "col POS" : "in contanti"} in pizzeria.` });
        setCarrello([]);
        try { localStorage.removeItem(BOZZA_LS); } catch {}
        vai("fatto");
        return;
      case "pieno":
        setErrore(r.motivo === "consegne" ? `Alle ${fascia.ora} i rider sono tutti impegnati: scegli un altro quarto d'ora.` : `Alle ${fascia.ora} la cucina è al completo: scegli un altro quarto d'ora.`);
        setFascia(null); vai("quando"); return;
      case "fuori_orario": case "ora_passata": case "manca_ora": case "giorno_non_ammesso":
        setErrore("Quell'orario non va più bene: scegline un altro."); setFascia(null); vai("quando"); return;
      case "minimo":
        setErrore(`A casa tua l'ordine minimo è ${euro(Number(r.minimo))}: aggiungi qualcosa.`); vai("carrello"); return;
      case "manca_civico": setErrore("Manca il numero civico."); setIndirizzo((i) => (i ? { ...i, civico: null } : i)); vai("tipo"); return;
      case "fuori_zona": case "manca_indirizzo":
        setErrore("Non consegniamo a quell'indirizzo."); vai("tipo"); return;
      case "telefono_corto": setErrore("Scrivi un numero di telefono completo: ti chiamiamo solo se c'è un problema."); return;
      case "manca_nome": setErrore("Scrivi il tuo nome."); return;
      case "troppi": setErrore("Hai già mandato diversi ordini in pochi minuti: aspetta un po', o chiamaci."); return;
      default: setErrore("Ordine non inviato" + (r.motivo ? ` (${r.motivo})` : "") + ". Riprova, o chiamaci."); return;
    }
  }

  function etichettaGiorno(g: string) {
    const d = giorni.find((x) => x.chiave === g);
    if (!d) return g;
    return d.oggi ? "oggi" : d.nome === "domani" ? "domani" : `${d.nome} ${d.numero}`;
  }

  // Come l'app: un solo pulsante sabbia in fondo, con gli articoli a sinistra, l'azione al centro e il totale a destra.
  const barra = (testo: string, su: () => void, spento = false) => (
    <div className="o-barra"><div className="dentro">
      <button onClick={su} disabled={spento} className="o-vai">
        <span className="n">{articoli}</span>
        <span className="azione">{testo}</span>
        <span className="tot">{euro(totale)}</span>
      </button>
    </div></div>
  );
  const TITOLI: Record<Passo, string> = { tipo: "Ordina", menu: "Ordina", carrello: "Carrello", quando: tipo === "domicilio" ? "Consegna" : "Ritiro", dati: "I tuoi dati", fatto: "Grazie" };
  // Le due fasce dell'app: sabbia col logo lineare e il bollino, vino con «‹ Indietro» e il titolo del passo.
  const testata = (indietro?: () => void) => (
    <div className="o-testa">
      <div className="o-sabbia">
        <img src="/brand/logo-amanoamano.png" alt="A Mano A Mano Pugliese" />
        <img src="/brand/bollino.png" alt="" className="bollino" />
      </div>
      <div className="o-vino">
        {indietro && <button className="indietro" onClick={indietro}><b>‹</b> Indietro</button>}
        <span className="titolo">{TITOLI[passo]}</span>
        {passo === "menu" && articoli > 0 && <button className="carrello" onClick={() => vai("carrello")}><span className="n">{articoli}</span>{euro(subtotale)}</button>}
      </div>
    </div>
  );

  if (erroreMenu) return <div className="ordina"><div className="o-corpo o-avviso">{erroreMenu}</div></div>;

  if (passo === "fatto" && esito) {
    return (
      <div className="ordina">
        {testata()}
        <div className="o-corpo o-fatto o-entra">
          <img src="/brand/bollino.png" alt="" className="bollino" />
          <div className={"cerchio" + (esito.ok ? "" : " no")}>{esito.ok ? <svg viewBox="0 0 64 64" aria-hidden><path d="M14 34 L27 47 L50 18" /></svg> : "!"}</div>
          <div className="lapide">A Mano A Mano · Pugliese</div>
          <h1>{esito.titolo}</h1>
          {esito.numero && <div className="numero"><small>Il tuo ordine</small><b>{esito.numero}</b></div>}
          <p>{esito.testo}</p>
          {esito.righe && esito.righe.length > 0 && (
            <div className="o-riepilogo" style={{ textAlign: "left" }}>
              {esito.righe.map((r) => (
                <div key={r.chiave} className="r"><b>{r.quantita}×</b><span>{r.descrizione}
                  {r.variazioni.length > 0 && <small>{r.variazioni.map((v) => v.nome).join(" · ")}</small>}
                  {r.figlie && <small>{r.figlie.map((f) => (f.quantita > 1 ? `${f.quantita}× ` : "") + f.descrizione).join(" · ")}</small>}
                </span><span className="p">{euro(prezzoRiga(r))}</span></div>
              ))}
              {(esito.consegna ?? 0) > 0 && <div className="r"><b></b><span>Consegna</span><span className="p">{euro(esito.consegna!)}</span></div>}
              <div className="r"><b></b><span style={{ fontWeight: 800 }}>Totale</span><span className="p" style={{ fontWeight: 800 }}>{euro(esito.totale ?? 0)}</span></div>
            </div>
          )}
          {esito.segui && <><p>Quando il rider parte, lo segui sulla mappa.</p><a href={esito.segui} className="segui">Segui la consegna</a></>}
          <button className="o-b-linea o-b-largo" onClick={() => { setEsito(null); setFascia(null); setPagamento(null); setNote(""); setGiorno(giornoRoma(new Date())); vai("tipo"); }}>Nuovo ordine</button>
        </div>
      </div>
    );
  }

  if (passo === "tipo") {
    return (
      <div className="ordina">
        {testata()}
        <div className="o-corpo o-avvio o-entra">
          <img className="bollino" src="/brand/bollino.png" alt="A Mano A Mano Pugliese" />
          <div className="marca">A Mano A Mano Pugliese</div>
          <div className="o-sez">Come lo vuoi?</div>
          <div className="o-scelta">
            <button onClick={() => scegliTipo("domicilio")} className={tipo === "domicilio" ? "on" : ""}>
              <IconaScooter /><span><span className="nome">Consegna a casa</span><small>te lo porta il rider</small></span>
            </button>
            <button onClick={() => scegliTipo("ritiro")} className={tipo === "ritiro" ? "on" : ""}>
              <IconaSacchetto /><span><span className="nome">Ritiro in pizzeria</span><small>Via Novara 5/7, Roma</small></span>
            </button>
          </div>
          {tipo === "domicilio" && (
            <div style={{ textAlign: "left" }}>
              <div className="o-sez">Indirizzo di consegna</div>
              {indirizzo ? (
                <div className="o-indirizzo">
                  <div className="testo">
                    {indirizzo.testo}
                    {indirizzo.zona
                      ? <small>Zona {nomeZona(indirizzo.zona.nome)} · consegna {indirizzo.zona.costo_consegna > 0 ? euro(indirizzo.zona.costo_consegna) : "gratis"}{indirizzo.zona.minimo_ordine > 0 ? ` · ordine minimo ${euro(indirizzo.zona.minimo_ordine)}` : ""}</small>
                      : <small style={{ color: "var(--vino)", fontWeight: 700 }}>Qui non consegniamo</small>}
                  </div>
                  <button className="cambia" onClick={() => setIndirizzo(null)}>Cambia</button>
                </div>
              ) : (
                <CercaIndirizzo scelto={scegliIndirizzo} />
              )}
              {indirizzo && indirizzo.zona && !indirizzo.civico && (
                <div className="o-civico">
                  <div className="o-avviso" style={{ marginTop: 0 }}>Manca il numero civico: scrivilo qui.</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <input value={civicoScritto} onChange={(e) => setCivicoScritto(e.target.value)} placeholder="Civico" inputMode="text" autoFocus
                      onKeyDown={(e) => { if (e.key === "Enter") confermaCivico(); }} style={{ flex: 1, padding: "12px 14px", borderRadius: 12, border: "2px solid var(--linea)" }} />
                    <button className="o-b-vino" onClick={confermaCivico} disabled={!civicoScritto.trim() || cercoCivico}>{cercoCivico ? "Cerco…" : "Avanti"}</button>
                  </div>
                </div>
              )}
              {indirizzo && !indirizzo.zona && <div className="o-avviso">Mi dispiace, a quell&apos;indirizzo non arriviamo. Puoi ordinare e ritirare in pizzeria.</div>}
            </div>
          )}
          {errore && <div className="o-avviso">{errore}</div>}
        </div>
      </div>
    );
  }

  if (passo === "carrello") {
    return (
      <div className="ordina">
        {testata(() => vai("menu"))}
        <div className="o-corpo o-entra">
          <div className="o-sez">{tipo === "domicilio" ? "Indirizzo di consegna" : "Ritiro"}</div>
          <p className="o-sotto" style={{ textAlign: "left" }}>{tipo === "domicilio" ? indirizzo?.testo ?? "" : "In pizzeria, Via Novara 5/7, Roma."}</p>
          <div className="o-sez">Il tuo ordine</div>
          <button className="o-link" onClick={() => vai("menu")}>Aggiungi prodotti</button>
          {carrello.length === 0 && <div className="o-nota">Il carrello è vuoto.</div>}
          {carrello.map((r) => (
            <div key={r.chiave} className="o-riga">
              <span className="q">{r.quantita}x</span>
              <div>
                <div className="nome">{r.descrizione}</div>
                {r.variazioni.length > 0 && <div className="var">{r.variazioni.map((v) => `CON ${v.nome}${v.prezzo > 0 ? ` (${euro(v.prezzo)})` : ""}`).join(", ")}</div>}
                {r.figlie && <div className="var">{r.figlie.map((f) => (f.quantita > 1 ? `${f.quantita}× ` : "") + f.descrizione).join(" · ")}</div>}
              </div>
              <div className="prezzo">{euro(prezzoRiga(r))}</div>
              <Contatore n={r.quantita} meno={() => cambiaQuantita(r.chiave, -1)} piu={() => cambiaQuantita(r.chiave, 1)} />
            </div>
          ))}
          {carrello.length > 0 && (
            <div className="o-somme">
              {tipo === "domicilio" && <div><span>Consegna{indirizzo?.zona ? ` · zona ${nomeZona(indirizzo.zona.nome)}` : ""}</span><span>{costoConsegna > 0 ? euro(costoConsegna) : "gratis"}</span></div>}
              <div className="tot"><span>Totale</span><span>{euro(totale)}</span></div>
            </div>
          )}
          {sottoMinimo && <div className="o-avviso">A casa tua l&apos;ordine minimo è {euro(minimo)}: mancano {euro(minimo - subtotale)}.</div>}
          {errore && <div className="o-avviso">{errore}</div>}
        </div>
        {barra("Scegli quando", () => vai("quando"), carrello.length === 0 || sottoMinimo)}
      </div>
    );
  }

  if (passo === "quando") {
    return (
      <div className="ordina">
        {testata(() => vai("carrello"))}
        <div className="o-corpo o-entra">
          <div className="o-sez">Giorno</div>
          <div className="o-giorni">
            {giorni.map((g) => (
              <button key={g.chiave} onClick={() => { setGiorno(g.chiave); setFascia(null); }} className={g.chiave === giorno ? "on" : ""} disabled={g.chiuso}>
                <small>{g.nome}</small><b>{g.numero}</b>
              </button>
            ))}
          </div>
          <div className="o-sez">{tipo === "domicilio" ? "Orario di consegna" : "Orario di ritiro"} · {etichettaGiorno(giorno)}</div>
          <p className="o-sotto">Il primo orario libero è già scelto: tocca un altro quarto d&apos;ora se preferisci. Quelli barrati sono pieni.</p>
          {fasce === null && <div className="o-nota">Guardo i posti liberi…</div>}
          {fasce !== null && fasce.length === 0 && (
            <div className="o-avviso chiuso">{fasciaEsito === "chiuso" ? "Quel giorno siamo chiusi." : fasciaEsito === "errore" ? "Non riesco a leggere gli orari: riprova." : "Per oggi non ci sono più orari: prova domani."}</div>
          )}
          {fasce !== null && fasce.length > 0 && (
            <div className="o-fasce">
              {fasce.map((f) => (
                <button key={f.inizio} onClick={() => { if (!f.piena) { setFascia(f); setErrore(null); vai("dati"); } }} className={(fascia?.inizio === f.inizio ? "on" : "") + (f.piena ? " piena" : "")} disabled={f.piena}>{f.ora}</button>
              ))}
            </div>
          )}
          {errore && <div className="o-avviso">{errore}</div>}
        </div>
        {barra(fascia ? (fasce && fasce.find((x) => !x.piena)?.inizio === fascia.inizio ? (giorno === giornoRoma(new Date()) ? `Il prima possibile · ${fascia.ora}` : `${etichettaGiorno(giorno)} alle ${fascia.ora}`) : `${giorno === giornoRoma(new Date()) ? "Oggi" : etichettaGiorno(giorno)} alle ${fascia.ora}`) : "Scegli un quarto d'ora", () => vai("dati"), !fascia)}
      </div>
    );
  }

  if (passo === "dati") {
    const pronto = nome.trim().length >= 2 && telefono.replace(/\D/g, "").length >= 9 && !!pagamento;
    return (
      <div className="ordina">
        {testata(() => vai("quando"))}
        <div className="o-corpo o-entra">
          <div className="o-sez">I tuoi dati</div>
          <p className="o-sotto">Ti chiamiamo solo se c&apos;è un problema con l&apos;ordine.</p>
          <label className="o-campo"><span>Nome</span><input value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" placeholder="Il tuo nome" /></label>
          <label className="o-campo"><span>Telefono</span><input value={telefono} onChange={(e) => setTelefono(e.target.value)} autoComplete="tel" inputMode="tel" placeholder="3xx xxx xxxx" />
            {telefono.trim().length > 0 && telefono.replace(/\D/g, "").length < 9 && <small style={{ color: "var(--vino)", fontWeight: 600 }}>Il numero è corto: servono almeno 9 cifre.</small>}</label>
          <label className="o-campo"><span>Email (se vuoi)</span><input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" placeholder="facoltativa" /></label>
          <label className="o-campo"><span>Note per la cucina{tipo === "domicilio" ? " o per il rider" : ""}</span><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={tipo === "domicilio" ? "citofono, piano, «senza cipolla»…" : "«ben cotta», «senza cipolla»…"} /></label>
          <div className="o-sez">Pagamento</div>
          <div className="o-paga">
            <button onClick={() => setPagamento("contanti")} className={pagamento === "contanti" ? "on" : ""}><span className="casella"><svg viewBox="0 0 64 64" aria-hidden><path d="M14 34 L27 47 L50 18" /></svg></span><IconaContanti /><span>Contanti {tipo === "domicilio" ? "alla consegna" : "alla cassa"}</span></button>
            <button onClick={() => setPagamento("pos")} className={pagamento === "pos" ? "on" : ""}><span className="casella"><svg viewBox="0 0 64 64" aria-hidden><path d="M14 34 L27 47 L50 18" /></svg></span><IconaCarta /><span>Bancomat o carta {tipo === "domicilio" ? "alla consegna" : "alla cassa"}</span></button>
          </div>
          <div className="o-sez">Il tuo ordine</div>
          <p className="o-sotto" style={{ textAlign: "left", marginBottom: 4 }}>{tipo === "domicilio" ? "Consegna" : "Ritiro"} <b>{etichettaGiorno(giorno)} alle {fascia?.ora}</b>{tipo === "domicilio" && indirizzo && <><br />a {indirizzo.testo} <button onClick={() => { setIndirizzo(null); vai("tipo"); }} style={{ color: "var(--vino)", fontWeight: 700, textDecoration: "underline", padding: 0 }}>cambia</button></>}{tipo === "ritiro" && <><br />in Via Novara 5/7, Roma</>}</p>
          <div className="o-riepilogo">
            {carrello.map((r) => (
              <div key={r.chiave} className="r"><b>{r.quantita}x</b><span>{r.descrizione}
                {r.variazioni.length > 0 && <small>{r.variazioni.map((v) => `CON ${v.nome}`).join(", ")}</small>}
                {r.figlie && <small>{r.figlie.map((f) => (f.quantita > 1 ? `${f.quantita}× ` : "") + f.descrizione).join(" · ")}</small>}
              </span><span className="p">{euro(prezzoRiga(r))}</span></div>
            ))}
            {costoConsegna > 0 && <div className="r"><b></b><span>Consegna</span><span className="p">{euro(costoConsegna)}</span></div>}
          </div>
          {errore && <div className="o-avviso">{errore}</div>}
        </div>
        {barra(invio ? "Invio l'ordine…" : `Conferma · ${euro(totale)}`, conferma, !pronto || invio)}
      </div>
    );
  }

  // il menù
  return (
    <div className="ordina">
      {testata(() => vai("tipo"))}
      <nav className="o-cat-striscia">
        {categorie.map((c) => (
          <button key={c.id} onClick={() => { setCategoria(c.id); window.scrollTo({ top: 0 }); }} className={"o-cat" + (c.id === categoria ? " attiva" : "")}>{c.nome}</button>
        ))}
      </nav>
      <div className="o-corpo o-entra" key={categoria}>
        {prodotti.length === 0 && <div className="o-nota">Carico il menù…</div>}
        <div className="o-sez o-sez-cat">{catCorrente?.nome}</div>
        <div className="o-lista">
          {inCategoria.map((p) => {
            const nel = carrello.filter((r) => r.id_prodotto === p.id).reduce((s, r) => s + r.quantita, 0);
            return (
              <button key={p.id} onClick={() => setAperto(p)} className="o-carta">
                <div className="testo">
                  <div className="nome">{p.nome}</div>
                  <div className="descr">{p.descrizione ?? (p.incluso ? `Con ${p.incluso}` : "")}</div>
                  <div className="prezzo"><span>{euro(p.prezzo)}</span>{catCorrente && /novit/i.test(catCorrente.nome) && <span className="o-etichetta">! Novità</span>}</div>
                </div>
                <div className="fotobox">
                  <Foto p={p} classe="foto" />
                  {nel > 0 && <span className="nel">{nel}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      {barra(sottoMinimo ? `Minimo ${euro(minimo)}` : "Avanti", () => vai("quando"), carrello.length === 0 || sottoMinimo)}
      {aperto && (
        <SchedaProdotto
          p={aperto}
          varianti={variantiPer(varianti, aperto.id_categoria, gruppiCat)}
          massimi={Object.fromEntries(gruppiCat.filter((g) => g.id_categoria === aperto.id_categoria).map((g) => [g.gruppo, g.max_n]))}
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

/** La ricerca dell'indirizzo: suggerimenti dal server (Google o OpenStreetMap), la zona di consegna accanto. */
function CercaIndirizzo({ scelto }: { scelto: (i: Indirizzo) => void }) {
  const [q, setQ] = useState("");
  const [risultati, setRisultati] = useState<Indirizzo[]>([]);
  const [cerco, setCerco] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 4) { setRisultati([]); return; }
    timer.current = setTimeout(async () => {
      setCerco(true); setErrore(null);
      try {
        const r = await fetch("/api/ordina/indirizzi?q=" + encodeURIComponent(q.trim()));
        const j = (await r.json()) as { risultati?: Indirizzo[]; errore?: string };
        if (!r.ok) setErrore(j.errore ?? "ricerca non riuscita");
        setRisultati(j.risultati ?? []);
      } catch { setErrore("Non riesco a cercare l'indirizzo: riprova."); }
      setCerco(false);
    }, 350);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q]);

  async function scegli(r: Indirizzo) {
    if (r.lat != null && r.lng != null) { scelto(r); return; }
    if (!r.place_id) return;
    setCerco(true);
    try {
      const x = await fetch("/api/ordina/indirizzi?id=" + encodeURIComponent(r.place_id));
      const j = (await x.json()) as Indirizzo & { errore?: string };
      if (!x.ok) { setErrore(j.errore ?? "indirizzo non trovato"); setCerco(false); return; }
      scelto({ ...j, testo: j.testo || r.testo });
    } catch { setErrore("Non riesco a leggere l'indirizzo: riprova."); }
    setCerco(false);
  }

  return (
    <div className="o-cerca">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Via e numero civico" autoComplete="street-address" autoFocus />
      {cerco && <div className="o-nota">Cerco…</div>}
      {errore && <div className="o-avviso">{errore}</div>}
      {risultati.length > 0 && (
        <div className="o-risultati">
          {risultati.map((r, i) => (
            <button key={i} onClick={() => scegli(r)}>
              {r.testo}
              {r.zona === null && <small className="no">Qui non consegniamo</small>}
              {r.zona && <small>Consegna {r.zona.costo_consegna > 0 ? euro(r.zona.costo_consegna) : "gratis"}</small>}
            </button>
          ))}
        </div>
      )}
      {!cerco && q.trim().length >= 4 && risultati.length === 0 && !errore && <div className="o-nota">Nessun indirizzo trovato: scrivi via e civico, per esempio «Via Novara 5».</div>}
    </div>
  );
}

function SchedaProdotto({ p, varianti, gruppiMenu, prodotti, categorie, massimi, chiudi, aggiungi }: {
  p: ProdottoMenu; varianti: VarianteMenu[]; gruppiMenu: PacchettoGruppo[]; prodotti: ProdottoMenu[]; categorie: CategoriaMenu[]; massimi?: Record<string, number>;
  chiudi: () => void; aggiungi: (q: number, v: Variazione[], figlie?: RigaFiglia[]) => void;
}) {
  const [q, setQ] = useState(1);
  const [scelte, setScelte] = useState<VarianteMenu[]>([]);
  const [scelteMenu, setScelteMenu] = useState<ProdottoMenu[][]>(() => gruppiMenu.map(() => []));
  // giro 8: i gruppi di ingredienti sono righe chiuse (63 voci in una pizza non stanno in una schermata); si apre uno alla volta
  const [gruppoAperto, setGruppoAperto] = useState<string | null>(null);
  const gruppi = gruppiDi(varianti);
  const extra = scelte.reduce((s, v) => s + v.prezzo, 0);
  const completo = menuCompleto(gruppiMenu, scelteMenu);

  function alterna(v: VarianteMenu) {
    setScelte((prev) => {
      if (prev.some((x) => x.id === v.id)) return prev.filter((x) => x.id !== v.id);
      // «Impasto alto» e «Impasto normale» insieme non hanno senso (critico giro 8): nei gruppi da uno si sostituisce
      const altri = (massimi?.[v.gruppo] ?? 99) <= 1 ? prev.filter((x) => x.gruppo !== v.gruppo) : prev;
      return [...altri, v];
    });
  }
  function scegli(i: number, prod: ProdottoMenu) {
    const g = gruppiMenu[i];
    setScelteMenu((prev) => prev.map((s, j) => {
      if (j !== i) return s;
      const k = s.findIndex((x) => x.id === prod.id);
      if (g.quantita === 1) return k >= 0 ? [] : [prod];
      if (k >= 0 && s.length >= g.quantita) return s.filter((_x, idx) => idx !== k);
      return s.length < g.quantita ? [...s, prod] : s;
    }));
  }

  return (
    <div className="o-velo">
      <div className="o-testa">
        <div className="o-sabbia">
          <img src="/brand/logo-amanoamano.png" alt="A Mano A Mano Pugliese" />
          <img src="/brand/bollino.png" alt="" className="bollino" />
        </div>
        <div className="o-vino">
          <button className="indietro" onClick={chiudi}><b>‹</b> Indietro</button>
          <span className="titolo">Dettagli</span>
        </div>
      </div>
      <div className="o-scheda">
        <div className="corpo"><div className="dentro">
          <div className="o-intesta">
            <div className="fotobox-grande"><Foto p={p} classe="foto-grande" /></div>
            <div className="testo">
              <h2>{p.nome}</h2>
              {p.descrizione && <p className="descr">{p.descrizione}</p>}
              {p.incluso && <p className="descr" style={{ fontWeight: 700 }}>Inclusi nel menu: {p.incluso}</p>}
              <div className="prezzo">{euro(p.prezzo)}</div>
            </div>
          </div>

          {gruppiMenu.map((g, i) => {
            const fatto = scelteMenu[i].length >= g.quantita;
            const voci = prodotti.filter((x) => g.scelte.includes(x.id));
            const cats = categorie.filter((c) => voci.some((x) => x.id_categoria === c.id));
            return (
              <div key={g.id} id={`o-passo-${i}`} style={{ scrollMarginTop: 12 }}>
                <div className="o-sez" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><span className={"o-numero" + (fatto ? " fatto" : "")}>{fatto ? "✓" : i + 1}</span>{g.etichetta} <small style={{ fontWeight: 400, color: "var(--testo2)" }}>{scelteMenu[i].length}/{g.quantita}</small></div>
                {(cats.length > 1 ? cats : [null]).map((c) => (
                  <div key={c?.id ?? "tutte"}>
                    {c && <div className="o-gruppo">{c.nome}</div>}
                    {voci.filter((x) => !c || x.id_categoria === c.id).map((x) => {
                      const n = scelteMenu[i].filter((y) => y.id === x.id).length;
                      return (
                        <button key={x.id} onClick={() => scegli(i, x)} className={"o-opz" + (n > 0 ? " on" : "")}>
                          <span className="spunta">{n > 0 ? (g.quantita > 1 ? `×${n}` : "✓") : ""}</span><span>{x.nome}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })}

          <div className="o-quanti"><span>Quantità</span><Contatore n={q} meno={() => setQ(Math.max(1, q - 1))} piu={() => setQ(Math.min(20, q + 1))} /></div>

          {gruppi.length > 0 && <div className="o-sez">Aggiungi ingredienti</div>}
          {gruppi.map((g) => {
            const scelteQui = scelte.filter((x) => x.gruppo === g);
            const aperto = gruppoAperto === g;
            return (
              <div key={g} className={"o-acc" + (aperto ? " aperto" : "")}>
                <button className="o-acc-testa" onClick={() => setGruppoAperto(aperto ? null : g)} aria-expanded={aperto}>
                  <span className="nome">{g}</span>
                  <span className={"scelte" + (scelteQui.length > 0 ? " fatte" : "")}>{scelteQui.length > 0 ? scelteQui.map((x) => x.nome).join(", ") : `${varianti.filter((v) => v.gruppo === g).length} scelte`}</span>
                  <span className="freccia" aria-hidden>{aperto ? "▴" : "▾"}</span>
                </button>
                {aperto && varianti.filter((v) => v.gruppo === g).map((v) => {
                  const on = scelte.some((x) => x.id === v.id);
                  return (
                    <button key={v.id} onClick={() => alterna(v)} className={"o-opz" + (on ? " on" : "")}>
                      <span className="spunta">{on ? "✓" : ""}</span><span>{v.nome}</span><span className="extra">{v.prezzo > 0 ? "+ " + euro(v.prezzo) : ""}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div></div>
        <div className="piede"><div className="dentro">
          <button
            onClick={() => {
              if (completo) return aggiungi(q, scelte.map((v) => ({ nome: v.nome, prezzo: v.prezzo, tipo: "aggiunta" as const })), gruppiMenu.length > 0 ? figlieDaScelte(gruppiMenu, scelteMenu, categorie) : undefined);
              const i = gruppiMenu.findIndex((g, j) => scelteMenu[j].length < g.quantita);
              document.getElementById(`o-passo-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="o-vai">
            {completo
              ? <><span className="n">{q}</span><span className="azione">Aggiungi al carrello</span><span className="tot">{euro((p.prezzo + extra) * q)}</span></>
              : <><span className="n">{q}</span><span className="azione">{(() => { const g = gruppiMenu.find((g, j) => scelteMenu[j].length < g.quantita); return g ? `Manca: ${g.etichetta.toLowerCase()} ↓` : "Completa le scelte"; })()}</span><span className="tot"></span></>}
          </button>
        </div></div>
      </div>
    </div>
  );
}

function Contatore({ n, meno, piu }: { n: number; meno: () => void; piu: () => void }) {
  return (
    <div className="o-cont">
      <button onClick={meno} aria-label="meno">−</button>
      <span>{n}</span>
      <button onClick={piu} className="piu" aria-label="più">+</button>
    </div>
  );
}

function Foto({ p, classe }: { p?: ProdottoMenu; classe: string }) {
  if (p?.foto_url) return <img src={p.foto_url} alt="" className={classe} />;
  return <div className="o-manca" aria-hidden><img src="/brand/bollino.png" alt="" style={{ width: "52%" }} /></div>;
}

/** Lo scooter della consegna, come l'icona bianca dell'app. */
function IconaScooter() {
  return <svg className="icona" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="14" cy="44" r="7" /><circle cx="50" cy="44" r="7" /><path d="M14 44h16l6-16h8" /><path d="M36 28l-4-10h-8" /><path d="M44 28l6 16" /><path d="M8 32h14" /></svg>;
}
function IconaSacchetto() {
  return <svg className="icona" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M14 22h36l-3 32H17z" /><path d="M24 22v-4a8 8 0 0 1 16 0v4" /><path d="M24 32h16" opacity=".5" /></svg>;
}
function IconaContanti() {
  return <svg className="icona" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="6" y="18" width="52" height="30" rx="5" /><circle cx="32" cy="33" r="8" /><path d="M14 26h.01M50 40h.01" strokeWidth="5" /></svg>;
}
function IconaCarta() {
  return <svg className="icona" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="6" y="16" width="52" height="34" rx="6" /><path d="M6 26h52" strokeWidth="6" /><path d="M14 40h12M44 40h6" /></svg>;
}
