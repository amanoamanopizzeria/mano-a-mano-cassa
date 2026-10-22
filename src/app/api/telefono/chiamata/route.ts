// POST /api/telefono/chiamata — una telefonata in arrivo. La scrive in `chiamata`; la cassa
// la vede in tempo reale e apre la scheda del cliente (riconoscimento del chiamante).
// Chi la chiama: il centralino / l'apparecchio di identificazione, con la chiave TELEFONO_KEY
// nell'intestazione x-api-key. Accetta due forme:
//   { "numero": "+39333…" }                      — generica
//   il webhook voce di Telnyx (call.initiated)  — data.payload.from
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function chiaveValida(ricevuta: string | null): boolean {
  const attesa = process.env.TELEFONO_KEY;
  if (!attesa || !ricevuta) return false;
  const a = Buffer.from(ricevuta), b = Buffer.from(attesa);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (!chiaveValida(req.headers.get("x-api-key") ?? url.searchParams.get("k"))) {
    return NextResponse.json({ errore: "non autorizzato" }, { status: 401 });
  }
  let body: { numero?: string; data?: { event_type?: string; payload?: { from?: string; direction?: string } } };
  try { body = await req.json(); } catch { return NextResponse.json({ errore: "JSON non valido" }, { status: 400 }); }

  let numero = body.numero ?? null;
  let origine = "api";
  if (!numero && body.data?.payload?.from) {
    // Telnyx: ci interessa solo l'inizio di una chiamata in entrata.
    if (body.data.event_type !== "call.initiated" || body.data.payload.direction === "outgoing") {
      return NextResponse.json({ esito: "ignorato" });
    }
    numero = body.data.payload.from;
    origine = "telnyx";
  }
  const pulito = (numero ?? "").replace(/[^\d+]/g, "");
  if (pulito.replace(/\D/g, "").length < 6) return NextResponse.json({ errore: "numero mancante" }, { status: 400 });

  // Scrive tramite segna_chiamata_api: la funzione confronta l'impronta della chiave, così non
  // serve la service_role sul server. La chiave è già stata controllata qui sopra.
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("segna_chiamata_api", { p_numero: pulito, p_origine: origine, p_chiave: process.env.TELEFONO_KEY });
  if (error) return NextResponse.json({ errore: error.message }, { status: 500 });
  return NextResponse.json({ esito: "segnata", id: data });
}
