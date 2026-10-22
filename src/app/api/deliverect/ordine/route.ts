// Ordini da Deliverect (Glovo, Deliveroo, Just Eat) verso la cassa.
// Deliverect chiama questo URL (Locations > Generic POS Settings > Orders webhook URL).
// STATO: scaffolding. Da verificare in test: firma HMAC, mappa dei canali (codici numerici),
// e la conferma ACCEPTED verso Deliverect (serve OAuth). Finché la mappa dei canali è vuota
// le richieste vengono rifiutate, così nessun ordine finisce con il canale sbagliato.
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Codice canale di Deliverect -> canale nostro. DA COMPILARE dopo il primo test con Deliverect.
const CANALI_DELIVERECT: Record<number, "glovo" | "deliveroo" | "justeat"> = {};

// orderType di Deliverect -> tipo nostro (1 pickup, 2 delivery, 3 eat-in, 4 curbside)
const TIPI: Record<number, "domicilio" | "ritiro" | "tavolo" | "banco"> = {
  1: "ritiro",
  2: "domicilio",
  3: "tavolo",
  4: "ritiro",
};

interface ArticoloDeliverect {
  plu?: string;
  name: string;
  price: number;        // centesimi
  quantity: number;
  remark?: string;
  subItems?: { plu?: string; name: string; price: number; quantity: number }[];
}

interface OrdineDeliverect {
  _id?: string;
  channelOrderId: string;
  channel: number;
  orderType: number;
  channelLink?: string;
  note?: string;
  customer?: { name?: string; phoneNumber?: string };
  deliveryAddress?: { street?: string; streetNumber?: string; postalCode?: string; city?: string };
  items: ArticoloDeliverect[];
  status?: number;
  testOrder?: boolean;
}

function firmaValida(corpo: string, ricevuta: string | null): boolean {
  const segreto = process.env.DELIVERECT_WEBHOOK_SECRET;
  if (!segreto || !ricevuta) return false;
  const attesa = createHmac("sha256", segreto).update(corpo, "utf8").digest("hex");
  const a = Buffer.from(ricevuta);
  const b = Buffer.from(attesa);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const corpo = await req.text();
  if (!firmaValida(corpo, req.headers.get("x-server-authorization-hmac-sha256"))) {
    return NextResponse.json({ errore: "firma non valida" }, { status: 401 });
  }

  let ordine: OrdineDeliverect;
  try {
    ordine = JSON.parse(corpo) as OrdineDeliverect;
  } catch {
    return NextResponse.json({ errore: "JSON non valido" }, { status: 400 });
  }

  // Annullo: lo gestiremo quando avremo la mappa dei canali e i test
  if (ordine.status === 100) return NextResponse.json({ result: "OK" });

  const canale = CANALI_DELIVERECT[ordine.channel];
  if (!canale) {
    return NextResponse.json({ errore: `canale Deliverect ${ordine.channel} non mappato` }, { status: 422 });
  }
  const tipo = TIPI[ordine.orderType] ?? "ritiro";
  const negozio = process.env.DELIVERECT_ID_NEGOZIO;
  if (!negozio) return NextResponse.json({ errore: "negozio non configurato" }, { status: 500 });

  const righe = (ordine.items ?? []).map((a) => ({
    descrizione: a.name,
    quantita: a.quantity,
    prezzo_unit: a.price / 100,
    destinazione: "cucina",
    note: a.remark ?? null,
  }));
  const note = [ordine.note, ordine.customer?.name && `Cliente: ${ordine.customer.name}`, ordine.customer?.phoneNumber && `Tel: ${ordine.customer.phoneNumber}`]
    .filter(Boolean).join(" · ") || null;

  const { data, error } = await supabaseAdmin().rpc("accetta_ordine_esterno", {
    p_negozio: negozio,
    p_canale: canale,
    p_tipo: tipo,
    p_id_esterno: ordine._id ?? ordine.channelOrderId,
    p_ora: null,
    p_note: note,
    p_righe: righe,
  });
  if (error) return NextResponse.json({ errore: error.message }, { status: 500 });

  // Risposta a Deliverect: 200 = ricevuto. L'accettazione (ACCEPTED 20) verso Deliverect
  // non è ancora implementata: va fatta con OAuth una volta che le credenziali sono pronte.
  return NextResponse.json({ result: "OK", esito: (data as { esito: string }).esito }, { status: 200 });
}
