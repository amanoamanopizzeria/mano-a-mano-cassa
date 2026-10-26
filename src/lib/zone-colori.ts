// Il colore della zona sulle comande a quarto d'ora (Edoardo, 26/10/2026): «l'ordine C12 giallo, C36
// giallo, so già che lo posso abbinare». Le zone di Velocissimo vicine fra loro hanno lo stesso colore:
// sono una proposta da guardare con Edoardo, si cambiano qui. Il colore non è mai l'unico segno: accanto
// c'è sempre il nome corto della zona.
export interface ColoreZona { colore: string; corto: string; famiglia: string }

const FAMIGLIE: { colore: string; corto: string; parole: string[] }[] = [
  { colore: "#f2c200", corto: "Vicino", parole: ["VERBANO", "NOMENTANA SANT ANGELA"] },
  { colore: "#2e7dd7", corto: "Bologna", parole: ["BOLOGNA"] },
  { colore: "#2e9e5b", corto: "Parioli", parole: ["PARIOLI"] },
  { colore: "#e8762b", corto: "Libia", parole: ["LIBIA", "CONCA D ORO", "VALLI"] },
  { colore: "#8e44ad", corto: "Centro", parole: ["PORTA PIA", "BARBERINI", "SAN GIOVANNI"] },
];

export function coloreZona(nome: string | null | undefined): ColoreZona | null {
  if (!nome) return null;
  const n = nome.toUpperCase().replace(/'/g, " ");
  const f = FAMIGLIE.find((x) => x.parole.some((p) => n.includes(p)));
  // il nome della zona com'è, in minuscolo con le iniziali grandi (BOLOGNA SAPIENZA → Bologna Sapienza)
  const corto = nome.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());
  return { colore: f?.colore ?? "#9e9e9e", corto, famiglia: f?.corto ?? "Altra" };
}
