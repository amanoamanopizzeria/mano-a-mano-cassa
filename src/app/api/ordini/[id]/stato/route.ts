// Cambio stato di un ordine, con controllo delle transizioni ammesse.
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { transizioneValida, type StatoOrdine } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { stato } = (await req.json().catch(() => ({}))) as { stato?: StatoOrdine };
  if (!stato) return NextResponse.json({ errore: "Manca lo stato" }, { status: 400 });

  const supabase = await supabaseServer();
  const { data: attuale, error: e1 } = await supabase
    .from("ordine")
    .select("stato")
    .eq("id", id)
    .single();
  if (e1 || !attuale) return NextResponse.json({ errore: "Ordine non trovato" }, { status: 404 });

  if (!transizioneValida(attuale.stato as StatoOrdine, stato)) {
    return NextResponse.json(
      { errore: `Da "${attuale.stato}" non si può passare a "${stato}"` },
      { status: 409 }
    );
  }

  // Si aggiorna solo se lo stato è ancora quello letto (controllo ECC 26/10, punto 8): un annullo
  // e una consegna nello stesso momento non devono passare tutti e due.
  const { data, error } = await supabase
    .from("ordine")
    .update({ stato, aggiornato_il: new Date().toISOString() })
    .eq("id", id)
    .eq("stato", attuale.stato)
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ errore: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ errore: "L'ordine è appena cambiato: ricarica e riprova" }, { status: 409 });
  return NextResponse.json(data);
}
