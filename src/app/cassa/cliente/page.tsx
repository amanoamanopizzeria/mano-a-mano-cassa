"use client";

// Home della cassa: si digita il telefono, se il cliente è conosciuto si apre la scheda
// (nome, indirizzi, note fisse, ultimi ordini); se no si crea al volo.
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";

interface Scheda {
  esito: "trovato" | "nuovo" | "numero_corto";
  telefono?: string;
  cliente?: { id: string; nome: string | null; telefono: string; note: string | null };
  indirizzi?: { id: string; via: string; civico: string | null; cap: string | null; citta: string | null }[];
  ultimi_ordini?: { numero: number; creato_il: string; totale: number; tipo: string; canale: string }[];
}

export default function ClientePagina() {
  return (
    <AuthGate>
      <Cliente />
    </AuthGate>
  );
}

function Cliente() {
  const [telefono, setTelefono] = useState("");
  const [scheda, setScheda] = useState<Scheda | null>(null);
  const [nome, setNome] = useState("");
  const [note, setNote] = useState("");
  const [via, setVia] = useState("");
  const [civico, setCivico] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [salvato, setSalvato] = useState(false);

  async function cerca() {
    setErrore(null);
    setSalvato(false);
    const { data, error } = await supabaseBrowser().rpc("cerca_cliente", { p_telefono: telefono });
    if (error) { setErrore(error.message); return; }
    const s = data as Scheda;
    setScheda(s);
    setNome(s.cliente?.nome ?? "");
    setNote(s.cliente?.note ?? "");
  }

  async function salva() {
    setErrore(null);
    const { error } = await supabaseBrowser().rpc("salva_cliente", {
      p_telefono: telefono, p_nome: nome || null, p_note: note || null,
      p_via: via || null, p_civico: civico || null, p_cap: null, p_citta: "Roma",
    });
    if (error) { setErrore(error.message); return; }
    setSalvato(true);
    setVia("");
    setCivico("");
    await cerca();
  }

  return (
    <main>
      <h1>Cassa — cliente</h1>
      {errore && <p style={{ color: "var(--accento)" }}>{errore}</p>}

      <form onSubmit={(e) => { e.preventDefault(); cerca(); }} className="carta" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          type="tel"
          inputMode="tel"
          placeholder="Numero di telefono"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          style={{ flex: 1, minWidth: 180, fontSize: 18 }}
        />
        <button className="primario" type="submit">Cerca</button>
      </form>

      {scheda?.esito === "numero_corto" && <p className="muto">Numero troppo corto.</p>}

      {scheda?.esito === "trovato" && scheda.cliente && (
        <div className="carta" style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong style={{ fontSize: 18 }}>{scheda.cliente.nome ?? "Senza nome"}</strong>
            <span className="muto">{scheda.cliente.telefono}</span>
          </div>
          {scheda.cliente.note && (
            <p style={{ marginTop: 8, padding: 8, borderRadius: 8, border: "1px solid var(--accento)" }}>
              <strong>Note fisse:</strong> {scheda.cliente.note}
            </p>
          )}
          <h3 style={{ fontSize: 14, marginTop: 12 }}>Indirizzi</h3>
          <ul>
            {(scheda.indirizzi ?? []).map((i) => (
              <li key={i.id}>{i.via} {i.civico ?? ""} {i.citta ?? ""}</li>
            ))}
            {(scheda.indirizzi ?? []).length === 0 && <li className="muto">Nessun indirizzo</li>}
          </ul>
          <h3 style={{ fontSize: 14, marginTop: 12 }}>Ultimi ordini</h3>
          <ul>
            {(scheda.ultimi_ordini ?? []).map((o) => (
              <li key={o.numero}>#{o.numero} · {o.tipo} · {o.canale} · {Number(o.totale).toFixed(2)} €</li>
            ))}
            {(scheda.ultimi_ordini ?? []).length === 0 && <li className="muto">Nessun ordine</li>}
          </ul>
        </div>
      )}

      {scheda && scheda.esito !== "numero_corto" && (
        <div className="carta" style={{ marginTop: 12, display: "grid", gap: 8 }}>
          <strong>{scheda.esito === "nuovo" ? "Cliente nuovo: crea la scheda" : "Modifica la scheda"}</strong>
          <input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          <textarea placeholder="Note fisse (es. citofono rotto, non suonare)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div style={{ display: "flex", gap: 8 }}>
            <input placeholder="Via" value={via} onChange={(e) => setVia(e.target.value)} style={{ flex: 3 }} />
            <input placeholder="Civico" value={civico} onChange={(e) => setCivico(e.target.value)} style={{ flex: 1 }} />
          </div>
          <button className="primario" onClick={salva}>{salvato ? "Salvato" : "Salva scheda"}</button>
        </div>
      )}
    </main>
  );
}
