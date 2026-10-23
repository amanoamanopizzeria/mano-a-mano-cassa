"use client";

// Menù della cassa, in sola lettura: gruppi → categorie → prodotti, con varianti e pacchetti.
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";

interface Prodotto {
  id: string;
  id_categoria: string | null;
  nome: string;
  prezzo: number;
  attivo: boolean;
}
interface Categoria { id: string; nome: string; id_gruppo: string | null; ordine: number }
interface Gruppo { id: string; nome: string; ordine: number }
interface Variazione { id: string; nome: string; prezzo: number; tipo: string; gruppo: string; id_categoria: string | null }
interface GruppoVar { id_categoria: string; gruppo: string; ordine: number }
interface Componente { id_pacchetto: string; etichetta: string; id_categoria: string; quantita: number; ordine: number }

export default function MenuPagina() {
  return (
    <AuthGate>
      <Menu />
    </AuthGate>
  );
}

function Menu() {
  const [gruppi, setGruppi] = useState<Gruppo[]>([]);
  const [categorie, setCategorie] = useState<Categoria[]>([]);
  const [prodotti, setProdotti] = useState<Prodotto[]>([]);
  const [variazioni, setVariazioni] = useState<Variazione[]>([]);
  const [gruppiVar, setGruppiVar] = useState<GruppoVar[]>([]);
  const [componenti, setComponenti] = useState<Componente[]>([]);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) { setErrore("Supabase non configurato."); return; }
    const supabase = supabaseBrowser();
    (async () => {
      const [g, c, p, v, gv, k] = await Promise.all([
        supabase.from("gruppo_categoria").select("id, nome, ordine").order("ordine"),
        supabase.from("categoria").select("id, nome, id_gruppo, ordine").order("ordine"),
        supabase.from("prodotto").select("id, id_categoria, nome, prezzo, attivo").order("ordine"),
        supabase.from("variazione").select("id, nome, prezzo, tipo, gruppo, id_categoria"),
        supabase.from("categoria_gruppo_variazione").select("id_categoria, gruppo, ordine").order("ordine"),
        supabase.from("pacchetto_componente").select("id_pacchetto, etichetta, id_categoria, quantita, ordine").order("ordine"),
      ]);
      const primo = [g, c, p, v, gv, k].find((r) => r.error)?.error;
      setGruppiVar((gv.data ?? []) as GruppoVar[]);
      if (primo) { setErrore(primo.message); return; }
      setGruppi((g.data ?? []) as Gruppo[]);
      setCategorie((c.data ?? []) as Categoria[]);
      setProdotti((p.data ?? []) as Prodotto[]);
      setVariazioni((v.data ?? []) as Variazione[]);
      setComponenti((k.data ?? []) as Componente[]);
    })();
  }, []);

  const nomeCategoria = (id: string) => categorie.find((c) => c.id === id)?.nome ?? "?";

  return (
    <main className="menu-lettura">
      <h1>Menù</h1>
      <p className="muto">Sola lettura: il menù si cambia dal back office e dal database.</p>
      {errore && <p style={{ color: "var(--accento)" }}>{errore}</p>}

      {gruppi.map((g) => (
        <section key={g.id} style={{ marginTop: 16 }}>
          <h2>{g.nome}</h2>
          {categorie.filter((c) => c.id_gruppo === g.id).map((c) => (
            <div key={c.id} className="carta" style={{ marginBottom: 10 }}>
              <strong className="cat">{c.nome}</strong>
              <ul className="prodotti">
                {prodotti.filter((p) => p.id_categoria === c.id).map((p) => {
                  const pacchetto = componenti.filter((k) => k.id_pacchetto === p.id);
                  return (
                    <li key={p.id} className={p.attivo ? undefined : "spento"}>
                      <span className="nome">{p.nome}</span><span className="prezzo">{Number(p.prezzo).toFixed(2).replace(".", ",")} €</span>
                      {pacchetto.length > 0 && (
                        <div className="muto">
                          Pacchetto: {pacchetto.map((k) => `${k.quantita}× ${k.etichetta} (${nomeCategoria(k.id_categoria)})`).join(" + ")}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              {gruppiVar.some((g) => g.id_categoria === c.id) && (
                <div className="muto" style={{ marginTop: 6 }}>
                  Varianti: {gruppiVar.filter((g) => g.id_categoria === c.id).map((g) =>
                    `${g.gruppo} (${variazioni.filter((v) => v.gruppo === g.gruppo && (v.id_categoria === null || v.id_categoria === c.id)).length})`
                  ).join(" · ")}
                </div>
              )}
            </div>
          ))}
        </section>
      ))}
    </main>
  );
}
