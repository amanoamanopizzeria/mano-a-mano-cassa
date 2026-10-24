"use client";

// Accesso per lo staff (cassa, rider) e per i clienti.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [messaggio, setMessaggio] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  // Chi è già dentro non deve rivedere il modulo (critico giro 4b): si va alla home.
  useEffect(() => {
    supabaseBrowser().auth.getSession().then(({ data }) => { if (data.session) router.replace("/"); });
  }, [router]);

  async function accedi(registra: boolean) {
    setInCorso(true);
    setMessaggio(null);
    const supabase = supabaseBrowser();
    const { error } = registra
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setInCorso(false);
    if (error) {
      setMessaggio(error.message);
      return;
    }
    router.push("/cassa");
    router.refresh();
  }

  return (
    <main className="accesso app">
      <div className="a-testa">
        <div className="a-sabbia"><img src="/brand/logo-amanoamano.png" alt="A Mano A Mano Pugliese" /><img src="/brand/bollino.png" alt="" className="bollino" /></div>
        <div className="a-vino">Mano a Mano Cassa</div>
      </div>
      <h1>Accedi</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          accedi(false);
        }}
        className="carta"
      >
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="current-password"
        />
        <button className="primario a-entra" type="submit" disabled={inCorso}>
          Accedi
        </button>
        <button type="button" className="a-registra" disabled={inCorso} onClick={() => accedi(true)}>
          Registrati
        </button>
      </form>
      {messaggio && <p className="a-msg">{messaggio}</p>}
    </main>
  );
}
