// GET /api/ordina/indirizzi?q=via tuscolana 12 → suggerimenti per la pagina d'ordine PUBBLICA.
// GET /api/ordina/indirizzi?id=<place_id>   → via, civico, CAP, coordinate e la zona di consegna.
// Nessun login: è il cliente che scrive il suo indirizzo. La chiave Google resta sul server; il freno
// è per indirizzo IP (60 richieste ogni 10 minuti, in memoria: su Vercel vale per istanza, basta a
// scoraggiare chi fa girare uno script, non è una difesa da assedio).
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cercaIndirizzi, chiaveGoogle, dettaglioGoogle, kmDallaPizzeria } from "@/lib/indirizzi";

export const dynamic = "force-dynamic";

const FINESTRA_MS = 10 * 60_000;
const MASSIMO = 60;
const conta = new Map<string, { n: number; da: number }>();
function frenato(ip: string) {
  const adesso = Date.now();
  const c = conta.get(ip);
  if (!c || adesso - c.da > FINESTRA_MS) { conta.set(ip, { n: 1, da: adesso }); return false; }
  c.n += 1;
  return c.n > MASSIMO;
}

export async function GET(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "?";
  if (frenato(ip)) return NextResponse.json({ errore: "troppe richieste, riprova fra qualche minuto" }, { status: 429 });

  const u = new URL(req.url);
  const id = u.searchParams.get("id");
  try {
    if (id) {
      const r = await dettaglioGoogle(id);
      if (!r) return NextResponse.json({ errore: "ricerca non disponibile" }, { status: 503 });
      return NextResponse.json({ ...r, zona: await zonaDi(r.lat, r.lng), km: r.lat != null && r.lng != null ? Math.round(kmDallaPizzeria(r.lat, r.lng) * 10) / 10 : null });
    }
    const q = (u.searchParams.get("q") ?? "").trim().slice(0, 120);
    if (q.length < 4) return NextResponse.json({ risultati: [] });
    // Con OpenStreetMap le coordinate arrivano subito: la zona si dice già nella lista.
    const risultati = await Promise.all((await cercaIndirizzi(q)).map(async (r) => ({
      ...r, zona: r.lat != null && r.lng != null ? await zonaDi(r.lat, r.lng) : undefined,
    })));
    return NextResponse.json({ risultati, fonte: chiaveGoogle() ? "google" : "osm" });
  } catch (e) {
    return NextResponse.json({ errore: (e as Error).message, risultati: [] }, { status: 502 });
  }
}

/** La zona di consegna del punto (zona_per_punto è leggibile da anon). null = fuori da tutte: non consegniamo. */
async function zonaDi(lat: number | null, lng: number | null) {
  if (lat == null || lng == null) return null;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await supabase.rpc("zona_per_punto", { p_lat: lat, p_lng: lng });
  const z = (data as { nome: string; costo_consegna: number; minimo_ordine: number }[] | null)?.[0];
  return z ? { nome: z.nome, costo_consegna: Number(z.costo_consegna), minimo_ordine: Number(z.minimo_ordine) } : null;
}
