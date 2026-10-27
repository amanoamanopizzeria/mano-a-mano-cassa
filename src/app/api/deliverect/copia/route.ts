// Le COPIE degli ordini Deliverect per il mese in parallelo (REA 26 §26.3 strada R, REA 28).
// Deliverect le manda con le «Reporting Webhooks» mentre il POS resta Velocissimo. Qui non si crea
// nessun ordine: niente stampa, niente quarti d'ora, niente vendite né export verso l'OS. Si salva il
// messaggio così com'è in `deliverect_copia` (supabase/da_decidere/deliverect_copie.sql), per
// confrontare sera per sera. E da qui non parte mai uno stato verso Deliverect: accetta solo Velocissimo.
// STATO: spento finché su Vercel manca DELIVERECT_COPIA_SECRET (risponde 401 a tutto).
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// la stessa intestazione del POS (documentazione Deliverect, store-api_new_order_event); su Vercel se ne può
// aggiungere un'altra senza toccare il codice
const INTESTAZIONI = [process.env.DELIVERECT_COPIA_HEADER, "x-server-authorization-hmac-sha256"]
  .filter((x): x is string => !!x);

function firmaValida(corpo: string, ricevute: (string | null)[]): boolean {
  const segreto = process.env.DELIVERECT_COPIA_SECRET;
  if (!segreto) return false;
  const firma = createHmac("sha256", segreto).update(corpo, "utf8").digest();
  const attese = [Buffer.from(firma.toString("hex")), Buffer.from(firma.toString("base64"))];
  return ricevute.some((r) => {
    if (!r) return false;
    const a = Buffer.from(r.trim());
    return attese.some((b) => a.length === b.length && timingSafeEqual(a, b));
  });
}

// la serata finisce alle 06:00 di Roma
function giornata(d: Date): string {
  const roma = new Date(d.toLocaleString("en-US", { timeZone: "Europe/Rome" }));
  roma.setHours(roma.getHours() - 6);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${roma.getFullYear()}-${p(roma.getMonth() + 1)}-${p(roma.getDate())}`;
}

type Qualsiasi = Record<string, unknown>;
const testo = (x: unknown) => (typeof x === "string" && x ? x : typeof x === "number" ? String(x) : null);
const numero = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : null);

export async function POST(req: Request) {
  const corpo = await req.text();
  if (!firmaValida(corpo, INTESTAZIONI.map((h) => req.headers.get(h)))) {
    return NextResponse.json({ errore: "firma non valida" }, { status: 401 });
  }
  let msg: Qualsiasi;
  try {
    msg = JSON.parse(corpo) as Qualsiasi;
  } catch {
    return NextResponse.json({ errore: "JSON non valido" }, { status: 400 });
  }
  // l'ordine può stare al primo livello o dentro «order»/«data», a seconda dell'evento
  const o = ((msg.order ?? msg.data ?? msg) as Qualsiasi) || {};
  const pagato = numero((o.payment as Qualsiasi | undefined)?.amount);
  const cifre = numero(o.decimalDigits) ?? 2;
  const ora = new Date();

  const { error } = await supabaseAdmin().from("deliverect_copia").insert({
    ricevuto_il: ora.toISOString(),
    giornata: giornata(ora),
    evento: testo(msg.event ?? msg.type ?? msg.eventType),
    id_deliverect: testo(o._id ?? o.orderId),
    id_piattaforma: testo(o.channelOrderId),
    numero_visibile: testo(o.channelOrderDisplayId),
    canale: numero(o.channel),
    stato: numero(o.status),
    totale: pagato == null ? null : pagato / 10 ** cifre,
    corpo: msg,
  });
  // Deliverect non riprova le Reporting Webhooks (un tentativo, 20 s): l'errore resta nei log di Vercel
  if (error) return NextResponse.json({ errore: error.message }, { status: 500 });
  return NextResponse.json({ result: "OK" });
}
