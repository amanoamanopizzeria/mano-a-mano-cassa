// Un ordine di Deliverect (Glovo, Deliveroo, Just Eat) tradotto nelle righe della nostra cassa.
// Il prodotto si riconosce dal PLU (critico giro 31, D7: prima si leggeva solo il nome). I PLU possibili:
// - quelli di oggi, cioè i codici di Velocissimo (142 = L'arrabbiata, Edoardo 26/10), tradotti con la
//   tabella CODICI_VELOCISSIMO (critico giro 36, G1: nel nostro database i codici non ci sono ancora);
// - il nostro codice prodotto, «V<id Velocissimo>», «VAR<id>», «M-<plu>», «P-/G-» (i gruppi), cioè quelli
//   che costruisce l'anteprima menu.ts, per quando su Deliverect andrà il menù nostro.
// Se il PLU non si trova si prova il nome (sempre il prodotto acceso prima di una copia spenta); se non si
// trova nemmeno quello la riga entra lo stesso col nome e il prezzo di Deliverect, e la nota lo dice: un
// ordine pagato non si rifiuta per un prodotto che non conosciamo.
import type { Variazione } from "@/lib/types";
import { CODICI_VELOCISSIMO } from "./codici-velocissimo";

export interface ArticoloDx {
  plu?: string; name: string; price: number; quantity: number; remark?: string;
  modifierAction?: string;            // «NO»/«REMOVE» = senza (critico giro 36, M2)
  productType?: number;               // 3 = gruppo
  subItems?: ArticoloDx[];
}
export interface ProdottoCatalogo {
  id: string; nome: string; codice: string | null; id_velocissimo: number | null; attivo?: boolean;
  destinazione: "cucina" | "cassa" | "nessuna";
}
export interface VariazioneCatalogo { nome: string; id_velocissimo: number | null; tipo: Variazione["tipo"] }

export interface RigaDx {
  id_prodotto: string | null; descrizione: string; quantita: number; prezzo_unit: number;
  variazioni: Variazione[]; note: string | null; destinazione: "cucina" | "cassa" | "nessuna";
  figlie?: Omit<RigaDx, "figlie">[];
}

const piccolo = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
const euro = (centesimi: number | undefined) => (Number.isFinite(centesimi) ? (centesimi as number) / 100 : 0);
const eGruppo = (a: ArticoloDx) => a.productType === 3 || /^[PG]-/i.test(a.plu ?? "");
const eRimozione = (a: ArticoloDx) => /^(no|remove|removed)$/i.test(a.modifierAction ?? "") || /^(senza|no)\s/i.test(a.name);

export function traduciArticoli(
  articoli: ArticoloDx[], prodotti: ProdottoCatalogo[], variazioni: VariazioneCatalogo[],
  menuCombo: Set<string> = new Set(),   // i prodotti che sono menu (pacchetto_gruppo): solo loro hanno righe figlie
) {
  // l'acceso vince sempre sulla copia spenta (critico giro 36, M1: 46 nomi doppi)
  const ordinati = [...prodotti].sort((a, b) => Number(b.attivo !== false) - Number(a.attivo !== false));
  const primo = <K,>(chiave: (p: ProdottoCatalogo) => K | null) => {
    const m = new Map<K, ProdottoCatalogo>();
    for (const p of ordinati) { const k = chiave(p); if (k != null && !m.has(k)) m.set(k, p); }
    return m;
  };
  const perCodice = primo((p) => (p.codice?.trim() ? piccolo(p.codice) : null));
  const perIdV = primo((p) => p.id_velocissimo);
  const perNome = primo((p) => piccolo(p.nome));
  const varPerIdV = new Map(variazioni.filter((v) => v.id_velocissimo != null).map((v) => [v.id_velocissimo!, v]));
  const varPerNome = new Map(variazioni.map((v) => [piccolo(v.nome), v]));
  const sconosciuti: string[] = [];

  const perPlu = (pluGrezzo: string | undefined): ProdottoCatalogo | null => {
    const plu = (pluGrezzo ?? "").trim().replace(/^M-/i, "");
    if (!plu) return null;
    const c = perCodice.get(piccolo(plu));
    if (c) return c;
    const v = /^V(\d+)$/i.exec(plu);
    if (v) return perIdV.get(Number(v[1])) ?? null;
    // il codice di Velocissimo: se due prodotti lo portano (142, C072), vince quello acceso
    const ids = CODICI_VELOCISSIMO[plu.toLowerCase()] ?? [];
    const trovati = ids.map((id) => perIdV.get(id)).filter((x): x is ProdottoCatalogo => !!x);
    return trovati.find((x) => x.attivo !== false) ?? trovati[0] ?? null;
  };
  const prodottoDi = (a: ArticoloDx) => perPlu(a.plu) ?? perNome.get(piccolo(a.name)) ?? null;
  const variazioneDi = (a: ArticoloDx): VariazioneCatalogo | null => {
    const v = /^VAR(\d+)$/i.exec((a.plu ?? "").trim());
    if (v) return varPerIdV.get(Number(v[1])) ?? null;
    return varPerNome.get(piccolo(a.name.replace(/^(senza|no)\s+/i, ""))) ?? null;
  };

  // i gruppi (P-/G-, productType 3) non sono righe: si guarda dentro (critico giro 36, M3)
  const appiattisci = (xs: ArticoloDx[] = []): ArticoloDx[] =>
    xs.flatMap((s) => (eGruppo(s) ? appiattisci(s.subItems).map((x) => ({ ...x, quantity: (x.quantity || 1) * (s.quantity || 1) })) : [s]));

  // le varianti di un articolo, compresi gli extra annidati, ognuna per la sua quantità
  const variantiDi = (xs: ArticoloDx[]): Variazione[] => appiattisci(xs).flatMap((s) => {
    const v = variazioneDi(s);
    const tipo: Variazione["tipo"] = eRimozione(s) ? "rimozione" : v?.tipo ?? "aggiunta";
    const nome = v?.nome ?? s.name.replace(/^(senza|no)\s+/i, "");
    const una: Variazione = { nome, prezzo: euro(s.price), tipo };
    return [...Array.from({ length: Math.max(1, s.quantity || 1) }, () => una), ...variantiDi(s.subItems ?? [])];
  });

  const riga = (a: ArticoloDx): RigaDx => {
    const p = prodottoDi(a);
    if (!p) sconosciuti.push(`${a.name}${a.plu ? ` (PLU ${a.plu})` : ""}`);
    const sotto = appiattisci(a.subItems);
    // righe figlie solo dentro un menu (o col PLU «M-»): un extra che si chiama come un prodotto
    // («Chips di patate») resta un extra (critico giro 36, M4 e M5)
    const combo = !!p && menuCombo.has(p.id);
    const eFiglia = (s: ArticoloDx) => !variazioneDi(s) && (/^M-/i.test(s.plu ?? "") || (combo && !!prodottoDi(s)));
    const figlie = sotto.filter(eFiglia).map((s) => {
      const f = riga({ ...s, subItems: s.subItems });
      return { ...f, quantita: s.quantity || 1 };
    });
    return {
      id_prodotto: p?.id ?? null,
      descrizione: p?.nome ?? a.name,
      quantita: a.quantity || 1,
      prezzo_unit: euro(a.price), // dentro un menu è il supplemento della scelta (di solito 0)
      variazioni: variantiDi(sotto.filter((s) => !eFiglia(s))),
      note: a.remark || null,
      destinazione: p?.destinazione ?? "cucina",
      ...(figlie.length ? { figlie: figlie.map(({ figlie: _f, ...x }) => x) } : {}),
    };
  };

  const righe = articoli.map(riga);
  const totale = righe.reduce((t, r) => {
    const unita = (x: Omit<RigaDx, "figlie">) => x.prezzo_unit + x.variazioni.reduce((s, v) => s + v.prezzo, 0);
    return t + r.quantita * (unita(r) + (r.figlie ?? []).reduce((s, f) => s + f.quantita * unita(f), 0));
  }, 0);
  return { righe, sconosciuti, totale: Math.round(totale * 100) / 100 };
}
