// GET /api/indirizzi/cerca?q=via tuscolana 12 → suggerimenti (Google se c'è la chiave, se no OpenStreetMap).
// Solo per lo staff loggato: la chiave Google resta sul server.
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { cercaIndirizzi, chiaveGoogle, kmDallaPizzeria } from "@/lib/indirizzi";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ errore: "non autorizzato" }, { status: 401 });

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 3) return NextResponse.json({ risultati: [], fonte: chiaveGoogle() ? "google" : "osm" });
  try {
    const risultati = (await cercaIndirizzi(q)).map((r) => ({
      ...r, km: r.lat != null && r.lng != null ? Math.round(kmDallaPizzeria(r.lat, r.lng) * 10) / 10 : null,
    }));
    return NextResponse.json({ risultati, fonte: chiaveGoogle() ? "google" : "osm" });
  } catch (e) {
    return NextResponse.json({ errore: (e as Error).message, risultati: [] }, { status: 502 });
  }
}
