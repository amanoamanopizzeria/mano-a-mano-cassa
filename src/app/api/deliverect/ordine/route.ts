// Ordini da Deliverect (Glovo, Deliveroo, Just Eat) verso la cassa.
// Deliverect chiama questo URL (Locations > Generic POS Settings > Orders webhook URL).
// STATO: scaffolding. Da verificare in test: firma HMAC, mappa dei canali (codici numerici),
// e la conferma ACCEPTED verso Deliverect (serve OAuth). Finché la mappa dei canali è vuota
// le richieste vengono rifiutate, così nessun ordine finisce con il canale sbagliato.
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { traduciArticoli, type ArticoloDx, type VariazioneCatalogo } from "@/lib/deliverect/ordine";

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

type ArticoloDeliverect = ArticoloDx;

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
  payment?: { amount?: number };       // centesimi, quello che ha pagato il cliente
  deliveryCost?: number; serviceCharge?: number; tip?: number; bagFee?: number; discountTotal?: number;
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

  // il prodotto si riconosce dal PLU (src/lib/deliverect/ordine.ts); quello che non conosciamo entra col
  // suo nome e il suo prezzo, e la nota lo dice alla cassa
  const admin = supabaseAdmin();
  const [pr, va, pg] = await Promise.all([
    admin.from("prodotto").select("id, nome, codice, id_velocissimo, attivo, categoria(destinazione)"),
    admin.from("variazione").select("nome, id_velocissimo, tipo"),
    admin.from("pacchetto_gruppo").select("id_pacchetto"),
  ]);
  type PrRiga = { id: string; nome: string; codice: string | null; id_velocissimo: number | null; attivo: boolean; categoria: { destinazione: "cucina" | "cassa" | "nessuna" } | null };
  const catalogo = ((pr.data ?? []) as unknown as PrRiga[]).map((p) => ({ ...p, destinazione: p.categoria?.destinazione ?? "cucina" }));
  const combo = new Set(((pg.data ?? []) as { id_pacchetto: string }[]).map((x) => x.id_pacchetto));
  const { righe, sconosciuti, totale } = traduciArticoli(ordine.items ?? [], catalogo, (va.data ?? []) as VariazioneCatalogo[], combo);
  // il totale si confronta con quello di Deliverect (critico giro 36, M6): consegna, servizio e mancia sono
  // loro, lo sconto è della piattaforma; se i prodotti non tornano, la cassa lo vede scritto
  const cent = (x?: number) => (Number.isFinite(x) ? (x as number) : 0);
  const pagato = ordine.payment?.amount;
  const atteso = pagato == null ? null
    : (pagato - cent(ordine.deliveryCost) - cent(ordine.serviceCharge) - cent(ordine.tip) - cent(ordine.bagFee) + Math.abs(cent(ordine.discountTotal))) / 100;
  const scarto = atteso == null ? 0 : Math.round((atteso - totale) * 100) / 100;
  const note = [
    sconosciuti.length && `NON IN MENÙ: ${sconosciuti.join(", ")}`,
    Math.abs(scarto) >= 0.01 && `TOTALE DIVERSO: Deliverect ${atteso!.toFixed(2)} €, righe ${totale.toFixed(2)} €`,
    ordine.note, ordine.customer?.name && `Cliente: ${ordine.customer.name}`, ordine.customer?.phoneNumber && `Tel: ${ordine.customer.phoneNumber}`,
  ].filter(Boolean).join(" · ") || null;

  const { data, error } = await admin.rpc("accetta_ordine_esterno", {
    p_negozio: negozio,
    p_canale: canale,
    p_tipo: tipo,
    p_id_esterno: ordine._id ?? ordine.channelOrderId,
    p_ora: null,
    p_note: note,
    p_righe: righe,
  });
  if (error) return NextResponse.json({ errore: error.message }, { status: 500 });
  // un ordine che la cassa non ha preso non è «OK» (critico giro 36, G2: per Glovo arrivava, in cassa no).
  // Deliverect lo segna fallito e il ristorante lo vede: meglio che un ordine pagato e perso.
  const esito = (data as { esito: string; motivo?: string }).esito;
  if (esito !== "accettato" && esito !== "duplicato") {
    return NextResponse.json({ errore: `ordine non accettato: ${esito}`, dettaglio: data }, { status: 409 });
  }

  // Risposta a Deliverect: 200 = ricevuto. L'accettazione (ACCEPTED 20) verso Deliverect
  // non è ancora implementata: va fatta con OAuth una volta che le credenziali sono pronte.
  return NextResponse.json({ result: "OK", esito: (data as { esito: string }).esito }, { status: 200 });
}
