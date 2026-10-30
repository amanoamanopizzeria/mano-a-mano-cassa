// Il CSV per ordine a 40 colonne, come l'export «/weborder» di Velocissimo, per mano-a-mano-os
// (REA 15): GET /api/ordini/csv?giornata=2026-10-23 con x-api-key (ORDINI_ESTERNI_KEY).
// Una giornata lavorativa alla volta (taglio alle 06:00 di Roma, come /api/vendite). Le righe le
// fa ordini_giornata (mig. 0040); qui solo il CSV: virgola, tutti i campi fra virgolette, UTF-8,
// le note su più righe restano dentro le virgolette (il parser dell'OS le legge così).
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { csvDaRighe } from "@/lib/export-ordini";

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
  const { data, error } = await supabaseAdmin().rpc("ordini_giornata", { p_giornata: giornata });
  if (error) return NextResponse.json({ status: 500, message: error.message }, { status: 500 });
  const csv = csvDaRighe((data ?? []) as Record<string, unknown>[]);
  const [a, m, g] = giornata.split("-");
  return new NextResponse("﻿" + csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="export_${g}-${m}-${a}.csv"`,
    },
  });
}
