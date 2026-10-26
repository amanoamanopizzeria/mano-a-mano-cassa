"use client";

// La scheda di una categoria (26/10/2026): nome, gruppo, colore del tasto in cassa, dove si stampa,
// se impegna il forno, dove si vede. Le varianti restano attaccate alla categoria (mig. 0021).
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export interface CategoriaCompleta {
  id?: string; nome: string; id_gruppo: string | null; ordine: number; colore: string | null;
  destinazione: "cucina" | "cassa" | "nessuna"; impegna_forno: boolean;
  visibile_app: boolean; visibile_web: boolean; visibile_totem: boolean;
}
/** Una categoria nuova prende stampa e forno dalle sorelle del suo gruppo: sotto Bar non nasce «pizza» (critico giro 32). */
export const categoriaVuota = (idGruppo: string | null, sorelle: CategoriaCompleta[] = []): CategoriaCompleta => {
  const modello = sorelle.find((c) => c.id_gruppo === idGruppo);
  return {
    nome: "", id_gruppo: idGruppo, ordine: 0, colore: null,
    destinazione: modello?.destinazione ?? "cucina", impegna_forno: modello?.impegna_forno ?? true,
    visibile_app: true, visibile_web: true, visibile_totem: true,
  };
};

/** Rinumera la fila delle categorie 1…n nell'ordine dato, scrivendo solo quelle che cambiano. */
export async function rinumeraCategorie(fila: { id?: string; ordine: number }[]): Promise<string | null> {
  const supabase = supabaseBrowser();
  for (const [i, x] of fila.entries()) {
    if (!x.id || x.ordine === i + 1) continue;
    const u = await supabase.from("categoria").update({ ordine: i + 1 }).eq("id", x.id);
    if (u.error) return u.error.message;
  }
  return null;
}

// i colori dei tasti della cassa 2Bit, più la terracotta del marchio
const COLORI = ["#A3452F", "#C0392B", "#E67E22", "#D4A017", "#27AE60", "#16A085", "#2980B9", "#8E44AD", "#7F8C8D", "#5D4037"];

export default function SchedaCategoria({ iniziale, gruppi, tutte, onChiudi, onSalvata }: {
  iniziale: CategoriaCompleta;
  tutte: CategoriaCompleta[];
  gruppi: { id: string; nome: string }[];
  onChiudi: () => void;
  onSalvata: (c: CategoriaCompleta & { id: string }) => void;
}) {
  const nuova = !iniziale.id;
  // i colori di oggi (quelli di Velocissimo) vengono prima: toccarne un altro non deve perdere il vecchio
  const colori = [...new Set([iniziale.colore, ...tutte.filter((x) => !/^prova/i.test(x.nome)).map((x) => x.colore), ...COLORI].filter((x): x is string => !!x).map((x) => x.toLowerCase()))];
  const [c, setC] = useState<CategoriaCompleta>(iniziale);
  const [salvo, setSalvo] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const cambia = <K extends keyof CategoriaCompleta>(k: K, v: CategoriaCompleta[K]) => { setErrore(null); setC((x) => ({ ...x, [k]: v })); };

  async function salva() {
    const nome = c.nome.trim();
    if (!nome) { setErrore("Scrivi il nome della categoria."); return; }
    if (!c.id_gruppo) { setErrore("Scegli il gruppo (Pizze, Cucina, Bar…)."); return; }
    setSalvo(true);
    const supabase = supabaseBrowser();
    let ordine = c.ordine;
    const cambiaPosto = nuova || c.id_gruppo !== iniziale.id_gruppo;
    const riga = {
      nome, id_gruppo: c.id_gruppo, ordine, colore: c.colore, destinazione: c.destinazione, impegna_forno: c.impegna_forno,
      visibile_app: c.visibile_app, visibile_web: c.visibile_web, visibile_totem: c.visibile_totem,
    };
    const r = nuova
      ? await supabase.from("categoria").insert(riga).select("id").single()
      : await supabase.from("categoria").update(riga).eq("id", c.id!).select("id").single();
    if (r.error || !r.data) { setSalvo(false); setErrore("Non salvata: " + (r.error?.message ?? "nessuna risposta")); return; }
    const id = (r.data as { id: string }).id;
    if (cambiaPosto) {
      // subito dopo la prima fila di sorelle del gruppo (critico giro 33: dopo «Menù» finiva dopo i vini),
      // poi tutta la fila si rinumera 1…n
      const fila = tutte.filter((x) => x.id !== id).sort((a, b) => a.ordine - b.ordine);
      let k = fila.findIndex((x) => x.id_gruppo === c.id_gruppo);
      if (k < 0) k = fila.length; else { while (k < fila.length && fila[k].id_gruppo === c.id_gruppo) k++; }
      fila.splice(k, 0, { ...riga, id });
      const e = await rinumeraCategorie(fila);
      if (e) { setSalvo(false); setErrore("Salvata, ma non spostata: " + e); return; }
      ordine = k + 1;
    }
    setSalvo(false);
    onSalvata({ ...c, ...riga, ordine, id });
  }

  return (
    <div className="me-velo" role="dialog" aria-modal="true" aria-label={nuova ? "Nuova categoria" : `Modifica ${iniziale.nome}`}>
      <form className="me-scheda carta" onSubmit={(e) => { e.preventDefault(); salva(); }}>
        <h2>{nuova ? "Nuova categoria" : "Modifica categoria"}</h2>
        <label className="me-campo">Nome
          <input autoFocus value={c.nome} onChange={(e) => cambia("nome", e.target.value)} placeholder="es. Pizze d'autunno" />
        </label>
        <label className="me-campo">Gruppo
          <select value={c.id_gruppo ?? ""} onChange={(e) => {
            const g = e.target.value || null;
            // una categoria nuova prende stampa e forno dal gruppo scelto
            if (nuova) { const m = categoriaVuota(g, tutte); setErrore(null); setC((x) => ({ ...x, id_gruppo: g, destinazione: m.destinazione, impegna_forno: m.impegna_forno })); }
            else cambia("id_gruppo", g);
          }}>
            <option value="">Scegli…</option>
            {gruppi.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
          </select>
        </label>

        <fieldset className="me-dove">
          <legend>Colore del tasto in cassa</legend>
          <div className="me-colori">
            {colori.map((col) => (
              <button key={col} type="button" className={"me-colore" + (c.colore?.toLowerCase() === col ? " scelto" : "")} style={{ background: col }}
                aria-label={`Colore ${col}`} aria-pressed={c.colore?.toLowerCase() === col} onClick={() => cambia("colore", col)} />
            ))}
            <button type="button" className={"me-colore nessuno" + (!c.colore ? " scelto" : "")} aria-pressed={!c.colore} onClick={() => cambia("colore", null)}>nessuno</button>
          </div>
        </fieldset>

        <fieldset className="me-dove">
          <legend>Comanda</legend>
          <label><input type="radio" name="dest" checked={c.destinazione === "cucina"} onChange={() => cambia("destinazione", "cucina")} /> Si stampa in cucina</label>
          <label><input type="radio" name="dest" checked={c.destinazione === "cassa"} onChange={() => cambia("destinazione", "cassa")} /> Si stampa in cassa <small>(bibite, dolci pronti)</small></label>
          <label><input type="radio" name="dest" checked={c.destinazione === "nessuna"} onChange={() => cambia("destinazione", "nessuna")} /> Non si stampa</label>
          <label><input type="checkbox" checked={c.impegna_forno} onChange={(e) => cambia("impegna_forno", e.target.checked)} /> Conta come pizza nei quarti d&apos;ora <small>(il forno)</small></label>
        </fieldset>

        <fieldset className="me-dove">
          <legend>Dove si vede</legend>
          <label><input type="checkbox" checked={c.visibile_app && c.visibile_web} onChange={(e) => setC((x) => ({ ...x, visibile_app: e.target.checked, visibile_web: e.target.checked }))} /> App e sito</label>
          <label><input type="checkbox" checked={c.visibile_totem} onChange={(e) => cambia("visibile_totem", e.target.checked)} /> Totem</label>
          <small>In cassa si vede sempre. Una categoria senza prodotti accesi non compare da nessuna parte.</small>
        </fieldset>

        {nuova && <p className="muto">Una categoria nuova parte senza varianti (impasto, aggiunte): per una pizza nuova conviene metterla in una categoria di pizze che c&apos;è già.</p>}
        {errore && <p className="m-errore">{errore}</p>}
        <div className="me-azioni">
          <button type="button" onClick={onChiudi}>Annulla</button>
          <button type="submit" className="primario" disabled={salvo}>{salvo ? "Salvo…" : "Salva"}</button>
        </div>
      </form>
    </div>
  );
}
