// POST /api/copia-2bit — gli ordini del 2Bit, copiati dall'agente sul PC di cassa (agente-copiatore/).
// Sono COPIE: vanno in copia_2bit, non in `ordine` (non stampano, non contano nei conti, non vanno all'OS).
// La chiave (x-api-key) la genera il PC e non esce dal PC: la controlla copia_2bit_salva con la sua impronta
// SHA-256 in impostazione_riservata (mig. 0083). Corpo: { "ordini": [ { "id_2bit": "…", … }, … ] }, al più 200.
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const chiave = req.headers.get("x-api-key");
  if (!chiave || chiave.length < 32) return NextResponse.json({ errore: "non autorizzato" }, { status: 401 });
  let body: { ordini?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ errore: "JSON non valido" }, { status: 400 }); }
  if (!Array.isArray(body.ordini)) return NextResponse.json({ errore: "manca «ordini»" }, { status: 422 });
  if (body.ordini.length === 0) return NextResponse.json({ esito: "ok", nuove: 0, cambiate: 0 });
  if (body.ordini.length > 200) return NextResponse.json({ errore: "al più 200 ordini per volta" }, { status: 413 });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("copia_2bit_salva", { p_chiave: chiave, p_ordini: body.ordini });
  if (error) {
    const rifiutata = /chiave non valida/.test(error.message);
    return NextResponse.json({ errore: rifiutata ? "non autorizzato" : error.message }, { status: rifiutata ? 401 : 500 });
  }
  return NextResponse.json(data);
}
