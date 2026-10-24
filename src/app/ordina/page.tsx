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
const PASSI: Passo[] = ["tipo", "menu", "carrello", "quando", "dati"];
const BOZZA_LS = "ordina:bozza";
const BOZZA_MS = 60 * 60_000;

interface Zona { nome: string; costo_consegna: number; minimo_ordine: number }
interface Indirizzo { testo: string; via: string | null; civico: string | null; cap: string | null; citta: string | null; lat: number | null; lng: number | null; place_id: string | null; zona?: Zona | null; km?: number | null }
interface Fascia { ora: string; inizio: string; piena: boolean }
interface Negozio { nome: string; preordini_giorni: number; attesa_domicilio: number; attesa_ritiro: number }
interface Orario { giorno: number; tipo: string; dalle: string; alle: string }
interface Esito { ok: boolean; titolo: string; testo: string; numero?: string; segui?: string | null }

const giornoRoma = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" }); // AAAA-MM-GG
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
      setFascia((f) => (f && (r.fasce ?? []).some((x) => x.inizio === f.inizio && !x.piena) ? f : null));
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

  function scegliTipo(t: Tipo) {
    setTipo(t);
    if (t === "ritiro") setIndirizzo(null);
    if (t !== tipo) setFascia(null);
  }
  function avantiDalTipo() {
    if (!tipo) return;
    if (tipo === "domicilio" && !indirizzo?.zona) return;
    setCategoria((c) => c ?? categorie[0]?.id ?? null);
    vai("menu");
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
    const r = data as { esito: string; numero?: string; segui?: string | null; motivo?: string; minimo?: number; dalle?: string; alle?: string; libere?: number };
    switch (r.esito) {
      case "accettato":
        setEsito({ ok: true, titolo: `Grazie ${nome.trim().split(" ")[0]}!`, numero: r.numero, segui: r.segui,
          testo: tipo === "domicilio"
            ? `Te lo portiamo ${etichettaGiorno(giorno)} alle ${fascia.ora}. Paghi ${pagamento === "pos" ? "col POS" : "in contanti"} al rider.`
            : `Ti aspettiamo ${etichettaGiorno(giorno)} alle ${fascia.ora}. Paghi ${pagamento === "pos" ? "col POS" : "in contanti"} in pizzeria.` });
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

  const barra = (testo: string, su: () => void, spento = false) => (
    <div className="o-barra"><div className="dentro">
      <div className="tot"><small>{articoli} {articoli === 1 ? "articolo" : "articoli"}{costoConsegna > 0 ? ` + consegna ${euro(costoConsegna)}` : ""}</small><b>{euro(totale)}</b></div>
      <button onClick={su} disabled={spento} className="o-b-oro">{testo}</button>
    </div></div>
  );
  const testata = (indietro?: () => void) => (
    <>
      <div className="o-testata">
        {indietro && <button className="indietro" onClick={indietro}>← Indietro</button>}
        <img src="/brand/logo-amanoamano-chiaro.png" alt="A Mano A Mano Pugliese" />
        {passo === "menu" && articoli > 0 && <button className="carrello" onClick={() => vai("carrello")}>{articoli} · {euro(subtotale)}</button>}
      </div>
      <div className="o-oro-linea" />
      {passo !== "fatto" && (
        <div className="o-passi">{PASSI.map((p) => <span key={p} className={p === passo ? "qui" : PASSI.indexOf(p) < PASSI.indexOf(passo) ? "fatto" : ""} />)}</div>
      )}
    </>
  );

  if (erroreMenu) return <div className="ordina"><div className="o-corpo o-avviso">{erroreMenu}</div></div>;

  if (passo === "fatto" && esito) {
    return (
      <div className="ordina">
        {testata()}
        <div className="o-corpo o-fatto o-entra">
          <img src="/brand/bollino.png" alt="" style={{ width: 110 }} />
          <div className={"cerchio" + (esito.ok ? "" : " no")}>{esito.ok ? <svg viewBox="0 0 64 64" aria-hidden><path d="M14 34 L27 47 L50 18" /></svg> : "!"}</div>
          <h1>{esito.titolo}</h1>
          {esito.numero && <div className="numero"><small>Il tuo ordine</small><b>{esito.numero}</b></div>}
          <p>{esito.testo}</p>
          {esito.segui && <p>Quando il rider parte, lo segui sulla mappa da qui:<br /><a href={esito.segui} style={{ color: "var(--vino)", fontWeight: 700 }}>segui la consegna</a></p>}
          <button className="o-b-vino o-b-largo" onClick={() => { setEsito(null); setFascia(null); setPagamento(null); setNote(""); vai("tipo"); }}>Nuovo ordine</button>
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
          <h1 className="o-titolo" style={{ marginTop: 14 }}>Come lo vuoi?</h1>
          <p className="o-sotto">Pizza pugliese, pucce e fritti. Ordini qui, paghi quando arriva.</p>
          <div className="o-scelta">
            <button onClick={() => scegliTipo("domicilio")} className={tipo === "domicilio" ? "on" : ""}>
              <IconaCasa /><span className="nome">A casa</span><small>te lo porta il rider</small>
            </button>
            <button onClick={() => scegliTipo("ritiro")} className={tipo === "ritiro" ? "on" : ""}>
              <IconaSacchetto /><span className="nome">Lo ritiro</span><small>Via Novara 5/7, Roma</small>
            </button>
          </div>
          {tipo === "domicilio" && (
            <div style={{ textAlign: "left" }}>
              {indirizzo ? (
                <div className="o-indirizzo">
                  <div className="testo">
                    {indirizzo.testo}
                    {indirizzo.zona
                      ? <small>Consegna {indirizzo.zona.costo_consegna > 0 ? euro(indirizzo.zona.costo_consegna) : "gratis"}{indirizzo.zona.minimo_ordine > 0 ? ` · ordine minimo ${euro(indirizzo.zona.minimo_ordine)}` : ""}</small>
                      : <small style={{ color: "var(--vino)", fontWeight: 700 }}>Qui non consegniamo</small>}
                  </div>
                  <button className="cambia" onClick={() => setIndirizzo(null)}>Cambia</button>
                </div>
              ) : (
                <CercaIndirizzo scelto={setIndirizzo} />
              )}
              {indirizzo && !indirizzo.zona && <div className="o-avviso">Mi dispiace, a quell&apos;indirizzo non arriviamo. Puoi ordinare e ritirare in pizzeria.</div>}
            </div>
          )}
          {errore && <div className="o-avviso">{errore}</div>}
        </div>
        {barra("Vai al menù", avantiDalTipo, !tipo || (tipo === "domicilio" && !indirizzo?.zona))}
      </div>
    );
  }

  if (passo === "carrello") {
    return (
      <div className="ordina">
        {testata(() => vai("menu"))}
        <div className="o-corpo o-entra">
          <h1 className="o-titolo">Il tuo ordine</h1>
          <p className="o-sotto">{tipo === "domicilio" ? `A casa: ${indirizzo?.testo ?? ""}` : "Lo ritiri in pizzeria, Via Novara 5/7."}</p>
          {carrello.length === 0 && <div className="o-nota">Il carrello è vuoto.</div>}
          {carrello.map((r) => (
            <div key={r.chiave} className="o-riga">
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
          {carrello.length > 0 && (
            <div className="o-somme">
              <div><span>Prodotti</span><span>{euro(subtotale)}</span></div>
              {tipo === "domicilio" && <div><span>Consegna{indirizzo?.zona ? ` · ${indirizzo.zona.nome.toLowerCase()}` : ""}</span><span>{costoConsegna > 0 ? euro(costoConsegna) : "gratis"}</span></div>}
              <div className="tot"><span>Totale</span><span>{euro(totale)}</span></div>
            </div>
          )}
          {sottoMinimo && <div className="o-avviso">A casa tua l&apos;ordine minimo è {euro(minimo)}: mancano {euro(minimo - subtotale)}.</div>}
          {errore && <div className="o-avviso">{errore}</div>}
          <button className="o-b-linea o-b-largo" onClick={() => vai("menu")}>Aggiungi altro</button>
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
          <h1 className="o-titolo">{tipo === "domicilio" ? "Quando te lo portiamo?" : "Quando passi?"}</h1>
          <p className="o-sotto">Scegli il giorno e il quarto d&apos;ora. Quelli barrati sono già pieni.</p>
          <div className="o-giorni">
            {giorni.map((g) => (
              <button key={g.chiave} onClick={() => { setGiorno(g.chiave); setFascia(null); }} className={g.chiave === giorno ? "on" : ""} disabled={g.chiuso} style={g.chiuso ? { opacity: .4 } : undefined}>
                <small>{g.nome}</small><b>{g.numero}</b>
              </button>
            ))}
          </div>
          {fasce === null && <div className="o-nota">Guardo i posti liberi…</div>}
          {fasce !== null && fasce.length === 0 && (
            <div className="o-avviso">{fasciaEsito === "chiuso" ? "Quel giorno siamo chiusi." : fasciaEsito === "errore" ? "Non riesco a leggere gli orari: riprova." : "Per oggi non ci sono più orari: prova domani."}</div>
          )}
          {fasce !== null && fasce.length > 0 && (
            <div className="o-fasce">
              {fasce.map((f) => (
                <button key={f.inizio} onClick={() => { if (!f.piena) { setFascia(f); setErrore(null); } }} className={(fascia?.inizio === f.inizio ? "on" : "") + (f.piena ? " piena" : "")} disabled={f.piena}>{f.ora}</button>
              ))}
            </div>
          )}
          {errore && <div className="o-avviso">{errore}</div>}
        </div>
        {barra(fascia ? `Alle ${fascia.ora} · avanti` : "Scegli un orario", () => vai("dati"), !fascia)}
      </div>
    );
  }

  if (passo === "dati") {
    const pronto = nome.trim().length >= 2 && telefono.replace(/\D/g, "").length >= 9 && !!pagamento;
    return (
      <div className="ordina">
        {testata(() => vai("quando"))}
        <div className="o-corpo o-entra">
          <h1 className="o-titolo">Chi sei?</h1>
          <p className="o-sotto">Ti chiamiamo solo se c&apos;è un problema con l&apos;ordine.</p>
          <label className="o-campo"><span>Nome</span><input value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" placeholder="Il tuo nome" /></label>
          <label className="o-campo"><span>Telefono</span><input value={telefono} onChange={(e) => setTelefono(e.target.value)} autoComplete="tel" inputMode="tel" placeholder="3xx xxx xxxx" /></label>
          <label className="o-campo"><span>Email (se vuoi)</span><input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" placeholder="facoltativa" /></label>
          <label className="o-campo"><span>Note per la cucina{tipo === "domicilio" ? " o per il rider" : ""}</span><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={tipo === "domicilio" ? "citofono, piano, «senza cipolla»…" : "«ben cotta», «senza cipolla»…"} /></label>
          <div className="o-campo"><span>Come paghi {tipo === "domicilio" ? "al rider" : "in pizzeria"}</span>
            <div className="o-paga">
              <button onClick={() => setPagamento("contanti")} className={pagamento === "contanti" ? "on" : ""}><IconaContanti /><span>Contanti</span><small>alla consegna</small></button>
              <button onClick={() => setPagamento("pos")} className={pagamento === "pos" ? "on" : ""}><IconaCarta /><span>Carta · POS</span><small>alla consegna</small></button>
            </div>
          </div>
          <div className="o-riepilogo">
            <div className="lapide" style={{ marginBottom: 6 }}>{tipo === "domicilio" ? "A casa" : "Ritiro"} · {etichettaGiorno(giorno)} alle {fascia?.ora}</div>
            {carrello.map((r) => (
              <div key={r.chiave} className="r"><b>{r.quantita}×</b><span>{r.descrizione}
                {r.variazioni.length > 0 && <small>{r.variazioni.map((v) => v.nome).join(" · ")}</small>}
                {r.figlie && <small>{r.figlie.map((f) => (f.quantita > 1 ? `${f.quantita}× ` : "") + f.descrizione).join(" · ")}</small>}
              </span><span style={{ flex: "none", fontVariantNumeric: "tabular-nums" }}>{euro(prezzoRiga(r))}</span></div>
            ))}
            {costoConsegna > 0 && <div className="r"><b></b><span>Consegna</span><span style={{ flex: "none" }}>{euro(costoConsegna)}</span></div>}
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
          <button key={c.id} onClick={() => { setCategoria(c.id); window.scrollTo({ top: 0 }); }} className={"o-cat" + (c.id === categoria ? " attiva" : "")}>
            <Foto p={prodotti.find((p) => p.id_categoria === c.id && p.foto_url) ?? prodotti.find((p) => p.id_categoria === c.id)} classe="tondo" tondo />
            <span className="nome">{c.nome}</span>
          </button>
        ))}
      </nav>
      <div className="o-corpo o-entra" key={categoria}>
        {prodotti.length === 0 && <div className="o-nota">Carico il menù…</div>}
        <h1 className="o-titolo" style={{ fontSize: 22, marginBottom: 12 }}>{catCorrente?.nome}</h1>
        <div className="o-griglia">
          {inCategoria.map((p) => {
            const nel = carrello.filter((r) => r.id_prodotto === p.id).reduce((s, r) => s + r.quantita, 0);
            return (
              <button key={p.id} onClick={() => setAperto(p)} className="o-carta">
                <Foto p={p} classe="foto" />
                {nel > 0 && <span className="nel">×{nel}</span>}
                <div className="nome">{p.nome}</div>
                <div className="descr">{p.descrizione ?? ""}</div>
                <div className="prezzo"><span>{euro(p.prezzo)}</span><span className="piu">+</span></div>
              </button>
            );
          })}
        </div>
      </div>
      {barra(sottoMinimo ? `Minimo ${euro(minimo)}` : "Vedi ordine", () => vai("carrello"), carrello.length === 0)}
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

function SchedaProdotto({ p, varianti, gruppiMenu, prodotti, categorie, chiudi, aggiungi }: {
  p: ProdottoMenu; varianti: VarianteMenu[]; gruppiMenu: PacchettoGruppo[]; prodotti: ProdottoMenu[]; categorie: CategoriaMenu[];
  chiudi: () => void; aggiungi: (q: number, v: Variazione[], figlie?: RigaFiglia[]) => void;
}) {
  const [q, setQ] = useState(1);
  const [scelte, setScelte] = useState<VarianteMenu[]>([]);
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
      if (k >= 0 && s.length >= g.quantita) return s.filter((_x, idx) => idx !== k);
      return s.length < g.quantita ? [...s, prod] : s;
    }));
  }

  return (
    <div className="o-velo" onClick={chiudi}>
      <div className="o-scheda" onClick={(e) => e.stopPropagation()}>
        <div className="corpo">
          {p.foto_url ? <img src={p.foto_url} alt="" className="foto-grande" /> : <div className="o-manca" style={{ aspectRatio: "auto", height: "22vh", borderRadius: 0, width: "calc(100% + 40px)", margin: "0 -20px" }}><img src="/brand/bollino.png" alt="" style={{ height: "60%" }} /></div>}
          <h2>{p.nome}</h2>
          {p.descrizione && <p className="descr">{p.descrizione}</p>}
          <div className="prezzo">{euro(p.prezzo)}</div>
          {p.incluso && <p className="descr" style={{ fontWeight: 700, marginTop: 6 }}>Inclusi nel menu: {p.incluso}</p>}

          {gruppiMenu.map((g, i) => {
            const fatto = scelteMenu[i].length >= g.quantita;
            const voci = prodotti.filter((x) => g.scelte.includes(x.id));
            const cats = categorie.filter((c) => voci.some((x) => x.id_categoria === c.id));
            return (
              <div key={g.id} id={`o-passo-${i}`} style={{ scrollMarginTop: 12 }}>
                <h3><span className={"o-numero" + (fatto ? " fatto" : "")}>{fatto ? "✓" : i + 1}</span>{g.etichetta} <small style={{ fontWeight: 400, color: "var(--grigio)", textTransform: "none", fontFamily: "Figtree" }}>{scelteMenu[i].length}/{g.quantita}</small></h3>
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

          <h3>Quantità</h3>
          <Contatore n={q} meno={() => setQ(Math.max(1, q - 1))} piu={() => setQ(Math.min(20, q + 1))} />

          {gruppi.length > 0 && <h3>Aggiungi ingredienti</h3>}
          {gruppi.map((g) => (
            <div key={g}>
              <div className="o-gruppo">{g}</div>
              {varianti.filter((v) => v.gruppo === g).map((v) => {
                const on = scelte.some((x) => x.id === v.id);
                return (
                  <button key={v.id} onClick={() => alterna(v)} className={"o-opz" + (on ? " on" : "")}>
                    <span className="spunta">{on ? "✓" : ""}</span><span>{v.nome}</span><span className="extra">{v.prezzo > 0 ? "+ " + euro(v.prezzo) : ""}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="piede">
          <button onClick={chiudi} className="o-b-linea">Annulla</button>
          <button
            onClick={() => {
              if (completo) return aggiungi(q, scelte.map((v) => ({ nome: v.nome, prezzo: v.prezzo, tipo: "aggiunta" as const })), gruppiMenu.length > 0 ? figlieDaScelte(gruppiMenu, scelteMenu, categorie) : undefined);
              const i = gruppiMenu.findIndex((g, j) => scelteMenu[j].length < g.quantita);
              document.getElementById(`o-passo-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className={completo ? "o-b-vino" : "o-b-linea"} style={{ flex: 1 }}>
            {completo ? `Aggiungi · ${euro((p.prezzo + extra) * q)}` : (() => { const g = gruppiMenu.find((g, j) => scelteMenu[j].length < g.quantita); return g ? `Manca: ${g.etichetta.toLowerCase()} ↓` : "Completa le scelte"; })()}
          </button>
        </div>
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

function Foto({ p, classe, tondo }: { p?: ProdottoMenu; classe: string; tondo?: boolean }) {
  if (p?.foto_url) return <img src={p.foto_url} alt="" className={classe} />;
  return <div className={"o-manca" + (tondo ? " tondo" : "")} aria-hidden><img src="/brand/bollino.png" alt="" style={{ width: tondo ? "74%" : "48%" }} /></div>;
}

function IconaCasa() {
  return <svg className="icona" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M8 30 L32 10 L56 30" /><path d="M14 26v28h36V26" /><path d="M26 54V38h12v16" /></svg>;
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
