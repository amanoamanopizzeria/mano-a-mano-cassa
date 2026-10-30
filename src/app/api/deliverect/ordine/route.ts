// Ordini da Deliverect (Glovo, Deliveroo, Just Eat) verso la cassa, per quando saremo noi il POS.
// Deliverect chiama questo URL (Locations > Generic POS Settings > Orders webhook URL).
// STATO: spento. Nel mese in parallelo il POS resta Velocissimo e questo URL non sta su Deliverect (le copie
// arrivano a /api/deliverect/copia). Senza DELIVERECT_WEBHOOK_SECRET risponde 401 a tutto.
// Regole (documentazione Deliverect letta il 27/10/2026, REA 26):
// - un ordine pagato non si rifiuta mai: entra anche a quarto pieno (0073), con un PLU che non conosciamo
//   (ordine.ts) o da un canale che non conosciamo (la nota lo dice);
// - l'annullo arriva qui con status 100 e lo stesso _id: si annulla l'ordine e si risponde 110;
// - gli stati (20 accettato, 110 annullato) partono solo se il client API è acceso (src/lib/deliverect/api.ts).
import { NextResponse, after } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { traduciArticoli, type ArticoloDx, type VariazioneCatalogo } from "@/lib/deliverect/ordine";
import { aggiornaStato, acceso, STATO } from "@/lib/deliverect/api";

export const dynamic = "force-dynamic";

// Codice canale di Deliverect -> canale nostro. Deliveroo 2 e Just Eat 9 sono nell'esempio di /allChannels
// della documentazione; Glovo lì non c'è: il numero vero si legge in staging (/allChannels) e si scrive su
// Vercel in DELIVERECT_CANALI, per esempio {"2":"deliveroo","9":"justeat","27":"glovo"}.
type CanalePiattaforma = "glovo" | "deliveroo" | "justeat";
function canali(): Record<number, CanalePiattaforma> {
  const base: Record<number, CanalePiattaforma> = { 2: "deliveroo", 9: "justeat" };
  try {
    return { ...base, ...(JSON.parse(process.env.DELIVERECT_CANALI || "{}") as Record<number, CanalePiattaforma>) };
  } catch {
    return base;
  }
}

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
  pickupTime?: string;                 // UTC, sempre presente: quando il cibo deve essere pronto
  deliveryTime?: string;
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

  const admin = supabaseAdmin();
  const idEsterno = ordine._id ?? ordine.channelOrderId;

  // annullo: l'ordine resta una riga, annullato (come la 0062), e si conferma 110 a Deliverect
  if (ordine.status === 100) {
    const { data: trovati, error } = await admin.from("ordine")
      .select("id, numero, stato, note").eq("id_esterno", idEsterno).in("canale", ["glovo", "deliveroo", "justeat"]);
    if (error) return NextResponse.json({ errore: error.message }, { status: 500 });
    for (const o of (trovati ?? []) as { id: string; numero: number; stato: string; note: string | null }[]) {
      if (o.stato === "annullato") continue;
      const nota = ["ANNULLATO DALLA PIATTAFORMA", o.note].filter(Boolean).join(" · ");
      const { error: e2 } = await admin.from("ordine")
        .update({ stato: "annullato", annullato_il: new Date().toISOString(), note: nota }).eq("id", o.id);
      if (e2) return NextResponse.json({ errore: e2.message }, { status: 500 });
      if (ordine._id && acceso()) after(() => aggiornaStato(ordine._id!, STATO.annullato, String(o.numero)).then(() => undefined));
    }
    return NextResponse.json({ result: "OK", annullati: trovati?.length ?? 0 });
  }

  const mappa = canali();
  const canale: CanalePiattaforma = mappa[ordine.channel] ?? "glovo";
  const canaleIgnoto = !mappa[ordine.channel];
  const tipo = TIPI[ordine.orderType] ?? "ritiro";
  const negozio = process.env.DELIVERECT_ID_NEGOZIO;
  if (!negozio) return NextResponse.json({ errore: "negozio non configurato" }, { status: 500 });

  // il prodotto si riconosce dal PLU (src/lib/deliverect/ordine.ts); quello che non conosciamo entra col
  // suo nome e il suo prezzo, e la nota lo dice alla cassa
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
    canaleIgnoto && `CANALE DELIVERECT ${ordine.channel} NON RICONOSCIUTO (segnato Glovo)`,
    ordine.testOrder && "ORDINE DI PROVA DI DELIVERECT",
    sconosciuti.length && `NON IN MENÙ: ${sconosciuti.join(", ")}`,
    Math.abs(scarto) >= 0.01 && `TOTALE DIVERSO: Deliverect ${atteso!.toFixed(2)} €, righe ${totale.toFixed(2)} €`,
    ordine.note, ordine.customer?.name && `Cliente: ${ordine.customer.name}`, ordine.customer?.phoneNumber && `Tel: ${ordine.customer.phoneNumber}`,
  ].filter(Boolean).join(" · ") || null;

  const { data, error } = await admin.rpc("accetta_ordine_esterno", {
    p_negozio: negozio,
    p_canale: canale,
    p_tipo: tipo,
    p_id_esterno: idEsterno,
    // il quarto d'ora è quello in cui il cibo deve essere pronto (prima si passava null: tutto «adesso»)
    p_ora: ordine.pickupTime ?? ordine.deliveryTime ?? null,
    p_note: note,
    p_righe: righe,
  });
  if (error) return NextResponse.json({ errore: error.message }, { status: 500 });
  // dalla 0073 un ordine di piattaforma entra sempre; resta fuori solo un ordine senza righe
  const esito = data as { esito: string; motivo?: string; numero?: number };
  if (esito.esito !== "accettato" && esito.esito !== "duplicato") {
    return NextResponse.json({ errore: `ordine non accettato: ${esito.esito}`, dettaglio: data }, { status: 500 });
  }
  // 2xx subito, lo stato dopo (Deliverect: «return a 2xx, then send statuses asynchronously»)
  if (esito.esito === "accettato" && ordine._id && acceso()) {
    after(() => aggiornaStato(ordine._id!, STATO.accettato, String(esito.numero ?? "")).then(() => undefined));
  }
  return NextResponse.json({ result: "OK", esito: esito.esito }, { status: 200 });
}
