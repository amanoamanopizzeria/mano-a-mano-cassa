"use client";

// Accesso per lo staff (cassa, rider) e per i clienti.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [messaggio, setMessaggio] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

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
    <main className="accesso" style={{ maxWidth: 400 }}>
      <img src="/brand/bollino.png" alt="A Mano a Mano" className="bollino" />
      <h1>Accedi</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          accedi(false);
        }}
        className="carta"
        style={{ display: "grid", gap: 10 }}
      >
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
          style={{ padding: 12, fontSize: 16 }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="current-password"
          style={{ padding: 12, fontSize: 16 }}
        />
        <button className="primario" type="submit" disabled={inCorso} style={{ padding: 14, fontSize: 17, fontFamily: "Oswald, sans-serif", textTransform: "uppercase", letterSpacing: ".06em" }}>
          Accedi
        </button>
        <button type="button" disabled={inCorso} onClick={() => accedi(true)}>
          Registrati
        </button>
      </form>
      {messaggio && <p style={{ color: "var(--accento)" }}>{messaggio}</p>}
    </main>
  );
}
