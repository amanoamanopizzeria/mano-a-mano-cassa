// La coda di stampa per l'agente sul PC di cassa (agente-stampa/): GET con x-api-key = STAMPA_KEY e
// ?stampanti=cucina:cucina:48,cassa:cassa:42 (nome:ruolo:colonne di ogni stampante). Torna le comande
// da stampare (coda_stampa, mig. 0047) già in ESC/POS, una copia per stampante, in base64: l'agente
// manda i byte alla porta 9100 e basta. Il disegno della carta sta in src/lib/stampa/escpos.ts.
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { chiaveStampaValida } from "@/lib/stampa/chiave";
import { comandaEscPos } from "@/lib/stampa/escpos";
import { leggiStampanti } from "@/lib/stampa/stampanti";
import { normalizzaComanda, type Comanda } from "@/lib/comanda";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!chiaveStampaValida(req.headers.get("x-api-key"))) {
    return NextResponse.json({ status: 401, message: "non autorizzato" }, { status: 401 });
  }
  const stampanti = leggiStampanti(new URL(req.url).searchParams.get("stampanti"));
  if (!stampanti) return NextResponse.json({ status: 422, message: "stampanti: nome:cucina|cassa:colonne, separate da virgola" }, { status: 422 });

  const { data, error } = await supabaseAdmin().rpc("coda_stampa");
  if (error) return NextResponse.json({ status: 500, message: error.message }, { status: 500 });
  const comande = ((data ?? []) as Comanda[]).filter(Boolean).map((d) => {
    const c = normalizzaComanda(d);
    const stampe: Record<string, string> = {};
    for (const s of stampanti) stampe[s.nome] = Buffer.from(comandaEscPos(c, { ruolo: s.ruolo, colonne: s.colonne })).toString("base64");
    return { id: c.id, numero: c.numero_visibile ?? String(c.numero), stampe };
  });
  return NextResponse.json({ comande }, { headers: { "cache-control": "no-store" } });
}
