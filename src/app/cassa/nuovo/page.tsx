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
  aggiungiRiga, chiaveRiga, euro, figlieDaScelte, gruppiDi, gruppiPacchetto, leggiMenu, menuCompleto, nuovaRiga, prezzoDi, prezzoRiga, righePerInvio, riprezzaRighe, totaleRighe, variantiPer,
  type CategoriaMenu, type GruppoCategoria, type PacchettoGruppo, type ProdottoMenu, type RigaFiglia, type RigaOrdine, type VarianteMenu,
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
  const [gruppiCat, setGruppiCat] = useState<GruppoCategoria[]>([]);
  const [pacchetti, setPacchetti] = useState<PacchettoGruppo[]>([]);
  // Un menu toccato (mig. 0023): si scelgono le pizze e la bibita prima che entri in comanda.
  const [menuAperto, setMenuAperto] = useState<{ p: ProdottoMenu; gruppi: PacchettoGruppo[]; scelte: ProdottoMenu[][]; passo: number } | null>(null);
  // Le varianti su un menu vanno sulla pizza scelta (indice fra le figlie), non sul menu.
  const [figliaSel, setFigliaSel] = useState<number | null>(null);
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
  // Il cliente che ha chiamato (da /cassa/cliente, «Prendi l'ordine»): si lega all'ordine.
  const [cliente, setCliente] = useState<{ id: string; nome: string | null; telefono: string; indirizzo: string | null } | null>(null);
  // Gli indirizzi del cliente, con la zona vera: a domicilio se ne sceglie uno (la zona dà costo e minimo).
  type Indirizzo = { id: string; via: string; civico: string | null; id_zona: string | null };
  type Zona = { id: string; nome: string; costo_consegna: number; minimo_ordine: number };
  const [indirizzi, setIndirizzi] = useState<Indirizzo[]>([]);
  const [idIndirizzo, setIdIndirizzo] = useState<string | null>(null);
  const [zone, setZone] = useState<Zona[]>([]);
  const [esito, setEsito] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);
  // Quando: «adesso» oppure giorno + quarto d'ora, dentro l'orario del tipo (mig. 0022: domicilio 19:00–22:30,
  // ritiro 19:00–22:45, 7 giorni avanti come online). Un ordine telefonico «per domani alle 20» si prende qui.
  type Orario = { tipo: string; dalle: string; alle: string };
  const [idNegozio, setIdNegozio] = useState<string | null>(null);
  const [preordiniGiorni, setPreordiniGiorni] = useState(7);
  const [giorno, setGiorno] = useState<string>("");          // "" = adesso
  const [ora, setOra] = useState<string>("");                // "HH:MM"
  const [orari, setOrari] = useState<Orario[]>([]);

  useEffect(() => {
    const tel = new URLSearchParams(window.location.search).get("telefono");
    if (!tel) return;
    supabaseBrowser().rpc("cerca_cliente", { p_telefono: tel }).then(({ data }) => {
      const s = data as { esito: string; cliente?: { id: string; nome: string | null; telefono: string }; indirizzi?: Indirizzo[] } | null;
      if (s?.esito === "trovato" && s.cliente) {
        const i = s.indirizzi?.[0];
        setCliente({ ...s.cliente, indirizzo: i ? `${i.via} ${i.civico ?? ""}`.trim() : null });
        setIndirizzi(s.indirizzi ?? []);
        setIdIndirizzo(i?.id ?? null);
        setTipo("domicilio");
      } else {
        setCliente({ id: "", nome: null, telefono: tel, indirizzo: null });
      }
    });
  }, []);

  useEffect(() => {
    (async () => {
      const [m, t, z] = await Promise.all([
        leggiMenu(),
        supabaseBrowser().from("tavolo").select("id, numero, stato").order("numero"),
        supabaseBrowser().from("zona").select("id, nome, costo_consegna, minimo_ordine").eq("attiva", true),
      ]);
      if (m.errore) setErrore(m.errore);
      setCategorie(m.categorie); setProdotti(m.prodotti); setVarianti(m.varianti); setGruppiCat(m.gruppi); setPacchetti(m.pacchetti);
      setTavoli(((t.data ?? []) as Tavolo[]).sort((a, b) => a.numero.localeCompare(b.numero, "it", { numeric: true })));
      const { data: prof } = await supabaseBrowser().from("profilo").select("id_negozio").single();
      const idNeg = (prof as { id_negozio: string | null } | null)?.id_negozio ?? null;
      if (idNeg) {
        setIdNegozio(idNeg);
        const { data: neg } = await supabaseBrowser().from("negozio").select("preordini_giorni").eq("id", idNeg).maybeSingle();
        const n = (neg as { preordini_giorni: number } | null)?.preordini_giorni;
        if (n) setPreordiniGiorni(n);
      }
      setZone(((z.data ?? []) as Zona[]).map((x) => ({ ...x, costo_consegna: Number(x.costo_consegna), minimo_ordine: Number(x.minimo_ordine) })));
      setCategoria(m.categorie[0]?.id ?? null);
    })();
  }, []);

  // Gli orari del giorno scelto (o di oggi), per i quarti d'ora offerti.
  useEffect(() => {
    if (!idNegozio) return;
    const g = giorno || oggiISO();
    supabaseBrowser().rpc("orari_giorno", { p_negozio: idNegozio, p_giorno: g }).then(({ data }) => setOrari((data ?? []) as Orario[]));
  }, [idNegozio, giorno]);

  const giorniScelta = useMemo(() => {
    const out: { v: string; t: string }[] = [];
    for (let i = 0; i < preordiniGiorni; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      const v = isoLocale(d);
      out.push({ v, t: i === 0 ? "Oggi" : i === 1 ? "Domani" : d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" }) });
    }
    return out;
  }, [preordiniGiorni]);

  const orarioTipo = orari.find((o) => o.tipo === (tipo === "domicilio" || tipo === "ritiro" ? tipo : "apertura")) ?? null;
  const quartiScelta = useMemo(() => {
    if (!orarioTipo) return [] as string[];
    const out: string[] = [];
    const [h1, m1] = orarioTipo.dalle.split(":").map(Number);
    const [h2, m2] = orarioTipo.alle.split(":").map(Number);
    const adesso = new Date();
    const g = giorno || oggiISO();
    for (let t = h1 * 60 + m1; t <= h2 * 60 + m2; t += 15) {
      const hh = String(Math.floor(t / 60)).padStart(2, "0"), mm = String(t % 60).padStart(2, "0");
      if (g === oggiISO() && t < adesso.getHours() * 60 + adesso.getMinutes() + 15) continue;   // attesa minima 15 min
      out.push(`${hh}:${mm}`);
    }
    return out;
  }, [orarioTipo, giorno]);

  const listino = tipo === "tavolo" ? "tavolo" : "asporto";
  const catCorrente = categorie.find((c) => c.id === categoria);
  const rigaSel = righe.find((r) => r.chiave === selezionata) ?? null;
  const figlie = rigaSel?.figlie ?? [];
  const figliaAttiva = figlie.length > 0 ? figlie[figliaSel != null && figliaSel < figlie.length ? figliaSel : 0] : null;
  const prodottoSel = rigaSel ? prodotti.find((p) => p.id === (figliaAttiva ? figliaAttiva.id_prodotto : rigaSel.id_prodotto)) : undefined;
  const variantiSel = useMemo(() => variantiPer(varianti, prodottoSel?.id_categoria ?? null, gruppiCat), [varianti, prodottoSel, gruppiCat]);
  const gruppi = gruppiDi(variantiSel);
  const gruppoAttivo = gruppo && gruppi.includes(gruppo) ? gruppo : gruppi[0] ?? null;
  const totale = totaleRighe(righe);
  const indirizzoSel = indirizzi.find((i) => i.id === idIndirizzo) ?? null;
  const zonaSel = indirizzoSel ? zone.find((z) => z.id === indirizzoSel.id_zona) ?? null : null;
  const costoConsegna = tipo === "domicilio" && zonaSel ? zonaSel.costo_consegna : 0;
  const sottoMinimo = tipo === "domicilio" && zonaSel != null && righe.length > 0 && totale < zonaSel.minimo_ordine;
  const fuoriZona = tipo === "domicilio" && indirizzoSel != null && !indirizzoSel.id_zona;
  const quantitaDigitata = Math.max(1, parseInt(digitato || "1", 10) || 1);

  function toccaProdotto(p: ProdottoMenu) {
    setEsito(null);
    const gruppiMenu = gruppiPacchetto(pacchetti, p.id);
    if (gruppiMenu.length > 0) { setMenuAperto({ p, gruppi: gruppiMenu, scelte: gruppiMenu.map(() => []), passo: 0 }); return; }
    const cat = categorie.find((c) => c.id === p.id_categoria);
    const r = nuovaRiga(p, cat, quantitaDigitata, [], listino);
    setRighe((prev) => aggiungiRiga(prev, r));
    setSelezionata(r.chiave);
    setFigliaSel(null);
    setDigitato("");
  }

  // Una scelta dentro il menu aperto: si riempie il gruppo del passo corrente, poi si passa al prossimo.
  function toccaScelta(p: ProdottoMenu) {
    if (!menuAperto) return;
    const { gruppi: gm, scelte, passo } = menuAperto;
    const g = gm[passo];
    const gia = scelte[passo].findIndex((x) => x.id === p.id);
    let nuove = scelte[passo];
    if (g.quantita === 1) nuove = gia >= 0 ? [] : [p];
    else if (nuove.length < g.quantita) nuove = [...nuove, p];
    else return;
    const tutte = scelte.map((s, i) => (i === passo ? nuove : s));
    const prossimo = nuove.length === g.quantita && passo + 1 < gm.length ? passo + 1 : passo;
    setMenuAperto({ ...menuAperto, scelte: tutte, passo: prossimo });
  }
  function togliScelta(passo: number, i: number) {
    if (!menuAperto) return;
    setMenuAperto({ ...menuAperto, scelte: menuAperto.scelte.map((s, j) => (j === passo ? s.filter((_x, k) => k !== i) : s)), passo });
  }
  function confermaMenu() {
    if (!menuAperto || !menuCompleto(menuAperto.gruppi, menuAperto.scelte)) return;
    const cat = categorie.find((c) => c.id === menuAperto.p.id_categoria);
    const r = nuovaRiga(menuAperto.p, cat, quantitaDigitata, [], listino, figlieDaScelte(menuAperto.gruppi, menuAperto.scelte, categorie));
    setRighe((prev) => aggiungiRiga(prev, r));
    setSelezionata(r.chiave);
    setFigliaSel(null);
    setDigitato("");
    setMenuAperto(null);
  }

  // Tavolo = listino L2 (sala), tutto il resto L1: cambiando tipo si riprezzano le righe già in comanda.
  function cambiaTipo(t: Tipo) {
    setTipo(t);
    setRighe((prev) => riprezzaRighe(prev, prodotti, t === "tavolo" ? "tavolo" : "asporto"));
  }

  function toccaRiga(r: RigaOrdine) {
    if (selezionata === r.chiave && !modoVarianti) { setModoVarianti(true); return; }
    setSelezionata(r.chiave); setFigliaSel(null);
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
    const alterna = (vs: Variazione[]) => vs.some((x) => x.nome === nuova.nome && x.tipo === nuova.tipo)
      ? vs.filter((x) => !(x.nome === nuova.nome && x.tipo === nuova.tipo)) : [...vs, nuova];
    let variazioni = rigaSel.variazioni;
    let nuoveFiglie: RigaFiglia[] | undefined = rigaSel.figlie;
    let idxFiglia = figliaSel ?? 0;
    if (figliaAttiva && rigaSel.figlie) {
      // la variante va sulla pizza scelta; se nel menu ce ne sono due uguali si stacca quella sola
      const f = figliaAttiva;
      const resto = rigaSel.figlie.filter((x) => x !== f);
      const una: RigaFiglia = { ...f, quantita: 1, variazioni: alterna(f.variazioni) };
      nuoveFiglie = f.quantita > 1 ? [...resto, { ...f, quantita: f.quantita - 1 }, una] : [...resto, una];
      idxFiglia = nuoveFiglie.length - 1;
    } else {
      variazioni = alterna(rigaSel.variazioni);
    }
    const chiave = chiaveRiga(rigaSel.id_prodotto, variazioni, nuoveFiglie);
    setRighe((prev) => {
      let out = prev;
      if (rigaSel.quantita > 1) {
        out = out.map((r) => (r.chiave === rigaSel.chiave ? { ...r, quantita: r.quantita - 1 } : r));
        return aggiungiRiga(out, { ...rigaSel, quantita: 1, variazioni, figlie: nuoveFiglie, chiave });
      }
      out = out.filter((r) => r.chiave !== rigaSel.chiave);
      return aggiungiRiga(out, { ...rigaSel, variazioni, figlie: nuoveFiglie, chiave });
    });
    setSelezionata(chiave);
    setFigliaSel(nuoveFiglie ? idxFiglia : null);
  }

  function tasto(k: string) {
    if (k === "C") { setDigitato(""); return; }
    setDigitato((d) => (d + k).replace(/^0+(?=\d)/, "").slice(0, 3));
  }

  function svuota() { setRighe([]); setSelezionata(null); setModoVarianti(false); setDigitato(""); setNote(""); setEsito(null); setErrore(null); setMenuAperto(null); setFigliaSel(null); }

  async function invia() {
    setErrore(null); setInvio(true);
    const pOra = giorno && ora ? new Date(`${giorno}T${ora}:00`).toISOString() : null;
    const { data, error } = await supabaseBrowser().rpc("ordine_da_cassa3", {
      p_tipo: tipo, p_righe: righePerInvio(righe),
      p_id_tavolo: tipo === "tavolo" ? idTavolo : null, p_id_cliente: cliente?.id || null, p_note: note || null,
      p_id_indirizzo: tipo === "domicilio" ? idIndirizzo : null, p_ora: pOra,
    });
    setInvio(false);
    if (error) { setErrore("Non sono riuscito a inviare l'ordine: " + error.message); return; }
    const r = data as { esito: string; numero?: number; libere?: number; motivo?: string; minimo?: number; zona?: string; costo_consegna?: number; dalle?: string; alle?: string; slot?: string };
    const quando = pOra ? ` per ${giorniScelta.find((g) => g.v === giorno)?.t.toLowerCase() ?? giorno} alle ${ora}` : "";
    if (r.esito === "accettato") { svuota(); setGiorno(""); setOra(""); setEsito(`Ordine n. ${r.numero} inviato in cucina${quando}${r.zona ? ` · ${r.zona}, consegna ${euro(Number(r.costo_consegna))}` : ""}.`); }
    else if (r.esito === "pieno" && r.motivo === "consegne") setErrore(`Quarto d'ora pieno per le consegne${pOra ? ` alle ${ora}` : ""}: scegli un altro orario o un rider in più.`);
    else if (r.esito === "pieno") setErrore(`Quarto d'ora pieno in cucina${pOra ? ` alle ${ora}` : ""}${r.libere !== undefined ? `: ci stanno ancora ${r.libere} pizze` : ""}. Scegli un altro orario.`);
    else if (r.esito === "minimo") setErrore(`Sotto il minimo a domicilio (${euro(Number(r.minimo))}): mancano ${euro(Number(r.minimo) - totale)}.`);
    else if (r.esito === "fuori_zona") setErrore("Indirizzo fuori dalle zone di consegna: non consegniamo lì.");
    else if (r.esito === "manca_indirizzo") setErrore("Serve l'indirizzo di consegna: aprilo da Dati cliente.");
    else if (r.esito === "fuori_orario") setErrore(`A quest'ora ${tipo === "domicilio" ? "non si consegna" : tipo === "ritiro" ? "non si ritira" : "la cucina è chiusa"}${r.dalle ? ` (${tipo === "domicilio" ? "consegna" : tipo === "ritiro" ? "ritiro" : "apertura"} ${r.dalle.slice(0, 5)}–${r.alle?.slice(0, 5)})` : ""}: scegli giorno e ora qui sotto.`);
    else if (r.esito === "ora_passata") setErrore("L'orario scelto è già passato.");
    else setErrore("Ordine non inserito (" + r.esito + "). Chiedi a Edoardo.");
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
            {menuAperto ? `${menuAperto.p.nome} · ${menuAperto.gruppi[menuAperto.passo]?.etichetta ?? ""}` : modoVarianti ? `Varianti · ${figliaAttiva ? figliaAttiva.descrizione + " (" + (rigaSel?.descrizione ?? "") + ")" : rigaSel?.descrizione ?? ""}` : catCorrente?.nome}
          </span>
          <span style={{ flex: 1 }} />
          {esito && <span style={{ color: "var(--ok)", fontWeight: 600 }}>{esito}</span>}
        </div>

        {menuAperto ? (
          <>
            {/* I passi del menu: «Scegli le 2 pizze» → «Scegli la bibita», come online (SCEGLI LA PIZZA 2–2). */}
            <div style={{ display: "grid", gridTemplateColumns: `auto repeat(${menuAperto.gruppi.length}, 1fr) auto`, gap: 4, padding: 6, background: "#eceae4" }}>
              <button className="tessera" onClick={() => setMenuAperto(null)} style={{ minHeight: 40, padding: "6px 14px", fontSize: 12, background: "#2d7ff9", color: "#fff" }}>← Annulla</button>
              {menuAperto.gruppi.map((g, i) => (
                <button key={g.id} className="tessera" onClick={() => setMenuAperto({ ...menuAperto, passo: i })} style={{
                  minHeight: 40, padding: "6px 4px", fontSize: 12, background: menuAperto.scelte[i].length === g.quantita ? "#9ad36a" : "#ffe08a",
                  outline: i === menuAperto.passo ? "3px solid #1d1b17" : "none", outlineOffset: -3, flexDirection: "column", gap: 2,
                }}>
                  <span>{g.etichetta}</span>
                  <span style={{ fontWeight: 500, textTransform: "none", fontSize: 11 }}>{menuAperto.scelte[i].length === 0 ? `${menuAperto.scelte[i].length}/${g.quantita}` : menuAperto.scelte[i].map((x) => x.nome).join(", ")}</span>
                </button>
              ))}
              <button className="tessera primario" onClick={confermaMenu} disabled={!menuCompleto(menuAperto.gruppi, menuAperto.scelte)} style={{ minHeight: 40, padding: "6px 14px", fontSize: 12 }}>
                In comanda · {euro(prezzoDi(menuAperto.p, listino) * quantitaDigitata)}
              </button>
            </div>
            {menuAperto.p.incluso && <div style={{ padding: "4px 10px", fontSize: 13, color: "var(--muto)" }}>Inclusi nel menu: <b>{menuAperto.p.incluso}</b></div>}
            <div className="scorri" style={{ flex: 1, padding: 6, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, alignContent: "start" }}>
              {(() => {
                const g = menuAperto.gruppi[menuAperto.passo];
                const scelte = menuAperto.scelte[menuAperto.passo];
                return prodotti.filter((p) => g.scelte.includes(p.id)).map((p) => {
                  const n = scelte.filter((x) => x.id === p.id).length;
                  return (
                    <button key={p.id} className="tessera" onClick={() => toccaScelta(p)} style={{ background: n > 0 ? "#ffe08a" : chiaro(categorie.find((c) => c.id === p.id_categoria)?.colore), flexDirection: "column", gap: 4, position: "relative" }}>
                      <span>{p.nome}</span>
                      {n > 0 && <span style={{ position: "absolute", top: 4, right: 6, fontSize: 12, fontWeight: 800 }}>{g.quantita > 1 ? `×${n}` : "✓"}</span>}
                      {n > 0 && g.quantita > 1 && <span onClick={(e) => { e.stopPropagation(); togliScelta(menuAperto.passo, scelte.findIndex((x) => x.id === p.id)); }} style={{ fontWeight: 500, fontSize: 11, textTransform: "none", textDecoration: "underline" }}>togli una</span>}
                    </button>
                  );
                });
              })()}
            </div>
          </>
        ) : !modoVarianti ? (
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
                  <span style={{ fontWeight: 500, fontSize: 12, textTransform: "none", opacity: .8 }}>{prezzoDi(p, listino) > 0 ? euro(prezzoDi(p, listino)) : "da impostare"}</span>
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
            {figlie.length > 0 && (
              <div style={{ display: "flex", gap: 4, padding: "6px 6px 0", flexWrap: "wrap" }}>
                <span className="muto" style={{ fontSize: 12, alignSelf: "center" }}>Su quale:</span>
                {figlie.map((f, i) => (
                  <button key={i} onClick={() => setFigliaSel(i)} style={{ padding: "4px 10px", fontSize: 13, outline: (figliaSel ?? 0) === i ? "3px solid #1d1b17" : "none", outlineOffset: -3 }}>
                    {f.quantita > 1 ? `${f.quantita}× ` : ""}{f.descrizione}{f.variazioni.length > 0 ? ` (${f.variazioni.map((v) => v.nome).join(", ")})` : ""}
                  </button>
                ))}
              </div>
            )}
            <div className="scorri" style={{ flex: 1, padding: 6, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, alignContent: "start" }}>
              <button className="tessera" onClick={() => setSegno("con")} style={{ background: "#f39c2b", outline: segno === "con" ? "3px solid #1d1b17" : "none", outlineOffset: -3 }}>CON</button>
              <button className="tessera" onClick={() => setSegno("senza")} style={{ background: "#f39c2b", outline: segno === "senza" ? "3px solid #1d1b17" : "none", outlineOffset: -3 }}>SENZA</button>
              {variantiSel.filter((v) => v.gruppo === gruppoAttivo).map((v) => {
                const nome = segno === "con" ? v.nome : "senza " + v.nome;
                const on = (figliaAttiva ? figliaAttiva.variazioni : rigaSel?.variazioni ?? []).some((x) => x.nome === nome);
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
            <button key={t.v} onClick={() => cambiaTipo(t.v)} className={tipo === t.v ? "primario" : ""} style={{ padding: "8px 2px", fontSize: 13 }}>{t.t}</button>
          ))}
        </div>
        {cliente && (
          <div style={{ margin: "0 6px 6px", padding: "6px 10px", borderRadius: 8, background: "#fff3f4", fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
            <span>📞</span>
            <div style={{ flex: 1 }}>
              <b>{cliente.nome ?? "Nuovo cliente"}</b> · {cliente.telefono}
              {cliente.indirizzo && <div className="muto" style={{ fontSize: 12 }}>{cliente.indirizzo}</div>}
            </div>
            <button onClick={() => setCliente(null)} style={{ padding: "2px 8px" }}>✕</button>
          </div>
        )}
        {tipo === "domicilio" && (
          <div style={{ margin: "0 6px 6px" }}>
            {indirizzi.length > 0 ? (
              <select value={idIndirizzo ?? ""} onChange={(e) => setIdIndirizzo(e.target.value || null)} style={{ width: "100%", padding: 8, fontSize: 15 }}>
                <option value="">Scegli l&apos;indirizzo</option>
                {indirizzi.map((i) => {
                  const z = zone.find((x) => x.id === i.id_zona);
                  return <option key={i.id} value={i.id}>{i.via} {i.civico ?? ""} · {z ? `${z.nome} (${euro(z.costo_consegna)})` : "fuori zona"}</option>;
                })}
              </select>
            ) : (
              <Link href={cliente?.telefono ? `/cassa/cliente?telefono=${encodeURIComponent(cliente.telefono)}` : "/cassa/cliente"} style={{ textDecoration: "none" }}>
                <button style={{ width: "100%", color: "var(--accento)", fontWeight: 600 }}>Serve l&apos;indirizzo: apri Dati cliente</button>
              </Link>
            )}
            {fuoriZona && <div style={{ color: "var(--accento)", fontWeight: 700, fontSize: 13, marginTop: 4 }}>Fuori dalle zone di consegna.</div>}
            {sottoMinimo && zonaSel && <div style={{ color: "var(--accento)", fontWeight: 700, fontSize: 13, marginTop: 4 }}>Minimo d&apos;ordine {euro(zonaSel.minimo_ordine)}: mancano {euro(zonaSel.minimo_ordine - totale)}.</div>}
          </div>
        )}
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
                {(r.figlie ?? []).map((f, i) => (
                  <span key={"f" + i} style={{ display: "block", fontSize: 13, paddingLeft: 10 }}>
                    ↳ {f.quantita > 1 ? `${f.quantita}× ` : ""}{f.descrizione}
                    {f.variazioni.map((v, j) => (
                      <span key={j} style={{ display: "block", paddingLeft: 14, color: v.tipo === "rimozione" ? "var(--accento)" : "var(--muto)" }}>
                        {v.tipo === "rimozione" ? v.nome : "+ " + v.nome}{v.prezzo > 0 ? ` (${euro(v.prezzo)})` : ""}
                      </span>
                    ))}
                  </span>
                ))}
                {r.figlie && (() => { const p = prodotti.find((x) => x.id === r.id_prodotto); return p?.incluso ? <span style={{ display: "block", fontSize: 12, paddingLeft: 10, color: "var(--muto)" }}>+ {p.incluso}</span> : null; })()}
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

        {tipo !== "tavolo" && (
          <div style={{ display: "flex", gap: 4, margin: "0 6px 6px" }}>
            <button onClick={() => { setGiorno(""); setOra(""); }} className={!giorno ? "primario" : ""} style={{ padding: "6px 10px", fontSize: 13 }}>Adesso</button>
            <select value={giorno} onChange={(e) => { setGiorno(e.target.value); setOra(""); }} style={{ flex: 1, padding: 6, fontSize: 14 }}>
              <option value="">Giorno…</option>
              {giorniScelta.map((g) => <option key={g.v} value={g.v}>{g.t}</option>)}
            </select>
            <select value={ora} onChange={(e) => setOra(e.target.value)} disabled={!giorno} style={{ flex: 1, padding: 6, fontSize: 14 }}>
              <option value="">Ora…</option>
              {quartiScelta.map((q) => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>
        )}
        <input placeholder="Note (es. ben cotta)" value={note} onChange={(e) => setNote(e.target.value)} style={{ margin: "0 6px 6px", padding: 8, fontSize: 14 }} />
        {errore && (
          <div role="alert" style={{ margin: "0 6px 6px", padding: "10px 12px", borderRadius: 10, background: "#fff3f4", border: "2px solid var(--accento)", color: "var(--accento)", fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>
            {errore}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 6px 6px" }}>
          <button onClick={svuota} disabled={righe.length === 0}>Svuota</button>
          <span style={{ flex: 1, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
            {costoConsegna > 0 && <span className="muto" style={{ display: "block", fontSize: 12 }}>+ consegna {euro(costoConsegna)}</span>}
            <span style={{ fontSize: 26, fontWeight: 800 }}>{euro(totale + costoConsegna)}</span>
          </span>
        </div>
        <button onClick={invia} className="primario" disabled={invio || righe.length === 0 || (tipo === "tavolo" && !idTavolo) || (tipo === "domicilio" && (!idIndirizzo || fuoriZona || sottoMinimo)) || (!!giorno && !ora)} style={{ margin: 6, padding: 16, fontSize: 18, fontWeight: 800, borderRadius: 10 }}>
          {invio ? "Invio…" : "Invia in cucina"}
        </button>
      </aside>
    </div>
  );
}

function isoLocale(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function oggiISO() { return isoLocale(new Date()); }

/** Il colore della categoria, schiarito per le tessere dei prodotti. */
function chiaro(hex: string | null | undefined) {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return "#f4f2ec";
  const n = parseInt(hex.slice(1), 16);
  const m = (c: number) => Math.round(c + (255 - c) * 0.45);
  return `rgb(${m(n >> 16)}, ${m((n >> 8) & 255)}, ${m(n & 255)})`;
}
