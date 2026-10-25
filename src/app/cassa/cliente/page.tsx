"use client";

// Home della cassa: si digita il telefono, se il cliente è conosciuto si apre la scheda
// (nome, indirizzi, note fisse, ultimi ordini); se no si crea al volo.
// Quando il telefono squilla (tabella `chiamata`, scritta da /api/telefono/chiamata) il numero
// compare da solo e la scheda si apre: riconoscimento del chiamante, come fa oggi la cassa.
// L'indirizzo si cerca su Google Maps (o OpenStreetMap senza chiave): via, civico, CAP e coordinate.
import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";

interface Scheda {
  esito: "trovato" | "nuovo" | "numero_corto";
  telefono?: string;
  cliente?: { id: string; nome: string | null; telefono: string; note: string | null; punti?: number; credito?: number; tag?: string[]; black_list?: boolean; card?: string | null };
  indirizzi?: { id: string; via: string; civico: string | null; cap: string | null; citta: string | null; lat: number | null; lng: number | null; id_zona: string | null; note?: string | null }[];
  ultimi_ordini?: { numero: number; numero_visibile?: string | null; creato_il: string; totale: number; tipo: string; canale: string }[];
}
interface Suggerimento {
  testo: string; via: string | null; civico: string | null; cap: string | null; citta: string | null;
  lat: number | null; lng: number | null; place_id: string | null; fonte: "google" | "osm"; km: number | null;
  zona?: { nome: string; costo_consegna: number; minimo_ordine: number } | null;
}
interface Chiamata { id: string; numero: string; origine: string; ricevuta_il: string }

export default function ClientePagina() {
  return (
    <AuthGate>
      <Cliente />
    </AuthGate>
  );
}

function Cliente() {
  const [telefono, setTelefono] = useState("");
  const [scheda, setScheda] = useState<Scheda | null>(null);
  const [nome, setNome] = useState("");
  const [note, setNote] = useState("");
  // note di consegna: stanno sull'indirizzo (citofono, scala, piano), mig. 0057
  const [noteConsegna, setNoteConsegna] = useState("");
  const [cercaVia, setCercaVia] = useState("");
  const [suggerimenti, setSuggerimenti] = useState<Suggerimento[]>([]);
  const [fonte, setFonte] = useState<"google" | "osm" | null>(null);
  const [scelto, setScelto] = useState<Suggerimento | null>(null);
  const [civico, setCivico] = useState("");
  const [chiamata, setChiamata] = useState<Chiamata | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [salvato, setSalvato] = useState(false);
  const ultimaRicerca = useRef(0);

  const cerca = useCallback(async (numero: string) => {
    setErrore(null); setSalvato(false);
    const { data, error } = await supabaseBrowser().rpc("cerca_cliente", { p_telefono: numero });
    if (error) { setErrore(error.message); return; }
    const s = data as Scheda;
    setScheda(s);
    setNome(s.cliente?.nome ?? "");
    setNote(s.cliente?.note ?? "");
    setNoteConsegna("");
  }, []);

  // Dalla cassa («Serve l'indirizzo») si arriva col numero già nell'indirizzo della pagina.
  useEffect(() => {
    const tel = new URLSearchParams(window.location.search).get("telefono");
    if (tel) { setTelefono(tel); cerca(tel); }
  }, [cerca]);

  // Il telefono squilla: il numero arriva in tempo reale e la scheda si apre da sola.
  useEffect(() => {
    const supabase = supabaseBrowser();
    const canale = supabase
      .channel("chiamate")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chiamata" }, (p) => {
        const c = p.new as Chiamata;
        setChiamata(c);
        setTelefono(c.numero);
        cerca(c.numero);
        try { new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==").play().catch(() => {}); } catch {}
      })
      .subscribe();
    return () => { supabase.removeChannel(canale); };
  }, [cerca]);

  // Ricerca dell'indirizzo mentre si scrive (dopo 3 lettere, con un piccolo ritardo).
  useEffect(() => {
    const q = cercaVia.trim();
    if (scelto && q === scelto.testo) return;
    if (q.length < 3) { setSuggerimenti([]); return; }
    const mio = ++ultimaRicerca.current;
    const t = setTimeout(async () => {
      const r = await fetch("/api/indirizzi/cerca?q=" + encodeURIComponent(q));
      const j = (await r.json()) as { risultati: Suggerimento[]; fonte: "google" | "osm"; errore?: string };
      if (mio !== ultimaRicerca.current) return;
      if (j.errore) setErrore("Ricerca indirizzi: " + j.errore);
      setSuggerimenti(j.risultati ?? []);
      setFonte(j.fonte ?? null);
    }, 250);
    return () => clearTimeout(t);
  }, [cercaVia, scelto]);

  // Scelta una via senza civico (Google dà la via intera, 6 km di Nomentana), scrivendo il civico
  // si rifà la ricerca «via civico, città» così zona, km e mappa sono del portone, non della via.
  useEffect(() => {
    const n = civico.trim();
    if (!scelto || !n || scelto.civico === n || !scelto.via) return;
    const mio = ++ultimaRicerca.current;
    const t = setTimeout(async () => {
      const q = `${scelto.via} ${n}, ${scelto.citta ?? "Roma"}`;
      const r = await fetch("/api/indirizzi/cerca?q=" + encodeURIComponent(q));
      const j = (await r.json()) as { risultati: Suggerimento[] };
      if (mio !== ultimaRicerca.current) return;
      const primo = (j.risultati ?? [])[0];
      if (!primo) return;
      let pieno = primo;
      if (primo.fonte === "google" && primo.place_id && primo.lat == null) {
        const d = await fetch("/api/indirizzi/dettaglio?id=" + encodeURIComponent(primo.place_id));
        if (d.ok) pieno = { ...primo, ...(await d.json()) };
      }
      if (mio !== ultimaRicerca.current) return;
      if (!pieno.civico) pieno = { ...pieno, civico: n };   // Google non ha quel numero: teniamo quello scritto
      setScelto(pieno);
      setCercaVia(pieno.testo);
    }, 500);
    return () => clearTimeout(t);
  }, [civico, scelto]);

  async function scegli(s: Suggerimento) {
    let pieno = s;
    if (s.fonte === "google" && s.place_id && s.lat == null) {
      const r = await fetch("/api/indirizzi/dettaglio?id=" + encodeURIComponent(s.place_id));
      if (r.ok) pieno = { ...s, ...(await r.json()) };
    }
    setScelto(pieno);
    setCercaVia(pieno.testo);
    if (pieno.civico) setCivico(pieno.civico);
    setSuggerimenti([]);
  }

  // Edoardo, 25/10/2026: un cliente che non conosco lo devo poter compilare tutto, anche senza cercarlo prima.
  function nuovoCliente() {
    setErrore(null); setSalvato(false);
    setScheda({ esito: "nuovo", telefono });
    setNome(""); setNote(""); setNoteConsegna(""); setCercaVia(""); setScelto(null); setCivico("");
  }

  async function salva(eVai = false) {
    setErrore(null);
    if (telefono.replace(/\D/g, "").length < 6) { setErrore("Scrivi il numero di telefono del cliente."); return; }
    const via = scelto?.via ?? (cercaVia.trim() || null);
    const { data, error } = await supabaseBrowser().rpc("salva_cliente3", {
      p_telefono: telefono, p_nome: nome || null, p_note: note || null,
      p_via: via, p_civico: civico || scelto?.civico || null, p_cap: scelto?.cap ?? null, p_citta: scelto?.citta ?? "Roma",
      p_lat: scelto?.lat ?? null, p_lng: scelto?.lng ?? null, p_place_id: scelto?.place_id ?? null,
      p_note_consegna: noteConsegna || null,
    });
    if (error) { setErrore(error.message); return; }
    const r = data as { id_indirizzo: string | null };
    if (eVai) {
      window.location.href = "/cassa/nuovo?telefono=" + encodeURIComponent(telefono) + (r.id_indirizzo ? "&indirizzo=" + r.id_indirizzo : "");
      return;
    }
    setSalvato(true);
    setCercaVia(""); setScelto(null); setCivico("");
    await cerca(telefono);
  }

  async function provaChiamata() {
    const n = telefono || "3331234567";
    const { error } = await supabaseBrowser().rpc("segna_chiamata", { p_numero: n, p_origine: "prova" });
    if (error) setErrore(error.message);
  }

  return (
    <main className="cliente-pagina">
      <h1>Cassa — cliente</h1>
      {errore && <p className="cl-errore">{errore}</p>}

      {chiamata && (
        <div className="carta cl-chiamata">
          <span className="tel">📞</span>
          <div className="chi">
            <strong>Sta chiamando <span>{chiamata.numero}</span></strong>
            <div className="muto">{new Date(chiamata.ricevuta_il).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}{chiamata.origine === "prova" ? " · prova" : ""}</div>
          </div>
          <a href={"/cassa/nuovo?telefono=" + encodeURIComponent(chiamata.numero)} className="primario cl-prendi">Prendi l&apos;ordine</a>
          <button onClick={() => setChiamata(null)} aria-label="Chiudi" className="cl-chiudi">✕</button>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); cerca(telefono); }} className="carta cl-cerca">
        <input
          type="tel"
          inputMode="tel"
          placeholder="Numero di telefono"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
        />
        <button className="primario cerca" type="submit">Cerca</button>
        <button type="button" className="nuovo" onClick={nuovoCliente}>+ Nuovo cliente</button>
        <button type="button" onClick={provaChiamata} title="Simula una telefonata in arrivo con questo numero" className="prova">Prova chiamata</button>
      </form>

      {scheda?.esito === "numero_corto" && <p className="muto">Numero troppo corto.</p>}

      {scheda?.esito === "trovato" && scheda.cliente && (
        <div className={"carta cl-scheda" + (scheda.cliente.black_list ? " black" : "")}>
          <div className="cl-intesta">
            <strong className="cl-nome">{scheda.cliente.nome ?? "Senza nome"}</strong>
            <span className="cl-tel">{scheda.cliente.telefono}</span>
          </div>
          {(scheda.indirizzi ?? []).length > 0 && (
            <p className="cl-via">{scheda.indirizzi![0].via} {scheda.indirizzi![0].civico ?? ""}<span className="muto">{[scheda.indirizzi![0].cap, scheda.indirizzi![0].citta].filter(Boolean).join(" ")}</span></p>
          )}
          {scheda.cliente.note && (
            <p className="cl-note">
              <strong>Note fisse</strong>{scheda.cliente.note}
            </p>
          )}
          {!chiamata && (
            <a href={"/cassa/nuovo?telefono=" + encodeURIComponent(scheda.cliente.telefono)} className="primario cl-prendi">Prendi l&apos;ordine</a>
          )}
          {scheda.cliente.black_list && (
            <p className="cl-black">BLACK LIST: non si prende l&apos;ordine senza Edoardo.</p>
          )}
          <p className="muto cl-punti">
            <span className="stella">★ {scheda.cliente.punti ?? 0}</span> punti{Number(scheda.cliente.credito ?? 0) > 0 && <> · credito {Number(scheda.cliente.credito).toFixed(2).replace(".", ",")} €</>}{scheda.cliente.card && <> · card {scheda.cliente.card}</>}
            {(scheda.cliente.tag ?? []).length > 0 && <span className="cl-tags">{(scheda.cliente.tag ?? []).map((t) => <span key={t} className="cl-tag">{t}</span>)}</span>}
          </p>
          <h3>Indirizzi</h3>
          <ul className="c-lista">
            {(scheda.indirizzi ?? []).map((i) => (
              <li key={i.id}>
                {i.via} {i.civico ?? ""} {i.cap ?? ""} {i.citta ?? ""}
                {i.note && <span className="cl-nota-consegna"> · {i.note}</span>}
                {i.lat != null && i.lng != null && (
                  <a className="mappa-link" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${i.lat},${i.lng}`}>Mappa ↗</a>
                )}
              </li>
            ))}
            {(scheda.indirizzi ?? []).length === 0 && <li className="muto">Nessun indirizzo</li>}
          </ul>
          <h3>Ultimi ordini</h3>
          <ul className="c-lista">
            {(scheda.ultimi_ordini ?? []).map((o) => (
              <li key={o.numero}><span>{[o.numero_visibile ?? `#${o.numero}`, new Date(o.creato_il).toLocaleDateString("it-IT", { day: "numeric", month: "short" }), o.tipo].filter(Boolean).join(" · ")}</span><b>{Number(o.totale).toFixed(2).replace(".", ",")} €</b></li>
            ))}
            {(scheda.ultimi_ordini ?? []).length === 0 && <li className="muto">Nessun ordine</li>}
          </ul>
        </div>
      )}

      {scheda && scheda.esito !== "numero_corto" && (
        <div className="carta cl-modulo">
          <strong className="titolo">{scheda.esito === "nuovo" ? "Cliente nuovo: crea la scheda" : "Modifica la scheda o aggiungi un indirizzo"}</strong>
          {scheda.esito === "nuovo" && <input type="tel" inputMode="tel" placeholder="Telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />}
          <input placeholder="Nome e cognome" value={nome} onChange={(e) => setNome(e.target.value)} />
          <textarea placeholder="Note del cliente (es. allergico al lattosio, paga sempre col POS)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="cl-via-box">
            <div className="cl-via-fila">
              <input
                placeholder="Via (scrivi e scegli dalla lista)"
                value={cercaVia}
                onChange={(e) => { setCercaVia(e.target.value); setScelto(null); }}
                autoComplete="off"
                className="via"
              />
              <input placeholder="Civico" value={civico} onChange={(e) => setCivico(e.target.value)} className="civico" />
            </div>
            {suggerimenti.length > 0 && (
              <div className="carta cl-sugg">
                {suggerimenti.map((s, i) => (
                  <button key={i} type="button" onClick={() => scegli(s)}>
                    <span className="testo">{s.testo}</span>
                    {s.km != null && <span className="muto">{s.km.toFixed(1).replace(".", ",")} km</span>}
                  </button>
                ))}
                <div className="muto fonte">{fonte === "google" ? "Google Maps" : "OpenStreetMap (senza chiave Google)"}</div>
              </div>
            )}
          </div>
          {scelto && scelto.lat != null && (
            <div className="muto">
              {scelto.via ?? scelto.testo}{scelto.cap ? ", " + scelto.cap : ""}{scelto.citta ? " " + scelto.citta : ""} · {scelto.km != null ? `${scelto.km.toFixed(1).replace(".", ",")} km dalla pizzeria` : ""}
              {scelto.zona !== undefined && (
                scelto.zona
                  ? <div className="cl-zona ok">Zona {scelto.zona.nome} · consegna {scelto.zona.costo_consegna.toFixed(2).replace(".", ",")} € · minimo {scelto.zona.minimo_ordine.toFixed(0)} €</div>
                  : civico.trim() === "" && !scelto.civico
                    ? <div className="cl-zona civico">Scrivi il civico: la zona si decide sul portone, non sulla via.</div>
                    : <div className="cl-zona fuori">Fuori dalle zone di consegna: non consegniamo qui.</div>
              )}
            </div>
          )}
          <input placeholder="Note di consegna (citofono, scala, piano…)" value={noteConsegna} onChange={(e) => setNoteConsegna(e.target.value)} />
          <div className="cl-salva-fila">
            <button className="primario salva" onClick={() => salva(true)}>Salva e prendi l&apos;ordine</button>
            <button className="salva" onClick={() => salva(false)}>{salvato ? "Salvato" : "Salva soltanto"}</button>
          </div>
        </div>
      )}
    </main>
  );
}
