// Il CSV a 40 colonne per mano-a-mano-os (mig. 0040, /api/ordini/csv): le intestazioni nell'ordine
// del file vero di Velocissimo e la scrittura con tutti i campi fra virgolette.
export const COLONNE = [
  "#", "# Comanda", "Orario di ritiro", "Orario richiesto", "Negozio", "Stato", "Cliente", "Rider", "Tipo", "Tavolo",
  "Sala", "Cellulare", "Cliente ", "Data creazione", "Data ed ora ordine", "Data ordine", "Totale", "Costo Consegna", "Origine", "Pagamento",
  "Note", "Orario associazione rider", "Orario di partenza", "Orario di consegna effettivo", "Distanza percorsa", "Ritardo consegna (s.)", "Ritardo consegna", "Coperti", "Telefono", "Nazione",
  "Sconto", "CAP Negozio", "Città Negozio", "Provincia Negozio", "Città", "Provincia", "Indirizzo", "Civico", "Zona", "Gruppo di zone",
] as const;

function campo(v: unknown): string {
  const s = v == null ? "" : typeof v === "number" ? String(v) : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export function csvDaRighe(righe: Record<string, unknown>[]): string {
  // La seconda «Cliente» del CSV vero ha lo stesso nome della settima colonna: nel jsonb la
  // teniamo come "Cliente " (con lo spazio) e qui la scriviamo di nuovo "Cliente".
  const testa = COLONNE.map((c) => campo(c.trim())).join(",");
  const corpo = righe.map((r) => COLONNE.map((c) => campo(r[c])).join(","));
  return [testa, ...corpo].join("\r\n") + "\r\n";
}

