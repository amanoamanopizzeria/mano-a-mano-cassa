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

/** Riga della lista consegne vista dal rider (funzione consegne_rider). */
export interface ConsegnaRider {
  id: string;
  id_ordine: string;
  stato: StatoConsegna;
  id_rider?: string | null;
  numero: number;
  tipo: TipoOrdine;
  canale: CanaleOrdine;
  totale: number;
  ora_consegna?: string | null;
  note?: string | null;
  contanti_da_incassare: number;
  cliente_nome?: string | null;
  cliente_telefono?: string | null;
  via?: string | null;
  civico?: string | null;
  cap?: string | null;
  citta?: string | null;
  lat?: number | null;
  lng?: number | null;
  zona?: string | null;
  righe: { descrizione: string; quantita: number; variazioni: Variazione[] }[];
  // mig. 0024: le note fisse del cliente, come paga, lo storico da saldare
  cliente_note?: string | null;
  pagamento?: "contanti" | "pos" | null;
  pagato_online?: boolean;
  paga_con?: number | null;
  consegnata_il?: string | null;
}

/** Il borsello di un rider visto dalla cassa (funzione rider_borsello, mig. 0024). */
export interface RiderBorsello {
  id: string; nome: string; telefono: string | null; attivo: boolean;
  prelievi: number; depositi: number; da_saldare: number; n_da_saldare: number; in_corso: number; in_mano: number;
}

/** Rider con ultima posizione, per la mappa della cassa (funzione rider_in_mappa). */
export interface RiderInMappa {
  id: string;
  nome: string;
  lat?: number | null;
  lng?: number | null;
  aggiornata_il?: string | null;
  consegne_in_corso: number;
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

/** Una fascia da 15 minuti della capacità di un giorno (funzione capacita_giorno). */
export type TipoBlocco = "produzione" | "consegne";

export interface CapacitaFascia {
  ora: string;
  inizio: string;
  pizze_max: number;
  pizze_occupate: number;
  consegne_max: number;
  consegne_occupate: number;
  bloccata_produzione: boolean;
  bloccata_consegne: boolean;
}
