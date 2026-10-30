"use client";

// Accesso per lo staff (cassa, rider). Niente «Registrati» (controllo ECC, 26/10/2026): le utenze le crea
// Edoardo dal pannello di Supabase, i clienti ordinano da /ordina senza account. Rider e postazioni entrano
// anche con nome breve e PIN di 4 cifre (Edoardo, 30/10/2026): /api/accesso/pin, che si accende col database.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [messaggio, setMessaggio] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const [conPin, setConPin] = useState(false);   // col PIN acceso si può partire da lì
  const [nome, setNome] = useState("");
  const [pin, setPin] = useState("");

  // Chi è già dentro non deve rivedere il modulo (critico giro 4b): si va alla home.
  useEffect(() => {
    supabaseBrowser().auth.getSession().then(({ data }) => { if (data.session) router.replace("/"); });
  }, [router]);

  async function accedi() {
    setInCorso(true);
    setMessaggio(null);
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
    setInCorso(false);
    if (error) {
      setMessaggio(error.message);
      return;
    }
    router.push("/cassa");
    router.refresh();
  }

  async function accediPin(p: string) {
    setInCorso(true);
    setMessaggio(null);
    const r = await fetch("/api/accesso/pin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome, pin: p }) });
    const j = (await r.json().catch(() => ({}))) as { token?: string; errore?: string };
    if (!r.ok || !j.token) { setInCorso(false); setPin(""); setMessaggio(j.errore ?? "Accesso non riuscito."); return; }
    const { error } = await supabaseBrowser().auth.verifyOtp({ token_hash: j.token, type: "magiclink" });
    setInCorso(false);
    if (error) { setPin(""); setMessaggio(error.message); return; }
    router.push("/");
    router.refresh();
  }
  function tasto(c: string) {
    if (inCorso) return;
    if (c === "⌫") { setPin((x) => x.slice(0, -1)); return; }
    const nuovo = (pin + c).slice(0, 4);
    setPin(nuovo);
    if (nuovo.length === 4 && nome.trim()) accediPin(nuovo);
  }

  return (
    <main className="accesso app">
      <div className="a-testa">
        <div className="a-sabbia"><img src="/brand/logo-amanoamano.png" alt="A Mano A Mano Pugliese" /><img src="/brand/bollino.png" alt="" className="bollino" /></div>
        <div className="a-vino">Mano a Mano Cassa</div>
      </div>
      <h1>Accedi</h1>
      <div className="a-modi">
        <button type="button" className={conPin ? "primario" : ""} onClick={() => { setConPin(true); setMessaggio(null); }}>Con il PIN</button>
        <button type="button" className={conPin ? "" : "primario"} onClick={() => { setConPin(false); setMessaggio(null); }}>Email e password</button>
      </div>
      {conPin ? (
        <div className="carta a-pin">
          <input placeholder="Chi sei (es. rider3, totem)" value={nome} onChange={(e) => setNome(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
          <div className="a-puntini" aria-label={`${pin.length} cifre su 4`}>{[0, 1, 2, 3].map((i) => <span key={i} className={i < pin.length ? "pieno" : ""} />)}</div>
          <div className="a-tastierino">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((c, i) => c === ""
              ? <span key={i} />
              : <button key={i} type="button" disabled={inCorso || (c !== "⌫" && !nome.trim())} onClick={() => tasto(c)}>{c}</button>)}
          </div>
          {!nome.trim() && <p className="muto">Scrivi prima chi sei, poi il PIN.</p>}
        </div>
      ) : (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          accedi();
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
      </form>
      )}
      {messaggio && <p className="a-msg">{messaggio}</p>}
    </main>
  );
}
