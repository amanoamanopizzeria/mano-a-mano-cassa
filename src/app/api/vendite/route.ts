// Le vendite di una giornata lavorativa nella forma di GET /vendite di Velocissimo (RigaVendita),
// per mano-a-mano-os: GET /api/vendite?giornata=2026-10-23 con x-api-key (ORDINI_ESTERNI_KEY).
// Una giornata alla volta, come l'API vera; dopo mezzanotte resta la sera prima (taglio alle 06:00).
// Risposta { status, message, data: { righe, informazioni } }, come la loro.
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function chiaveValida(ricevuta: string | null): boolean {
  const attesa = process.env.ORDINI_ESTERNI_KEY;
  if (!attesa || !ricevuta) return false;
  const a = Buffer.from(ricevuta);
  const b = Buffer.from(attesa);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  if (!chiaveValida(req.headers.get("x-api-key"))) {
    return NextResponse.json({ status: 401, message: "non autorizzato" }, { status: 401 });
  }
  const giornata = new URL(req.url).searchParams.get("giornata");
  if (!giornata || !/^\d{4}-\d{2}-\d{2}$/.test(giornata)) {
    return NextResponse.json({ status: 422, message: "giornata mancante (AAAA-MM-GG)" }, { status: 422 });
  }
  const supabase = supabaseAdmin();
  const [righe, totali] = await Promise.all([
    supabase.rpc("vendite_giornata", { p_giornata: giornata }),
    supabase.rpc("vendite_giornata_totali", { p_giornata: giornata }),
  ]);
  if (righe.error || totali.error) {
    return NextResponse.json({ status: 500, message: righe.error?.message ?? totali.error?.message }, { status: 500 });
  }
  return NextResponse.json({ status: 200, message: "ok", data: { righe: righe.data ?? [], informazioni: totali.data } });
}
