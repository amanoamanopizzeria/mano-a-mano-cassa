"use client";

// Pagine solo dell'admin (l'elenco di tutte le pagine, il cruscotto): chi non lo è va alla sua home.
// Edoardo, 31/10/2026: «la home è sbagliata, dà troppe informazioni»; «la dashboard è tutta roba mia, loro
// non ci devono accedere».
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
