// Il CSV di fine serata per lo staff (Edoardo, 31/10/2026: «loro hanno accesso solo al CSV per fare la
// chiusura»): lo stesso file a 40 colonne di /api/ordini/csv, uguale a quello di Velocissimo, ma con
// l'accesso della cassa invece della chiave dell'OS. GET /api/ordini/csv-serata?giornata=AAAA-MM-GG
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { csvDaRighe } from "@/lib/export-ordini";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ errore: "non autorizzato" }, { status: 401 });
  const { data: profilo } = await supabase.from("profilo").select("ruolo").maybeSingle();
  if (!profilo || !["cassa", "admin"].includes(profilo.ruolo)) return NextResponse.json({ errore: "solo cassa e admin" }, { status: 403 });
  const giornata = new URL(req.url).searchParams.get("giornata");
  if (!giornata || !/^\d{4}-\d{2}-\d{2}$/.test(giornata)) return NextResponse.json({ errore: "giornata mancante (AAAA-MM-GG)" }, { status: 422 });
  const { data, error } = await supabase.rpc("ordini_giornata", { p_giornata: giornata });
  if (error) return NextResponse.json({ errore: error.message }, { status: 500 });
  const [a, m, g] = giornata.split("-");
  // nessun BOM, come il file vero di Velocissimo (export-ordini.ts)
  return new NextResponse(csvDaRighe((data ?? []) as Record<string, unknown>[]), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="export_${g}-${m}-${a}.csv"` },
  });
}
