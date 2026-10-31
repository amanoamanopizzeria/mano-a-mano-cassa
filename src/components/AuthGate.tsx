"use client";

// Protegge una pagina: senza sessione rimanda a /login. Mostra chi è dentro.
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { homeDel, ruoloMio } from "@/lib/home";

// barra=false nasconde email ed «Esci»: serve al totem e alla cassa a tutto schermo.
// Home e Indietro in ogni pagina dello staff (Edoardo, 30/10/2026: «il tasto home e indietro in ogni pagina che apri»).
// La home è «Cassa — ordini» (Edoardo, 31/10/2026: «tenere quella che è cassa ordini come home page»), vedi
// src/lib/home.ts; l'elenco di tutte le pagine resta all'admin.
const PAGINE_CASSA = [
  { href: "/cassa/tavoli", nome: "Sala" },
  { href: "/cassa/cliente", nome: "Cliente" },
  { href: "/cassa/riepilogo", nome: "Chiusura serata" },
];

export default function AuthGate({ children, barra = true }: { children: React.ReactNode; barra?: boolean }) {
  const router = useRouter();
  const pagina = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [home, setHome] = useState("/cassa");

  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/login");
      } else {
        setEmail(data.session.user.email ?? null);
        setPronto(true);
        ruoloMio().then((r) => { setAdmin(r === "admin"); setHome(homeDel(r)); });
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
        <span className="ag-nav">
          {pagina !== home && <>
            <button type="button" onClick={() => (window.history.length > 1 ? router.back() : router.push(home))}>‹ Indietro</button>
            <button type="button" onClick={() => router.push(home)}>⌂ Home</button>
          </>}
          {/* senza l'elenco delle pagine, alla cassa restano a un tocco solo le pagine del lavoro (31/10/2026):
              la sala, la scheda cliente e la chiusura della serata col CSV */}
          {home === "/cassa" && PAGINE_CASSA.filter((p) => p.href !== pagina).map((p) =>
            <button key={p.href} type="button" onClick={() => router.push(p.href)}>{p.nome}</button>)}
        </span>
        {admin && pagina !== "/" && <button type="button" onClick={() => router.push("/")}>Tutte le pagine</button>}
        <span>{email}</span>
        <button onClick={esci}>Esci</button>
      </div>}
      {children}
    </>
  );
}
