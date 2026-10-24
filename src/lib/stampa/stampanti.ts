// Le stampanti che l'agente dichiara nella richiesta: «nome:ruolo:colonne», separate da virgola.
import type { RuoloStampante } from "./escpos";

export interface Stampante { nome: string; ruolo: RuoloStampante; colonne: number }

export function leggiStampanti(q: string | null): Stampante[] | null {
  if (!q) return null;
  const out: Stampante[] = [];
  for (const pezzo of q.split(",")) {
    const [nome, ruolo, col] = pezzo.split(":");
    const colonne = Number(col ?? 48);
    if (!nome || !/^[a-z0-9_-]{1,20}$/i.test(nome) || (ruolo !== "cucina" && ruolo !== "cassa") || !(colonne >= 24 && colonne <= 64)) return null;
    out.push({ nome, ruolo, colonne });
  }
  return out.length > 0 && out.length <= 4 ? out : null;
}

