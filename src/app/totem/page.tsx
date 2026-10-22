"use client";

// Totem self-order, sulla stessa Wi-Fi della cassa. Il cliente sceglie dal menù;
// l'ordine passa dalla stessa capacità di app e sito. Accesso con il profilo del totem.
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";

interface Prodotto { id: string; id_categoria: string | null; nome: string; prezzo: number }
interface Categoria { id: string; nome: string; ordine: number }
interface Riga { id_prodotto: string; descrizione: string; quantita: number; prezzo_unit: number; destinazione: "cucina" }

export default function TotemPagina() {
  return (
    <AuthGate>
      <Totem />
    </AuthGate>
  );
}

function Totem() {
  const [categorie, setCategorie] = useState<Categoria[]>([]);
  const [prodotti, setProdotti] = useState<Prodotto[]>([]);
  const [carrello, setCarrello] = useState<Riga[]>([]);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [esito, setEsito] = useState<string | null>(null);

  useEffect(() => {
    const supabase = supabaseBrowser();
    (async () => {
      const [c, p] = await Promise.all([
        supabase.from("categoria").select("id, nome, ordine").eq("visibile_totem", true).order("ordine"),
        supabase.from("prodotto").select("id, id_categoria, nome, prezzo").eq("visibile_totem", true).eq("attivo", true).order("ordine"),
      ]);
      setCategorie((c.data ?? []) as Categoria[]);
      setProdotti((p.data ?? []) as Prodotto[]);
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
    const { data, error } = await supabaseBrowser().rpc("ordine_da_totem", { p_righe: carrello });
    if (error) { setEsito("Errore: " + error.message); return; }
    const r = data as { esito: string; numero?: number; libere?: number };
    if (r.esito === "accettato") { setEsito(`Ordine n. ${r.numero} inviato. Ritira lo scontrino alla cassa.`); setCarrello([]); }
    else if (r.esito === "pieno") setEsito("Questo orario è al completo: scegli un altro momento o chiedi alla cassa.");
    else setEsito("Ordine non inviato. Riprova o chiedi alla cassa.");
  }

  return (
    <main>
      <h1>Ordina qui</h1>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {categorie.map((c) => (
          <button key={c.id} className={c.id === categoria ? "primario" : ""} onClick={() => setCategoria(c.id)}>{c.nome}</button>
        ))}
      </div>
      <div className="griglia">
        {prodotti.filter((p) => p.id_categoria === categoria).map((p) => (
          <button key={p.id} className="carta" onClick={() => aggiungi(p)} style={{ textAlign: "left", fontSize: 18 }}>
            <strong>{p.nome}</strong>
            <div className="muto">{Number(p.prezzo).toFixed(2)} €</div>
          </button>
        ))}
      </div>

      <div className="carta" style={{ marginTop: 16 }}>
        <strong>Il tuo ordine</strong>
        <ul style={{ marginTop: 6 }}>
          {carrello.map((r) => (
            <li key={r.id_prodotto}>{r.quantita}× {r.descrizione}</li>
          ))}
          {carrello.length === 0 && <li className="muto">Vuoto</li>}
        </ul>
        <div style={{ margin: "8px 0", fontSize: 18 }}>{totale.toFixed(2)} €</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setCarrello([])} disabled={carrello.length === 0}>Svuota</button>
          <button className="primario" onClick={invia} disabled={carrello.length === 0}>Invia ordine</button>
        </div>
        {esito && <p style={{ marginTop: 8 }}>{esito}</p>}
      </div>
    </main>
  );
}
