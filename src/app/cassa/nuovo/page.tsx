"use client";

// La cassa del ragazzo, a tutto schermo e touch, come la schermata della cassa vera:
// barra delle categorie colorate in alto, griglia di tessere grandi, comanda a destra con
// tastierino (il numero digitato è la quantità del prossimo tocco), varianti CON / SENZA a gruppi.
// Passa dalla stessa capacità di app, sito e totem (funzione ordine_da_cassa).
import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";
import "./nuovo.css";
import {
  aggiungiRiga, chiaveRiga, euro, figlieDaScelte, gruppiDi, gruppiPacchetto, gruppiPerCategoria, leggiMenu, menuCompleto, nuovaRiga, prezzoDi, prezzoRiga, righePerInvio, riprezzaRighe, totaleRighe, variantiPer,
  type CategoriaMenu, type GruppoCategoria, type PacchettoGruppo, type ProdottoMenu, type RigaFiglia, type RigaOrdine, type VarianteMenu,
  esaurito,
} from "@/lib/menu";
import type { Variazione } from "@/lib/types";
import MiniMappa from "@/components/MiniMappa";

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
  const [scorsa, setScorsa] = useState<string | null>(null);   // la riga scorsa a sinistra, che mostra «Elimina»
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
  type Indirizzo = { id: string; via: string; civico: string | null; id_zona: string | null; lat?: number | null; lng?: number | null };
  type Zona = { id: string; nome: string; costo_consegna: number; minimo_ordine: number };
  const [indirizzi, setIndirizzi] = useState<Indirizzo[]>([]);
  const [idIndirizzo, setIdIndirizzo] = useState<string | null>(null);
  const [zone, setZone] = useState<Zona[]>([]);
  // Come paga (mig. 0024): contanti con «paga con» (il rider porta il resto), POS, o già pagato online.
  const [pagamento, setPagamento] = useState<"contanti" | "pos" | "online" | null>(null);
  const [pagaCon, setPagaCon] = useState("");
  // Il coupon (mig. 0026): si batte il codice, si verifica sul carrello, lo sconto si vede nel totale e si applica all'ordine accettato.
  const [codiceCoupon, setCodiceCoupon] = useState("");
  const [coupon, setCoupon] = useState<{ codice: string; nome: string; sconto: number } | null>(null);
  const [erroreCoupon, setErroreCoupon] = useState<string | null>(null);
  // Lo sconto manuale (mig. 0039, REA 13 A.3: in Velocissimo ~190 volte al mese): in euro o in
  // percentuale, si vede nel totale e si applica all'ordine accettato con ordine_sconto_manuale.
  const [scontoTesto, setScontoTesto] = useState("");
  const [scontoPct, setScontoPct] = useState(false);
  const [esito, setEsito] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);
  // Quando: «adesso» oppure giorno + quarto d'ora, dentro l'orario del tipo (mig. 0022: domicilio 19:00–22:30,
  // ritiro 19:00–22:45, 7 giorni avanti come online). Un ordine telefonico «per domani alle 20» si prende qui.
  type Orario = { tipo: string; dalle: string; alle: string };
  const [idNegozio, setIdNegozio] = useState<string | null>(null);
  const [preordiniGiorni, setPreordiniGiorni] = useState(7);
  const [giorno, setGiorno] = useState<string>("");          // "" = adesso
  const [nomeCliente, setNomeCliente] = useState("");         // chi ritira, quando non c'è una scheda cliente (critico giro 10: C-24 senza nome)
  const [ora, setOra] = useState<string>("");                // "HH:MM"
  const [orari, setOrari] = useState<Orario[]>([]);
  // Modifica con ristampa (mig. 0038, come in Velocissimo): con ?modifica=<id> si riapre un ordine già
  // battuto, si cambiano le righe e la comanda si ristampa con la scritta MODIFICATA. Il tipo non cambia.
  const [modifica, setModifica] = useState<{ id: string; numero: string; bloccata?: boolean; sconto?: number; costo_consegna?: number } | null>(null);
  // giro 8 del grafico: sul telefono (≤ 600 px) la comanda è un pannello in fondo che si apre dalla maniglia;
  // sul PC e sul tablet non cambia niente (la classe non ha effetto).
  const [comandaAperta, setComandaAperta] = useState(false);

  // La comanda battuta resta anche se si va a Dati cliente e si torna (critico giro 5: «cancella la comanda»).
  const BOZZA = "cassa:bozza";
  useEffect(() => {
    try {
      const b = JSON.parse(sessionStorage.getItem(BOZZA) ?? "null") as { righe: RigaOrdine[]; tipo: Tipo; note: string; quando: number } | null;
      if (b && b.righe.length > 0 && Date.now() - b.quando < 30 * 60_000) { setRighe(b.righe); setTipo(b.tipo); setNote(b.note); }
    } catch {}
  }, []);
  useEffect(() => {
    if (modifica || new URLSearchParams(window.location.search).get("modifica")) return;
    try {
      if (righe.length === 0) sessionStorage.removeItem(BOZZA);
      else sessionStorage.setItem(BOZZA, JSON.stringify({ righe, tipo, note, quando: Date.now() }));
    } catch {}
  }, [righe, tipo, note, modifica]);

  // L'ordine da modificare: righe (figlie dei menu comprese: in tabella la loro quantità è già moltiplicata
  // per quella del padre, qui si ridivide), tipo, note e cliente. La bozza eventuale si lascia stare.
  useEffect(() => {
    const idMod = new URLSearchParams(window.location.search).get("modifica");
    if (!idMod) return;
    type RigaDb = { id: string; id_prodotto: string | null; descrizione: string; quantita: number; prezzo_unit: number; variazioni: Variazione[] | null; destinazione: "cucina" | "cassa" | "nessuna"; id_riga_padre: string | null };
    supabaseBrowser().from("ordine")
      .select("id, numero, numero_visibile, tipo, note, stato, id_tavolo, id_indirizzo, sconto, costo_consegna, cliente(id, nome, telefono), ordine_riga(id, id_prodotto, descrizione, quantita, prezzo_unit, variazioni, destinazione, id_riga_padre)")
      .eq("id", idMod).single()
      .then(({ data, error }) => {
        if (error || !data) { setErrore("Non trovo l'ordine da modificare."); return; }
        const o = data as unknown as { id: string; numero: number; numero_visibile: string | null; tipo: Tipo; note: string | null; stato: string; id_tavolo: string | null; id_indirizzo: string | null; sconto: number | null; costo_consegna: number | null; cliente: { id: string; nome: string | null; telefono: string } | null; ordine_riga: RigaDb[] };
        if (!["ricevuto", "in_preparazione", "pronto"].includes(o.stato)) {
          // la pagina resta «in modifica» ma bloccata: un tocco su Invia non deve fare un ordine nuovo (critico giro 12)
          setModifica({ id: o.id, numero: o.numero_visibile ?? `#${o.numero}`, bloccata: true });
          setErrore(`L'ordine ${o.numero_visibile ?? "#" + o.numero} è ${o.stato}: non si modifica più, si annulla e si rifà.`);
          return;
        }
        const padri = o.ordine_riga.filter((r) => !r.id_riga_padre);
        const nuove: RigaOrdine[] = padri.map((r) => {
          const q = Number(r.quantita) || 1;
          const figlie = o.ordine_riga.filter((x) => x.id_riga_padre === r.id).map((x) => ({
            id_prodotto: x.id_prodotto ?? "", descrizione: x.descrizione, quantita: Math.max(1, Math.round(Number(x.quantita) / q)),
            prezzo_unit: Number(x.prezzo_unit), variazioni: x.variazioni ?? [], destinazione: x.destinazione,
          }));
          return {
            chiave: chiaveRiga(r.id_prodotto ?? r.descrizione, r.variazioni ?? [], figlie) + ":" + r.id,
            id_prodotto: r.id_prodotto ?? "", descrizione: r.descrizione, quantita: q, prezzo_unit: Number(r.prezzo_unit),
            variazioni: r.variazioni ?? [], destinazione: r.destinazione, ...(figlie.length > 0 ? { figlie } : {}),
          };
        });
        setModifica({ id: o.id, numero: o.numero_visibile ?? `#${o.numero}`, sconto: Number(o.sconto ?? 0), costo_consegna: Number(o.costo_consegna ?? 0) });
        setRighe(nuove); setTipo(o.tipo); setNote(o.note ?? ""); setIdTavolo(o.id_tavolo); setIdIndirizzo(o.id_indirizzo);
        if (o.cliente) setCliente({ id: o.cliente.id, nome: o.cliente.nome, telefono: o.cliente.telefono, indirizzo: null });
      });
  }, []);

  useEffect(() => {
    const tel = new URLSearchParams(window.location.search).get("telefono");
    if (!tel) return;
    supabaseBrowser().rpc("cerca_cliente", { p_telefono: tel }).then(({ data }) => {
      const s = data as { esito: string; cliente?: { id: string; nome: string | null; telefono: string }; indirizzi?: Indirizzo[] } | null;
      if (s?.esito === "trovato" && s.cliente) {
        // dalla scheda appena salvata si arriva con l'indirizzo scelto (?indirizzo=)
        const voluto = new URLSearchParams(window.location.search).get("indirizzo");
        const i = s.indirizzi?.find((x) => x.id === voluto) ?? s.indirizzi?.[0];
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
        supabaseBrowser().from("tavolo").select("id, numero, stato").eq("attivo", true).order("numero"),
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

  // I quarti d'ora per il domicilio, col posto e la consegna già presa più vicina a questo indirizzo
  // (mig. 0052): in giallo dove c'è una consegna entro 1,5 km, così si propone la doppia allo stesso
  // rider (Edoardo, 25/10/2026). Due ordini restano due consegne: qui si suggerisce e basta.
  type FasciaVicina = { ora: string; pizze_max: number; pizze_occupate: number; consegne_max: number; consegne_occupate: number; bloccata_produzione: boolean; bloccata_consegne: boolean; vicina_metri: number | null; vicina_numero: string | null; vicina_id?: string | null; vicina_lat?: number | null; vicina_lng?: number | null; vicina_minuti?: number | null };
  const [fasceVicine, setFasceVicine] = useState<FasciaVicina[]>([]);
  useEffect(() => {
    const ind = indirizzi.find((i) => i.id === idIndirizzo);
    if (tipo !== "domicilio" || !idNegozio || ind?.lat == null || ind?.lng == null) { setFasceVicine([]); return; }
    supabaseBrowser().rpc("fasce_con_vicine", { p_negozio: idNegozio, p_giorno: giorno || oggiISO(), p_lat: ind.lat, p_lng: ind.lng })
      .then(async ({ data }) => {
        const fasce = ((data ?? []) as FasciaVicina[]).map((f) => ({ ...f, ora: String(f.ora).slice(0, 5) }));
        setFasceVicine(fasce);
        // Poi i minuti veri per strada (Edoardo, 25/10/2026: «la cosa vera da migliorare è Google Maps»):
        // due vie vicine in linea d'aria possono stare di là da un binario o da un senso unico. Si chiedono
        // una volta sola, per le consegne entro 3 km in linea d'aria, dall'indirizzo di questo cliente.
        const cand = [...new Map(fasce.filter((f) => f.vicina_id && f.vicina_lat != null && f.vicina_metri != null && f.vicina_metri <= 3000)
          .map((f) => [f.vicina_id!, { lat: f.vicina_lat!, lng: f.vicina_lng! }])).entries()].slice(0, 10);
        if (!cand.length) return;
        const r = await fetch("/api/indirizzi/tempi", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ origini: [{ lat: ind.lat, lng: ind.lng }], destinazioni: cand.map(([, p]) => p) }) }).catch(() => null);
        const t = r?.ok ? ((await r.json()) as { fonte: string; minuti: (number | null)[][] }) : null;
        if (!t || t.fonte !== "google") return;   // senza Google resta la linea d'aria di prima
        const minDi = new Map(cand.map(([id], j) => [id, t.minuti[0][j]]));
        setFasceVicine(fasce.map((f) => ({ ...f, vicina_minuti: f.vicina_id ? minDi.get(f.vicina_id) ?? null : null })));
      });
  }, [tipo, idNegozio, idIndirizzo, indirizzi, giorno]);
  const VICINA_M = 1500;
  const VICINA_MIN = 5;   // per strada: entro 5 minuti di motorino è una doppia

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
  const scontoNum = Number(scontoTesto.replace(",", ".")) || 0;
  const scontoManuale = scontoNum <= 0 ? 0 : Math.round((scontoPct ? totale * Math.min(scontoNum, 100) / 100 : Math.min(scontoNum, totale)) * 100) / 100;
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

  // Edoardo, 25/10/2026: «metto una pizza e la voglio eliminare»: la ✕ su ogni riga e lo scorrere a sinistra
  // tolgono quella riga senza doverla prima selezionare. «Togli» sotto resta per chi ci è abituato.
  function eliminaRiga(chiave: string) {
    setRighe((prev) => prev.filter((r) => r.chiave !== chiave));
    if (selezionata === chiave) { setSelezionata(null); setModoVarianti(false); }
    setScorsa(null);
  }
  const inizioScorri = useRef<{ chiave: string; x: number } | null>(null);
  const appenaScorsa = useRef(0);   // critico giro 26: il click dopo il trascinamento richiudeva «Elimina»

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
      const pos = rigaSel.figlie.indexOf(f);
      nuoveFiglie = f.quantita > 1
        ? [...rigaSel.figlie.slice(0, pos), { ...f, quantita: f.quantita - 1 }, una, ...rigaSel.figlie.slice(pos + 1)]
        : [...rigaSel.figlie.slice(0, pos), una, ...rigaSel.figlie.slice(pos + 1)];
      idxFiglia = f.quantita > 1 ? pos + 1 : pos;
      void resto;
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

  async function verificaCoupon() {
    setErroreCoupon(null); setCoupon(null);
    if (!codiceCoupon.trim()) return;
    const pOra = giorno && ora ? new Date(`${giorno}T${ora}:00`).toISOString() : null;
    const { data, error } = await supabaseBrowser().rpc("coupon_verifica", { p_codice: codiceCoupon, p_id_cliente: cliente?.id || null, p_tipo: tipo, p_righe: righePerInvio(righe), p_ora: pOra });
    if (error) { setErroreCoupon(error.message); return; }
    const r = data as { esito: string; codice?: string; nome?: string; sconto?: number; minimo?: number; dalle?: string; alle?: string; tipi?: string[]; servono?: number; hai?: number };
    const msg: Record<string, string> = {
      non_trovato: "Codice non trovato.", gia_usato: "Coupon già usato.", scaduto: "Coupon scaduto.", non_ancora_valido: "Coupon non ancora valido.",
      non_attivo: "Coupon spento.", esaurito: "Coupon esaurito.", black_list: "Cliente in black list.", solo_primo_ordine: "Vale solo per il primo ordine.",
      serve_cliente: "Serve il cliente: aprilo da Dati cliente.",
    };
    if (r.esito === "ok") setCoupon({ codice: r.codice!, nome: r.nome!, sconto: Number(r.sconto) });
    else if (r.esito === "minimo") setErroreCoupon(`Vale da ${euro(Number(r.minimo))} in su.`);
    else if (r.esito === "fuori_fascia") setErroreCoupon(`Vale dalle ${r.dalle?.slice(0, 5)} alle ${r.alle?.slice(0, 5)}.`);
    else if (r.esito === "solo_tipi") setErroreCoupon(`Vale solo per ${(r.tipi ?? []).join(" e ")}.`);
    else if (r.esito === "punti") setErroreCoupon(`Servono ${r.servono} punti, ne ha ${r.hai}.`);
    else setErroreCoupon(msg[r.esito] ?? `Coupon non applicabile (${r.esito}).`);
  }

  function svuota() { setRighe([]); setSelezionata(null); setModoVarianti(false); setDigitato(""); setNote(""); setNomeCliente(""); setEsito(null); setErrore(null); setMenuAperto(null); setFigliaSel(null); setCoupon(null); setCodiceCoupon(""); setErroreCoupon(null); setScontoTesto(""); setScontoPct(false); }

  async function salvaModifica() {
    if (!modifica) return;
    setErrore(null); setInvio(true);
    const { data, error } = await supabaseBrowser().rpc("ordine_modifica", { p_id: modifica.id, p_righe: righePerInvio(righe), p_note: note || null });
    setInvio(false);
    if (error) { setErrore("Non sono riuscito a salvare la modifica: " + error.message); return; }
    const r = data as { esito: string; stato?: string };
    if (r.esito === "modificato") { window.location.href = `/cassa/comanda/${modifica.id}?stampa=1`; return; }
    if (r.esito === "stato_non_modificabile") setErrore(`L'ordine è ${r.stato}: non si modifica più, si annulla e si rifà.`);
    else setErrore("Modifica non salvata (" + r.esito + ").");
  }

  async function invia() {
    if (modifica) return salvaModifica();
    setErrore(null); setInvio(true);
    const pOra = giorno && ora ? new Date(`${giorno}T${ora}:00`).toISOString() : null;
    const { data, error } = await supabaseBrowser().rpc("ordine_da_cassa3", {
      p_tipo: tipo, p_righe: righePerInvio(righe),
      p_id_tavolo: tipo === "tavolo" ? idTavolo : null, p_id_cliente: cliente?.id || null, p_note: note || null,
      p_id_indirizzo: tipo === "domicilio" ? idIndirizzo : null, p_ora: pOra,
    });
    setInvio(false);
    if (error) { setErrore("Non sono riuscito a inviare l'ordine: " + error.message); return; }
    const r = data as { esito: string; id?: string; numero?: number; libere?: number; motivo?: string; minimo?: number; zona?: string; costo_consegna?: number; dalle?: string; alle?: string; slot?: string; massimo?: number };
    const quando = pOra ? ` per ${giorniScelta.find((g) => g.v === giorno)?.t.toLowerCase() ?? giorno} alle ${ora}` : "";
    if (r.esito === "accettato" && r.id && !cliente && nomeCliente.trim()) {
      await supabaseBrowser().rpc("ordine_nome", { p_id: r.id, p_nome: nomeCliente.trim() });
    }
    if (r.esito === "accettato" && r.id && coupon) {
      const { data: ca } = await supabaseBrowser().rpc("coupon_applica", { p_id_ordine: r.id, p_codice: coupon.codice });
      const x = ca as { esito: string } | null;
      if (x?.esito !== "applicato") setErroreCoupon(`Ordine inviato ma coupon NON applicato (${x?.esito ?? "errore"}).`);
    }
    if (r.esito === "accettato" && r.id && scontoManuale > 0) {
      const { data: sc } = await supabaseBrowser().rpc("ordine_sconto_manuale", { p_id: r.id, p_sconto: scontoManuale, p_motivo: scontoPct ? `${scontoNum}%` : null });
      const x = sc as { esito: string } | null;
      if (x?.esito !== "applicato") setErroreCoupon(`Ordine inviato ma sconto NON applicato (${x?.esito ?? "errore"}).`);
    }
    if (r.esito === "accettato" && r.id && (pagamento || pagaCon)) {
      const pc = Number(pagaCon.replace(",", "."));
      await supabaseBrowser().rpc("ordine_pagamento", { p_id: r.id, p_pagamento: pagamento === "online" ? null : pagamento, p_paga_con: pc > 0 ? pc : null, p_pagato_online: pagamento === "online" });
    }
    if (r.esito === "accettato") { svuota(); setCliente(null); setIndirizzi([]); setIdIndirizzo(null); setGiorno(""); setOra(""); setPagamento(null); setPagaCon(""); setEsito(`Ordine n. ${r.numero}${tipo === "tavolo" ? ` · tavolo ${tavoli.find((t) => t.id === idTavolo)?.numero ?? ""}` : tipo === "ritiro" && (cliente?.nome || nomeCliente.trim()) ? ` · ${cliente?.nome ?? nomeCliente.trim()}` : ""} inviato in cucina${quando} · ${euro(Math.max(0, totale + costoConsegna - (coupon?.sconto ?? 0) - scontoManuale))}${pagamento ? (pagamento === "pos" ? " POS" : pagamento === "online" ? " già pagato" : " contanti") : ""}${r.zona ? ` · ${r.zona}, consegna ${euro(Number(r.costo_consegna))}` : ""}.`); }
    else if (r.esito === "pieno" && r.motivo === "consegne") setErrore(`Quarto d'ora pieno per le consegne${pOra ? ` alle ${ora}` : ""}: scegli un altro orario o un rider in più.`);
    else if (r.esito === "pieno" && r.massimo === 0) setErrore(`Per ${pOra ? (giorniScelta.find((g) => g.v === giorno)?.t.toLowerCase() ?? giorno) : "oggi"} non sono impostati i pizzaioli (0 posti): aprì Capacità e metti quanti sono.`);
    else if (r.esito === "pieno") setErrore(`Quarto d'ora pieno in cucina${pOra ? ` alle ${ora}` : ""}${r.libere ? `: ci stanno ancora ${r.libere} pizze` : ""}. Scegli un altro orario.`);
    else if (r.esito === "minimo") setErrore(`Sotto il minimo a domicilio (${euro(Number(r.minimo))}): mancano ${euro(Number(r.minimo) - totale)}.`);
    else if (r.esito === "fuori_zona") setErrore("Indirizzo fuori dalle zone di consegna: non consegniamo lì.");
    else if (r.esito === "manca_indirizzo") setErrore("Serve l'indirizzo di consegna: aprilo da Dati cliente.");
    else if (r.esito === "fuori_orario") setErrore(`A quest'ora ${tipo === "domicilio" ? "non si consegna" : tipo === "ritiro" ? "non si ritira" : "la cucina è chiusa"}${r.dalle ? ` (${tipo === "domicilio" ? "consegna" : tipo === "ritiro" ? "ritiro" : "apertura"} ${r.dalle.slice(0, 5)}–${r.alle?.slice(0, 5)})` : ""}: scegli giorno e ora qui sopra.`);
    else if (r.esito === "ora_passata") setErrore("L'orario scelto è già passato.");
    else setErrore("Ordine non inserito (" + r.esito + "). Chiedi a Edoardo.");
  }


  return (
    <div className="schermo cassa-nuovo">
      {/* ===== Sinistra: categorie e tessere (giro 18 del grafico: le classi stanno in globals.css,
          il colore della categoria resta un dato e viaggia nella variabile --riga) ===== */}
      <div className="cn-sinistra">
        <div className="barra">
          <Link href="/cassa"><button className="ghost">⌂</button></Link>
          <Link href="/cassa/cliente"><button className="ghost">Dati cliente</button></Link>
          <button className="ghost ordine">Ordine</button>
          <Link href="/cassa/tavoli"><button className="ghost">Sala</button></Link>
          <span className="titolo">
            {menuAperto ? `${menuAperto.p.nome} · ${menuAperto.gruppi[menuAperto.passo]?.etichetta ?? ""}` : modoVarianti ? `Varianti · ${figliaAttiva ? figliaAttiva.descrizione + " (" + (rigaSel?.descrizione ?? "") + ")" : rigaSel?.descrizione ?? ""}` : catCorrente?.nome}
          </span>
          <span className="spazio" />
        </div>

        {menuAperto ? (
          <>
            {/* I passi del menu: «Scegli le 2 pizze» → «Scegli la bibita», come online (SCEGLI LA PIZZA 2–2). */}
            <div className="cn-passi">
              <button className="tessera indietro" onClick={() => setMenuAperto(null)}>← Annulla</button>
              {menuAperto.gruppi.map((g, i) => (
                <button key={g.id} className={"tessera passo colonna stretta" + (menuAperto.scelte[i].length === g.quantita ? " oro" : "") + (i === menuAperto.passo ? " corrente" : "")} onClick={() => setMenuAperto({ ...menuAperto, passo: i })}>
                  <span>{g.etichetta}</span>
                  <span className="prezzo">{menuAperto.scelte[i].length === 0 ? `${menuAperto.scelte[i].length}/${g.quantita}` : menuAperto.scelte[i].map((x) => x.nome).join(", ")}</span>
                </button>
              ))}
              <button className="tessera primario conferma" onClick={confermaMenu} disabled={!menuCompleto(menuAperto.gruppi, menuAperto.scelte)}>
                In comanda · {euro(prezzoDi(menuAperto.p, listino) * quantitaDigitata)}
              </button>
            </div>
            {menuAperto.p.incluso && <div className="cn-inclusi">Inclusi nel menu: <b>{menuAperto.p.incluso}</b></div>}
            <div className="scorri cn-griglia">
              {(() => {
                const g = menuAperto.gruppi[menuAperto.passo];
                const scelte = menuAperto.scelte[menuAperto.passo];
                return prodotti.filter((p) => g.scelte.includes(p.id)).map((p) => {
                  const n = scelte.filter((x) => x.id === p.id).length;
                  return (
                    <button key={p.id} className={"tessera colonna" + (n > 0 ? " oro" : " riga")} onClick={() => toccaScelta(p)} style={n > 0 ? undefined : striscia(categorie.find((c) => c.id === p.id_categoria)?.colore)}>
                      <span>{p.nome}</span>
                      {n > 0 && <span className="conta">{g.quantita > 1 ? `×${n}` : "✓"}</span>}
                      {n > 0 && g.quantita > 1 && <span onClick={(e) => { e.stopPropagation(); togliScelta(menuAperto.passo, scelte.findIndex((x) => x.id === p.id)); }} className="prezzo togli">togli una</span>}
                    </button>
                  );
                });
              })()}
            </div>
          </>
        ) : !modoVarianti ? (
          <>
            <div className="cn-categorie">
              {categorie.map((c) => (
                <button key={c.id} className={"tessera categoria" + (c.id === categoria ? " attiva" : " riga")} onClick={() => setCategoria(c.id)} style={c.id === categoria ? undefined : striscia(c.colore)}>{c.nome}</button>
              ))}
            </div>
            <div className="scorri cn-griglia">
              {prodotti.filter((p) => p.id_categoria === categoria).map((p) => (
                <button key={p.id} className={"tessera colonna riga" + (esaurito(p) ? " esaurito" : "")} onClick={() => toccaProdotto(p)} disabled={esaurito(p)} style={striscia(catCorrente?.colore)}>
                  <span>{p.nome}</span>
                  <span className="prezzo">{esaurito(p) ? "ESAURITO" : prezzoDi(p, listino) > 0 ? euro(prezzoDi(p, listino)) : "da impostare"}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="cn-passi">
              <button className="tessera indietro" onClick={() => setModoVarianti(false)}>← Prodotti</button>
              {gruppi.map((g) => (
                <button key={g} className={"tessera passo" + (g === gruppoAttivo ? " attiva" : "")} onClick={() => setGruppo(g)}>{g}</button>
              ))}
            </div>
            {figlie.length > 0 && (
              <div className="cn-figlie">
                <span className="muto eti">Su quale:</span>
                {figlie.map((f, i) => ({ f, i })).filter(({ f }) => gruppiPerCategoria(gruppiCat, prodotti.find((p) => p.id === f.id_prodotto)?.id_categoria ?? null).length > 0).map(({ f, i }) => (
                  <button key={i} onClick={() => setFigliaSel(i)} className={(figliaSel ?? 0) === i ? "primario" : ""}>
                    {f.quantita > 1 ? `${f.quantita}× ` : ""}{f.descrizione}{f.variazioni.length > 0 ? ` (${f.variazioni.map((v) => v.nome).join(", ")})` : ""}
                  </button>
                ))}
              </div>
            )}
            <div className="scorri cn-griglia">
              <button className={"tessera segno" + (segno === "con" ? " attiva" : " riga")} onClick={() => setSegno("con")} style={segno === "con" ? undefined : striscia("#c9973f")}>CON</button>
              <button className={"tessera segno" + (segno === "senza" ? " attiva" : " riga")} onClick={() => setSegno("senza")} style={segno === "senza" ? undefined : striscia("#c9973f")}>SENZA</button>
              {variantiSel.filter((v) => v.gruppo === gruppoAttivo).map((v) => {
                const nome = segno === "con" ? v.nome : "senza " + v.nome;
                const on = (figliaAttiva ? figliaAttiva.variazioni : rigaSel?.variazioni ?? []).some((x) => x.nome === nome);
                return (
                  <button key={v.id} className={"tessera variante colonna stretta" + (on ? " oro" : "")} onClick={() => toccaVariante(v)}>
                    <span>{v.nome}</span>
                    {segno === "con" && v.prezzo > 0 && <span className="prezzo">+ {euro(v.prezzo)}</span>}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ===== Destra: comanda, tastierino, invio ===== */}
      <aside className={"cassa-comanda" + (comandaAperta ? " aperta" : "")} style={{ display: "flex", flexDirection: "column", background: "#fff", borderLeft: "1px solid var(--bordo)", boxShadow: "-6px 0 18px rgba(26,23,21,.05)" }}>
        <button className="c-maniglia" onClick={() => setComandaAperta((a) => !a)} aria-expanded={comandaAperta}>
          <b>{righe.length} {righe.length === 1 ? "riga" : "righe"}</b>
          <span>{comandaAperta ? "Chiudi la comanda ▾" : "Apri la comanda ▴"}</span>
        </button>
        {modifica && (
          <div className="c-mod" style={{ margin: "6px 6px 0", padding: "8px 12px", borderRadius: 12, background: "var(--oro)", color: "var(--testo)", fontSize: 14, display: "flex", gap: 8, alignItems: "center" }}>
            <b style={{ fontFamily: "Oswald, sans-serif", textTransform: "uppercase", letterSpacing: ".04em" }}>Modifica {modifica.numero}</b>
            <span style={{ flex: 1 }}>{modifica.bloccata ? "non si modifica più: torna alla cassa, annulla e rifai" : "le righe qui sotto sostituiscono la comanda, che si ristampa"}</span>
            <Link href="/cassa" style={{ textDecoration: "none" }}><button style={{ padding: "2px 10px", minHeight: 32 }}>Lascia stare</button></Link>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, padding: 6 }}>
          {TIPI.map((t) => (
            <button key={t.v} onClick={() => cambiaTipo(t.v)} disabled={!!modifica && tipo !== t.v} className={tipo === t.v ? "primario" : ""} style={{ padding: "10px 2px", fontSize: 14, whiteSpace: "nowrap", minHeight: 44 }}>{t.t}</button>
          ))}
        </div>
        {cliente && (
          <div style={{ margin: "0 6px 6px", padding: "6px 10px", borderRadius: 12, background: "var(--vino-chiaro)", border: "1px solid var(--oro-chiaro)", fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
            <span>📞</span>
            <div style={{ flex: 1 }}>
              <b>{cliente.nome ?? "Nuovo cliente"}</b> · {cliente.telefono}
              {cliente.indirizzo && <div className="muto">{cliente.indirizzo}</div>}
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
            {indirizzoSel?.lat != null && indirizzoSel.lng != null && <MiniMappa lat={indirizzoSel.lat} lng={indirizzoSel.lng} titolo={`${indirizzoSel.via} ${indirizzoSel.civico ?? ""}`} />}
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

        <div className="scorri" style={{ flex: 1, minHeight: 160, borderTop: "1px solid var(--bordo)", borderBottom: "1px solid var(--bordo)" }}>
          {righe.length === 0 && <p className="muto" style={{ padding: 12 }}>Tocca un prodotto per iniziare la comanda.</p>}
          {righe.map((r) => (
            <div key={r.chiave} className={"c-riga" + (scorsa === r.chiave ? " scorsa" : "")}
              onPointerDown={(e) => { inizioScorri.current = { chiave: r.chiave, x: e.clientX }; }}
              onPointerMove={(e) => { const s = inizioScorri.current; if (s && s.chiave === r.chiave && s.x - e.clientX > 50) { setScorsa(r.chiave); appenaScorsa.current = Date.now(); inizioScorri.current = null; } else if (s && s.chiave === r.chiave && e.clientX - s.x > 50) { setScorsa(null); inizioScorri.current = null; } }}
              onPointerUp={() => { inizioScorri.current = null; }}>
            <button onClick={() => { if (Date.now() - appenaScorsa.current < 400) return; if (scorsa === r.chiave) setScorsa(null); else toccaRiga(r); }} style={{
              width: "100%", display: "flex", gap: 8, alignItems: "flex-start", textAlign: "left", border: "none", borderRadius: 0,
              borderBottom: "1px solid var(--bordo)", padding: "9px 10px", minHeight: 44, background: r.chiave === selezionata ? "var(--oro-velo)" : "#fff", boxShadow: r.chiave === selezionata ? "inset 4px 0 0 var(--oro)" : undefined,
            }}>
              <span style={{ fontWeight: 800, minWidth: 30, color: "var(--vino)", fontSize: 17 }}>{r.quantita}×</span>
              <span style={{ flex: 1 }}>
                <span style={{ fontWeight: 700, fontSize: 15.5 }}>{r.descrizione}</span>
                {r.variazioni.map((v, i) => (
                  <span key={i} style={{ display: "block", fontSize: 14, color: v.tipo === "rimozione" ? "var(--accento)" : "var(--muto)" }}>
                    {v.tipo === "rimozione" ? v.nome : "+ " + v.nome}{v.prezzo > 0 ? ` (${euro(v.prezzo)})` : ""}
                  </span>
                ))}
                {(r.figlie ?? []).map((f, i) => (
                  <span key={"f" + i} style={{ display: "block", fontSize: 14, paddingLeft: 10 }}>
                    ↳ {f.quantita > 1 ? `${f.quantita}× ` : ""}{f.descrizione}
                    {f.variazioni.map((v, j) => (
                      <span key={j} style={{ display: "block", paddingLeft: 14, color: v.tipo === "rimozione" ? "var(--accento)" : "var(--muto)" }}>
                        {v.tipo === "rimozione" ? v.nome : "+ " + v.nome}{v.prezzo > 0 ? ` (${euro(v.prezzo)})` : ""}
                      </span>
                    ))}
                  </span>
                ))}
                {r.figlie && (() => { const p = prodotti.find((x) => x.id === r.id_prodotto); return p?.incluso ? <span style={{ display: "block", fontSize: 14, paddingLeft: 10, color: "var(--muto)" }}>+ {p.incluso}</span> : null; })()}
              </span>
              <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{euro(prezzoRiga(r))}</span>
            </button>
            <button className="c-x" aria-label={"Togli " + r.descrizione} onClick={() => eliminaRiga(r.chiave)}>✕</button>
            {scorsa === r.chiave && <button className="c-elimina" onClick={() => eliminaRiga(r.chiave)}>Elimina</button>}
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, padding: 6 }}>
          <button onClick={() => cambiaQuantita(-1)} disabled={!rigaSel} style={{ minHeight: 44, fontSize: 20 }}>−</button>
          <button onClick={() => cambiaQuantita(1)} disabled={!rigaSel} style={{ minHeight: 44, fontSize: 20 }}>+</button>
          <button onClick={() => setModoVarianti(true)} disabled={!rigaSel || (variantiSel.length === 0 && figlie.length === 0)} title={rigaSel && variantiSel.length === 0 && figlie.length === 0 ? "Niente varianti per questa categoria" : undefined} style={{ minHeight: 44, fontSize: 14 }}>Varianti</button>
          <button onClick={togliRiga} disabled={!rigaSel} style={{ color: "var(--vino)", borderColor: "var(--vino)", minHeight: 44, fontSize: 14 }}>Togli</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr) 1.4fr", gap: 4, padding: "0 6px 6px" }}>
          {["7", "8", "9", "1", "2", "3", "4", "5", "6", "0", "00", "C"].map((k, i) => (
            <button key={k} onClick={() => tasto(k)} style={{ padding: "11px 0", fontSize: 20, fontWeight: 700, borderRadius: 12, minHeight: 46 }}>{k}</button>
          ))}
          <div style={{ gridColumn: "4", gridRow: "1 / span 4", display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ flex: 1, border: "1px solid var(--oro-chiaro)", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--oro-velo)" }}>
              <span className="muto" style={{ fontSize: 13 }}>quantità</span>
              <span style={{ fontSize: 34, fontWeight: 800, color: "var(--vino)", lineHeight: 1 }}>{digitato || "1"}</span>
            </div>
          </div>
        </div>

        {tipo !== "tavolo" && (
          <div style={{ display: "flex", gap: 4, margin: "0 6px 6px" }}>
            <button onClick={() => { setGiorno(""); setOra(""); }} className={!giorno ? "primario" : ""} style={{ padding: "8px 12px", fontSize: 14, minHeight: 40 }}>Adesso</button>
            <select value={giorno} onChange={(e) => { setGiorno(e.target.value); setOra(""); setErrore(null); }} style={{ flex: 1, minWidth: 0, padding: "6px 8px", fontSize: 15, minHeight: 40 }}>
              <option value="">Giorno…</option>
              {giorniScelta.map((g) => <option key={g.v} value={g.v}>{g.t}</option>)}
            </select>
            <select value={ora} onChange={(e) => { setOra(e.target.value); setErrore(null); }} disabled={!giorno} style={{ flex: 1, minWidth: 0, padding: "6px 8px", fontSize: 15, minHeight: 40 }}>
              <option value="">Ora…</option>
              {quartiScelta.map((q) => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>
        )}
        {tipo === "domicilio" && fasceVicine.length > 0 && (
          <div className="c-vicine" aria-label="Quarti d'ora per la consegna">
            {fasceVicine.filter((f) => quartiScelta.includes(f.ora)).slice(0, 16).map((f, i, tutte) => {
              const piena = (x: typeof f) => x.bloccata_consegne || x.bloccata_produzione || x.consegne_occupate >= x.consegne_max || x.pizze_occupate >= x.pizze_max;
              const pieno = piena(f);
              // critico giro 24: il giallo su un quarto d'ora pieno mandava a un rifiuto. Due consegne
              // occupano due posti (Edoardo): se la vicina sta in un quarto pieno, il giallo va a quelli accanto.
              const vicinaDi = (x?: typeof f) => !!x && (x.vicina_minuti != null ? x.vicina_minuti <= VICINA_MIN : x.vicina_metri != null && x.vicina_metri <= VICINA_M);
              const accanto = !pieno && !vicinaDi(f) ? [tutte[i - 1], tutte[i + 1]].find((x) => vicinaDi(x) && piena(x!)) : undefined;
              if (accanto) f = { ...f, vicina_metri: accanto.vicina_metri, vicina_numero: accanto.vicina_numero, vicina_minuti: accanto.vicina_minuti };
              const vicina = !pieno && vicinaDi(f);
              const scelto = !!giorno && ora === f.ora;
              return (
                <button key={f.ora} className={"c-fascia" + (vicina ? " vicina" : "") + (pieno ? " piena" : "") + (scelto ? " scelta" : "")}
                  onClick={() => { setGiorno(giorno || oggiISO()); setOra(f.ora); setErrore(null); }}>
                  <b>{f.ora}</b>
                  <span>{pieno ? "pieno" : `${f.consegne_occupate}/${f.consegne_max} cons.`}</span>
                  {vicina && <span className="dove">{f.vicina_numero} a {f.vicina_minuti != null ? `${f.vicina_minuti} min` : f.vicina_metri! < 1000 ? `${Math.round(f.vicina_metri! / 50) * 50} m` : `${(f.vicina_metri! / 1000).toFixed(1).replace(".", ",")} km`}</span>}
                </button>
              );
            })}
          </div>
        )}
        {/* critico giro 16: dal telefono il banco partiva senza contanti/POS. Il tavolo paga col conto. */}
        {(tipo === "domicilio" || tipo === "ritiro" || tipo === "banco") && (
          <div className="c-paga" style={{ display: "flex", gap: 4, margin: "0 6px 6px", alignItems: "center" }}>
            {([["contanti", "Contanti"], ["pos", "POS"], ["online", "Già pagato"]] as const).map(([v, t]) => (
              <button key={v} onClick={() => setPagamento(pagamento === v ? null : v)} className={pagamento === v ? "primario" : ""} style={{ padding: "8px 10px", fontSize: 14, minHeight: 40 }}>{t}</button>
            ))}
            {pagamento === "contanti" && tipo === "domicilio" && (
              <input inputMode="decimal" placeholder="paga con…" value={pagaCon} onChange={(e) => setPagaCon(e.target.value)} style={{ flex: 1, minWidth: 0, padding: "6px 8px", fontSize: 15, minHeight: 40 }} />
            )}
          </div>
        )}
        {pagamento === "contanti" && tipo === "domicilio" && Number(pagaCon.replace(",", ".")) > totale + costoConsegna && (
          <div style={{ margin: "-2px 6px 6px", fontSize: 14, fontWeight: 700 }}>
            Resto da portare: {euro(Number(pagaCon.replace(",", ".")) - Math.max(0, totale + costoConsegna - (coupon?.sconto ?? 0) - scontoManuale))}
          </div>
        )}
        <div style={{ display: "flex", gap: 4, margin: "0 6px 6px", alignItems: "center" }}>
          <input placeholder="Coupon" value={codiceCoupon} onChange={(e) => { setCodiceCoupon(e.target.value.toUpperCase()); setCoupon(null); setErroreCoupon(null); }} onKeyDown={(e) => { if (e.key === "Enter") verificaCoupon(); }} style={{ flex: 1, minWidth: 0, padding: "6px 8px", fontSize: 15, minHeight: 40, textTransform: "uppercase" }} />
          <button onClick={verificaCoupon} disabled={!codiceCoupon.trim() || righe.length === 0} style={{ padding: "8px 12px", fontSize: 14, minHeight: 40 }}>Applica</button>
          {coupon && <span style={{ fontSize: 14, color: "var(--ok)", fontWeight: 700, whiteSpace: "nowrap" }}>−{euro(coupon.sconto)}</span>}
        </div>
        {!modifica && (
          <div style={{ display: "flex", gap: 4, margin: "0 6px 6px", alignItems: "center" }}>
            <input placeholder="Sconto" inputMode="decimal" value={scontoTesto} onChange={(e) => setScontoTesto(e.target.value.replace(/[^\d.,]/g, ""))} style={{ flex: 1, minWidth: 0, padding: "6px 8px", fontSize: 15, minHeight: 40 }} />
            <button onClick={() => setScontoPct(false)} className={!scontoPct ? "primario" : ""} style={{ padding: "8px 12px", fontSize: 14, minHeight: 40 }}>€</button>
            <button onClick={() => setScontoPct(true)} className={scontoPct ? "primario" : ""} style={{ padding: "8px 12px", fontSize: 14, minHeight: 40 }}>%</button>
            {scontoManuale > 0 && <span style={{ fontSize: 14, color: "var(--ok)", fontWeight: 700, whiteSpace: "nowrap" }}>−{euro(scontoManuale)}</span>}
          </div>
        )}
        {erroreCoupon && <div style={{ margin: "-2px 6px 6px", fontSize: 13, color: "var(--accento)", fontWeight: 700 }}>{erroreCoupon}</div>}
        {!cliente && tipo !== "tavolo" && <input placeholder={tipo === "ritiro" ? "Nome di chi ritira" : "Nome (se serve)"} value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} style={{ margin: "0 6px 6px", padding: "8px 10px", fontSize: 15, minHeight: 40 }} />}
        <input placeholder="Note (es. ben cotta)" value={note} onChange={(e) => setNote(e.target.value)} style={{ margin: "0 6px 6px", padding: "8px 10px", fontSize: 15, minHeight: 40 }} />
        {errore && (
          <div role="alert" style={{ margin: "0 6px 6px", padding: "10px 12px", borderRadius: 12, background: "var(--errore-chiaro)", border: "2px solid var(--errore)", color: "var(--errore)", fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>
            {errore}
          </div>
        )}
        {/* critico giro 18: il messaggio dell'invio e «scegli Contanti o POS» finivano sotto il blocco fisso: stanno nel blocco */}
        <div className="c-fondo">
        {esito && (
          <div role="status" className="esito-invio" style={{ margin: "0 6px 6px", padding: "10px 12px", borderRadius: 12, background: "#eef7ea", border: "2px solid var(--ok)", color: "var(--ok)", fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>
            {esito}
          </div>
        )}
        {/* n. 10 del giro 3: gli errori stanno in UN posto, vicino al bottone */}
        {/* critico giro 17: il banco partiva senza contanti/POS, e in chiusura non si sa come ha pagato */}
        {!errore && !esito && tipo === "banco" && !pagamento && righe.length > 0 && !modifica && (
          <div className="c-paga-manca" style={{ margin: "0 6px 6px", padding: "8px 12px", borderRadius: 12, background: "var(--oro-velo)", borderLeft: "4px solid var(--oro)", fontSize: 14, fontWeight: 600 }}>Al banco si paga subito: scegli Contanti o POS.</div>
        )}
        {!errore && tipo === "domicilio" && (!idIndirizzo || fuoriZona || sottoMinimo) && righe.length > 0 && (
          <div style={{ margin: "0 6px 6px", padding: "8px 12px", borderRadius: 12, background: "var(--errore-chiaro)", border: "2px solid var(--errore)", color: "var(--errore)", fontWeight: 700, fontSize: 14 }}>
            {!idIndirizzo ? "Serve l'indirizzo di consegna: aprilo da Dati cliente." : fuoriZona ? "Fuori dalle zone di consegna: non consegniamo lì." : `Minimo d'ordine ${euro(zonaSel!.minimo_ordine)}: mancano ${euro(zonaSel!.minimo_ordine - totale)}.`}
          </div>
        )}
        <div className="c-totale" style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 6px 6px" }}>
          <button onClick={svuota} disabled={righe.length === 0} style={{ minHeight: 40, fontSize: 14 }}>Svuota</button>
          <span style={{ flex: 1, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
            {costoConsegna > 0 && <span className="muto" style={{ display: "block" }}>+ consegna {euro(costoConsegna)}</span>}
            {coupon && <span className="muto" style={{ display: "block" }}>− {coupon.nome} {euro(coupon.sconto)}</span>}
            {scontoManuale > 0 && !modifica && <span className="muto" style={{ display: "block" }}>− sconto {euro(scontoManuale)}</span>}
            {modifica && (modifica.sconto ?? 0) > 0 && <span className="muto" style={{ display: "block" }}>− sconto {euro(modifica.sconto ?? 0)}</span>}
            {modifica && (modifica.costo_consegna ?? 0) > 0 && <span className="muto" style={{ display: "block" }}>+ consegna {euro(modifica.costo_consegna ?? 0)}</span>}
            <span style={{ fontSize: 30, fontWeight: 800, color: "var(--vino)", fontFamily: "Oswald, sans-serif", lineHeight: 1.1 }}>{euro(righe.length === 0 ? 0 : modifica ? Math.max(0, totale + (modifica.costo_consegna ?? 0) - (modifica.sconto ?? 0)) : Math.max(0, totale + costoConsegna - (coupon?.sconto ?? 0) - scontoManuale))}</span>
          </span>
        </div>
        <button onClick={invia} className="primario c-invia" disabled={invio || righe.length === 0 || !!modifica?.bloccata || (!modifica && ((tipo === "tavolo" && !idTavolo) || (tipo === "banco" && !pagamento) || (tipo === "domicilio" && (!idIndirizzo || fuoriZona || sottoMinimo)) || (!!giorno && !ora)))} style={{ margin: 6, padding: 16, fontSize: 19, fontFamily: "Oswald, sans-serif", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", borderRadius: 999, boxShadow: "0 8px 22px rgba(138,21,56,.28)" }}>
          {invio ? (modifica ? "Salvo…" : "Invio…") : modifica ? "Salva e ristampa" : "Invia in cucina"}
        </button>
        </div>
      </aside>
    </div>
  );
}

function isoLocale(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function oggiISO() { return isoLocale(new Date()); }

/** Il colore della categoria (quello di Velocissimo) resta come striscia sotto la tessera, non più come fondo:
 * la tessera è bianca col marchio, il colore aiuta ancora l'occhio a ritrovare il reparto. */
/** Il colore della categoria (dal database) per la striscia in fondo alla tessera: è un dato, non uno
 *  stile, e viaggia nella variabile --riga che `.tessera.riga` disegna. */
function striscia(hex: string | null | undefined) {
  const c = hex && /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#e8d2a6";
  return { "--riga": c } as React.CSSProperties;
}
