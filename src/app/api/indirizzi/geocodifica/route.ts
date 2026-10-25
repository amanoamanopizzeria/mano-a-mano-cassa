// POST /api/indirizzi/geocodifica → mette le coordinate (e la zona, se manca) a un pacco di vie che non
// le hanno: quelle arrivate da Velocissimo (mig. 0049–0050) erano solo testo, e senza coordinate il
// rider non ha il punto sulla mappa né il cliente la sua casa sulla pagina «segui». Solo per chi entra
// in cassa; si chiama più volte finché «restano» va a zero. Una via che Google non trova, o che sta
// fuori da Roma, si segna «geo-non-trovata» e non si riprova.
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { geocodifica, kmDallaPizzeria } from "@/lib/indirizzi";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const PACCO = 40;
const NON_TROVATA = "geo-non-trovata";

export async function POST() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ errore: "non autorizzato" }, { status: 401 });
  const { data: profilo } = await supabase.from("profilo").select("ruolo").maybeSingle();
  if (!profilo || !["cassa", "admin"].includes(profilo.ruolo)) return NextResponse.json({ errore: "solo la cassa" }, { status: 403 });

  // con l'utenza della cassa (policy indirizzo_staff): la chiave service_role non è su Vercel
  const db = supabase;
  const { data: vie, error } = await db.from("indirizzo").select("id, via, civico, cap, citta, id_zona")
    .is("lat", null).or(`place_id.is.null,place_id.neq.${NON_TROVATA}`).limit(PACCO);
  if (error) return NextResponse.json({ errore: error.message }, { status: 500 });

  let fatte = 0, nonTrovate = 0, zone = 0;
  for (const v of vie ?? []) {
    const testo = [[v.via, v.civico].filter(Boolean).join(" "), v.cap, v.citta || "Roma"].filter(Boolean).join(", ");
    let g: Awaited<ReturnType<typeof geocodifica>>;
    try { g = await geocodifica(testo); } catch (e) { return NextResponse.json({ errore: (e as Error).message, fatte }, { status: 502 }); }
    if (!g || kmDallaPizzeria(g.lat, g.lng) > 15) {
      await db.from("indirizzo").update({ place_id: NON_TROVATA }).eq("id", v.id);
      nonTrovate++;
      continue;
    }
    // la zona la mette il trigger indirizzo_zona_auto (mig. 0020) appena arrivano le coordinate
    await db.from("indirizzo").update({ lat: g.lat, lng: g.lng, place_id: g.place_id }).eq("id", v.id);
    if (!v.id_zona) zone++;
    fatte++;
  }
  const { count } = await db.from("indirizzo").select("id", { count: "exact", head: true })
    .is("lat", null).or(`place_id.is.null,place_id.neq.${NON_TROVATA}`);
  return NextResponse.json({ fatte, nonTrovate, zone, restano: count ?? null });
}
