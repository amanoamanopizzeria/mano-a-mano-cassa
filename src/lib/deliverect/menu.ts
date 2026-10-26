// Il nostro menù nella forma che Deliverect si aspetta da un POS (POST /productAndCategories).
// Solo costruzione: qui non si manda niente. Serve a vedere oggi il menù che Glovo, Deliveroo e Just Eat
// riceverebbero, e a trovare prima i buchi (PLU doppi o mancanti, prezzo piattaforme vuoto).
// Riferimenti: docs/rea/23_MENU_E_DELIVERECT.md §23.4 e developers.deliverect.com
// (Insert/Update Products and Categories). Le tasse sono in millesimi di punto: 10% = 10000.
// I menu combo (bundle) seguono lo schema prodotto → gruppo di scelta → prodotto: da provare in staging.

export interface CategoriaDx { id: string; nome: string; ordine: number }
export interface ProdottoDx {
  id: string; id_categoria: string | null; nome: string; descrizione: string | null; codice: string | null;
  id_velocissimo: number | null; prezzo: number; prezzo_piattaforme: number | null; aliquota_iva: number;
  foto_url: string | null; attivo: boolean; esaurito_fino: string | null;
}
export interface VariazioneDx { id: string; nome: string; prezzo: number; gruppo: string; id_categoria: string | null; id_velocissimo: number | null; tipo: string }
export interface GruppoCatDx { id_categoria: string; gruppo: string; ordine: number; min_n: number; max_n: number; max_gratis: number }
export interface PacchettoDx { id: string; id_pacchetto: string; etichetta: string; quantita: number; ordine: number; scelte: string[] }

export interface ArticoloDeliverect {
  productType: 1 | 2 | 3;
  plu: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  deliveryTax: number; takeawayTax: number; eatInTax: number;
  posCategoryIds?: string[];
  subProducts?: string[];
  min?: number; max?: number; multiMax?: number; maxFree?: number;
  visible?: boolean;
}
export interface MenuDeliverect {
  accountId: string; locationId: string;
  categories: { posCategoryId: string; name: string; sortOrder: number }[];
  products: ArticoloDeliverect[];
}
export interface Avviso { grave: boolean; testo: string }

const centesimi = (euro: number) => Math.round(euro * 100);
const tassa = (iva: number) => Math.round(iva * 1000);
const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Il PLU di un prodotto: il codice se c'è, se no l'id di Velocissimo, se no un pezzo del nostro id. */
export function pluProdotto(p: Pick<ProdottoDx, "codice" | "id_velocissimo" | "id">): { plu: string; da: "codice" | "velocissimo" | "nostro" } {
  if (p.codice?.trim()) return { plu: p.codice.trim(), da: "codice" };
  if (p.id_velocissimo != null) return { plu: `V${p.id_velocissimo}`, da: "velocissimo" };
  return { plu: `N-${p.id.slice(0, 8)}`, da: "nostro" };
}
const pluVariazione = (v: VariazioneDx) => (v.id_velocissimo != null ? `VAR${v.id_velocissimo}` : `VAR-${v.id.slice(0, 8)}`);

/** Sulle piattaforme va ciò che è acceso e ha il prezzo L3; l'esaurito di stasera va ma non si vede. */
export function vaSullePiattaforme(p: ProdottoDx) {
  return p.attivo && p.prezzo_piattaforme != null;
}

export function costruisciMenu(
  dati: { categorie: CategoriaDx[]; prodotti: ProdottoDx[]; variazioni: VariazioneDx[]; gruppi: GruppoCatDx[]; pacchetti: PacchettoDx[] },
  ids: { accountId: string; locationId: string } = { accountId: "DA-DELIVERECT", locationId: "DA-DELIVERECT" },
  adesso = Date.now(),
): { menu: MenuDeliverect; avvisi: Avviso[]; pluDa: Record<string, number> } {
  const avvisi: Avviso[] = [];
  const pluDa: Record<string, number> = { codice: 0, velocissimo: 0, nostro: 0 };
  const inVendita = dati.prodotti.filter(vaSullePiattaforme);
  const perId = new Map(dati.prodotti.map((p) => [p.id, p]));
  const pluDi = new Map<string, string>();
  const visti = new Map<string, string>();
  for (const p of inVendita) {
    const { plu, da } = pluProdotto(p);
    pluDa[da]++;
    pluDi.set(p.id, plu);
    const altro = visti.get(plu);
    if (altro) avvisi.push({ grave: true, testo: `PLU «${plu}» doppio: ${altro} e ${p.nome}. Un ordine di uno arriverebbe come l'altro.` });
    else visti.set(plu, p.nome);
  }
  const senzaL3 = dati.prodotti.filter((p) => p.attivo && p.prezzo_piattaforme == null);
  if (senzaL3.length) avvisi.push({ grave: false, testo: `${senzaL3.length} prodotti accesi senza prezzo piattaforme (L3) restano fuori: ${senzaL3.slice(0, 6).map((p) => p.nome).join(", ")}${senzaL3.length > 6 ? "…" : ""}.` });

  const prodotti: ArticoloDeliverect[] = [];
  const giaMesso = new Set<string>();
  const metti = (a: ArticoloDeliverect) => { if (!giaMesso.has(a.plu)) { giaMesso.add(a.plu); prodotti.push(a); } };

  // varianti: una volta sola ciascuna (tipo 2), i gruppi per categoria (tipo 3)
  const pluGruppo = (idCat: string, gruppo: string) => `G-${idCat.slice(0, 6)}-${slug(gruppo)}`;
  for (const g of dati.gruppi) {
    const dentro = dati.variazioni
      .filter((v) => v.tipo !== "nota" && (v.id_categoria === g.id_categoria || (v.id_categoria === null && v.gruppo === g.gruppo)))
      .filter((v) => v.gruppo === g.gruppo);
    if (!dentro.length) continue;
    for (const v of dentro) {
      metti({ productType: 2, plu: pluVariazione(v), name: v.tipo === "rimozione" ? `Senza ${v.nome}` : v.nome, price: centesimi(Number(v.prezzo)), deliveryTax: 10000, takeawayTax: 10000, eatInTax: 10000 });
    }
    metti({ productType: 3, plu: pluGruppo(g.id_categoria, g.gruppo), name: g.gruppo, price: 0, deliveryTax: 0, takeawayTax: 0, eatInTax: 0,
      min: g.min_n, max: g.max_n, maxFree: g.max_gratis || undefined, subProducts: dentro.map(pluVariazione) });
  }

  // menu combo: ogni «Scegli la pizza» diventa un gruppo, e le scelte prodotti a prezzo 0 dentro il menu
  const pacchettiDi = new Map<string, PacchettoDx[]>();
  for (const pg of dati.pacchetti) pacchettiDi.set(pg.id_pacchetto, [...(pacchettiDi.get(pg.id_pacchetto) ?? []), pg]);
  for (const [idPacchetto, gruppi] of pacchettiDi) {
    if (!pluDi.has(idPacchetto)) continue;
    for (const pg of gruppi) {
      const scelte = pg.scelte.map((id) => perId.get(id)).filter((x): x is ProdottoDx => !!x && x.attivo);
      for (const s of scelte) {
        metti({ productType: 2, plu: `M-${pluProdotto(s).plu}`, name: s.nome, price: 0, deliveryTax: tassa(s.aliquota_iva), takeawayTax: tassa(s.aliquota_iva), eatInTax: tassa(s.aliquota_iva) });
      }
      metti({ productType: 3, plu: `P-${pg.id.slice(0, 8)}`, name: pg.etichetta, price: 0, deliveryTax: 0, takeawayTax: 0, eatInTax: 0,
        min: pg.quantita, max: pg.quantita, multiMax: pg.quantita, subProducts: scelte.map((s) => `M-${pluProdotto(s).plu}`) });
    }
  }

  for (const p of inVendita) {
    const iva = tassa(p.aliquota_iva);
    const gruppiCat = p.id_categoria ? dati.gruppi.filter((g) => g.id_categoria === p.id_categoria).sort((a, b) => a.ordine - b.ordine) : [];
    const sub = [
      ...(pacchettiDi.get(p.id) ?? []).sort((a, b) => a.ordine - b.ordine).map((pg) => `P-${pg.id.slice(0, 8)}`),
      ...gruppiCat.map((g) => pluGruppo(g.id_categoria, g.gruppo)).filter((plu) => giaMesso.has(plu)),
    ];
    const esaurito = !!p.esaurito_fino && new Date(p.esaurito_fino).getTime() > adesso;
    prodotti.push({
      productType: 1, plu: pluDi.get(p.id)!, name: p.nome, price: centesimi(p.prezzo_piattaforme!),
      description: p.descrizione ?? undefined, imageUrl: p.foto_url ?? undefined,
      deliveryTax: iva, takeawayTax: iva, eatInTax: iva,
      posCategoryIds: p.id_categoria ? [p.id_categoria] : [],
      subProducts: sub.length ? sub : undefined,
      visible: !esaurito,
    });
  }
  const senzaFoto = inVendita.filter((p) => !p.foto_url);
  if (senzaFoto.length) avvisi.push({ grave: false, testo: `${senzaFoto.length} senza foto (sulle piattaforme si vende peggio): ${senzaFoto.slice(0, 6).map((p) => p.nome).join(", ")}${senzaFoto.length > 6 ? "…" : ""}.` });

  const usate = new Set(inVendita.map((p) => p.id_categoria));
  const categories = dati.categorie.filter((c) => usate.has(c.id)).sort((a, b) => a.ordine - b.ordine)
    .map((c) => ({ posCategoryId: c.id, name: c.nome, sortOrder: c.ordine }));

  avvisi.sort((a, b) => Number(b.grave) - Number(a.grave));
  return { menu: { ...ids, categories, products: prodotti }, avvisi, pluDa };
}
