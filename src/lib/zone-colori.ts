// Il colore della zona sulle comande a quarto d'ora (Edoardo, 26/10/2026): «l'ordine C12 giallo, C36
// giallo, so già che lo posso abbinare». Le zone di Velocissimo vicine fra loro hanno lo stesso colore:
// si cambiano qui. Il colore non è mai l'unico segno: accanto
// c'è sempre il nome corto della zona.
export interface ColoreZona { colore: string; corto: string; famiglia: string }

// I sei gruppi misurati dal critico sui poligoni veri (giro 38), scelti da Edoardo il 26/10: dentro un gruppo
// due consegne in un giro solo fanno risparmiare il 21–40% di strada. Si cerca nell'ordine: «PORTA PIA
// TERMINI» va prima di «PORTA PIA». Niente rosso (è il ritardo) né arancio chiaro (le piattaforme).
const FAMIGLIE: { colore: string; corto: string; parole: string[] }[] = [
  { colore: "#f2c200", corto: "Sotto casa", parole: ["VERBANO"] },
  { colore: "#2e7dd7", corto: "Bologna", parole: ["BOLOGNA"] },
  { colore: "#c25a00", corto: "Nomentana–Libia", parole: ["SANT ANGELA", "LIBIA", "VALLI", "CONCA D ORO"] },
  { colore: "#2e9e5b", corto: "Parioli", parole: ["PARIOLI"] },
  { colore: "#7a4b2a", corto: "Termini–San Giovanni", parole: ["PORTA PIA TERMINI", "SAN GIOVANNI"] },
  { colore: "#8e44ad", corto: "Porta Pia–Veneto", parole: ["PORTA PIA", "BARBERINI"] },
];

export function coloreZona(nome: string | null | undefined): ColoreZona | null {
  if (!nome) return null;
  const n = nome.toUpperCase().replace(/'/g, " ");
  const f = FAMIGLIE.find((x) => x.parole.some((p) => n.includes(p)));
  // il nome della zona com'è, in minuscolo con le iniziali grandi (BOLOGNA SAPIENZA → Bologna Sapienza)
  const corto = nome.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());
  return { colore: f?.colore ?? "#9e9e9e", corto, famiglia: f?.corto ?? "Altra" };
}
