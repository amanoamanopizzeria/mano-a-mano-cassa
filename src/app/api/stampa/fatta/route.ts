// L'agente di stampa dice che TUTTE le stampanti hanno preso la comanda: POST { id } con x-api-key.
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { chiaveStampaValida } from "@/lib/stampa/chiave";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!chiaveStampaValida(req.headers.get("x-api-key"))) {
    return NextResponse.json({ status: 401, message: "non autorizzato" }, { status: 401 });
  }
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ status: 422, message: "id mancante" }, { status: 422 });
  const { error } = await supabaseAdmin().rpc("stampa_fatta", { p_id: id });
  if (error) return NextResponse.json({ status: 500, message: error.message }, { status: 500 });
  return NextResponse.json({ esito: "segnata" });
}
