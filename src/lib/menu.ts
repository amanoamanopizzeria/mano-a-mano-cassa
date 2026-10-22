// Il menù letto una volta: categorie (con colore e destinazione), prodotti e varianti a gruppi.
// Lo usano il totem e la cassa; la riga d'ordine si costruisce qui, così i due dicono la stessa cosa.
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Variazione } from "@/lib/types";

export interface CategoriaMenu {
  id: string; nome: string; ordine: number; colore: string | null;
  destinazione: "cucina" | "cassa" | "nessuna"; visibile_totem: boolean;
}
export interface ProdottoMenu {
  id: string; id_categoria: string | null; nome: string; descrizione: string | null;
  prezzo: number; prezzo_tavolo: number | null; foto_url: string | null; visibile_totem: boolean;
}
/** I listini di Velocissimo: L1 asporto (banco, ritiro, domicilio, totem), L3 tavoli. L2 è per le piattaforme. */
export type Listino = "asporto" | "tavolo";
export function prezzoDi(p: ProdottoMenu, listino: Listino) {
  return listino === "tavolo" && p.prezzo_tavolo != null ? p.prezzo_tavolo : p.prezzo;
}
export interface VarianteMenu { id: string; nome: string; prezzo: number; gruppo: string; id_categoria: string | null }

export interface RigaOrdine {
  chiave: string;            // prodotto + varianti: due righe uguali si sommano
  id_prodotto: string; descrizione: string; quantita: number; prezzo_unit: number;
  variazioni: Variazione[]; destinazione: "cucina" | "cassa" | "nessuna";
}

export async function leggiMenu(soloTotem = false) {
  const supabase = supabaseBrowser();
  let qc = supabase.from("categoria").select("id, nome, ordine, colore, destinazione, visibile_totem").order("ordine");
  let qp = supabase.from("prodotto").select("id, id_categoria, nome, descrizione, prezzo, prezzo_tavolo, foto_url, visibile_totem").eq("attivo", true).order("ordine");
  if (soloTotem) { qc = qc.eq("visibile_totem", true); qp = qp.eq("visibile_totem", true); }
  const [c, p, v] = await Promise.all([qc, qp, supabase.from("variazione").select("id, nome, prezzo, gruppo, id_categoria").order("gruppo").order("nome")]);
  return {
    categorie: (c.data ?? []) as CategoriaMenu[],
    prodotti: ((p.data ?? []) as ProdottoMenu[]).map((x) => ({ ...x, prezzo: Number(x.prezzo), prezzo_tavolo: x.prezzo_tavolo == null ? null : Number(x.prezzo_tavolo) })),
    varianti: ((v.data ?? []) as VarianteMenu[]).map((x) => ({ ...x, prezzo: Number(x.prezzo) })),
    errore: c.error?.message ?? p.error?.message ?? v.error?.message ?? null,
  };
}

/** Le varianti che valgono per una categoria: le sue più quelle senza categoria (tutte le pizze). */
export function variantiPer(varianti: VarianteMenu[], idCategoria: string | null) {
  return varianti.filter((v) => v.id_categoria === null || v.id_categoria === idCategoria);
}

export function gruppiDi(varianti: VarianteMenu[]): string[] {
  return Array.from(new Set(varianti.map((v) => v.gruppo)));
}

export function chiaveRiga(idProdotto: string, variazioni: Variazione[]) {
  return idProdotto + "|" + variazioni.map((v) => v.tipo + ":" + v.nome).sort().join(",");
}

export function nuovaRiga(p: ProdottoMenu, cat: CategoriaMenu | undefined, quantita: number, variazioni: Variazione[], listino: Listino = "asporto"): RigaOrdine {
  return {
    chiave: chiaveRiga(p.id, variazioni), id_prodotto: p.id, descrizione: p.nome, quantita,
    prezzo_unit: prezzoDi(p, listino), variazioni, destinazione: cat?.destinazione ?? "cucina",
  };
}

/** Cambiato il tipo d'ordine (tavolo ↔ asporto) le righe già in comanda prendono il listino nuovo. */
export function riprezzaRighe(righe: RigaOrdine[], prodotti: ProdottoMenu[], listino: Listino): RigaOrdine[] {
  return righe.map((r) => {
    const p = prodotti.find((x) => x.id === r.id_prodotto);
    return p ? { ...r, prezzo_unit: prezzoDi(p, listino) } : r;
  });
}

/** Aggiunge una riga al carrello: se c'è già la stessa (prodotto e varianti), somma le quantità. */
export function aggiungiRiga(righe: RigaOrdine[], r: RigaOrdine): RigaOrdine[] {
  const i = righe.findIndex((x) => x.chiave === r.chiave);
  if (i >= 0) return righe.map((x, j) => (j === i ? { ...x, quantita: x.quantita + r.quantita } : x));
  return [...righe, r];
}

export function prezzoRiga(r: RigaOrdine) {
  return (r.prezzo_unit + r.variazioni.reduce((s, v) => s + v.prezzo, 0)) * r.quantita;
}
export function totaleRighe(righe: RigaOrdine[]) {
  return righe.reduce((s, r) => s + prezzoRiga(r), 0);
}

/** Quello che si manda alla funzione sul database (senza la chiave, che è solo del browser). */
export function righePerInvio(righe: RigaOrdine[]) {
  return righe.map(({ chiave: _c, ...r }) => r);
}

export const euro = (n: number) => n.toFixed(2).replace(".", ",") + " €";
