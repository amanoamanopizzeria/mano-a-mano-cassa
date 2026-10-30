"use client";

// Protegge una pagina: senza sessione rimanda a /login. Mostra chi è dentro.
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

// barra=false nasconde email ed «Esci»: serve al totem e alla cassa a tutto schermo.
// Home e Indietro in ogni pagina dello staff (Edoardo, 30/10/2026: «il tasto home e indietro in ogni pagina che apri»).
export default function AuthGate({ children, barra = true }: { children: React.ReactNode; barra?: boolean }) {
  const router = useRouter();
  const pagina = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/login");
      } else {
        setEmail(data.session.user.email ?? null);
        setPronto(true);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.replace("/login");
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  async function esci() {
    await supabaseBrowser().auth.signOut();
    router.replace("/login");
  }

  if (!pronto) return <main className="muto">Verifica accesso…</main>;
  return (
    <>
      {barra && <div className="muto ag-barra">
        {pagina !== "/" && <span className="ag-nav">
          <button type="button" onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}>‹ Indietro</button>
          <button type="button" onClick={() => router.push("/")}>⌂ Home</button>
        </span>}
        <span>{email}</span>
        <button onClick={esci}>Esci</button>
      </div>}
      {children}
    </>
  );
}
