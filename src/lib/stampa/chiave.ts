// La chiave dell'agente di stampa (STAMPA_KEY, solo su Vercel e nel file .env del PC di cassa).
import "server-only";
import { timingSafeEqual } from "crypto";

export function chiaveStampaValida(ricevuta: string | null): boolean {
  const attesa = process.env.STAMPA_KEY;
  if (!attesa || !ricevuta) return false;
  const a = Buffer.from(ricevuta);
  const b = Buffer.from(attesa);
  return a.length === b.length && timingSafeEqual(a, b);
}
