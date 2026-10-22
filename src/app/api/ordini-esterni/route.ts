// Ordini da app, sito e aggregatori: entrano in cassa solo se lo slot ha posto.
// Autenticazione con chiave condivisa nell'intestazione x-api-key (ORDINI_ESTERNI_KEY).
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const CANALI = ["app", "web", "glovo", "deliveroo", "justeat", "totem"] as const;
const TIPI = ["domicilio", "ritiro"] as const;

function chiaveValida(ricevuta: string | null): boolean {
  const attesa = process.env.ORDINI_ESTERNI_KEY;
  if (!attesa || !ricevuta) return false;
  const a = Buffer.from(ricevuta);
  const b = Buffer.from(attesa);
  return a.length === b.length && timingSafeEqual(a, b);
}

interface RigaEsterna {
  descrizione: string;
  quantita?: number;
  prezzo_unit?: number;
  variazioni?: unknown[];
  note?: string;
  destinazione?: "cucina" | "cassa" | "nessuna";
}

export async function POST(req: Request) {
  if (!chiaveValida(req.headers.get("x-api-key"))) {
    return NextResponse.json({ errore: "non autorizzato" }, { status: 401 });
  }

  let body: {
    id_negozio?: string; canale?: string; tipo?: string; id_esterno?: string;
    ora_consegna?: string | null; note?: string | null; righe?: RigaEsterna[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ errore: "JSON non valido" }, { status: 400 });
  }

  if (!body.id_negozio || !body.canale || !(CANALI as readonly string[]).includes(body.canale)) {
    return NextResponse.json({ errore: "id_negozio e canale validi sono obbligatori" }, { status: 400 });
  }
  if (!body.tipo || !(TIPI as readonly string[]).includes(body.tipo)) {
    return NextResponse.json({ errore: "tipo: domicilio oppure ritiro" }, { status: 400 });
  }
  if (!Array.isArray(body.righe) || body.righe.length === 0) {
    return NextResponse.json({ errore: "serve almeno una riga" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin().rpc("accetta_ordine_esterno", {
    p_negozio: body.id_negozio,
    p_canale: body.canale,
    p_tipo: body.tipo,
    p_id_esterno: body.id_esterno ?? null,
    p_ora: body.ora_consegna ?? null,
    p_note: body.note ?? null,
    p_righe: body.righe,
  });
  if (error) return NextResponse.json({ errore: error.message }, { status: 500 });

  const esito = (data as { esito: string }).esito;
  if (esito === "accettato") return NextResponse.json(data, { status: 201 });
  if (esito === "duplicato") return NextResponse.json(data, { status: 200 });
  if (esito === "pieno") return NextResponse.json(data, { status: 409 });
  return NextResponse.json(data, { status: 422 });
}
