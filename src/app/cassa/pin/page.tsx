"use client";

// I PIN di rider e postazioni (Edoardo, 30/10/2026, risposta B: «un PIN di 4 cifre va bene»). Solo l'admin
// li vede e li mette; il database (pin_imposta) rifà il controllo. Le utenze le crea Edoardo da Supabase:
// qui si dà a ognuna un nome breve e un PIN. Rimettere il PIN sblocca anche un accesso fermo.
import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";

interface Riga { id_utente: string; email: string; ruolo: string; nome: string | null; errori: number; bloccato: boolean; ultimo_accesso: string | null }

export default function PinPagina() {
  return (
    <AuthGate>
      <Pin />
    </AuthGate>
  );
}

function Pin() {
  const [righe, setRighe] = useState<Riga[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [fatto, setFatto] = useState<string | null>(null);
  const [scheda, setScheda] = useState<{ id: string; nome: string; pin: string } | null>(null);

  const carica = useCallback(async () => {
    const { data, error } = await supabaseBrowser().rpc("pin_elenco");
    if (error) { setErrore(/pin_elenco/.test(error.message) ? "L'accesso col PIN non è ancora acceso nel database." : error.message); setRighe([]); return; }
    setRighe((data ?? []) as Riga[]);
  }, []);
  useEffect(() => { carica(); }, [carica]);

  async function salva() {
    if (!scheda) return;
    const { data, error } = await supabaseBrowser().rpc("pin_imposta", { p_nome: scheda.nome, p_id_utente: scheda.id, p_pin: scheda.pin });
    if (error) { setErrore(error.message); return; }
    const r = data as { esito: string; messaggio?: string };
    if (r.esito !== "ok") { setErrore(r.messaggio ?? r.esito); return; }
    setErrore(null); setFatto(`PIN salvato per «${scheda.nome}».`); setScheda(null); carica();
  }

  return (
    <main className="riepilogo">
      <h1>PIN di rider e postazioni</h1>
      <p className="muto">Si entra da /login con «Con il PIN»: nome breve e 4 cifre. Solo per rider, cassa e totem: l&apos;admin entra con la password.</p>
      {errore && <p className="r-errore">{errore}</p>}
      {fatto && <p className="muto">{fatto}</p>}
      {righe === null ? <p className="muto">Leggo le utenze…</p> : righe.length === 0 ? (
        !errore && <p className="muto">Nessuna utenza di rider, cassa o totem. Le crea Edoardo dal pannello di Supabase.</p>
      ) : (
        <ul className="ch-lista">
          {righe.map((r) => (
            <li key={r.id_utente} className="carta ch-riga">
              <span className="ch-chi">
                <strong>{r.nome ?? "senza PIN"}</strong>
                <span className="muto">{r.email} · {r.ruolo}{r.bloccato ? " · FERMO" : r.errori > 0 ? ` · ${r.errori} errori` : ""}</span>
              </span>
              <span className="ch-azioni">
                <button type="button" onClick={() => { setFatto(null); setScheda({ id: r.id_utente, nome: r.nome ?? r.email.split("@")[0].toLowerCase(), pin: "" }); }}>
                  {r.nome ? "Cambia PIN" : "Metti PIN"}
                </button>
              </span>
              {scheda?.id === r.id_utente && (
                <span className="pin-scheda">
                  <input value={scheda.nome} onChange={(e) => setScheda({ ...scheda, nome: e.target.value.toLowerCase() })} placeholder="nome breve" />
                  <input value={scheda.pin} inputMode="numeric" maxLength={4} onChange={(e) => setScheda({ ...scheda, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="PIN (4 cifre)" />
                  <button type="button" onClick={() => setScheda(null)}>Lascia stare</button>
                  <button type="button" className="primario" disabled={scheda.pin.length !== 4 || !/^[a-z0-9_-]{2,20}$/.test(scheda.nome)} onClick={salva}>Salva</button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
