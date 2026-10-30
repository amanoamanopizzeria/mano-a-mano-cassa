"use client";

// Riepilogo della giornata: ordini per canale e stato, pizze, consegne, incasso.
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";
import type { Ordine, OrdineRiga } from "@/lib/types";

type OrdineConRighe = Ordine & { ordine_riga: OrdineRiga[]; pagamento?: "contanti" | "pos" | null; pagato_online?: boolean };

export default function RiepilogoPagina() {
  return (
    <AuthGate>
      <Riepilogo />
    </AuthGate>
  );
}

// La serata, come nel database (giornata_lavorativa, mig. 0040): dopo mezzanotte è ancora la sera
// prima, il taglio è alle 06:00 di Roma. Critico giro 19: a mezzanotte e mezza la testa del riepilogo
// leggeva da mezzanotte e il blocco Cassa la serata: due giorni uno sopra l'altro.
const giornataDi = (iso: string) => new Date(new Date(iso).getTime() - 6 * 3_600_000).toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
const giornataOggi = () => giornataDi(new Date().toISOString());
function inizioGiornata(g: string): string {
  // le 06:00 di Roma di quel giorno, in UTC, con l'ora legale o senza
  for (const off of ["+02:00", "+01:00"]) {
    const d = new Date(`${g}T06:00:00${off}`);
    if (d.toLocaleTimeString("it-IT", { hour: "2-digit", timeZone: "Europe/Rome" }).startsWith("06")) return d.toISOString();
  }
  return new Date(`${g}T05:00:00Z`).toISOString();
}

// giorno di calendario più o meno uno (a mezzogiorno UTC: l'ora legale non sposta la data)
const spostaGiorno = (g: string, n: number) => new Date(Date.parse(g + "T12:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);
const domani = (g: string) => spostaGiorno(g, 1);
const ieri = (g: string) => spostaGiorno(g, -1);

function Riepilogo() {
  const [ordini, setOrdini] = useState<OrdineConRighe[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  // REA 21 D7: anche il riepilogo di una sera passata, per confrontarla col 2Bit. Di base la serata in corso.
  const [giornata, setGiornata] = useState(giornataOggi);
  // la serata in corso si ricalcola ogni minuto: una scheda lasciata aperta passa da sola alla sera nuova
  // alle 06:00, se stava guardando quella in corso (critico giro 41, G2)
  const [stasera, setStasera] = useState(giornataOggi);
  const staseraPrima = useRef(stasera);
  useEffect(() => {
    const t = setInterval(() => setStasera(giornataOggi()), 60_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const prima = staseraPrima.current;
    staseraPrima.current = stasera;
    if (prima !== stasera) setGiornata((g) => (g === prima ? stasera : g));
  }, [stasera]);
  const inCorso = giornata === stasera;
  const vaiA = (g: string) => setGiornata(g > stasera ? stasera : g);   // niente sere future (M4)

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) { setErrore("Supabase non configurato."); return; }
    const supabase = supabaseBrowser();
    // una risposta arrivata dopo il cambio di sera si butta (critico giro 41, G1)
    let viva = true;
    setOrdini([]); setErrore(null);
    async function carica() {
      const { data, error } = await supabase
        .from("ordine")
        .select("*, ordine_riga(*)")
        .or(`and(creato_il.gte.${inizioGiornata(giornata)},creato_il.lt.${inizioGiornata(domani(giornata))}),and(ora_consegna.gte.${inizioGiornata(giornata)},ora_consegna.lt.${inizioGiornata(domani(giornata))})`)
        .order("creato_il", { ascending: false });
      if (!viva) return;
      if (error) setErrore(error.message);
      // «di stasera» = per la serata in corso: un preordine di domani non conta (critico giro 4b);
      // un ordine senza ora è della serata in cui è stato fatto.
      else setOrdini(((data ?? []) as OrdineConRighe[]).filter((o) => giornataDi(o.ora_consegna ?? o.creato_il) === giornata));
    }
    carica();
    const canale = supabase
      .channel("riepilogo-" + giornata)
      .on("postgres_changes", { event: "*", schema: "public", table: "ordine" }, () => carica())
      .subscribe();
    return () => { viva = false; supabase.removeChannel(canale); };
  }, [giornata]);

  const validi = ordini.filter((o) => o.stato !== "annullato");
  const pizze = validi.reduce(
    (s, o) => s + o.ordine_riga.filter((r) => r.destinazione === "cucina").reduce((t, r) => t + Number(r.quantita), 0),
    0
  );
  const consegne = validi.filter((o) => o.tipo === "domicilio").length;
  const incasso = validi.reduce((s, o) => s + Number(o.totale), 0);
  // La chiusura di cassa: gli stessi numeri che diamo all'OS (vendite_giornata_totali, mig. 0044),
  // così il riepilogo e l'export non dicono due cifre per la stessa cosa. «Incassato» = dove stanno i
  // soldi: in cassa (contanti, POS), ai rider (contanti, POS), online nostro, piattaforme; e quanto
  // è ancora aperto. In più i contanti ancora in mano a ogni rider (rider_borsello).
  type Incassato = { contantiInCassa: number; posInCassa: number; contantiAiRider: number; posAiRider: number; onlineNostro: number; piattaforme: number; ancoraAperti: number; buoniPasto?: number; satispay?: number };
  const [incassato, setIncassato] = useState<Incassato | null>(null);
  const [riderDaSaldare, setRiderDaSaldare] = useState<{ nome: string; da_saldare: number }[]>([]);
  // al cambio di sera si svuota; a ogni ordine nuovo si rilegge senza far sparire i numeri (M5)
  useEffect(() => { setIncassato(null); setRiderDaSaldare([]); }, [giornata]);
  useEffect(() => {
    // la giornata lavorativa: dopo mezzanotte è ancora la sera prima (taglio alle 06:00 di Roma)
    let viva = true;
    supabaseBrowser().rpc("vendite_giornata_totali", { p_giornata: giornata }).then(({ data }) => {
      if (!viva) return;
      const d = data as { incassato?: Incassato } | null;
      setIncassato(d?.incassato ?? null);
    });
    // il borsello dei rider è quello di adesso: per una sera passata non vuol dire niente
    if (!inCorso) return () => { viva = false; };
    supabaseBrowser().rpc("rider_borsello").then(({ data }) => {
      if (!viva) return;
      setRiderDaSaldare(((data ?? []) as { nome: string; da_saldare: number }[]).filter((r) => Number(r.da_saldare) > 0).map((r) => ({ nome: r.nome, da_saldare: Number(r.da_saldare) })));
    });
    return () => { viva = false; };
  }, [ordini, giornata, inCorso]);
  const eur = (n: number) => n.toFixed(2).replace(".", ",") + " €";

  const perCanale = new Map<string, number>();
  for (const o of validi) perCanale.set(o.canale, (perCanale.get(o.canale) ?? 0) + 1);

  return (
    <main className="riepilogo">
      <h1>Riepilogo {inCorso ? "della serata" : "di " + new Date(giornata + "T12:00:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h1>
      <div className="r-giorno">
        <button type="button" onClick={() => vaiA(ieri(giornata))}>‹ Prima</button>
        <input type="date" value={giornata} max={stasera} onChange={(e) => e.target.value && vaiA(e.target.value)} aria-label="Serata" />
        <button type="button" disabled={giornata >= stasera} onClick={() => vaiA(domani(giornata))}>Dopo ›</button>
        {!inCorso && <button type="button" onClick={() => setGiornata(stasera)}>Stasera</button>}
      </div>
      {errore && <p className="r-errore">{errore}</p>}

      <div className="griglia r-cima">
        <div className="carta numero"><div className="eti">Ordini</div><strong>{validi.length}</strong></div>
        <div className="carta numero"><div className="eti">Pizze</div><strong>{pizze}</strong></div>
        <div className="carta numero"><div className="eti">Consegne</div><strong>{consegne}</strong></div>
        <div className="carta numero vino"><div className="eti">Venduto</div><strong>{eur(incasso)}</strong></div>
      </div>

      <h2>Cassa</h2>
      {incassato ? (
        <div className="r-cassa">
          <div className="carta numero vino principale"><div className="eti">In cassa · contanti</div><strong>{eur(Number(incassato.contantiInCassa))}</strong><small>quello che conti a fine serata</small></div>
          <div className="secondari">
            <div className="carta numero"><div className="eti">In cassa · POS</div><strong>{eur(Number(incassato.posInCassa))}</strong></div>
            <div className="carta numero"><div className="eti">Ai rider · contanti</div><strong>{eur(Number(incassato.contantiAiRider))}</strong></div>
            <div className="carta numero"><div className="eti">Ai rider · POS</div><strong>{eur(Number(incassato.posAiRider))}</strong></div>
            <div className="carta numero"><div className="eti">Online nostro</div><strong>{eur(Number(incassato.onlineNostro))}</strong></div>
            {Number(incassato.buoniPasto ?? 0) > 0 && <div className="carta numero"><div className="eti">Buoni pasto</div><strong>{eur(Number(incassato.buoniPasto))}</strong></div>}
            {Number(incassato.satispay ?? 0) > 0 && <div className="carta numero"><div className="eti">Satispay</div><strong>{eur(Number(incassato.satispay))}</strong></div>}
            {Number(incassato.piattaforme) > 0 && <div className="carta numero"><div className="eti">Piattaforme</div><strong>{eur(Number(incassato.piattaforme))}</strong></div>}
            <div className={"carta numero" + (Number(incassato.ancoraAperti) > 0 ? " aperti" : "")}><div className="eti">Ancora aperti</div><strong>{eur(Number(incassato.ancoraAperti))}</strong></div>
          </div>
          {riderDaSaldare.length > 0 && (
            <div className="carta in-mano">
              <div className="eti">In mano ai rider</div>
              {riderDaSaldare.map((r) => <div key={r.nome} className="riga"><span>{r.nome}</span><strong>{eur(r.da_saldare)}</strong></div>)}
            </div>
          )}
        </div>
      ) : <p className="muto">Leggo la cassa…</p>}

      <Conteggio giornata={giornata} attesoContanti={incassato ? Number(incassato.contantiInCassa) : null} attesoPos={incassato ? Number(incassato.posInCassa) : null} />

      <h2>Per canale</h2>
      <div className="griglia r-canali">
        {[...perCanale.entries()].map(([canale, n]) => (
          <div key={canale} className="carta numero"><div className="eti">{canale}</div><strong>{n}<small> {n === 1 ? "ordine" : "ordini"}</small></strong></div>
        ))}
        {perCanale.size === 0 && <p className="muto">{ordini.length > 0 ? `Nessun ordine valido (${ordini.length} annullati).` : inCorso ? "Nessun ordine stasera." : "Nessun ordine quella sera."}</p>}
      </div>

      {/* Giro 17 del grafico: gli ordini uno per uno stanno in un ramo chiuso (sono la parte lunga: 47 carte
          la sera del critico). Nessun numero tolto: si apre e c'è tutto. */}
      <details className="r-ramo">
        <summary><h2>Ordini <small>{ordini.length} · {validi.length} validi</small></h2></summary>
        <div className="griglia r-ordini">
          {ordini.map((o) => (
            <article key={o.id} className={"carta r-ordine " + o.stato}>
              <div className="r-testa">
                <strong className="r-num">{o.numero_visibile ?? `#${o.numero}`}</strong>
                <span className={`badge ${o.stato}`}>{o.stato.replace("_", " ")}</span>
              </div>
              <div className="muto r-dove">
                {o.canale} · {o.tipo}
                {o.ora_consegna && " · per le " + new Date(o.ora_consegna).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" })}
              </div>
              <div className="r-tot">{Number(o.totale).toFixed(2).replace(".", ",")} €</div>
            </article>
          ))}
        </div>
      </details>
    </main>
  );
}

// Fondo e conteggio di cassa (mig. 0077, REA 21 D7). A inizio sera il fondo, a fine sera i contanti
// contati e il totale del POS letto sul terminale; accanto quanto doveva esserci e la differenza.
// Append-only: un conteggio sbagliato non si corregge, se ne scrive un altro e vale l'ultimo.
type RigaConteggio = { id: number; momento: "fondo" | "chiusura"; contanti: number; pos: number | null; nota: string | null; creato_il: string; atteso_contanti: number | null; atteso_pos: number | null };
// «150», «150,50», «150.50», «1.234,50»: un punto seguito da tre cifre è delle migliaia solo se poi c'è la
// virgola o se i gruppi sono giusti; sopra 50.000 € in una sera è un errore di battitura (critico giro 41, L1)
const leggiEuro = (t: string) => {
  const x = t.replace(/\s|€/g, "");
  let n: number;
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(x) && x.includes(",")) n = Number(x.replace(/\./g, "").replace(",", "."));
  else if (/^\d+([.,]\d{1,2})?$/.test(x)) n = Number(x.replace(",", "."));
  else return null;
  return Number.isFinite(n) && n <= 50_000 ? Math.round(n * 100) / 100 : null;
};
const euro = (n: number) => n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const ora = (iso: string) => new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

function Conteggio({ giornata, attesoContanti, attesoPos }: { giornata: string; attesoContanti: number | null; attesoPos: number | null }) {
  const [righe, setRighe] = useState<RigaConteggio[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [fondo, setFondo] = useState("");
  const [contanti, setContanti] = useState("");
  const [pos, setPos] = useState("");
  const [nota, setNota] = useState("");
  const [invio, setInvio] = useState(false);

  const sera = useRef(giornata);
  sera.current = giornata;
  async function carica() {
    const g = giornata;
    const { data, error } = await supabaseBrowser().from("cassa_conteggio").select("id, momento, contanti, pos, nota, creato_il, atteso_contanti, atteso_pos").eq("giornata", g).order("creato_il", { ascending: false });
    if (sera.current !== g) return;   // nel frattempo si è cambiata sera (G1)
    if (error) setErrore(error.message);
    else setRighe(((data ?? []) as RigaConteggio[]).map((r) => ({ ...r, contanti: Number(r.contanti), pos: r.pos == null ? null : Number(r.pos), atteso_contanti: r.atteso_contanti == null ? null : Number(r.atteso_contanti), atteso_pos: r.atteso_pos == null ? null : Number(r.atteso_pos) })));
  }
  useEffect(() => { setRighe(null); setErrore(null); setFondo(""); setContanti(""); setPos(""); setNota(""); carica(); }, [giornata]); // eslint-disable-line react-hooks/exhaustive-deps

  async function scrivi(momento: "fondo" | "chiusura") {
    const c = leggiEuro(momento === "fondo" ? fondo : contanti);
    const p = momento === "chiusura" && pos.trim() !== "" ? leggiEuro(pos) : null;
    if (c === null || (momento === "chiusura" && pos.trim() !== "" && p === null)) { setErrore("Scrivi una cifra in euro, per esempio 150 o 150,50."); return; }
    if (giornata > giornataOggi()) { setErrore("Non si conta una sera che non è ancora cominciata."); return; }
    setInvio(true); setErrore(null);
    // il dovuto si scrive insieme al conteggio: se un rider salda dopo, la differenza di quella sera resta
    // quella che ha visto chi ha contato (Edoardo 27/10, critico giro 41 G3)
    const fondoOra = righe?.find((r) => r.momento === "fondo")?.contanti ?? 0;
    const atteso = momento === "chiusura" && attesoContanti !== null ? { atteso_contanti: Math.round((fondoOra + attesoContanti) * 100) / 100, atteso_pos: attesoPos } : {};
    const { error } = await supabaseBrowser().from("cassa_conteggio").insert({ giornata, momento, contanti: c, pos: p, nota: nota.trim() || null, ...atteso });
    setInvio(false);
    if (error) { setErrore(error.message); return; }
    setFondo(""); setContanti(""); setPos(""); setNota("");
    carica();
  }

  if (righe === null) return <><h2>Fondo e conteggio</h2><p className="muto">{errore ?? "Leggo il conteggio…"}</p></>;
  const ultimoFondo = righe.find((r) => r.momento === "fondo");
  const ultimaChiusura = righe.find((r) => r.momento === "chiusura");
  // un conteggio già fatto tiene il suo dovuto; senza conteggio (o per quelli di prima del 27/10) si calcola adesso
  const deveContanti = ultimaChiusura?.atteso_contanti ?? (attesoContanti === null ? null : (ultimoFondo?.contanti ?? 0) + attesoContanti);
  const devePos = ultimaChiusura?.atteso_contanti != null ? ultimaChiusura.atteso_pos : attesoPos;
  const diffContanti = ultimaChiusura && deveContanti !== null ? Math.round((ultimaChiusura.contanti - deveContanti) * 100) / 100 : null;
  const diffPos = ultimaChiusura?.pos != null && devePos != null ? Math.round((ultimaChiusura.pos - devePos) * 100) / 100 : null;
  const segno = (d: number) => (d === 0 ? "torna" : euro(Math.abs(d)) + (d > 0 ? " in più" : " in meno"));

  return (
    <section className="r-conteggio">
      <h2>Fondo e conteggio</h2>
      {errore && <p className="r-errore">{errore}</p>}
      <div className="griglia r-cont-griglia">
        <div className="carta r-cont">
          <div className="eti">Fondo di inizio sera</div>
          {ultimoFondo ? <strong>{euro(ultimoFondo.contanti)}</strong> : <p className="muto">Non scritto.</p>}
          {ultimoFondo && <small className="muto">alle {ora(ultimoFondo.creato_il)}{ultimoFondo.nota ? " · " + ultimoFondo.nota : ""}</small>}
          <form onSubmit={(e) => { e.preventDefault(); scrivi("fondo"); }}>
            <input inputMode="decimal" placeholder={ultimoFondo ? "Correggi il fondo" : "Fondo, es. 150"} value={fondo} onChange={(e) => setFondo(e.target.value)} aria-label="Fondo in euro" />
            <button type="submit" disabled={invio || fondo.trim() === ""}>{ultimoFondo ? "Riscrivi" : "Scrivi il fondo"}</button>
          </form>
        </div>
        <div className="carta r-cont">
          <div className="eti">Conteggio di fine sera</div>
          {ultimaChiusura ? (
            <>
              <div className="riga"><span>Contanti contati</span><strong>{euro(ultimaChiusura.contanti)}</strong></div>
              {deveContanti !== null && <div className="riga muto"><span>Dovevano esserci</span><span>{euro(deveContanti)}</span></div>}
              {diffContanti !== null && <div className={"riga diff" + (diffContanti === 0 ? " pari" : "")}><span>Differenza</span><strong>{segno(diffContanti)}</strong></div>}
              {ultimaChiusura.pos != null && <div className="riga"><span>POS dal terminale</span><strong>{euro(ultimaChiusura.pos)}</strong></div>}
              {ultimaChiusura.pos != null && devePos != null && <div className="riga muto"><span>POS in cassa</span><span>{euro(devePos)}</span></div>}
              {diffPos !== null && <div className={"riga diff" + (diffPos === 0 ? " pari" : "")}><span>Differenza POS</span><strong>{segno(diffPos)}</strong></div>}
              <small className="muto">alle {ora(ultimaChiusura.creato_il)}{ultimaChiusura.nota ? " · " + ultimaChiusura.nota : ""}</small>
            </>
          ) : <p className="muto">Non ancora contato.{!ultimoFondo && " Il fondo non è scritto: lo conto come zero."}</p>}
          <form onSubmit={(e) => { e.preventDefault(); scrivi("chiusura"); }}>
            <input inputMode="decimal" placeholder="Contanti contati" value={contanti} onChange={(e) => setContanti(e.target.value)} aria-label="Contanti contati in euro" />
            <input inputMode="decimal" placeholder="Totale POS (facoltativo)" value={pos} onChange={(e) => setPos(e.target.value)} aria-label="Totale POS in euro" />
            <input placeholder="Nota (facoltativa)" value={nota} onChange={(e) => setNota(e.target.value)} aria-label="Nota" />
            <button type="submit" disabled={invio || contanti.trim() === ""}>{ultimaChiusura ? "Riconta" : "Scrivi il conteggio"}</button>
          </form>
        </div>
      </div>
      {righe.length > 1 && (
        <details className="r-ramo">
          <summary><h2>Tutti i conteggi <small>{righe.length}</small></h2></summary>
          {righe.map((r) => <div key={r.id} className="riga r-cont-storia"><span>{ora(r.creato_il)} · {r.momento === "fondo" ? "fondo" : "conteggio"}</span><span>{euro(r.contanti)}{r.pos != null ? " · POS " + euro(r.pos) : ""}{r.nota ? " · " + r.nota : ""}</span></div>)}
        </details>
      )}
    </section>
  );
}
