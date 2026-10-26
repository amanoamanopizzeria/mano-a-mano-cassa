// POST /api/indirizzi/tempi { origini: [{lat,lng}], destinazioni: [{lat,lng}] } → minuti e metri per strada
// (Google Routes) o, se Google non c'è, in linea d'aria. Per la cassa (le doppie quando si prende un
// domicilio) e per i rider (quali consegne libere stanno vicine alle sue). Al massimo 10×10 punti.
// Google si paga per ogni coppia calcolata (critico giro 38): «coppie: true» calcola solo origine i → destinazione i
// (n coppie e non n×n), «traffico: false» usa la tariffa senza traffico.
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { tempiFra, type Punto } from "@/lib/indirizzi";

export const dynamic = "force-dynamic";

const valido = (p: unknown): p is Punto =>
  !!p && typeof (p as Punto).lat === "number" && typeof (p as Punto).lng === "number" && Math.abs((p as Punto).lat) <= 90 && Math.abs((p as Punto).lng) <= 180;

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ errore: "non autorizzato" }, { status: 401 });
  const { data: profilo } = await supabase.from("profilo").select("ruolo, id_rider").maybeSingle();
  if (!profilo || !(["cassa", "admin"].includes(profilo.ruolo) || profilo.id_rider)) return NextResponse.json({ errore: "solo cassa e rider" }, { status: 403 });

  const b = (await req.json().catch(() => null)) as { origini?: unknown[]; destinazioni?: unknown[]; coppie?: boolean; traffico?: boolean } | null;
  const o = (b?.origini ?? []).filter(valido), d = (b?.destinazioni ?? []).filter(valido);
  if (!o.length || !d.length) return NextResponse.json({ errore: "servono origini e destinazioni" }, { status: 400 });
  if (o.length > 10 || d.length > 10) return NextResponse.json({ errore: "al massimo 10 punti per lato" }, { status: 400 });
  const traffico = b?.traffico !== false;
  if (b?.coppie) {
    if (o.length !== d.length) return NextResponse.json({ errore: "coppie: tante origini quante destinazioni" }, { status: 400 });
    // una richiesta per coppia: torna la stessa tabella, piena solo sulla diagonale
    const una = await Promise.all(o.map((x, i) => tempiFra([x], [d[i]], traffico)));
    const vuota = () => o.map(() => d.map(() => null as number | null));
    const minuti = vuota(), metri = vuota();
    una.forEach((t, i) => { minuti[i][i] = t.minuti[0][0]; metri[i][i] = t.metri[0][0]; });
    return NextResponse.json({ fonte: una.every((t) => t.fonte === "google") ? "google" : "linea", minuti, metri });
  }
  return NextResponse.json(await tempiFra(o, d, traffico));
}
