"use client";

// Il menù che Deliverect riceverebbe da noi (REA 23 §23.4), costruito dal database e mostrato: NON si
// manda niente. Serve a vedere oggi cosa andrebbe su Glovo, Deliveroo e Just Eat e a sistemare prima
// i PLU doppi o mancanti. Quando Deliverect darà le chiavi di prova, si manda questo stesso JSON.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import { supabaseBrowser } from "@/lib/supabase/client";
import { costruisciMenu, pluProdotto, vaSullePiattaforme, type CategoriaDx, type GruppoCatDx, type PacchettoDx, type ProdottoDx, type VariazioneDx } from "@/lib/deliverect/menu";

export default function MenuDeliverectPagina() {
  return (
    <AuthGate>
      <MenuDeliverect />
    </AuthGate>
  );
}

interface Dati { categorie: CategoriaDx[]; prodotti: ProdottoDx[]; variazioni: VariazioneDx[]; gruppi: GruppoCatDx[]; pacchetti: PacchettoDx[] }
const euro = (c: number) => (c / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" });

function MenuDeliverect() {
  const [dati, setDati] = useState<Dati | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    const supabase = supabaseBrowser();
    (async () => {
      const [c, p, v, g, pg] = await Promise.all([
        supabase.from("categoria").select("id, nome, ordine").order("ordine"),
        supabase.from("prodotto").select("id, id_categoria, nome, descrizione, codice, id_velocissimo, prezzo, prezzo_piattaforme, aliquota_iva, foto_url, attivo, esaurito_fino").order("ordine"),
        supabase.from("variazione").select("id, nome, prezzo, gruppo, id_categoria, id_velocissimo, tipo"),
        supabase.from("categoria_gruppo_variazione").select("id_categoria, gruppo, ordine, min_n, max_n, max_gratis").order("ordine"),
        supabase.from("pacchetto_gruppo").select("id, id_pacchetto, etichetta, quantita, ordine, pacchetto_scelta(id_prodotto)").order("ordine"),
      ]);
      const primo = [c, p, v, g, pg].find((r) => r.error)?.error;
      if (primo) { setErrore(primo.message); return; }
      type PgRiga = Omit<PacchettoDx, "scelte"> & { pacchetto_scelta: { id_prodotto: string }[] };
      setDati({
        categorie: (c.data ?? []) as CategoriaDx[],
        prodotti: ((p.data ?? []) as ProdottoDx[]).map((x) => ({ ...x, prezzo: Number(x.prezzo), prezzo_piattaforme: x.prezzo_piattaforme == null ? null : Number(x.prezzo_piattaforme), aliquota_iva: Number(x.aliquota_iva ?? 10) })),
        variazioni: ((v.data ?? []) as VariazioneDx[]).map((x) => ({ ...x, prezzo: Number(x.prezzo) })),
        gruppi: (g.data ?? []) as GruppoCatDx[],
        pacchetti: ((pg.data ?? []) as PgRiga[]).map(({ pacchetto_scelta, ...x }) => ({ ...x, scelte: pacchetto_scelta.map((s) => s.id_prodotto) })),
      });
    })();
  }, []);

  const esito = useMemo(() => (dati ? costruisciMenu(dati) : null), [dati]);

  function scarica() {
    if (!esito) return;
    const blob = new Blob([JSON.stringify(esito.menu, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "menu-deliverect-anteprima.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (errore) return <main><p className="m-errore">{errore}</p></main>;
  if (!dati || !esito) return <main><p className="muto">Carico il menù…</p></main>;

  const { menu, avvisi, pluDa } = esito;
  const prodotti = menu.products.filter((x) => x.productType === 1);
  const gravi = avvisi.filter((a) => a.grave).length;
  const perCategoria = menu.categories.map((c) => ({ ...c, righe: prodotti.filter((x) => x.posCategoryIds?.includes(c.posCategoryId)) }));
  const fuori = dati.prodotti.filter((p) => p.attivo && !vaSullePiattaforme(p));

  return (
    <main className="menu-lettura dx">
      <p><Link href="/cassa/menu">← Menù</Link></p>
      <h1>Il menù per Glovo, Deliveroo e Just Eat</h1>
      <p className="dx-frase">
        {gravi > 0
          ? <>Andrebbero su Deliverect <strong>{prodotti.length} prodotti</strong>, ma ci sono <strong>{gravi} PLU doppi</strong> da sistemare prima.</>
          : <>Andrebbero su Deliverect <strong>{prodotti.length} prodotti</strong> in {menu.categories.length} categorie, coi prezzi piattaforme (L3).</>}
      </p>
      <p className="muto">
        Anteprima: <strong>non si manda niente</strong>. Per mandarlo davvero servono le chiavi di Deliverect (si diventa
        «POS partner»: vedi il REA 23). Il PLU è il codice che lega un prodotto nostro a quello delle piattaforme: oggi
        {` ${pluDa.codice} vengono dal codice, ${pluDa.velocissimo} dall'id di Velocissimo, ${pluDa.nostro} dal nostro id`}.
      </p>

      {avvisi.length > 0 && (
        <section className="carta dx-avvisi">
          <h2>Da guardare</h2>
          <ul>{avvisi.map((a, i) => <li key={i} className={a.grave ? "grave" : ""}>{a.grave ? "⚠ " : ""}{a.testo}</li>)}</ul>
        </section>
      )}

      {perCategoria.map((c) => (
        <details key={c.posCategoryId} className="carta dx-cat">
          <summary><span>{c.name}</span><span className="muto">{c.righe.length}</span></summary>
          <table>
            <thead><tr><th>PLU</th><th>Prodotto</th><th className="num">Piattaforme</th><th>Varianti</th></tr></thead>
            <tbody>
              {c.righe.map((x) => (
                <tr key={x.plu} className={x.visible === false ? "spento" : ""}>
                  <td><code>{x.plu}</code></td>
                  <td>{x.name}{x.visible === false && <small> · esaurito stasera</small>}</td>
                  <td className="num">{euro(x.price)}</td>
                  <td className="muto">{x.subProducts?.length ? `${x.subProducts.length} gruppi` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ))}

      {fuori.length > 0 && (
        <details className="carta dx-cat">
          <summary><span>Restano fuori (senza prezzo piattaforme)</span><span className="muto">{fuori.length}</span></summary>
          <ul>{fuori.map((p) => <li key={p.id}>{p.nome} <small className="muto">· PLU {pluProdotto(p).plu}</small></li>)}</ul>
        </details>
      )}

      <p><button onClick={scarica}>Scarica il JSON per Deliverect</button></p>
    </main>
  );
}
