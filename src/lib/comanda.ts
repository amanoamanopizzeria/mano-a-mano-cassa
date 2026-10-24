// La comanda in un posto solo: la pagina /cassa/comanda/[id] (carta dal browser) e la stampa ESC/POS
// sulle stampanti di rete (src/lib/stampa/escpos.ts) leggono lo stesso modello, così le due
// carte dicono le stesse cose. I dati arrivano da comanda_ordine (mig. 0043) o comanda_per_stampa (0047).
import type { Variazione } from "./types";

export interface RigaComanda {
  id?: string; id_riga_padre?: string | null; incluso?: string | null;
  descrizione: string; quantita: number; variazioni: Variazione[]; note: string | null;
  destinazione: "cucina" | "cassa" | "nessuna"; reparto: string; reparto_ordine: number;
  figlie?: RigaComanda[];
}
export interface Comanda {
  id: string; numero: number; numero_visibile?: string; canale: string; tipo: string; stato: string;
  creato_il: string; ora_consegna: string | null; totale: number; note: string | null;
  pagamento: "contanti" | "pos" | null; costo_consegna: number; cliente: string | null; telefono: string | null;
  cliente_note?: string | null; paga_con?: number | null; pagato_online?: boolean; sconto?: number; codice_coupon?: string | null;
  modificato_il?: string | null; stampe?: number;
  righe_prima?: { id: string; id_riga_padre: string | null; descrizione: string; quantita: number; variazioni: Variazione[] | null }[] | null;
  tavolo: number | string | null; indirizzo: { via: string; civico: string | null; cap: string | null; citta: string | null; zona: string | null } | null;
  righe: RigaComanda[];
}

export const TIPO_COMANDA: Record<string, string> = { banco: "AL BANCO", ritiro: "RITIRO", domicilio: "DOMICILIO", tavolo: "TAVOLO" };
export const CANALE_COMANDA: Record<string, string> = { app: "App", web: "Sito", totem: "Totem", telefono: "Telefono", cassa: "Cassa", glovo: "Glovo", deliveroo: "Deliveroo", justeat: "Just Eat" };

/** I numeri dal database arrivano come stringhe: una volta sola, qui. */
export function normalizzaComanda(d: Comanda): Comanda {
  return {
    ...d,
    totale: Number(d.totale),
    costo_consegna: Number(d.costo_consegna ?? 0),
    righe: (d.righe ?? []).map((r) => ({ ...r, quantita: Number(r.quantita), variazioni: r.variazioni ?? [] })),
  };
}

export interface RigaVista extends RigaComanda {
  figlie: RigaComanda[];
  /** «NUOVA » se tutta la riga è nuova rispetto alla prima stampa, «+1 (ora 2) » se è cresciuta, null se no. */
  segno: string | null;
}
export interface ComandaVista {
  reparti: { nome: string; righe: RigaVista[] }[];
  tolte: { descrizione: string; quante: number }[];
  /** i pezzi in cucina: le pizze vere, non la riga «Menu» che le contiene */
  pezzi: number;
}

const firma = (r: { descrizione: string; variazioni: Variazione[] | null }) =>
  r.descrizione.trim().toUpperCase() + "|" + (r.variazioni ?? []).map((v) => `${v.tipo}:${v.nome}`).sort().join(",");

/**
 * I reparti nell'ordine del menù; le righe «nessuna» (es. sconti) non vanno in cucina. Le scelte di un
 * menu (mig. 0023) stanno sotto il menu, non sparse nei reparti delle pizze. Dopo una modifica (mig. 0043)
 * le righe nuove si segnano e quelle tolte si elencano, così la cucina sa cosa è cambiato (critico giro 12).
 */
export function vistaComanda(c: Comanda): ComandaVista {
  const figlieDi = (id?: string) => (id ? c.righe.filter((x) => x.id_riga_padre === id) : []);
  const prima = c.modificato_il && c.righe_prima ? c.righe_prima.filter((r) => !r.id_riga_padre) : null;
  const contaPrima = new Map<string, number>();
  for (const r of prima ?? []) contaPrima.set(firma(r), (contaPrima.get(firma(r)) ?? 0) + Number(r.quantita));
  const contaAdesso = new Map<string, number>();
  for (const r of c.righe.filter((r) => !r.id_riga_padre)) contaAdesso.set(firma(r), (contaAdesso.get(firma(r)) ?? 0) + Number(r.quantita));
  const inPiu = (r: RigaComanda) => (prima ? Math.max(0, (contaAdesso.get(firma(r)) ?? 0) - (contaPrima.get(firma(r)) ?? 0)) : 0);

  const reparti: ComandaVista["reparti"] = [];
  for (const r of c.righe.filter((r) => r.destinazione !== "nessuna" && !r.id_riga_padre)) {
    const n = inPiu(r);
    const riga: RigaVista = { ...r, figlie: figlieDi(r.id), segno: n <= 0 ? null : n >= r.quantita ? "NUOVA " : `+${n} (ora ${r.quantita}) ` };
    const g = reparti.find((x) => x.nome === r.reparto);
    if (g) g.righe.push(riga); else reparti.push({ nome: r.reparto, righe: [riga] });
  }
  const tolte = (prima ?? []).filter((r) => (contaAdesso.get(firma(r)) ?? 0) < (contaPrima.get(firma(r)) ?? 0))
    .filter((r, i, a) => a.findIndex((x) => firma(x) === firma(r)) === i)
    .map((r) => ({ descrizione: r.descrizione, quante: (contaPrima.get(firma(r)) ?? 0) - (contaAdesso.get(firma(r)) ?? 0) }));
  const pezzi = c.righe.filter((r) => r.destinazione === "cucina" && !(r.id && c.righe.some((x) => x.id_riga_padre === r.id))).reduce((s, r) => s + r.quantita, 0);
  return { reparti, tolte, pezzi };
}

export const euroComanda = (n: number) => Number(n).toFixed(2).replace(".", ",");

/** «per le 20:30», «DOMANI alle 20:30», «sabato 25 ottobre alle 20:30»: tutto in ora di Roma. */
export function quandoComanda(iso: string, adesso = new Date()): { testo: string; forte: boolean } {
  const ora = (d: Date) => d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
  const giorno = (d: Date) => d.toLocaleDateString("it-IT", { timeZone: "Europe/Rome" });
  const d = new Date(iso), domani = new Date(adesso.getTime() + 86_400_000);
  if (giorno(d) === giorno(adesso)) return { testo: `per le ${ora(d)}`, forte: false };
  if (giorno(d) === giorno(domani)) return { testo: `DOMANI alle ${ora(d)}`, forte: true };
  return { testo: `${d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Rome" })} alle ${ora(d)}`, forte: true };
}
export const oraRoma = (iso: string) => new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
