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
  esaurito_fino: string | null;
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
        supabase.from("prodotto").select("id, id_categoria, nome, prezzo, attivo, esaurito_fino").order("ordine"),
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

  // «Esaurito per stasera» (mig. 0070): sparisce dal sito e dal totem, in cassa diventa grigio; torna alle 6.
  const esaurito = (p: Prodotto) => !!p.esaurito_fino && new Date(p.esaurito_fino).getTime() > Date.now();
  async function segnaEsaurito(p: Prodotto, si: boolean) {
    const { data, error } = await supabaseBrowser().rpc("prodotto_esaurito", { p_id: p.id, p_esaurito: si });
    if (error) { setErrore(error.message); return; }
    const fino = (data as { esaurito_fino: string | null }).esaurito_fino;
    setProdotti((ps) => ps.map((x) => (x.id === p.id ? { ...x, esaurito_fino: fino } : x)));
  }

  const nomeCategoria = (id: string) => categorie.find((c) => c.id === id)?.nome ?? "?";

  return (
    <main className="menu-lettura">
      <h1>Menù</h1>
      <p className="muto">Prezzi e prodotti si cambiano dal database. Qui si segna un prodotto «esaurito stasera»: sparisce dal sito e dal totem, in cassa diventa grigio, e torna da solo alle 6 di mattina.</p>
      {errore && <p className="m-errore">{errore}</p>}

      {/* grafico giro 24: l'indice, come la striscia delle categorie di /ordina. Un tocco porta alla
          categoria; solo quelle con qualcosa in vendita (i burger spenti non ci sono). */}
      {gruppi.length > 0 && (
        <nav className="m-indice" aria-label="Indice del menù">
          {gruppi.map((g) => {
            const cat = categorie.filter((c) => c.id_gruppo === g.id && prodotti.some((p) => p.id_categoria === c.id && p.attivo));
            if (cat.length === 0) return null;
            return (
              <span key={g.id} className="m-ind-gruppo">
                <span className="g">{g.nome}</span>
                {cat.map((c) => <a key={c.id} href={`#cat-${c.id}`}>{c.nome}</a>)}
              </span>
            );
          })}
        </nav>
      )}

      {gruppi.map((g) => (
        <section key={g.id} className="m-gruppo">
          <h2>{g.nome}</h2>
          <div className="m-categorie">
          {categorie.filter((c) => c.id_gruppo === g.id).map((c) => (
            <div key={c.id} id={`cat-${c.id}`} className="carta">
              <strong className="cat">{c.nome}</strong>
              {(() => {
                const della = prodotti.filter((p) => p.id_categoria === c.id);
                const riga = (p: Prodotto) => {
                  const pacchetto = componenti.filter((k) => k.id_pacchetto === p.id);
                  return (
                    <li key={p.id} className={!p.attivo ? "spento" : esaurito(p) ? "esaurito" : undefined}>
                      <span className="nome">{p.nome}</span><span className="prezzo">{Number(p.prezzo).toFixed(2).replace(".", ",")} €</span>
                      {p.attivo && (
                        <button className={"esaurito-tasto" + (esaurito(p) ? " primario" : "")} onClick={() => segnaEsaurito(p, !esaurito(p))}>
                          {esaurito(p) ? "Rimetti in vendita" : "Esaurito stasera"}
                        </button>
                      )}
                      {pacchetto.length > 0 && (
                        <div className="muto">
                          Pacchetto: {pacchetto.map((k) => `${k.quantita}× ${k.etichetta} (${nomeCategoria(k.id_categoria)})`).join(" + ")}
                        </div>
                      )}
                    </li>
                  );
                };
                const spenti = della.filter((p) => !p.attivo);
                return (
                  <>
                    <ul className="prodotti">{della.filter((p) => p.attivo).map(riga)}</ul>
                    {spenti.length > 0 && (
                      <details className="spenti">
                        <summary>Spenti ({spenti.length}): non si vendono, restano in anagrafica</summary>
                        <ul className="prodotti">{spenti.map(riga)}</ul>
                      </details>
                    )}
                  </>
                );
              })()}
              {gruppiVar.some((g) => g.id_categoria === c.id) && (
                <div className="muto m-varianti">
                  Varianti: {gruppiVar.filter((g) => g.id_categoria === c.id).map((g) =>
                    `${g.gruppo} (${variazioni.filter((v) => v.gruppo === g.gruppo && (v.id_categoria === null || v.id_categoria === c.id)).length})`
                  ).join(" · ")}
                </div>
              )}
            </div>
          ))}
          </div>
        </section>
      ))}
    </main>
  );
}
