"use client";

// App Rider: consegne libere e mie, prendi/ritirata/consegnata, naviga e chiama,
// posizione inviata in automatico al cloud (per la mappa live della cassa).
// Come l'app Velocissimo RIDER (REA, docs/rea/04_RIDER.md): il rider si prende da solo la prima
// comanda, vede le note fisse del cliente e come paga («paga con 50 → resto 26,50»), e in fondo lo
// storico delle consegne fatte e non ancora saldate alla cassa: dopo il dare-avere spariscono.
import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";
import type { ConsegnaRider, RiderBorsello } from "@/lib/types";

const num = (c: ConsegnaRider) => c.numero_visibile ?? `#${c.numero}`;

// Un «din» e una vibrazione quando arriva una consegna libera o la cassa me ne assegna una (critico
// giro 23: il rider non sapeva niente se non guardava). Il suono parte solo dopo il primo tocco sulla
// pagina: i telefoni non lasciano suonare una pagina che non è stata toccata.
let audio: AudioContext | null = null;
function sbloccaSuono() { try { audio ??= new AudioContext(); if (audio.state === "suspended") audio.resume(); } catch {} }
function avvisa() {
  try { navigator.vibrate?.([200, 100, 200]); } catch {}
  if (!audio) return;
  for (const [f, t] of [[880, 0], [1320, 0.18]] as const) {
    const o = audio.createOscillator(), g = audio.createGain();
    o.frequency.value = f; g.gain.setValueAtTime(0.25, audio.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + t + 0.3);
    o.connect(g).connect(audio.destination); o.start(audio.currentTime + t); o.stop(audio.currentTime + t + 0.32);
  }
}

const euro = (n: number) => n.toFixed(2).replace(".", ",") + " €";
const PIZZERIA = { lat: 41.9138, lng: 12.50734 };   // Via Novara 5/7: da qui parte il giro
const INSIEME_MIN = 5;                              // entro 5 minuti di strada due consegne vanno insieme
type Matrice = { fonte: string; minuti: (number | null)[][] };
const conPunto = (c: ConsegnaRider) => c.lat != null && c.lng != null;

// Il giro più corto a occhio: dalla pizzeria sempre alla tappa più vicina che resta. Con 2–4 tappe è
// quello che fa un rider; matrice[i][j] sono i minuti da i a j, con 0 = la pizzeria.
function ordineGiro(n: number, minuti: (number | null)[][]) {
  const resta = new Set(Array.from({ length: n }, (_, i) => i + 1)), giro: number[] = [];
  let da = 0;
  while (resta.size) {
    let meglio = -1, m = Infinity;
    for (const j of resta) { const t = minuti[da]?.[j] ?? Infinity; if (t < m || meglio < 0) { m = t; meglio = j; } }
    giro.push(meglio - 1); resta.delete(meglio); da = meglio;
  }
  return giro;
}
async function chiediTempi(origini: { lat: number; lng: number }[], destinazioni: { lat: number; lng: number }[]): Promise<Matrice | null> {
  const r = await fetch("/api/indirizzi/tempi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ origini, destinazioni }) }).catch(() => null);
  return r?.ok ? ((await r.json()) as Matrice) : null;
}

export default function RiderPagina() {
  return (
    <AuthGate>
      <Rider />
    </AuthGate>
  );
}

function Rider() {
  const [consegne, setConsegne] = useState<ConsegnaRider[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const [gps, setGps] = useState<string>("GPS spento");
  const [borsello, setBorsello] = useState<RiderBorsello | null>(null);
  const supabaseRef = useRef<ReturnType<typeof supabaseBrowser> | null>(null);
  const visti = useRef<Set<string> | null>(null);
  const [daConfermare, setDaConfermare] = useState<string | null>(null);
  // Come nell'app Velocissimo RIDER (Edoardo, 25/10/2026: «devono potersi assegnare le consegne esattamente
  // come sull'app loro»): si spuntano le comande libere e si prendono insieme, poi un solo «Parto».
  const [scelte, setScelte] = useState<Set<string>>(new Set());
  const [vicine, setVicine] = useState<Map<string, { con: string; min: number }>>(new Map());
  const [giro, setGiro] = useState<string | null>(null);

  const carica = useCallback(async () => {
    const supabase = supabaseRef.current!;
    const [{ data, error }, b, me] = await Promise.all([supabase.rpc("consegne_rider4"), supabase.rpc("rider_borsello"), supabase.from("profilo").select("ruolo, id_rider").maybeSingle()]);
    // È rider chi ha un rider collegato (mig. 0032): l'utenza della cassa fa anche da «Rider di prova».
    if (me.data && !me.data.id_rider) { setErrore(`Questa utenza è «${me.data.ruolo}» e non ha un rider collegato: le consegne si vedono entrando come rider. Da cassa: /cassa/rider e /cassa/mappa.`); return; }
    if (error) setErrore(error.message);
    else {
      const nuove = (data ?? []) as ConsegnaRider[];
      const id = (c: ConsegnaRider) => c.id + c.stato;
      if (visti.current && nuove.some((c) => (c.stato === "da_assegnare" || c.stato === "assegnata") && !visti.current!.has(id(c)))) avvisa();
      visti.current = new Set(nuove.map(id));
      setConsegne(nuove);
    }
    const mio = ((b.data ?? []) as RiderBorsello[])[0];
    if (mio) setBorsello({ ...mio, in_mano: Number(mio.in_mano), da_saldare: Number(mio.da_saldare) });
  }, []);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setErrore("Supabase non configurato.");
      return;
    }
    supabaseRef.current = supabaseBrowser();
    carica();

    // ogni cambio sulle consegne ricarica la lista (libere + mie)
    const canale = supabaseRef.current
      .channel("rider-consegne")
      .on("postgres_changes", { event: "*", schema: "public", table: "consegna" }, () => carica())
      .subscribe();

    // posizione: inviata quando cambia, al massimo una volta ogni 10 secondi
    let ultimoInvio = 0;
    let watchId: number | null = null;
    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const ora = Date.now();
          if (ora - ultimoInvio < 10_000) return;
          ultimoInvio = ora;
          const { latitude: lat, longitude: lng } = pos.coords;
          setGps(`GPS attivo · ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          await supabaseRef.current!.rpc("segnala_posizione", { p_lat: lat, p_lng: lng });
        },
        // critico giro 15: il telefono parlava inglese («User denied Geolocation»)
        (e) => setGps(e.code === 1 ? "GPS negato: consenti la posizione a questo sito nelle impostazioni del telefono" : e.code === 2 ? "GPS: posizione non trovata, riprovo" : "GPS lento: riprovo"),
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
    }

    return () => {
      supabaseRef.current?.removeChannel(canale);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [carica]);

  // Lo schermo resta acceso finché ho consegne in corso: col telefono bloccato il browser smette di
  // mandare la posizione e il cliente vede il rider fermo (critico giro 23). In tasca serve l'app vera.
  const inCorso = consegne.some((c) => c.stato === "assegnata" || c.stato === "ritirata");
  useEffect(() => {
    if (!inCorso || !("wakeLock" in navigator)) return;
    let blocco: WakeLockSentinel | null = null, vivo = true;
    const chiedi = () => { if (document.visibilityState === "visible") navigator.wakeLock.request("screen").then((b) => { if (vivo) blocco = b; else b.release(); }).catch(() => {}); };
    chiedi();
    document.addEventListener("visibilitychange", chiedi);
    return () => { vivo = false; document.removeEventListener("visibilitychange", chiedi); blocco?.release().catch(() => {}); };
  }, [inCorso]);

  async function prendi(ids: string[]) {
    const presi: string[] = [];
    for (const id of ids) {
      // l'ha presa lui: niente suono (critico giro 24, vibrava anche al suo tocco)
      visti.current?.add(id + "assegnata");
      const { error } = await supabaseRef.current!.rpc("prendi_consegna", { p_id: id });
      if (error) { setErrore(presi.length ? `Prese ${presi.length}; le altre no: ${error.message}` : error.message); break; }
      presi.push(id);
    }
    setScelte(new Set());
    carica();
  }
  function spunta(id: string) {
    setScelte((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  // L'avviso al cliente «è partito, seguilo qui» nasce quando il rider la ritira (mig. 0032) e resta
  // in notifica_cliente in attesa della push nell'app: Edoardo (24/10) non vuole WhatsApp («a pagamento;
  // chi ha l'app ha già le autorizzazioni»). Come mandarla lo dice il REA.
  async function aggiorna(id: string, stato: "ritirata" | "consegnata") {
    const { error } = await supabaseRef.current!.rpc("aggiorna_consegna", { p_id: id, p_stato: stato });
    if (error) setErrore(error.message);
    else carica();
  }
  // «Parto»: tutte quelle prese in un tocco, nell'ordine del giro più corto. Parte solo la prima: l'avviso
  // al cliente della seconda nasce quando la prima è consegnata (mig. 0061, Edoardo 25/10/2026).
  async function parto(ids: string[]) {
    const ordine = await girOrdinato(ids.map((id) => mie.find((c) => c.id === id)!).filter(Boolean));
    const { error } = await supabaseRef.current!.rpc("parto_giro", { p_ids: ordine.map((c) => c.id) });
    if (error) setErrore(error.message);
    carica();
  }

  const libere = consegne.filter((c) => c.stato === "da_assegnare");
  const mie = consegne.filter((c) => c.stato === "assegnata" || c.stato === "ritirata");
  // critico giro 15: due consegne allo stesso indirizzo erano due schede uguali e nessuno diceva il contante totale
  const chiave = (c: ConsegnaRider) => [c.via, c.civico].filter(Boolean).join(" ").toLowerCase().trim();
  const insieme = (c: ConsegnaRider) => mie.filter((x) => x.id !== c.id && chiave(x) && chiave(x) === chiave(c)).map(num);
  const contantiMie = mie.reduce((t, c) => t + (c.pagato_online ? 0 : Number(c.contanti_da_incassare)), 0);
  const daSaldare = consegne.filter((c) => c.stato === "consegnata");
  const daRitirare = mie.filter((c) => c.stato === "assegnata");
  // la tappa in viaggio è quella di cui il rider ha già l'avviso; le altre aspettano la consegna prima
  const inViaggio = mie.find((c) => c.stato === "ritirata" && c.in_viaggio_il);

  // Quali libere stanno a pochi minuti da un'altra (libera o già mia): la doppia la propone l'app,
  // coi minuti per strada di Google se ci sono, se no in linea d'aria. Si ricalcola quando cambia l'elenco.
  const firmaLibere = consegne.filter((c) => c.stato !== "consegnata").map((c) => c.id).join(",");
  useEffect(() => {
    const libereP = libere.filter(conPunto).slice(0, 10);
    const tutte = [...libereP, ...mie.filter(conPunto)].slice(0, 10);
    if (!libereP.length || tutte.length < 2) { setVicine(new Map()); return; }
    let vivo = true;
    chiediTempi(libereP.map((c) => ({ lat: c.lat!, lng: c.lng! })), tutte.map((c) => ({ lat: c.lat!, lng: c.lng! }))).then((t) => {
      if (!vivo || !t) return;
      const m = new Map<string, { con: string; min: number }>();
      libereP.forEach((c, i) => {
        let meglio: { con: string; min: number } | null = null;
        tutte.forEach((x, j) => {
          const min = t.minuti[i]?.[j];
          if (x.id !== c.id && min != null && min <= INSIEME_MIN && (!meglio || min < meglio.min)) meglio = { con: (mie.includes(x) ? "la tua " : "") + num(x), min };
        });
        if (meglio) m.set(c.id, meglio);
      });
      setVicine(m);
    });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmaLibere]);

  // Il giro più corto fra le consegne date, partendo dalla pizzeria (con i minuti di Google se ci sono)
  async function girOrdinato(cons: ConsegnaRider[]): Promise<ConsegnaRider[]> {
    const tappe = cons.filter(conPunto);
    if (tappe.length < 2) return cons;
    const punti = [PIZZERIA, ...tappe.map((c) => ({ lat: c.lat!, lng: c.lng! }))];
    const t = await chiediTempi(punti, punti);
    return t ? ordineGiro(tappe.length, t.minuti).map((i) => tappe[i]) : tappe;
  }

  // «Naviga tutte»: Google Maps col giro dalla pizzeria, una tappa dopo l'altra nell'ordine più corto
  async function navigaTutte() {
    const tappe = mie.filter(conPunto);
    if (!tappe.length) return;
    setGiro("Calcolo il giro…");
    const lista = await girOrdinato(tappe);
    const ll = (c: ConsegnaRider) => `${c.lat},${c.lng}`;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${PIZZERIA.lat},${PIZZERIA.lng}&destination=${ll(lista.at(-1)!)}`
      + (lista.length > 1 ? `&waypoints=${encodeURIComponent(lista.slice(0, -1).map(ll).join("|"))}` : "") + "&travelmode=driving";
    setGiro("Giro: " + lista.map(num).join(" → "));
    window.open(url, "_blank", "noreferrer");
  }

  return (
    <main className="rider" onPointerDown={sbloccaSuono}>
      <h1>Rider — consegne</h1>
      <p className={"muto r-gps" + (gps.startsWith("GPS attivo") ? " on" : "")}>{gps}</p>
      {inCorso && <p className="muto r-gps">Tieni aperta questa pagina mentre consegni: lo schermo resta acceso e il cliente ti vede sulla mappa.</p>}
      {errore && <p className="r-errore">{errore}</p>}

      <h2>Le mie ({mie.length})</h2>
      {mie.length === 0 && <p className="muto">Nessuna consegna in corso.</p>}
      {mie.length > 1 && <p className="r-tutto"><span>In tutto da incassare in contanti</span><b>{euro(contantiMie)}</b></p>}
      {mie.length > 0 && (
        <div className="r-giro">
          {daRitirare.length > 0 && <button className="primario r-azione" onClick={() => parto(daRitirare.map((c) => c.id))}>{daRitirare.length > 1 ? `Parto con tutte e ${daRitirare.length}` : "Parto"}</button>}
          {mie.filter(conPunto).length > 1 && <button className="r-azione" onClick={navigaTutte}>Naviga tutte</button>}
          {giro && <span className="muto">{giro}</span>}
        </div>
      )}
      <div className="griglia">
        {mie.map((c) => (
          <SchedaConsegna key={c.id} c={c} insieme={insieme(c)}>
            {c.stato === "assegnata" && (
              <button className="primario r-azione" onClick={() => aggiorna(c.id, "ritirata")}>Ritirata</button>
            )}
            {c.stato === "ritirata" && c.in_viaggio_il && (
              <button className="primario r-azione" onClick={() => { if (daConfermare === c.id) { setDaConfermare(null); aggiorna(c.id, "consegnata"); } else { setDaConfermare(c.id); setTimeout(() => setDaConfermare((x) => (x === c.id ? null : x)), 4000); } }}>{daConfermare === c.id ? "Sicuro? Tocca ancora" : "Consegnata"}</button>
            )}
            {c.stato === "ritirata" && !c.in_viaggio_il && (
              <span className="muto r-attesa">In attesa: prima {inViaggio ? num(inViaggio) : "la consegna in corso"}. Il cliente sarà avvisato quando parti.</span>
            )}
          </SchedaConsegna>
        ))}
      </div>

      <h2 className="r-sez">Disponibili ({libere.length})</h2>
      {libere.length === 0 && <p className="muto">Nessuna consegna libera. Quando arriva, compare qui.</p>}
      {libere.length > 1 && <p className="muto r-spiega">Tocca «Aggiungi» su più comande e prendile insieme.</p>}
      <div className="griglia">
        {libere.map((c, i) => (
          <SchedaConsegna key={c.id} c={c} scelta={scelte.has(c.id)} vicina={vicine.get(c.id)}>
            <button className="primario r-azione" onClick={() => prendi([c.id])}>{i === 0 ? "La prendo io" : "Prendi"}</button>
            {libere.length > 1 && <button className={"r-azione r-aggiungi" + (scelte.has(c.id) ? " on" : "")} onClick={() => spunta(c.id)}>{scelte.has(c.id) ? "✓ Aggiunta" : "+ Aggiungi"}</button>}
          </SchedaConsegna>
        ))}
      </div>
      {scelte.size > 0 && (
        <div className="r-barra-scelte">
          <span>{scelte.size} {scelte.size === 1 ? "comanda" : "comande"}: {libere.filter((c) => scelte.has(c.id)).map(num).join(", ")}</span>
          <button className="primario" onClick={() => prendi(libere.filter((c) => scelte.has(c.id)).map((c) => c.id))}>Le prendo io</button>
          <button onClick={() => setScelte(new Set())}>Annulla</button>
        </div>
      )}

      <h2 className="r-sez">Da saldare alla cassa ({daSaldare.length})</h2>
      {borsello && (
        <p className="muto r-borsello">
          Hai in mano <b>{euro(borsello.in_mano)}</b>
          {borsello.da_saldare > 0 && <> · da versare in cassa {euro(borsello.da_saldare)}</>}
          . A fine serata si fa il dare-avere in cassa e queste spariscono.
        </p>
      )}
      {daSaldare.length === 0 && <p className="muto">Niente da saldare.</p>}
      <div className="griglia">
        {daSaldare.map((c) => (
          <article key={c.id} className="carta r-saldo">
            <span className="chi"><strong>{num(c)}</strong> <span className="muto">{c.consegnata_il ? new Date(c.consegnata_il).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : ""} · {[c.via, c.civico].filter(Boolean).join(" ")}</span></span>
            <span className="cifra">{c.pagato_online ? "già pagato" : c.pagamento === "pos" ? "POS" : euro(Number(c.contanti_da_incassare))}</span>
          </article>
        ))}
      </div>
    </main>
  );
}

function SchedaConsegna({ c, children, insieme = [], scelta = false, vicina }: { c: ConsegnaRider; children: React.ReactNode; insieme?: string[]; scelta?: boolean; vicina?: { con: string; min: number } }) {
  const indirizzo = [c.via, c.civico, c.cap, c.citta].filter(Boolean).join(" ");
  const naviga = c.lat && c.lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`
    : indirizzo
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(indirizzo)}`
      : null;
  return (
    <article className={"carta r-scheda" + (scelta ? " scelta" : "")}>
      <div className="r-intesta">
        <strong>{num(c)}</strong>
        <span className={`badge ${c.stato === "da_assegnare" ? "ricevuto" : "in_consegna"}`}>{c.stato.replace("_", " ")}</span>
        {c.stato !== "ritirata" && c.stato_ordine === "pronto" && <span className="badge pronto">pronto in cucina</span>}
      </div>
      <div className="muto r-quando">
        {c.zona ?? "—"} ·{" "}
        {c.ora_consegna
          ? "per le " + new Date(c.ora_consegna).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
          : "appena pronto"}
      </div>
      {indirizzo && <div className="r-via">{indirizzo}</div>}
      {insieme.length > 0 && <div className="r-insieme">Stesso indirizzo di <b>{insieme.join(", ")}</b>: portale insieme</div>}
      {vicina && <div className="r-insieme">A {vicina.min} min da <b>{vicina.con}</b>: falle insieme</div>}
      {c.cliente_nome && <div className="r-nome">{c.cliente_nome}</div>}
      {c.cliente_note && <div className="r-avviso">⚠ {c.cliente_note}</div>}
      <div className="r-soldi">
        {c.pagato_online
          ? <>Già pagato <span className="muto come">niente da incassare</span></>
          : c.pagamento === "pos"
            ? <>{euro(Number(c.totale))} <span className="muto come">col POS · niente contanti</span></>
            : Number(c.contanti_da_incassare) === 0
            ? <>Già pagato <span className="muto come">niente da incassare</span></>
            : <>{euro(Number(c.contanti_da_incassare))} <span className="muto come">in contanti</span>
                {c.paga_con != null && Number(c.paga_con) > Number(c.contanti_da_incassare) && (
                  <div className="resto">paga con {euro(Number(c.paga_con))} → resto {euro(Number(c.paga_con) - Number(c.contanti_da_incassare))}</div>
                )}</>}
      </div>
      <ul className="muto r-righe">
        {c.righe.map((r, i) => (
          <li key={i}>{Number(r.quantita)}× {r.descrizione}
            {r.variazioni?.length > 0 && <span className="r-var"> · {r.variazioni.map((v) => (v.tipo === "aggiunta" && !v.nome.startsWith("+") ? "+ " : "") + v.nome).join(", ")}</span>}</li>
        ))}
      </ul>
      {c.note && <div className="r-note">Note: {c.note}</div>}
      <div className="muto r-totale">Totale ordine {euro(Number(c.totale))}{c.stato === "assegnata" || c.stato === "da_assegnare" ? " · si ritira in pizzeria, Via Novara 5/7" : ""}</div>
      <div className="azioni r-azioni">
        {children}
        {naviga && <a href={naviga} target="_blank" rel="noreferrer"><button className="r-azione">Naviga</button></a>}
        {c.cliente_telefono && <a href={`tel:${c.cliente_telefono}`}><button className="r-azione">Chiama</button></a>}
      </div>
    </article>
  );
}
