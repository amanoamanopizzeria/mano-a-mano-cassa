// API ordini: elenco (GET) e creazione (POST).
// Le policy RLS decidono chi può leggere/scrivere; qui si validano i dati.
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { calcolaTotale, type NuovoOrdine } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const stato = searchParams.get("stato");
  const supabase = await supabaseServer();

  let q = supabase
    .from("ordine")
    .select("*, ordine_riga(*)")
    .order("creato_il", { ascending: false })
    .limit(200);
  if (stato) q = q.eq("stato", stato);

  const { data, error } = await q;
  if (error) return NextResponse.json({ errore: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  let body: NuovoOrdine;
  try {
    body = (await req.json()) as NuovoOrdine;
  } catch {
    return NextResponse.json({ errore: "JSON non valido" }, { status: 400 });
  }
  if (!body.id_negozio || !Array.isArray(body.righe) || body.righe.length === 0) {
    return NextResponse.json(
      { errore: "Servono id_negozio e almeno una riga" },
      { status: 400 }
    );
  }
  if (body.tipo === "domicilio" && !body.id_indirizzo) {
    return NextResponse.json(
      { errore: "Un ordine a domicilio ha bisogno di un indirizzo" },
      { status: 400 }
    );
  }

  const supabase = await supabaseServer();
  const totale = calcolaTotale(body.righe);

  const { data: ordine, error: e1 } = await supabase
    .from("ordine")
    .insert({
      id_negozio: body.id_negozio,
      canale: body.canale ?? "cassa",
      tipo: body.tipo ?? "banco",
      id_cliente: body.id_cliente ?? null,
      id_indirizzo: body.id_indirizzo ?? null,
      id_zona: body.id_zona ?? null,
      ora_consegna: body.ora_consegna ?? null,
      note: body.note ?? null,
      id_esterno: body.id_esterno ?? null,
      totale,
    })
    .select()
    .single();
  if (e1 || !ordine) {
    return NextResponse.json({ errore: e1?.message ?? "insert fallito" }, { status: 400 });
  }

  const righe = body.righe.map((r) => ({
    id_ordine: ordine.id,
    id_prodotto: r.id_prodotto ?? null,
    descrizione: r.descrizione,
    quantita: r.quantita,
    prezzo_unit: r.prezzo_unit,
    variazioni: r.variazioni ?? [],
    note: r.note ?? null,
    destinazione: r.destinazione ?? "cucina",
  }));
  const { error: e2 } = await supabase.from("ordine_riga").insert(righe);
  if (e2) return NextResponse.json({ errore: e2.message }, { status: 400 });

  // un ordine a domicilio nasce con la sua consegna da assegnare
  if (body.tipo === "domicilio") {
    await supabase.from("consegna").insert({
      id_ordine: ordine.id,
      stato: "da_assegnare",
      contanti_da_incassare: totale,
    });
  }

  return NextResponse.json(ordine, { status: 201 });
}
