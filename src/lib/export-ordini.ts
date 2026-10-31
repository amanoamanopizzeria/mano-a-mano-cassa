// Il CSV a 40 colonne per mano-a-mano-os (mig. 0040, /api/ordini/csv): le intestazioni nell'ordine
// del file vero di Velocissimo e la scrittura con tutti i campi fra virgolette. Confrontato il 31/10/2026 col
// file della serata del 30/10: virgola, tutto fra virgolette, UTF-8 senza BOM, LF, decimale col punto.
export const COLONNE = [
  "#", "# Comanda", "Orario di ritiro", "Orario richiesto", "Negozio", "Stato", "Cliente", "Rider", "Tipo", "Tavolo",
  "Sala", "Cellulare", "Cliente ", "Data creazione", "Data ed ora ordine", "Data ordine", "Totale", "Costo Consegna", "Origine", "Pagamento",
  "Note", "Orario associazione rider", "Orario di partenza", "Orario di consegna effettivo", "Distanza percorsa", "Ritardo consegna (s.)", "Ritardo consegna", "Coperti asporto", "Telefono", "Nazione",
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
  // «Coperti asporto» come nel file vero (il parser dell'OS legge quella): ordini_giornata la chiama ancora «Coperti».
  const corpo = righe.map((r) => COLONNE.map((c) => campo(c === "Coperti asporto" ? r[c] ?? r["Coperti"] : r[c])).join(","));
  // A capo LF e niente BOM, come il CSV vero di Velocissimo (30/10/2026); dentro le note gli a capo restano fra virgolette.
  return [testa, ...corpo].join("\n") + "\n";
}

