"use client";

// Nuovo ordine in cassa: prodotti dal menù, tipo (banco, tavolo, asporto, domicilio),
// tavolo e cliente opzionali. Passa dalla stessa capacità di app, sito e totem.
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";

interface Prodotto { id: string; id_categoria: string | null; nome: string; prezzo: number }
interface Categoria { id: string; nome: string }
interface Tavolo { id: string; numero: string; stato: string }
type Tipo = "banco" | "tavolo" | "ritiro" | "domicilio";
interface Riga { id_prodotto: string; descrizione: string; quantita: number; prezzo_unit: number; destinazione: "cucina" }

export default function NuovoOrdinePagina() {
  return (
    <AuthGate>
      <NuovoOrdine />
    </AuthGate>
  );
}

function NuovoOrdine() {
  const [categorie, setCategorie] = useState<Categoria[]>([]);
  const [prodotti, setProdotti] = useState<Prodotto[]>([]);
  const [tavoli, setTavoli] = useState<Tavolo[]>([]);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [carrello, setCarrello] = useState<Riga[]>([]);
  const [tipo, setTipo] = useState<Tipo>("banco");
  const [idTavolo, setIdTavolo] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [esito, setEsito] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    const supabase = supabaseBrowser();
    (async () => {
      const [c, p, t] = await Promise.all([
        supabase.from("categoria").select("id, nome").order("ordine"),
        supabase.from("prodotto").select("id, id_categoria, nome, prezzo").eq("attivo", true).order("ordine"),
        supabase.from("tavolo").select("id, numero, stato").order("numero"),
      ]);
      setCategorie((c.data ?? []) as Categoria[]);
      setProdotti((p.data ?? []) as Prodotto[]);
      setTavoli((t.data ?? []) as Tavolo[]);
      setCategoria((c.data?.[0] as Categoria | undefined)?.id ?? null);
    })();
  }, []);

  function aggiungi(p: Prodotto) {
    setEsito(null);
    setCarrello((prev) => {
      const i = prev.findIndex((r) => r.id_prodotto === p.id);
      if (i >= 0) return prev.map((r, j) => (j === i ? { ...r, quantita: r.quantita + 1 } : r));
      return [...prev, { id_prodotto: p.id, descrizione: p.nome, quantita: 1, prezzo_unit: Number(p.prezzo), destinazione: "cucina" }];
    });
  }

  const totale = carrello.reduce((s, r) => s + r.quantita * r.prezzo_unit, 0);

  async function invia() {
    setErrore(null);
    const { data, error } = await supabaseBrowser().rpc("ordine_da_cassa", {
      p_tipo: tipo,
      p_righe: carrello,
      p_id_tavolo: tipo === "tavolo" ? idTavolo : null,
      p_id_cliente: null,
      p_note: note || null,
    });
    if (error) { setErrore(error.message); return; }
    const r = data as { esito: string; numero?: number; libere?: number; motivo?: string };
    if (r.esito === "accettato") {
      setEsito(`Ordine n. ${r.numero} inserito.`);
      setCarrello([]);
      setNote("");
    } else if (r.esito === "pieno") {
      setErrore(`Slot al completo${r.motivo ? ` (${r.motivo})` : ""}${r.libere !== undefined ? `: ne restano ${r.libere}` : ""}.`);
    } else {
      setErrore("Ordine non inserito: " + r.esito);
    }
  }

  return (
    <main>
      <h1>Nuovo ordine</h1>
      {errore && <p style={{ color: "var(--accento)" }}>{errore}</p>}
      {esito && <p>{esito}</p>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0" }}>
        {(["banco", "tavolo", "ritiro", "domicilio"] as Tipo[]).map((t) => (
          <button key={t} className={t === tipo ? "primario" : ""} onClick={() => setTipo(t)}>{t}</button>
        ))}
      </div>
      {tipo === "tavolo" && (
        <select value={idTavolo ?? ""} onChange={(e) => setIdTavolo(e.target.value || null)} style={{ marginBottom: 8 }}>
          <option value="">Scegli tavolo</option>
          {tavoli.map((t) => <option key={t.id} value={t.id}>{t.numero} ({t.stato})</option>)}
        </select>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {categorie.map((c) => (
          <button key={c.id} className={c.id === categoria ? "primario" : ""} onClick={() => setCategoria(c.id)}>{c.nome}</button>
        ))}
      </div>
      <div className="griglia">
        {prodotti.filter((p) => p.id_categoria === categoria).map((p) => (
          <button key={p.id} className="carta" onClick={() => aggiungi(p)} style={{ textAlign: "left" }}>
            <strong>{p.nome}</strong>
            <div className="muto">{Number(p.prezzo).toFixed(2)} €</div>
          </button>
        ))}
      </div>

      <div className="carta" style={{ marginTop: 16 }}>
        <strong>Comanda</strong>
        <ul style={{ marginTop: 6 }}>
          {carrello.map((r) => <li key={r.id_prodotto}>{r.quantita}× {r.descrizione}</li>)}
          {carrello.length === 0 && <li className="muto">Vuota</li>}
        </ul>
        <input placeholder="Note (es. senza cipolla)" value={note} onChange={(e) => setNote(e.target.value)} style={{ width: "100%", marginTop: 6 }} />
        <div style={{ margin: "8px 0", fontSize: 18 }}>{totale.toFixed(2)} €</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setCarrello([])} disabled={carrello.length === 0}>Svuota</button>
          <button className="primario" onClick={invia} disabled={carrello.length === 0 || (tipo === "tavolo" && !idTavolo)}>
            Invia in cucina
          </button>
        </div>
      </div>
    </main>
  );
}
