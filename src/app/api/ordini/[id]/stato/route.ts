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

  const { data, error } = await supabase
    .from("ordine")
    .update({ stato, aggiornato_il: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ errore: error.message }, { status: 400 });
  return NextResponse.json(data);
}
