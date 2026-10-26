// Un ordine di Deliverect (Glovo, Deliveroo, Just Eat) tradotto nelle righe della nostra cassa.
// Il prodotto si riconosce dal PLU (critico giro 31, D7: prima si leggeva solo il nome), con gli stessi
// PLU che costruisce menu.ts: il codice del prodotto, «V<id Velocissimo>», «VAR<id>» per le varianti,
// «M-<plu>» per le scelte dentro un menu. Se il PLU non si trova si prova il nome; se non si trova
// nemmeno quello la riga entra lo stesso, col nome e il prezzo di Deliverect: un ordine pagato non si
// rifiuta per un prodotto che non conosciamo, lo si dice nella nota.
import type { Variazione } from "@/lib/types";

export interface ArticoloDx {
  plu?: string; name: string; price: number; quantity: number; remark?: string;
  subItems?: ArticoloDx[];
}
export interface ProdottoCatalogo { id: string; nome: string; codice: string | null; id_velocissimo: number | null; destinazione: "cucina" | "cassa" | "nessuna" }
export interface VariazioneCatalogo { nome: string; id_velocissimo: number | null; tipo: Variazione["tipo"] }

export interface RigaDx {
  id_prodotto: string | null; descrizione: string; quantita: number; prezzo_unit: number;
  variazioni: Variazione[]; note: string | null; destinazione: "cucina" | "cassa" | "nessuna";
  figlie?: Omit<RigaDx, "figlie">[];
}

const piccolo = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export function traduciArticoli(articoli: ArticoloDx[], prodotti: ProdottoCatalogo[], variazioni: VariazioneCatalogo[]) {
  const perCodice = new Map(prodotti.filter((p) => p.codice?.trim()).map((p) => [piccolo(p.codice!), p]));
  const perIdV = new Map(prodotti.filter((p) => p.id_velocissimo != null).map((p) => [p.id_velocissimo!, p]));
  const perNome = new Map(prodotti.map((p) => [piccolo(p.nome), p]));
  const varPerIdV = new Map(variazioni.filter((v) => v.id_velocissimo != null).map((v) => [v.id_velocissimo!, v]));
  const sconosciuti: string[] = [];

  const prodottoDi = (a: ArticoloDx): ProdottoCatalogo | null => {
    const plu = (a.plu ?? "").trim().replace(/^M-/, "");
    if (plu) {
      const c = perCodice.get(piccolo(plu));
      if (c) return c;
      const v = /^V(\d+)$/i.exec(plu);
      if (v && perIdV.get(Number(v[1]))) return perIdV.get(Number(v[1]))!;
    }
    return perNome.get(piccolo(a.name)) ?? null;
  };
  const variazioneDi = (a: ArticoloDx): VariazioneCatalogo | null => {
    const v = /^VAR(\d+)$/i.exec((a.plu ?? "").trim());
    return v ? varPerIdV.get(Number(v[1])) ?? null : null;
  };

  const riga = (a: ArticoloDx, figlia: boolean): RigaDx => {
    const p = prodottoDi(a);
    if (!p) sconosciuti.push(`${a.name}${a.plu ? ` (PLU ${a.plu})` : ""}`);
    const varianti: Variazione[] = [];
    const figlie: Omit<RigaDx, "figlie">[] = [];
    const note: string[] = a.remark ? [a.remark] : [];
    for (const s of a.subItems ?? []) {
      const v = variazioneDi(s);
      // una scelta del menu (M-…) o un prodotto nostro dentro un altro è una riga figlia, il resto è una variante
      if (!v && (s.plu?.startsWith("M-") || (!figlia && prodottoDi(s) && !(s.subItems?.length)))) {
        figlie.push(riga({ ...s, quantity: s.quantity || 1 }, true));
      } else {
        const tipo = v?.tipo ?? "aggiunta";
        for (let i = 0; i < Math.max(1, s.quantity || 1); i++) varianti.push({ nome: v?.nome ?? s.name, prezzo: (s.price ?? 0) / 100, tipo });
        // le varianti dei gruppi annidati (la pizza del menu con l'extra) restano col loro nome
        for (const ss of s.subItems ?? []) varianti.push({ nome: ss.name, prezzo: (ss.price ?? 0) / 100, tipo: "aggiunta" });
      }
    }
    return {
      id_prodotto: p?.id ?? null,
      descrizione: p?.nome ?? a.name,
      quantita: a.quantity || 1,
      prezzo_unit: (a.price ?? 0) / 100, // dentro un menu è il supplemento della scelta (di solito 0)
      variazioni: varianti,
      note: note.length ? note.join(" · ") : null,
      destinazione: p?.destinazione ?? "cucina",
      ...(figlie.length ? { figlie } : {}),
    };
  };

  const righe = articoli.map((a) => riga(a, false));
  return { righe, sconosciuti };
}
