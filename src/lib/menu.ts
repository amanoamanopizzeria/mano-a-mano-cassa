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
  incluso?: string | null;      // i menu: «1 supplì, 1 crocchetta, 3 mozzarelline» in omaggio (mig. 0023)
}
/** I listini di Velocissimo: L1 asporto (banco, ritiro, domicilio, totem), L2 sala/tavoli, L3 piattaforme (Deliverect). */
export type Listino = "asporto" | "tavolo";
export function prezzoDi(p: ProdottoMenu, listino: Listino) {
  return listino === "tavolo" && p.prezzo_tavolo != null ? p.prezzo_tavolo : p.prezzo;
}
export interface VarianteMenu { id: string; nome: string; prezzo: number; gruppo: string; id_categoria: string | null }
/** Quali gruppi di varianti vede una categoria (mig. 0021, come il back-office Velocissimo: pizze 5, pucce 4, burger 4 + salse, fritti e bevande nessuno). */
export interface GruppoCategoria { id_categoria: string; gruppo: string; ordine: number; min_n: number; max_n: number; max_gratis: number }

/** Un gruppo di scelta di un menu (mig. 0023): «Scegli la pizza» ×2 fra questi prodotti. */
export interface PacchettoGruppo { id: string; id_pacchetto: string; etichetta: string; quantita: number; ordine: number; scelte: string[] }

/** La scelta dentro un menu: una pizza o una bibita, a prezzo 0 (è nel menu), con i suoi extra a pagamento. */
export interface RigaFiglia {
  id_prodotto: string; descrizione: string; quantita: number; prezzo_unit: number;
  variazioni: Variazione[]; destinazione: "cucina" | "cassa" | "nessuna";
}
export interface RigaOrdine {
  chiave: string;            // prodotto + varianti (+ le scelte del menu): due righe uguali si sommano
  id_prodotto: string; descrizione: string; quantita: number; prezzo_unit: number;
  variazioni: Variazione[]; destinazione: "cucina" | "cassa" | "nessuna";
  figlie?: RigaFiglia[];
}

export async function leggiMenu(soloTotem = false) {
  const supabase = supabaseBrowser();
  let qc = supabase.from("categoria").select("id, nome, ordine, colore, destinazione, visibile_totem").order("ordine");
  let qp = supabase.from("prodotto").select("id, id_categoria, nome, descrizione, prezzo, prezzo_tavolo, foto_url, visibile_totem, incluso").eq("attivo", true).order("ordine");
  if (soloTotem) { qc = qc.eq("visibile_totem", true); qp = qp.eq("visibile_totem", true); }
  const [c, p, v, g, pg] = await Promise.all([
    qc, qp,
    supabase.from("variazione").select("id, nome, prezzo, gruppo, id_categoria").order("gruppo").order("nome"),
    supabase.from("categoria_gruppo_variazione").select("id_categoria, gruppo, ordine, min_n, max_n, max_gratis").order("ordine"),
    supabase.from("pacchetto_gruppo").select("id, id_pacchetto, etichetta, quantita, ordine, pacchetto_scelta(id_prodotto)").order("ordine"),
  ]);
  type PgRiga = { id: string; id_pacchetto: string; etichetta: string; quantita: number; ordine: number; pacchetto_scelta: { id_prodotto: string }[] };
  return {
    categorie: (c.data ?? []) as CategoriaMenu[],
    prodotti: ((p.data ?? []) as ProdottoMenu[]).map((x) => ({ ...x, prezzo: Number(x.prezzo), prezzo_tavolo: x.prezzo_tavolo == null ? null : Number(x.prezzo_tavolo) })),
    varianti: ((v.data ?? []) as VarianteMenu[]).map((x) => ({ ...x, prezzo: Number(x.prezzo) })),
    gruppi: (g.data ?? []) as GruppoCategoria[],
    pacchetti: ((pg.data ?? []) as PgRiga[]).map(({ pacchetto_scelta, ...x }) => ({ ...x, scelte: pacchetto_scelta.map((s) => s.id_prodotto) })) as PacchettoGruppo[],
    errore: c.error?.message ?? p.error?.message ?? v.error?.message ?? g.error?.message ?? pg.error?.message ?? null,
  };
}

/** I gruppi di varianti di una categoria, nell'ordine del back-office. Una categoria senza righe non ha varianti (Supplì, Coca cola). */
export function gruppiPerCategoria(gruppi: GruppoCategoria[], idCategoria: string | null): string[] {
  if (!idCategoria) return [];
  return gruppi.filter((g) => g.id_categoria === idCategoria).sort((a, b) => a.ordine - b.ordine).map((g) => g.gruppo);
}

/** Le varianti che valgono per una categoria: quelle dei suoi gruppi (più quelle attaccate proprio a lei). */
export function variantiPer(varianti: VarianteMenu[], idCategoria: string | null, gruppi: GruppoCategoria[]) {
  const ammessi = gruppiPerCategoria(gruppi, idCategoria);
  return varianti
    .filter((v) => v.id_categoria === idCategoria || (v.id_categoria === null && ammessi.includes(v.gruppo)))
    .sort((a, b) => (ammessi.indexOf(a.gruppo) - ammessi.indexOf(b.gruppo)) || a.nome.localeCompare(b.nome));
}

/** I gruppi presenti fra le varianti, nell'ordine in cui arrivano (variantiPer li ha già messi in fila). */
export function gruppiDi(varianti: VarianteMenu[]): string[] {
  return Array.from(new Set(varianti.map((v) => v.gruppo)));
}

/** I gruppi di scelta di un prodotto: vuoto per tutto quello che non è un menu. */
export function gruppiPacchetto(pacchetti: PacchettoGruppo[], idProdotto: string): PacchettoGruppo[] {
  return pacchetti.filter((g) => g.id_pacchetto === idProdotto).sort((a, b) => a.ordine - b.ordine);
}

/** Vero quando le scelte coprono tutti i gruppi del menu (2 pizze E la bibita). */
export function menuCompleto(gruppi: PacchettoGruppo[], scelte: ProdottoMenu[][]) {
  return gruppi.every((g, i) => (scelte[i]?.length ?? 0) === g.quantita);
}

/** Le righe figlie di un menu dalle scelte fatte, gruppo per gruppo: prezzo 0, nel menu c'è già. */
export function figlieDaScelte(gruppi: PacchettoGruppo[], scelte: ProdottoMenu[][], categorie: CategoriaMenu[]): RigaFiglia[] {
  const out: RigaFiglia[] = [];
  gruppi.forEach((_g, i) => {
    for (const p of scelte[i] ?? []) {
      const cat = categorie.find((c) => c.id === p.id_categoria);
      const gia = out.find((f) => f.id_prodotto === p.id && f.variazioni.length === 0);
      if (gia) gia.quantita += 1;
      else out.push({ id_prodotto: p.id, descrizione: p.nome, quantita: 1, prezzo_unit: 0, variazioni: [], destinazione: cat?.destinazione ?? "cucina" });
    }
  });
  return out;
}

const chiaveVar = (variazioni: Variazione[]) => variazioni.map((v) => v.tipo + ":" + v.nome).sort().join(",");
export function chiaveRiga(idProdotto: string, variazioni: Variazione[], figlie: RigaFiglia[] = []) {
  const f = figlie.map((x) => x.id_prodotto + "×" + x.quantita + "{" + chiaveVar(x.variazioni) + "}").sort().join(";");
  return idProdotto + "|" + chiaveVar(variazioni) + (f ? "|" + f : "");
}

export function nuovaRiga(p: ProdottoMenu, cat: CategoriaMenu | undefined, quantita: number, variazioni: Variazione[], listino: Listino = "asporto", figlie?: RigaFiglia[]): RigaOrdine {
  return {
    chiave: chiaveRiga(p.id, variazioni, figlie), id_prodotto: p.id, descrizione: p.nome, quantita,
    prezzo_unit: prezzoDi(p, listino), variazioni, destinazione: cat?.destinazione ?? "cucina",
    ...(figlie && figlie.length > 0 ? { figlie } : {}),
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

const prezzoVar = (variazioni: Variazione[]) => variazioni.reduce((s, v) => s + v.prezzo, 0);
/** Il prezzo della riga: prodotto + extra, più gli extra delle scelte del menu, per la quantità. */
export function prezzoRiga(r: RigaOrdine) {
  const figlie = (r.figlie ?? []).reduce((s, f) => s + (f.prezzo_unit + prezzoVar(f.variazioni)) * f.quantita, 0);
  return (r.prezzo_unit + prezzoVar(r.variazioni) + figlie) * r.quantita;
}
export function totaleRighe(righe: RigaOrdine[]) {
  return righe.reduce((s, r) => s + prezzoRiga(r), 0);
}

/** Quello che si manda alla funzione sul database (senza la chiave, che è solo del browser). */
export function righePerInvio(righe: RigaOrdine[]) {
  return righe.map(({ chiave: _c, ...r }) => r);
}

export const euro = (n: number) => n.toFixed(2).replace(".", ",") + " €";
