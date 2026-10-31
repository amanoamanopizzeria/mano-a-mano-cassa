"use client";

// Sala: 10 tavoli dentro e 5 fuori, sulla piantina di Edoardo. Si apre un tavolo con i coperti, si chiude quando paga.
// Il colore cambia dopo 60 minuti dall'apertura (alert per proporre il dessert o un altro giro).
// I tavoli si uniscono trascinandone uno sull'altro, o con «Unisci» (Edoardo, 31/10/2026: «tipo trascini i tavoli, li
// unisci… un tavolo a 6 prende il tavolo 1, 2 e 3 e li unisce, e deve sempre mettere quanti sono i coperti»).
import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";
import type { Variazione } from "@/lib/types";

// Il conto: le righe di tutti gli ordini aperti del tavolo, con le varianti, e il totale.
interface RigaConto { id: string; descrizione: string; quantita: number; prezzo_unit: number; variazioni: Variazione[] | null; id_riga_padre: string | null }
interface OrdineConto { id: string; numero_visibile: string | null; numero: number; totale: number; stato: string; sconto: number | null; ordine_riga: RigaConto[] }
const euro = (n: number) => n.toFixed(2).replace(".", ",") + " €";
// Edoardo 30/10/2026 (risposta D): buoni pasto, Satispay e il conto diviso fra più persone, soprattutto ai tavoli.
type Metodo = "contanti" | "pos" | "buono_pasto" | "satispay";
const METODI: [Metodo, string][] = [["contanti", "Contanti"], ["pos", "POS"], ["buono_pasto", "Buono pasto"], ["satispay", "Satispay"]];
interface RigaPagamento { metodo: Metodo; importo: string }
const numero = (t: string) => Number(t.replace(",", ".")) || 0;
const centesimi = (n: number) => Math.round(n * 100) / 100;
const prezzoRiga = (r: RigaConto) => (Number(r.prezzo_unit) + (r.variazioni ?? []).reduce((a, v) => a + Number(v.prezzo ?? 0), 0)) * Number(r.quantita);

interface Tavolo {
  id: string;
  numero: string;
  zona: "dentro" | "fuori";
  posti: number;
  stato: "libero" | "occupato" | "conto";
  aperto_il: string | null;
  coperti: number;
  unito_a?: string | null;   // mig. 0081: il tavolo principale del gruppo («1+2»)
}

const ALERT_MINUTI = 60;

export default function TavoliPagina() {
  return (
    <AuthGate>
      <Tavoli />
    </AuthGate>
  );
}

function minutiDa(iso: string | null): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

function Tavoli() {
  const [tavoli, setTavoli] = useState<Tavolo[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const [, setOra] = useState(0);
  const [conto, setConto] = useState<{ tavolo: Tavolo; ordini: OrdineConto[]; prezzoCoperto: number } | null>(null);
  const [chiudo, setChiudo] = useState(false);
  // il pannello «Diviso / altri metodi» del conto: una riga per ogni pagamento
  const [divisi, setDivisi] = useState<RigaPagamento[] | null>(null);
  // Il tastierino dei coperti sulla pagina (critico giro 29: la finestrella del browser bloccava la pagina).
  // «apri» un tavolo libero, «correggi» uno già occupato (anche aperto da /cassa/nuovo, che non li chiede).
  const [coperti, setCoperti] = useState<{ tavolo: Tavolo; scopo: "apri" | "correggi" } | null>(null);
  // «Unisci» (Edoardo, 30/10/2026: «voglio unire 1 e 2, o 11 e 12»): si tocca Unisci su un tavolo, poi i tavoli
  // liberi da mettergli accanto. Il gruppo diventa un tavolone «1+2»: ordini, coperti e conto stanno sul primo.
  const [unisco, setUnisco] = useState<Tavolo | null>(null);
  // Il trascinamento: col mouse parte subito, col dito dopo un attimo fermo (così la pagina scorre ancora col dito).
  const [trascino, setTrascino] = useState<{ tavolo: Tavolo; x: number; y: number } | null>(null);
  const [sopra, setSopra] = useState<string | null>(null);
  // pronto: si può trascinare (mouse subito, dito dopo l'attimo fermo); mosso: si sta trascinando davvero
  const presa = useRef<{ tavolo: Tavolo; x0: number; y0: number; pronto: boolean; mosso: boolean; timer?: number } | null>(null);

  const carica = useCallback(async () => {
    const { data, error } = await supabaseBrowser()
      .from("tavolo").select("*").eq("attivo", true).order("numero");   // 10 dentro e 5 fuori (mig. 0031)
    if (error) setErrore(error.message);
    else setTavoli((data ?? []) as Tavolo[]);
  }, []);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) { setErrore("Supabase non configurato."); return; }
    carica();
    const supabase = supabaseBrowser();
    const canale = supabase
      .channel("sala")
      .on("postgres_changes", { event: "*", schema: "public", table: "tavolo" }, () => carica())
      .subscribe();
    const timer = setInterval(() => setOra((n) => n + 1), 30000); // ricalcola i minuti
    return () => { clearInterval(timer); supabase.removeChannel(canale); };
  }, [carica]);

  // I coperti si scrivono con tavolo_coperti (mig. 0068): apre il tavolo se è libero, li corregge se è occupato.
  async function scegliCoperti(n: number) {
    if (!coperti) return;
    const t = coperti.tavolo;
    setCoperti(null);
    const { data, error } = await supabaseBrowser().rpc("tavolo_coperti", { p_id_tavolo: t.id, p_coperti: n });
    if (error) { setErrore(error.message); return; }
    if ((data as { esito: string }).esito !== "ok") { setErrore("Coperti non validi."); return; }
    setErrore(null);
    setConto((c) => (c && c.tavolo.id === t.id ? { ...c, tavolo: { ...c.tavolo, coperti: n } } : c));
    carica();
  }

  async function unisciA(principale: Tavolo, altro: Tavolo): Promise<boolean> {
    const { data, error } = await supabaseBrowser().rpc("tavolo_unisci", { p_principale: principale.id, p_altro: altro.id });
    if (error) { setErrore(error.message); return false; }
    const r = data as { esito: string; messaggio?: string };
    const ok = r.esito === "ok";
    if (!ok) setErrore(r.messaggio ?? "Non si possono unire (" + r.esito + ")."); else setErrore(null);
    await carica();
    return ok;
  }

  // Un tavolo lasciato sopra un altro: il gruppo resta su quello già aperto (lì ci sono ordini e coperti); se sono
  // liberi tutti e due, su quello sotto. Poi si chiedono subito i coperti di tutto il gruppo.
  async function unisciTrascinando(preso: Tavolo, bersaglio: Tavolo) {
    const capo = (t: Tavolo) => tavoli.find((x) => x.id === t.unito_a) ?? t;
    const a = capo(preso), b = capo(bersaglio);
    if (a.id === b.id) return;
    if (a.zona !== b.zona) { setErrore("Un tavolo di dentro e uno di fuori non si uniscono."); return; }
    const conGruppo = (t: Tavolo) => tavoli.some((x) => x.unito_a === t.id);
    if (a.stato !== "libero" && b.stato !== "libero") {
      setErrore(`Il ${nomeDi(a)} e il ${nomeDi(b)} sono aperti tutti e due: incassa o libera uno dei due prima di unirli.`);
      return;
    }
    const [principale, altro] = b.stato !== "libero" || (a.stato === "libero" && !conGruppo(a)) ? [b, a] : [a, b];
    if (conGruppo(altro)) { setErrore(`Il ${nomeDi(altro)} è già un gruppo: trascina sopra di lui gli altri tavoli.`); return; }
    if (await unisciA(principale, altro)) setCoperti({ tavolo: principale, scopo: principale.stato === "libero" ? "apri" : "correggi" });
  }

  function prendi(e: React.PointerEvent, t: Tavolo) {
    if (e.button > 0 || (e.target as HTMLElement).closest("button")) return;
    const tocco = e.pointerType !== "mouse";
    presa.current = { tavolo: t, x0: e.clientX, y0: e.clientY, pronto: !tocco, mosso: false };
    if (tocco) presa.current.timer = window.setTimeout(() => {
      const p = presa.current;
      if (p) { p.pronto = true; p.mosso = true; setTrascino({ tavolo: t, x: p.x0, y: p.y0 }); }
    }, 280);
  }

  useEffect(() => {
    const sotto = (x: number, y: number) =>
      (document.elementFromPoint(x, y)?.closest("[data-tavolo]") as HTMLElement | null)?.dataset.tavolo ?? null;
    const muovi = (e: PointerEvent) => {
      const p = presa.current;
      if (!p) return;
      const lontano = Math.hypot(e.clientX - p.x0, e.clientY - p.y0) > 10;
      if (!p.pronto) { if (lontano) { clearTimeout(p.timer); presa.current = null; } return; }   // il dito scorre la pagina
      if (!lontano && !p.mosso) return;
      p.mosso = true;
      setTrascino({ tavolo: p.tavolo, x: e.clientX, y: e.clientY });
      const id = sotto(e.clientX, e.clientY);
      setSopra(id && id !== p.tavolo.id ? id : null);
    };
    const lascia = (e: PointerEvent) => {
      const p = presa.current;
      presa.current = null;
      if (!p) return;
      clearTimeout(p.timer);
      const id = p.mosso ? sotto(e.clientX, e.clientY) : null;
      setTrascino(null); setSopra(null);
      const bersaglio = id ? tavoli.find((x) => x.id === id) : undefined;
      if (bersaglio && bersaglio.id !== p.tavolo.id) unisciTrascinando(p.tavolo, bersaglio);
    };
    // mentre si trascina col dito la pagina sta ferma
    const fermaScorrimento = (e: TouchEvent) => { if (presa.current?.pronto) e.preventDefault(); };
    window.addEventListener("pointermove", muovi);
    window.addEventListener("pointerup", lascia);
    window.addEventListener("pointercancel", lascia);
    window.addEventListener("touchmove", fermaScorrimento, { passive: false });
    return () => {
      window.removeEventListener("pointermove", muovi);
      window.removeEventListener("pointerup", lascia);
      window.removeEventListener("pointercancel", lascia);
      window.removeEventListener("touchmove", fermaScorrimento);
    };
  });
  async function separa(t: Tavolo) {
    const { error } = await supabaseBrowser().rpc("tavolo_separa", { p_principale: t.id });
    if (error) setErrore(error.message); else setErrore(null);
    setUnisco(null);
    carica();
  }

  // «Libera» non lascia ordini aperti al gruppo dopo (critico giro 29): se ce ne sono, prima si incassano o si annullano.
  async function chiudi(t: Tavolo) {
    const { data, error } = await supabaseBrowser().rpc("tavolo_libera", { p_id_tavolo: t.id });
    if (error) { setErrore(error.message); return; }
    const r = data as { esito: string; ordini?: number };
    if (r.esito === "ordini_aperti") setErrore(`Il tavolo ${t.numero} ha ${r.ordini} ${r.ordini === 1 ? "ordine aperto" : "ordini aperti"}: incassa il conto o annulla prima di liberarlo.`);
    else { setErrore(null); carica(); }
  }

  // «Conto»: si segna il tavolo «al conto» e si apre il conto vero (critico giro 10: «Conto senza conto»).
  async function passaAlConto(t: Tavolo) {
    if (t.stato === "occupato") await supabaseBrowser().from("tavolo").update({ stato: "conto" }).eq("id", t.id);
    const { data, error } = await supabaseBrowser().from("ordine")
      .select("id, numero_visibile, numero, totale, stato, sconto, ordine_riga(id, descrizione, quantita, prezzo_unit, variazioni, id_riga_padre)")
      .eq("id_tavolo", t.id).not("stato", "in", "(annullato,ritirato,consegnato)").order("creato_il");
    if (error) { setErrore(error.message); return; }
    // Il coperto (1,50 € a persona, Edoardo 25/10) lo aggiunge il database al conto (mig. 0065): qui si mostra prima.
    const { data: neg } = await supabaseBrowser().from("negozio").select("prezzo_coperto").limit(1).maybeSingle();
    setConto({ tavolo: t, ordini: (data ?? []) as unknown as OrdineConto[], prezzoCoperto: Number(neg?.prezzo_coperto ?? 1.5) });
  }

  // Si incassa (contanti o POS): gli ordini si chiudono e il tavolo si libera, in una transazione (mig. 0041).
  async function incassa(pagamento: "contanti" | "pos") {
    if (!conto) return;
    setChiudo(true);
    const { data, error } = await supabaseBrowser().rpc("tavolo_conto_chiudi", { p_id_tavolo: conto.tavolo.id, p_pagamento: pagamento });
    setChiudo(false);
    if (error) { setErrore(error.message); return; }
    const r = data as { esito: string };
    if (r.esito !== "chiuso") { setErrore("Conto non chiuso (" + r.esito + ")."); return; }
    setConto(null);
  }

  // Più pagamenti, o buono pasto e Satispay (tavolo_conto_chiudi2, supabase/da_decidere/pagamenti_divisi.sql):
  // il database rifà i conti col coperto e chiude solo se la somma arriva al totale; il resto esce dai contanti.
  async function incassaDiviso(righe: RigaPagamento[]) {
    if (!conto) return;
    const pagamenti = righe.map((r) => ({ metodo: r.metodo, importo: centesimi(numero(r.importo)) })).filter((r) => r.importo > 0);
    if (pagamenti.length === 0) { setErrore("Scrivi almeno un importo."); return; }
    setChiudo(true);
    const { data, error } = await supabaseBrowser().rpc("tavolo_conto_chiudi2", { p_id_tavolo: conto.tavolo.id, p_pagamenti: pagamenti });
    setChiudo(false);
    if (error) {
      setErrore(/tavolo_conto_chiudi2|function/i.test(error.message)
        ? "Il conto diviso non è ancora acceso nel database: serve l'ok di Edoardo sulla modifica dei pagamenti."
        : error.message);
      return;
    }
    const r = data as { esito: string; mancano?: number; eccedenza?: number; resto?: number };
    if (r.esito === "manca") { setErrore(`Mancano ${euro(Number(r.mancano))}.`); return; }
    if (r.esito === "troppo") { setErrore(`Ci sono ${euro(Number(r.eccedenza))} in più fuori dai contanti: il resto si dà solo in contanti.`); return; }
    if (r.esito !== "chiuso") { setErrore("Conto non chiuso (" + r.esito + ")."); return; }
    setErrore(Number(r.resto) > 0 ? `Conto chiuso. Resto da dare: ${euro(Number(r.resto))}.` : null);
    setDivisi(null);
    setConto(null);
  }

  // La piantina disegnata da Edoardo (30/10/2026, docs/sala/PIANTINA.md): fuori 11–15 in fila in alto; dentro la
  // colonna sinistra dal basso 1–6 e la colonna centrale dal basso 7–10, con il passaggio fra 7 e 8; in basso a
  // destra il banco. Il 2Bit non ha una piantina: questa è nostra. Un tavolo che non è nel disegno va in fondo.
  const POSTO: Record<string, { riga: number; colonna: number }> = {
    "6": { riga: 1, colonna: 1 }, "5": { riga: 2, colonna: 1 }, "4": { riga: 3, colonna: 1 },
    "3": { riga: 4, colonna: 1 }, "2": { riga: 5, colonna: 1 }, "1": { riga: 6, colonna: 1 },
    "10": { riga: 1, colonna: 3 }, "9": { riga: 2, colonna: 3 }, "8": { riga: 3, colonna: 3 }, "7": { riga: 5, colonna: 3 },
  };
  // dal 30/10 (mig. 0081) i tavoli si chiamano 1…10 dentro e 11…15 fuori; il posto si cerca dalle cifre
  const postoDi = (t: Tavolo) => POSTO[t.numero.replace(/\D/g, "")];
  const perNumero = (a: Tavolo, b: Tavolo) => a.numero.localeCompare(b.numero, "it", { numeric: true });
  // i tavoli uniti a un principale non si disegnano da soli: il principale li disegna come un tavolone
  const uniti = (t: Tavolo) => tavoli.filter((x) => x.unito_a === t.id).sort(perNumero);
  const nomeDi = (t: Tavolo) => [t, ...uniti(t)].map((x) => x.numero).join("+");
  // il tavolone occupa i posti di tutti i suoi tavoli sulla piantina (1+2 = due righe della colonna)
  const rettangolo = (t: Tavolo) => {
    const membri = [t, ...uniti(t)];
    const posti = membri.map(postoDi).filter(Boolean) as { riga: number; colonna: number }[];
    if (posti.length === 0) return undefined;
    const r = { r0: Math.min(...posti.map((p) => p.riga)), r1: Math.max(...posti.map((p) => p.riga)),
      c0: Math.min(...posti.map((p) => p.colonna)), c1: Math.max(...posti.map((p) => p.colonna)) };
    // se in mezzo c'è un tavolo che non è del gruppo (1+3 senza il 2), il tavolone resta al posto del primo
    const inMezzo = tavoli.some((x) => !membri.includes(x) && x.zona === "dentro" && !x.unito_a && (() => {
      const p = postoDi(x); return !!p && p.riga >= r.r0 && p.riga <= r.r1 && p.colonna >= r.c0 && p.colonna <= r.c1;
    })());
    if (inMezzo) { const p = postoDi(t); return p ? { r0: p.riga, r1: p.riga, c0: p.colonna, c1: p.colonna } : undefined; }
    return r;
  };
  const postoGruppo = (t: Tavolo) => {
    const r = rettangolo(t);
    return r ? { gridRow: `${r.r0} / ${r.r1 + 1}`, gridColumn: `${r.c0} / ${r.c1 + 1}` } : undefined;
  };
  const principali = tavoli.filter((t) => !t.unito_a);
  const fuori = principali.filter((t) => t.zona === "fuori").sort(perNumero);
  const dentro = principali.filter((t) => t.zona === "dentro" && postoDi(t));
  const altri = principali.filter((t) => t.zona === "dentro" && !postoDi(t)).sort(perNumero);
  // il passaggio fra 7 e 8 (riga 4 della colonna centrale) sparisce sotto un tavolone 7+8
  const passaggioCoperto = dentro.some((t) => { const r = rettangolo(t); return !!r && r.r0 <= 4 && r.r1 >= 4 && r.c0 <= 3 && r.c1 >= 3; });
  const scheda = (t: Tavolo, inPiantina = false) => {
        const min = minutiDa(t.aperto_il);
        const allarme = t.stato !== "libero" && min >= ALERT_MINUTI;
        const gruppo = uniti(t);
        const scegliCompagno = unisco && unisco.id !== t.id && t.stato === "libero" && gruppo.length === 0;
        return (
          <div
            key={t.id}
            data-tavolo={t.id}
            style={inPiantina ? postoGruppo(t) : (gruppo.length > 0 ? { gridColumn: `span ${1 + gruppo.length}` } : undefined)}
            className={"carta tavolo " + t.stato + (allarme ? " allarme" : "") + (gruppo.length > 0 ? " unito" : "")
              + (unisco?.id === t.id ? " unisce" : "") + (scegliCompagno ? " compagno" : "")
              + (sopra === t.id ? " sopra" : "") + (trascino?.tavolo.id === t.id ? " preso" : "")}
            onClick={scegliCompagno ? () => unisciA(unisco, t) : undefined}
            onPointerDown={(e) => prendi(e, t)}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div className="s-intesta">
              <strong className="num">{nomeDi(t)}</strong>
              <span className={`badge stato-${t.stato}`}>{t.stato === "occupato" ? "occ." : t.stato}</span>
            </div>
            {t.stato !== "libero" && (
              <div className="muto riga-min">
                <button className="link-coperti" onClick={() => setCoperti({ tavolo: t, scopo: "correggi" })} aria-label="Correggi i coperti">{t.coperti} cop.</button> · <b className={allarme ? "da-troppo" : undefined}>{min} min</b>{allarme ? " · da troppo" : ""}
              </div>
            )}
            {scegliCompagno ? <div className="azioni"><button className="primario">+ Unisci a {nomeDi(unisco)}</button></div> :
            <div className="azioni">
              {t.stato === "libero" && <button className="primario" onClick={() => setCoperti({ tavolo: t, scopo: "apri" })}>Apri</button>}
              {!unisco && <button onClick={() => setUnisco(t)}>Unisci</button>}
              {unisco?.id === t.id && <button className="primario" onClick={() => {
                setUnisco(null);
                if (gruppo.length > 0) setCoperti({ tavolo: t, scopo: t.stato === "libero" ? "apri" : "correggi" });
              }}>Fatto</button>}
              {gruppo.length > 0 && <button onClick={() => separa(t)}>Separa</button>}
              {t.stato !== "libero" && <button className={t.stato === "conto" ? "primario" : ""} onClick={() => passaAlConto(t)}>Conto</button>}
              {t.stato !== "libero" && <button onClick={() => chiudi(t)}>Libera</button>}
            </div>}
          </div>
        );
  };

  return (
    <main className="sala">
      <h1>Sala</h1>
      {errore && <p className="s-errore">{errore}</p>}
      {unisco ? <p className="s-unisci">Tocca i tavoli liberi da unire al <b>{nomeDi(unisco)}</b>, poi <b>Fatto</b>.</p>
        : <p className="muto s-aiuto">Per unire i tavoli trascinane uno sopra l&apos;altro (col dito: tienilo premuto un attimo), oppure tocca <b>Unisci</b>.</p>}
      {trascino && <div className="p-fantasma" style={{ left: trascino.x, top: trascino.y }} aria-hidden="true">{nomeDi(trascino.tavolo)}</div>}
      <div className="piantina">
        <section className="s-zona p-fuori">
          <h2>Fuori</h2>
          <div className="p-fila">{fuori.map((t) => scheda(t))}</div>
        </section>
        <div className="p-muro" aria-hidden="true" />
        <section className="s-zona p-dentro">
          <h2>Dentro</h2>
          <div className="p-griglia">
            {dentro.map((t) => scheda(t, true))}
            {!passaggioCoperto && <div className="p-passaggio" style={{ gridRow: 4, gridColumn: 3 }} aria-hidden="true">passaggio</div>}
            <div className="p-parete" style={{ gridRow: "1 / span 5", gridColumn: 4 }} aria-hidden="true" />
            <div className="p-banco" style={{ gridRow: "6 / span 1", gridColumn: "3 / span 2" }} aria-hidden="true">banco</div>
          </div>
          {altri.length > 0 && <div className="griglia sala-griglia">{altri.map((t) => scheda(t))}</div>}
        </section>
      </div>

      {conto && (() => {
        const righe = conto.ordini.flatMap((o) => o.ordine_riga);
        const padri = righe.filter((r) => !r.id_riga_padre);
        const giaCoperto = righe.some((r) => r.descrizione === "Coperto");
        const coperto = padri.length > 0 && !giaCoperto ? conto.tavolo.coperti * conto.prezzoCoperto : 0;
        const totale = conto.ordini.reduce((a, o) => a + Number(o.totale), 0) + coperto;
        return (
          <div className="conto-velo" onClick={() => { setConto(null); setDivisi(null); }}>
            <section className="carta conto" onClick={(e) => e.stopPropagation()}>
              <header>
                <strong className="num">Tavolo {nomeDi(conto.tavolo)}</strong>
                <span className="muto">{conto.tavolo.coperti} {conto.tavolo.coperti === 1 ? "coperto" : "coperti"} · {minutiDa(conto.tavolo.aperto_il)} min</span>
                <button className="chiudi-conto" onClick={() => { setConto(null); setDivisi(null); }}>✕</button>
              </header>
              {padri.length === 0 ? (
                <p className="muto">Nessun ordine aperto su questo tavolo.</p>
              ) : (
                <ul className="righe">
                  {conto.ordini.map((o) => [
                    <li key={o.id + "-num"} className="ordine-num" aria-label="Ordine"><span className="q" /><span className="d">Ordine <b>{o.numero_visibile ?? `#${o.numero}`}</b>{conto.ordini.length > 1 && <small>{euro(Number(o.totale))}</small>}</span><span className="p" /></li>,
                    ...o.ordine_riga.filter((r) => !r.id_riga_padre).map((r) => (
                    <li key={r.id}>
                      <span className="q">{Number(r.quantita)}×</span>
                      <span className="d">
                        {r.descrizione}
                        {(r.variazioni ?? []).length > 0 && <small> {(r.variazioni ?? []).map((v) => (v.tipo === "rimozione" ? "senza " : "+ ") + v.nome).join(", ")}</small>}
                        {righe.filter((f) => f.id_riga_padre === r.id).map((f) => <small key={f.id} className="figlia">· {f.descrizione}</small>)}
                      </span>
                      <span className="p">{euro(prezzoRiga(r))}</span>
                    </li>
                    )),
                  ])}
                  {coperto > 0 && (
                    <li key="coperto" className="coperto">
                      <span className="q">{conto.tavolo.coperti}×</span>
                      <span className="d">Coperto <small>{euro(conto.prezzoCoperto)} a persona</small></span>
                      <span className="p">{euro(coperto)}</span>
                    </li>
                  )}
                </ul>
              )}
              {conto.ordini.some((o) => Number(o.sconto) > 0) && <div className="muto sconti">sconti −{euro(conto.ordini.reduce((a, o) => a + Number(o.sconto ?? 0), 0))}</div>}
              {padri.length > 0 && conto.tavolo.coperti === 0 && !giaCoperto && (
                <button className="mancano-coperti" onClick={() => setCoperti({ tavolo: conto.tavolo, scopo: "correggi" })}>Quanti coperti? Il coperto entra nel conto</button>
              )}
              <div className="totale"><span>Totale</span><strong>{euro(totale)}</strong></div>
              {divisi && (() => {
                const pagato = divisi.reduce((a, r) => a + numero(r.importo), 0);
                const diff = centesimi(pagato - totale);
                // «Dividi in N»: N quote uguali, i centesimi che avanzano sull'ultima
                const inParti = (n: number) => {
                  const quota = Math.floor((totale / n) * 100) / 100;
                  setDivisi(Array.from({ length: n }, (_, i) => ({ metodo: "contanti" as Metodo,
                    importo: (i === n - 1 ? centesimi(totale - quota * (n - 1)) : quota).toFixed(2).replace(".", ",") })));
                };
                return (
                  <div className="diviso">
                    <div className="diviso-parti">
                      <span className="muto">Dividi in</span>
                      {[2, 3, 4, 5, 6].map((n) => <button key={n} onClick={() => inParti(n)}>{n}</button>)}
                    </div>
                    {divisi.map((r, i) => (
                      <div key={i} className="diviso-riga">
                        <select aria-label="Metodo" value={r.metodo} onChange={(e) => setDivisi(divisi.map((x, j) => (j === i ? { ...x, metodo: e.target.value as Metodo } : x)))}>
                          {METODI.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                        </select>
                        <input aria-label="Importo" inputMode="decimal" value={r.importo} placeholder="0,00"
                          onChange={(e) => setDivisi(divisi.map((x, j) => (j === i ? { ...x, importo: e.target.value } : x)))} />
                        <button aria-label="Togli" onClick={() => setDivisi(divisi.filter((_, j) => j !== i))}>✕</button>
                      </div>
                    ))}
                    <button className="diviso-aggiungi" onClick={() => setDivisi([...divisi, { metodo: "contanti",
                      importo: diff < 0 ? (-diff).toFixed(2).replace(".", ",") : "" }])}>+ Pagamento</button>
                    <div className={"diviso-stato" + (diff < 0 ? " manca" : "")}>
                      Pagato {euro(pagato)} · {diff < 0 ? `mancano ${euro(-diff)}` : diff > 0 ? `resto ${euro(diff)}` : "giusto"}
                    </div>
                    <div className="azioni-conto">
                      <button onClick={() => setDivisi(null)}>Indietro</button>
                      <button className="primario" disabled={chiudo || diff < 0} onClick={() => incassaDiviso(divisi)}>Chiudi il conto</button>
                    </div>
                  </div>
                );
              })()}
              <div className="azioni-conto" hidden={!!divisi}>
                <button onClick={() => window.print()}>Stampa</button>
                <button className="primario" disabled={chiudo || padri.length === 0 || (conto.tavolo.coperti === 0 && !giaCoperto)} onClick={() => incassa("contanti")}>Contanti</button>
                <button className="primario" disabled={chiudo || padri.length === 0 || (conto.tavolo.coperti === 0 && !giaCoperto)} onClick={() => incassa("pos")}>POS</button>
                <button disabled={chiudo || padri.length === 0 || (conto.tavolo.coperti === 0 && !giaCoperto)}
                  onClick={() => setDivisi([{ metodo: "contanti", importo: totale.toFixed(2).replace(".", ",") }])}>Diviso o altro</button>
              </div>
            </section>
          </div>
        );
      })()}
      {coperti && (
        <div className="conto-velo coperti-velo" onClick={() => setCoperti(null)}>
          <section className="carta tastierino-coperti" role="dialog" aria-label="Coperti" onClick={(e) => e.stopPropagation()}>
            <header>
              <strong>Tavolo {nomeDi(coperti.tavolo)}: quanti coperti?</strong>
              <button className="chiudi-conto" onClick={() => setCoperti(null)}>✕</button>
            </header>
            <div className="numeri">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <button key={n} className={n === coperti.tavolo.coperti ? "primario" : ""} onClick={() => scegliCoperti(n)}>{n}</button>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
