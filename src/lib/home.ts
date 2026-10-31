// La home di ciascuno (Edoardo, 31/10/2026): la cassa lavora da «Cassa — ordini», il rider dalla sua app,
// il totem dal totem. L'elenco di tutte le pagine («/») è dell'admin.
import { supabaseBrowser } from "@/lib/supabase/client";

export function homeDel(ruolo: string | null | undefined): string {
  if (ruolo === "rider") return "/rider";
  if (ruolo === "totem") return "/totem";
  return "/cassa";
}

export async function ruoloMio(): Promise<string | null> {
  const { data } = await supabaseBrowser().from("profilo").select("ruolo").maybeSingle();
  return data?.ruolo ?? null;
}
