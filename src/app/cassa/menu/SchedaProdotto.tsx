"use client";

// La scheda per aggiungere o cambiare un prodotto (Edoardo, 26/10/2026: «aggiungere prodotti al computer e
// prodotti sull'app in maniera veloce»). Un prodotto solo, una scheda sola: quello che si salva qui è lo
// stesso tasto in cassa, la stessa riga su /ordina e sul totem. Come la scheda «Generali» del back-office di
// Velocissimo (REA 13.6), senza le sette schede che non usiamo: nome, categoria, i tre listini, dove si
// vende, descrizione, foto, codice. Il codice è il PLU che userà Deliverect per riconoscere il prodotto.
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export interface ProdottoScheda {
  id?: string;
  id_categoria: string | null;
  nome: string;
  descrizione: string | null;
  codice: string | null;
  prezzo: number;
  prezzo_tavolo: number | null;
  prezzo_piattaforme: number | null;
  aliquota_iva: number;
  foto_url: string | null;
  attivo: boolean;
  visibile_app: boolean;
  visibile_web: boolean;
  visibile_totem: boolean;
  ordine?: number;
}
export interface CategoriaScheda { id: string; nome: string; id_gruppo: string | null; ordine: number }

export const prodottoVuoto = (idCategoria: string | null): ProdottoScheda => ({
  id_categoria: idCategoria, nome: "", descrizione: null, codice: null, prezzo: 0, prezzo_tavolo: null, prezzo_piattaforme: null,
  aliquota_iva: 10, foto_url: null, attivo: true, visibile_app: true, visibile_web: true, visibile_totem: true,
});

// «8,50» e «8.50» valgono uguale; vuoto = nessun prezzo (per L2 e L3: vale quello d'asporto)
const leggiEuro = (s: string): number | null => {
  const t = s.trim().replace(/\s|€/g, "").replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN;
};
const scriviEuro = (n: number | null | undefined) => (n == null ? "" : n.toFixed(2).replace(".", ","));

export default function SchedaProdotto({ iniziale, categorie, gruppi, onChiudi, onSalvato }: {
  iniziale: ProdottoScheda;
  categorie: CategoriaScheda[];
  gruppi: { id: string; nome: string }[];
  onChiudi: () => void;
  onSalvato: (p: ProdottoScheda & { id: string }) => void;
}) {
  const nuovo = !iniziale.id;
  const [p, setP] = useState<ProdottoScheda>(iniziale);
  const [l1, setL1] = useState(iniziale.prezzo ? scriviEuro(iniziale.prezzo) : "");
  const [l2, setL2] = useState(scriviEuro(iniziale.prezzo_tavolo));
  const [l3, setL3] = useState(scriviEuro(iniziale.prezzo_piattaforme));
  const [salvo, setSalvo] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [fotoRotta, setFotoRotta] = useState(false);
  const cambia = <K extends keyof ProdottoScheda>(k: K, v: ProdottoScheda[K]) => { setErrore(null); setP((x) => ({ ...x, [k]: v })); };

  async function salva() {
    setErrore(null);
    const nome = p.nome.trim();
    const prezzo = leggiEuro(l1), tavolo = leggiEuro(l2), piattaforme = leggiEuro(l3);
    if (!nome) { setErrore("Scrivi il nome del prodotto."); return; }
    if (!p.id_categoria) { setErrore("Scegli la categoria: decide le varianti, la comanda e dove sta nel menù."); return; }
    // critico giro 31: l'errore dice QUALE prezzo, e un negativo non è «scrivi il prezzo»
    if (prezzo == null) { setErrore("Scrivi il prezzo d'asporto (es. 8,50)."); return; }
    if (Number.isNaN(prezzo)) { setErrore("Il prezzo d'asporto non va: scrivilo come 8,50 (niente lettere né segno meno)."); return; }
    if (Number.isNaN(tavolo)) { setErrore("Il prezzo di sala non va: scrivilo come 8,50 o lascialo vuoto."); return; }
    if (Number.isNaN(piattaforme)) { setErrore("Il prezzo piattaforme non va: scrivilo come 8,50 o lascialo vuoto."); return; }
    setSalvo(true);
    const supabase = supabaseBrowser();
    // un codice già usato da un altro prodotto confonderebbe Deliverect (PLU doppio: ne tiene uno solo)
    const codice = p.codice?.trim() || null;
    if (codice) {
      const { data: doppio } = await supabase.from("prodotto").select("id, nome").ilike("codice", codice.replace(/[\\%_]/g, "\\$&")).neq("id", p.id ?? "00000000-0000-0000-0000-000000000000").limit(1);
      if (doppio && doppio.length) { setSalvo(false); setErrore(`Il codice ${codice} è già di «${doppio[0].nome}»: due prodotti non possono avere lo stesso codice.`); return; }
    }
    let ordine = p.ordine;
    if (nuovo || p.id_categoria !== iniziale.id_categoria) {
      // in fondo alla sua categoria (anche quando la si cambia: critico giro 31)
      const { data: ultimo } = await supabase.from("prodotto").select("ordine").eq("id_categoria", p.id_categoria).order("ordine", { ascending: false }).limit(1);
      ordine = ((ultimo?.[0]?.ordine as number | undefined) ?? 0) + 1;
    }
    const riga = {
      id_categoria: p.id_categoria, nome, descrizione: p.descrizione?.trim() || null, codice,
      prezzo, prezzo_tavolo: tavolo, prezzo_piattaforme: piattaforme, aliquota_iva: p.aliquota_iva,
      foto_url: p.foto_url?.trim() || null, attivo: p.attivo,
      visibile_app: p.visibile_app, visibile_web: p.visibile_web, visibile_totem: p.visibile_totem, ordine,
    };
    const r = nuovo
      ? await supabase.from("prodotto").insert(riga).select("id").single()
      : await supabase.from("prodotto").update(riga).eq("id", p.id!).select("id").single();
    setSalvo(false);
    if (r.error || !r.data) { setErrore("Non salvato: " + (r.error?.message ?? "nessuna risposta")); return; }
    onSalvato({ ...p, ...riga, ordine: ordine ?? 0, id: (r.data as { id: string }).id });
  }

  const nomeGruppo = (id: string | null) => gruppi.find((g) => g.id === id)?.nome ?? "";
  return (
    <div className="me-velo" role="dialog" aria-modal="true" aria-label={nuovo ? "Nuovo prodotto" : `Modifica ${iniziale.nome}`} >
      {/* il fondo grigio non chiude: un tocco sbagliato perdeva tutta la scheda (critico giro 31) */}
      <form className="me-scheda carta" onSubmit={(e) => { e.preventDefault(); salva(); }}>
        <h2>{nuovo ? (iniziale.nome ? "Copia di un prodotto" : "Nuovo prodotto") : "Modifica prodotto"}</h2>

        <label className="me-campo">Nome
          <input autoFocus value={p.nome} onChange={(e) => cambia("nome", e.target.value)} placeholder="es. La patate e salsiccia" />
        </label>
        <label className="me-campo">Categoria
          <select value={p.id_categoria ?? ""} onChange={(e) => cambia("id_categoria", e.target.value || null)}>
            <option value="">Scegli…</option>
            {categorie.map((c) => <option key={c.id} value={c.id}>{nomeGruppo(c.id_gruppo) ? `${nomeGruppo(c.id_gruppo)} · ` : ""}{c.nome}</option>)}
          </select>
          <small className="muto">La categoria porta con sé le varianti (impasto, aggiunte), la stampa in cucina o in cassa e il posto nel menù.</small>
        </label>

        <fieldset className="me-prezzi">
          <legend>Prezzi</legend>
          <label>Asporto, app, totem <small>(L1)</small><input inputMode="decimal" value={l1} onChange={(e) => setL1(e.target.value)} placeholder="8,50" /></label>
          <label>Sala <small>(L2, vuoto = come asporto)</small><input inputMode="decimal" value={l2} onChange={(e) => setL2(e.target.value)} placeholder={l1 || "—"} /></label>
          <label>Piattaforme <small>(L3: Glovo, Deliveroo, Just Eat)</small><input inputMode="decimal" value={l3} onChange={(e) => setL3(e.target.value)} placeholder="vuoto = non va" /></label>
          <small className="muto">Sulle piattaforme va solo ciò che ha il prezzo L3 (e non sotto «In cassa» spento): per toglierlo da Glovo, svuota il prezzo piattaforme.</small>
        </fieldset>

        <fieldset className="me-dove">
          <legend>Dove si vende</legend>
          <label><input type="checkbox" checked={p.attivo} onChange={(e) => cambia("attivo", e.target.checked)} /> In cassa <small>(spento = non si vende da nessuna parte)</small></label>
          <label><input type="checkbox" checked={p.visibile_app && p.visibile_web} disabled={!p.attivo} onChange={(e) => setP((x) => ({ ...x, visibile_app: e.target.checked, visibile_web: e.target.checked }))} /> App e sito</label>
          <label><input type="checkbox" checked={p.visibile_totem} disabled={!p.attivo} onChange={(e) => cambia("visibile_totem", e.target.checked)} /> Totem</label>
        </fieldset>

        <label className="me-campo">Descrizione <small className="muto">(la leggono i clienti su app, sito e totem)</small>
          <textarea rows={3} value={p.descrizione ?? ""} onChange={(e) => cambia("descrizione", e.target.value)} placeholder="Pomodoro, fiordilatte, patate al forno, salsiccia" />
        </label>
        <div className="me-riga">
          <label className="me-campo">Foto (indirizzo dell&apos;immagine)
            <input value={p.foto_url ?? ""} onChange={(e) => cambia("foto_url", e.target.value)} placeholder="https://…" />
          </label>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {p.foto_url?.startsWith("http") && <img key={p.foto_url} className="me-foto" src={p.foto_url} alt="" onError={() => setFotoRotta(true)} onLoad={() => setFotoRotta(false)} />}
        </div>
        {fotoRotta && p.foto_url && <p className="m-errore">Questa foto non si apre: controlla l&apos;indirizzo, se no in app e sul totem resta il riquadro vuoto.</p>}
        <div className="me-riga">
          <label className="me-campo">Codice <small className="muto">(PLU per Deliverect)</small>
            <input value={p.codice ?? ""} onChange={(e) => cambia("codice", e.target.value)} placeholder="es. 24" />
          </label>
          <label className="me-campo">IVA
            <select value={p.aliquota_iva} onChange={(e) => cambia("aliquota_iva", Number(e.target.value))}>
              <option value={10}>10%</option><option value={4}>4%</option><option value={22}>22%</option>
            </select>
          </label>
        </div>

        {errore && <p className="m-errore" role="alert">{errore}</p>}
        <div className="me-azioni">
          <button type="button" onClick={onChiudi}>Annulla</button>
          <button type="submit" className="primario" disabled={salvo}>{salvo ? "Salvo…" : nuovo ? "Aggiungi al menù" : "Salva"}</button>
        </div>
      </form>
    </div>
  );
}
