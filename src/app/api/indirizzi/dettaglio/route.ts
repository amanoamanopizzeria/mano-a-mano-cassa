// GET /api/indirizzi/dettaglio?id=<place_id> → via, civico, CAP, città e coordinate del posto scelto su Google.
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { dettaglioGoogle, kmDallaPizzeria } from "@/lib/indirizzi";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ errore: "non autorizzato" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ errore: "manca id" }, { status: 400 });
  try {
    const r = await dettaglioGoogle(id);
    if (!r) return NextResponse.json({ errore: "Google Maps non configurato" }, { status: 503 });
    // la zona di consegna (vera, dal back-office Velocissimo): null = fuori da tutte, non consegniamo
    let zona: { nome: string; costo_consegna: number; minimo_ordine: number } | null = null;
    if (r.lat != null && r.lng != null) {
      const { data } = await supabase.rpc("zona_per_punto", { p_lat: r.lat, p_lng: r.lng });
      const z = (data as { nome: string; costo_consegna: number; minimo_ordine: number }[] | null)?.[0];
      if (z) zona = { nome: z.nome, costo_consegna: Number(z.costo_consegna), minimo_ordine: Number(z.minimo_ordine) };
    }
    return NextResponse.json({ ...r, zona, km: r.lat != null && r.lng != null ? Math.round(kmDallaPizzeria(r.lat, r.lng) * 10) / 10 : null });
  } catch (e) {
    return NextResponse.json({ errore: (e as Error).message }, { status: 502 });
  }
}
