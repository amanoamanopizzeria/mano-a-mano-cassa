// Lo scontrino sulla Epson FP-81 II RT (192.168.1.200), solo i messaggi: qui NON si manda niente alla stampante.
// Il canale l'ha confermato lo studio del PC di cassa (REA 32 §32.6): una POST a http://{ip}/cgi-bin/fpmate.cgi,
// text/xml, in SOAP, con dentro printerFiscalReceipt (scontrino), printerFiscalReport (X/Z) o printerCommand
// (stato). I nomi dei comandi sono quelli del protocollo XML pubblico di Epson per le stampanti fiscali italiane
// (fpMate / ePOS-Fiscal), NON il codice del 2Bit (clean-room).
//
// ⚠️ Edoardo, 30/10/2026: nessuno scontrino, X o Z vero senza una prova in negozio insieme e il suo ok. Reparti,
// tipi di pagamento e messaggi dell'annullo vanno verificati sulla stampante vera (pagina di stato RT) prima
// di usarli: per questo qui ci sono solo funzioni pure che compongono il testo.

export interface RigaScontrino { descrizione: string; quantita: number; prezzo: number; reparto?: number }
export type PagamentoFiscale = "contanti" | "pos" | "buono_pasto" | "satispay";
export interface PagamentoScontrino { metodo: PagamentoFiscale; importo: number }
export interface Scontrino { righe: RigaScontrino[]; pagamenti: PagamentoScontrino[]; sconto?: number; operatore?: number }

// Tutto il menù è al 10 % (Edoardo, 30/10): un reparto solo. Il numero del reparto con l'IVA al 10 % va letto
// dalla programmazione della stampante: 1 è un'ipotesi da verificare.
export const REPARTO_IVA_10 = 1;
// paymentType del protocollo Epson: 0 contanti, 2 carta/POS, 3 ticket (buono pasto); «index» sceglie la voce
// programmata sulla stampante. Da verificare sulla programmazione vera prima della prova.
const TIPO_PAGAMENTO: Record<PagamentoFiscale, { tipo: number; indice: number; descrizione: string }> = {
  contanti: { tipo: 0, indice: 0, descrizione: "CONTANTI" },
  pos: { tipo: 2, indice: 1, descrizione: "POS" },
  buono_pasto: { tipo: 3, indice: 1, descrizione: "BUONO PASTO" },
  satispay: { tipo: 2, indice: 2, descrizione: "SATISPAY" },
};

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Gli importi come li vuole la stampante: virgola, due decimali. */
export const importo = (n: number) => (Math.round(n * 100) / 100).toFixed(2).replace(".", ",");
const quantita = (n: number) => (Math.round(n * 1000) / 1000).toString().replace(".", ",");
// la descrizione di una riga sullo scontrino ha 38 caratteri al massimo
const corta = (s: string, max = 38) => xml(s.normalize("NFKD").replace(/[^\x20-\x7E]/g, "").slice(0, max));

const busta = (corpo: string) =>
  `<?xml version="1.0" encoding="utf-8"?>\n<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>${corpo}</s:Body></s:Envelope>`;

/** Lo stato della stampante: il 2Bit lo chiede prima di ogni stampa e si ferma se è in periodo inattivo. */
export function xmlStato(operatore = 1): string {
  return busta(`<printerCommand><queryPrinterStatus operator="${operatore}" statusType="1" /></printerCommand>`);
}

/** Lo scontrino di vendita. Controlla che i pagamenti coprano il totale: il resto esce solo dai contanti. */
export function xmlScontrino(s: Scontrino): { xml: string; totale: number; resto: number } {
  const op = s.operatore ?? 1;
  if (s.righe.length === 0) throw new Error("scontrino senza righe");
  const totale = Math.round((s.righe.reduce((a, r) => a + r.prezzo * r.quantita, 0) - (s.sconto ?? 0)) * 100) / 100;
  const pagato = Math.round(s.pagamenti.reduce((a, p) => a + p.importo, 0) * 100) / 100;
  if (pagato < totale) throw new Error(`mancano ${importo(totale - pagato)} €`);
  const fuoriContanti = s.pagamenti.filter((p) => p.metodo !== "contanti").reduce((a, p) => a + p.importo, 0);
  if (fuoriContanti > totale + 0.001) throw new Error("il resto si dà solo in contanti");
  const righe = s.righe.map((r) =>
    `<printRecItem operator="${op}" description="${corta(r.descrizione)}" quantity="${quantita(r.quantita)}" unitPrice="${importo(r.prezzo)}" department="${r.reparto ?? REPARTO_IVA_10}" justification="1" />`);
  const sconto = s.sconto && s.sconto > 0
    ? [`<printRecSubtotalAdjustment operator="${op}" adjustmentType="1" description="SCONTO" amount="${importo(s.sconto)}" justification="1" />`]
    : [];
  const pagamenti = s.pagamenti.map((p) => {
    const t = TIPO_PAGAMENTO[p.metodo];
    return `<printRecTotal operator="${op}" description="${t.descrizione}" payment="${importo(p.importo)}" paymentType="${t.tipo}" index="${t.indice}" justification="1" />`;
  });
  const corpo = `<printerFiscalReceipt><beginFiscalReceipt operator="${op}" />${[...righe, ...sconto, ...pagamenti].join("")}<endFiscalReceipt operator="${op}" /></printerFiscalReceipt>`;
  return { xml: busta(corpo), totale, resto: Math.round((pagato - totale) * 100) / 100 };
}

/** Rapporto X (lettura, non azzera) o Z (chiusura giornaliera: azzera e manda i corrispettivi). */
export function xmlRapporto(tipo: "X" | "Z", operatore = 1): string {
  const comando = tipo === "Z" ? "printZReport" : "printXReport";
  return busta(`<printerFiscalReport><${comando} operator="${operatore}" /></printerFiscalReport>`);
}

/** Apre il cassetto (dalla fiscale, REA 30 C7). */
export function xmlCassetto(operatore = 1): string {
  return busta(`<printerCommand><openDrawer operator="${operatore}" /></printerCommand>`);
}

/** L'esito della stampante: success="true" e, se c'è, il codice d'errore. Si legge senza librerie. */
export function leggiRisposta(testo: string): { ok: boolean; codice: string | null; stato: string | null } {
  const ok = /success="true"/i.test(testo);
  const codice = testo.match(/code="([^"]*)"/i)?.[1] ?? null;
  const stato = testo.match(/status="([^"]*)"/i)?.[1] ?? null;
  return { ok, codice: codice && codice !== "" ? codice : null, stato };
}
