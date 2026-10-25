// La comanda in ESC/POS, per le stampanti di rete della pizzeria (Edoardo, 24/10/2026: una comande
// Epson, una comande forse Ditron, una fiscale Epson, tutte in LAN). L'agente di stampa sul PC di cassa
// riceve questi byte già pronti dal server e li manda alla porta 9100 della stampante: il disegno
// della carta si cambia qui e arriva con un deploy, senza reinstallare niente in negozio.
// Due copie complete e uguali (cucina e cassa: anche via, telefono e totale, così una comanda persa
// si ritrova dall'altra), con «copia cucina» o «copia cassa» in fondo. Il modello è lo stesso della pagina: src/lib/comanda.ts.
import { vistaComanda, quandoComanda, oraRoma, euroComanda, TIPO_COMANDA, CANALE_COMANDA, type Comanda } from "../comanda";

export type RuoloStampante = "cucina" | "cassa";
export interface OpzioniStampa {
  ruolo: RuoloStampante;
  /** caratteri per riga col carattere normale: 48 su una 80 mm Epson, 42 su molte altre */
  colonne?: number;
  /** tabella dei caratteri da chiedere alla stampante (ESC t n): 19 = PC858 con l'euro, sulle Epson */
  tabella?: number;
  adesso?: Date;
}

const ESC = 0x1b, GS = 0x1d;

// PC858 (= PC850 con l'euro al posto di ı): i caratteri che servono a un menù italiano.
const PC858: Record<string, number> = {
  "Ç": 0x80, "ü": 0x81, "é": 0x82, "â": 0x83, "ä": 0x84, "à": 0x85, "å": 0x86, "ç": 0x87, "ê": 0x88, "ë": 0x89,
  "è": 0x8a, "ï": 0x8b, "î": 0x8c, "ì": 0x8d, "Ä": 0x8e, "É": 0x90, "ô": 0x93, "ö": 0x94, "ò": 0x95, "û": 0x96,
  "ù": 0x97, "Ö": 0x99, "Ü": 0x9a, "×": 0x9e, "á": 0xa0, "í": 0xa1, "ó": 0xa2, "ú": 0xa3, "ñ": 0xa4, "Ñ": 0xa5,
  "«": 0xae, "»": 0xaf, "Á": 0xb5, "Â": 0xb6, "À": 0xb7, "Ê": 0xd2, "Ë": 0xd3, "È": 0xd4, "€": 0xd5, "Í": 0xd6,
  "Î": 0xd7, "Ï": 0xd8, "Ì": 0xde, "Ó": 0xe0, "Ô": 0xe2, "Ò": 0xe3, "Ú": 0xe9, "Û": 0xea, "Ù": 0xeb, "°": 0xf8, "·": 0xfa,
};
const SOSTITUTI: Record<string, string> = {
  "→": "->", "←": "<-", "−": "-", "–": "-", "—": "-", "‘": "'", "’": "'", "“": '"', "”": '"', "…": "...",
  "⚠": "!!", "✓": "v", " ": " ", " ": " ",
};

/** Il testo nei byte della tabella PC858: quello che la stampante non ha diventa «?», mai un byte a caso. */
export function codifica(testo: string): number[] {
  const out: number[] = [];
  for (const ch of testo.normalize("NFC")) {
    const sost = SOSTITUTI[ch];
    if (sost) { for (const c of sost) out.push(c.charCodeAt(0)); continue; }
    const cp = ch.codePointAt(0)!;
    if (cp >= 0x20 && cp < 0x7f) out.push(cp);
    else if (PC858[ch] !== undefined) out.push(PC858[ch]);
    else if (ch === "\n") out.push(0x0a);
    else if (cp > 0xffff) continue; // emoji: niente
    else out.push(0x3f);
  }
  return out;
}

/** A capo sulle parole, alla larghezza data; una parola più lunga della riga si spezza. */
export function aCapo(testo: string, larghezza: number): string[] {
  const righe: string[] = [];
  for (const pezzo of testo.split("\n")) {
    let riga = "";
    for (let parola of pezzo.split(/\s+/).filter(Boolean)) {
      while (parola.length > larghezza) {
        if (riga) { righe.push(riga); riga = ""; }
        righe.push(parola.slice(0, larghezza)); parola = parola.slice(larghezza);
      }
      if (!riga) riga = parola;
      else if (riga.length + 1 + parola.length <= larghezza) riga += " " + parola;
      else { righe.push(riga); riga = parola; }
    }
    righe.push(riga);
  }
  return righe;
}

class Carta {
  private b: number[] = [];
  private colonne: number;
  constructor(colonne: number, tabella: number) {
    this.colonne = colonne;
    this.b.push(ESC, 0x40, ESC, 0x74, tabella, ESC, 0x32); // inizializza, tabella, interlinea normale
  }
  centro(si: boolean) { this.b.push(ESC, 0x61, si ? 1 : 0); return this; }
  grassetto(si: boolean) { this.b.push(ESC, 0x45, si ? 1 : 0); return this; }
  rovescio(si: boolean) { this.b.push(GS, 0x42, si ? 1 : 0); return this; }
  /** larghezza e altezza da 1 a 2 */
  misura(l: 1 | 2, a: 1 | 2) { this.b.push(GS, 0x21, ((l - 1) << 4) | (a - 1)); this.largo = l; return this; }
  private largo: 1 | 2 = 1;
  get larghezza() { return Math.floor(this.colonne / this.largo); }
  /** il testo a capo sulle parole; «primo» va davanti alla prima riga (es. la quantità), «rientro» alle altre */
  testo(t: string, rientro = "", primo = rientro) {
    aCapo(t, this.larghezza - rientro.length).forEach((r, i) => this.b.push(...codifica((i === 0 ? primo : rientro) + r), 0x0a));
    return this;
  }
  /** due colonne: a sinistra il testo, a destra la cifra, sulla stessa riga */
  coppia(sx: string, dx: string) {
    const spazio = this.larghezza - dx.length - 1;
    const righe = aCapo(sx, spazio);
    righe.forEach((r, i) => this.b.push(...codifica(i === righe.length - 1 ? r.padEnd(spazio) + " " + dx : r), 0x0a));
    return this;
  }
  /** una fascia nera piena con il testo bianco, a tutta riga */
  fascia(t: string) {
    this.rovescio(true).grassetto(true);
    for (const r of aCapo(t, this.larghezza)) this.b.push(...codifica(r.padEnd(this.larghezza)), 0x0a);
    return this.rovescio(false).grassetto(false);
  }
  linea(c = "-") { this.b.push(...codifica(c.repeat(this.larghezza)), 0x0a); return this; }
  avanti(n = 1) { this.b.push(ESC, 0x64, n); return this; }
  taglia() { this.b.push(GS, 0x56, 66, 3); return this; } // avanza 3 righe e taglia (parziale)
  byte() { return Uint8Array.from(this.b); }
}

/** La comanda pronta per la stampante, nella copia della cucina o della cassa. */
export function comandaEscPos(c: Comanda, o: OpzioniStampa): Uint8Array {
  const colonne = o.colonne ?? 48;
  const p = new Carta(colonne, o.tabella ?? 19);
  const { reparti, tolte, pezzi } = vistaComanda(c);
  // Edoardo, 25/10/2026: «in cucina manda comunque l'ordine completo, anche con la via ed il totale,
  // casomai non ci ritroviamo le comande». Le due copie sono uguali; cambia solo la riga «copia …».
  // L'ordine delle cose è quello del pizzaiolo (critico giro 21): numero, tipo, ORA, chi, note e
  // allergie subito sopra le pizze, le pizze, poi i soldi.
  const annullato = c.stato === "annullato";
  const copia = o.ruolo === "cucina" ? "- copia cucina -" : "- copia cassa -";

  // testata: il numero grande, la copia, se è annullata o una ristampa
  p.centro(true).misura(2, 2).grassetto(true).testo(c.numero_visibile ?? `#${c.numero}`).grassetto(false).misura(1, 1).testo(copia);
  if (annullato) p.misura(1, 2).fascia("ANNULLATO - NON FARE").misura(1, 1);
  if (c.modificato_il) p.fascia(`MODIFICATA - RISTAMPA ${oraRoma(c.modificato_il)}`);
  else if ((c.stampe ?? 0) > 0) p.fascia("RISTAMPA");

  // il tipo: il domicilio in fascia nera, così non si confonde col ritiro (2Bit stampava un disegno)
  const tipo = `${TIPO_COMANDA[c.tipo] ?? c.tipo.toUpperCase()}${c.tavolo != null ? ` ${c.tavolo}` : ""}`;
  if (c.tipo === "domicilio") p.misura(2, 2).fascia(tipo).misura(1, 1);
  else p.misura(2, 2).grassetto(true).testo(tipo).grassetto(false).misura(1, 1);
  // l'ora grande sempre, oggi come domani
  const q = c.ora_consegna ? quandoComanda(c.ora_consegna, o.adesso) : null;
  p.misura(1, 2).grassetto(true).testo(q ? q.testo : "SUBITO").grassetto(false).misura(1, 1);
  p.testo(`ricevuto ${oraRoma(c.creato_il)} · ${CANALE_COMANDA[c.canale] ?? c.canale}`);
  p.centro(false).linea("=");

  // chi e dove
  if (c.cliente) p.grassetto(true).misura(1, 2).testo(c.cliente + (c.ordini_cliente ? (Number(c.ordini_cliente) === 1 ? "  [PRIMO ORDINE]" : `  [${c.ordini_cliente} ORD.]`) : "")).misura(1, 1).grassetto(false);
  if (c.telefono) p.testo(c.telefono);
  if (c.indirizzo) {
    p.grassetto(true).misura(1, 2).testo(`${c.indirizzo.via} ${c.indirizzo.civico ?? ""}`.trim()).misura(1, 1).grassetto(false);
    const sotto = [c.indirizzo.cap, c.indirizzo.citta].filter(Boolean).join(" ");
    if (sotto.trim()) p.testo(sotto.trim());
    if (c.indirizzo.zona) p.grassetto(true).misura(1, 2).testo(`ZONA ${c.indirizzo.zona.toUpperCase()}`).misura(1, 1).grassetto(false);
    // la nota di consegna dell'indirizzo (citofono, piano: mig. 0057), per il rider che ha la carta in mano
    if (c.indirizzo.note) p.grassetto(true).testo(`CONSEGNA: ${c.indirizzo.note}`).grassetto(false);
  }
  if (c.cliente || c.telefono || c.indirizzo) p.linea();
  // la nota dell'ordine e la nota fissa del cliente (allergie, citofono) subito sopra le pizze
  // la nota dell'ordine in grande (critico giro 22); la fascia nera resta per la nota fissa del cliente
  if (c.note) p.grassetto(true).misura(1, 2).testo(`NOTE: ${c.note}`).misura(1, 1).grassetto(false);
  if (c.cliente_note) p.misura(1, 2).fascia(`!! ${c.cliente_note}`).misura(1, 1);

  // le righe, reparto per reparto
  const grande = annullato ? 1 : 2;
  for (const g of reparti) {
    p.fascia(g.nome.toUpperCase());
    for (const r of g.righe) {
      if (r.segno && r.inPiu < r.quantita) {
        // cresciuta: in grande quante FARE ancora, in piccolo quante in tutto (critico giro 21)
        p.rovescio(true).grassetto(true).testo("IN PIÙ").rovescio(false);
        p.misura(1, grande).testo(r.descrizione.toUpperCase(), "    ", `+${String(r.inPiu).padEnd(3)}`).misura(1, 1).grassetto(false);
        const fatte = r.quantita - r.inPiu;
        p.testo(`(in tutto ${r.quantita}, ${fatte} già ${fatte === 1 ? "fatta" : "fatte"})`, "     ");
      } else {
        if (r.segno) p.rovescio(true).grassetto(true).testo("NUOVA").rovescio(false).grassetto(false);
        p.misura(1, grande).grassetto(true).testo(r.descrizione.toUpperCase(), "    ", `${String(r.quantita).padStart(2)}  `).grassetto(false).misura(1, 1);
      }
      for (const v of r.variazioni.filter((v) => v.tipo === "aggiunta")) p.grassetto(true).testo(`CON ${v.nome}`, "     ").grassetto(false);
      for (const v of r.variazioni.filter((v) => v.tipo === "rimozione")) p.grassetto(true).testo(`SENZA ${v.nome}`, "     ").grassetto(false);
      for (const v of r.variazioni.filter((v) => v.tipo === "nota")) p.testo(v.nome, "     ");
      if (r.note) p.testo(r.note, "     ");
      for (const f of r.figlie) {
        p.testo(`${f.quantita > 1 ? `${f.quantita}x` : "·"} ${f.descrizione}`, "     ");
        for (const v of (f.variazioni ?? []).filter((v) => v.tipo === "aggiunta")) p.testo(`CON ${v.nome}`, "       ");
        for (const v of (f.variazioni ?? []).filter((v) => v.tipo === "rimozione")) p.testo(`SENZA ${v.nome}`, "       ");
      }
      if (r.incluso) p.testo(`+ ${r.incluso.toUpperCase()}`, "     ");
    }
  }
  if (tolte.length > 0) {
    p.fascia("TOLTE - NON FARE");
    for (const t of tolte) p.grassetto(true).testo(`${t.quante} x ${t.descrizione.toUpperCase()}`).grassetto(false);
  }

  // in fondo: i pezzi, poi i soldi
  p.linea("=").testo(`${pezzi} ${pezzi === 1 ? "pezzo" : "pezzi"} in cucina`);
  if (c.costo_consegna > 0) p.coppia("consegna", `${euroComanda(c.costo_consegna)} €`);
  if (Number(c.sconto ?? 0) > 0) p.coppia(`sconto ${c.codice_coupon ?? ""}`.trim(), `-${euroComanda(Number(c.sconto))} €`);
  p.misura(1, 2).grassetto(true).coppia("TOTALE", `${euroComanda(c.totale)} €`).grassetto(false).misura(1, 1);
  const come = c.pagato_online ? "GIÀ PAGATO" : c.pagamento === "pos" ? "POS" : c.pagamento === "contanti" ? "CONTANTI"
    : c.tipo === "tavolo" ? "SI PAGA AL CONTO" : "PAGAMENTO DA CHIEDERE";
  p.centro(true).fascia(come).centro(false);
  if (!c.pagato_online && c.paga_con != null && Number(c.paga_con) > c.totale)
    p.grassetto(true).testo(`PAGA CON ${euroComanda(Number(c.paga_con))} € -> RESTO ${euroComanda(Number(c.paga_con) - c.totale)} €`).grassetto(false);
  if (annullato) p.misura(1, 2).fascia("ANNULLATO - NON FARE").misura(1, 1);
  p.centro(true).testo(copia).centro(false);
  return p.avanti(1).taglia().byte();
}

/** Quello che uscirebbe sulla carta, in testo semplice: per le prove e per vedere la comanda senza stampante. */
export function anteprimaTesto(b: Uint8Array): string {
  const inverso = Object.fromEntries(Object.entries(PC858).map(([k, v]) => [v, k]));
  let out = "";
  for (let i = 0; i < b.length; i++) {
    const x = b[i];
    if (x === ESC) { const n = b[i + 1]; i += n === 0x40 || n === 0x32 ? 1 : 2; continue; }
    if (x === GS) { const n = b[i + 1]; i += n === 0x56 ? 3 : 2; continue; }
    if (x === 0x0a) { out += "\n"; continue; }
    out += x >= 0x20 && x < 0x7f ? String.fromCharCode(x) : inverso[x] ?? "?";
  }
  return out;
}
