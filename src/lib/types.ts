// Tipi del dominio, specchio dello schema in supabase/migrations.

export type StatoOrdine =
  | "ricevuto"
  | "in_preparazione"
  | "pronto"
  | "in_consegna"
  | "consegnato"
  | "ritirato"
  | "annullato";

export type CanaleOrdine =
  | "app"
  | "totem"
  | "web"
  | "telefono"
  | "cassa"
  | "glovo"
  | "deliveroo"
  | "justeat";

export type TipoOrdine = "domicilio" | "ritiro" | "tavolo" | "banco";

export type StatoConsegna =
  | "da_assegnare"
  | "assegnata"
  | "ritirata"
  | "consegnata"
  | "annullata";

export interface Variazione {
  nome: string;
  prezzo: number;
  tipo: "aggiunta" | "rimozione" | "nota";
}

export interface OrdineRiga {
  id?: string;
  id_ordine?: string;
  id_prodotto?: string | null;
  descrizione: string;
  quantita: number;
  prezzo_unit: number;
  variazioni: Variazione[];
  note?: string | null;
  destinazione: "cucina" | "cassa" | "nessuna";
}

export interface Ordine {
  id: string;
  id_negozio: string;
  numero: number;
  canale: CanaleOrdine;
  tipo: TipoOrdine;
  stato: StatoOrdine;
  id_cliente?: string | null;
  id_indirizzo?: string | null;
  id_zona?: string | null;
  ora_consegna?: string | null;
  totale: number;
  note?: string | null;
  id_esterno?: string | null;
  creato_il: string;
  aggiornato_il: string;
}

export interface NuovoOrdine {
  id_negozio: string;
  canale: CanaleOrdine;
  tipo: TipoOrdine;
  id_cliente?: string | null;
  id_indirizzo?: string | null;
  id_zona?: string | null;
  ora_consegna?: string | null;
  note?: string | null;
  id_esterno?: string | null;
  righe: OrdineRiga[];
}

export interface Consegna {
  id: string;
  id_ordine: string;
  id_rider?: string | null;
  stato: StatoConsegna;
  assegnata_il?: string | null;
  ritirata_il?: string | null;
  consegnata_il?: string | null;
  contanti_da_incassare: number;
  note?: string | null;
}

/** Il totale di un ordine = somma(righe × quantità + variazioni). */
export function calcolaTotale(righe: OrdineRiga[]): number {
  const tot = righe.reduce((acc, r) => {
    const varTot = r.variazioni.reduce((a, v) => a + v.prezzo, 0);
    return acc + (r.prezzo_unit + varTot) * r.quantita;
  }, 0);
  return Math.round(tot * 100) / 100;
}

/** Transizioni di stato ammesse per un ordine. */
export const TRANSIZIONI_ORDINE: Record<StatoOrdine, StatoOrdine[]> = {
  ricevuto: ["in_preparazione", "annullato"],
  in_preparazione: ["pronto", "annullato"],
  pronto: ["in_consegna", "ritirato", "annullato"],
  in_consegna: ["consegnato", "annullato"],
  consegnato: [],
  ritirato: [],
  annullato: [],
};

export function transizioneValida(da: StatoOrdine, a: StatoOrdine): boolean {
  return TRANSIZIONI_ORDINE[da].includes(a);
}
