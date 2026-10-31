"use client";

// L'elenco di tutte le pagine è dell'admin: chi non lo è va alla sua home
// (Edoardo, 31/10/2026: «la home è sbagliata, dà troppe informazioni, non è quello che serve in cassa»).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { homeDel, ruoloMio } from "@/lib/home";

export default function SoloAdmin({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    supabaseBrowser().auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace("/login"); return; }
      const ruolo = await ruoloMio();
      if (ruolo === "admin") setAdmin(true);
      else router.replace(homeDel(ruolo));
    });
  }, [router]);
  return admin ? <>{children}</> : null;
}
