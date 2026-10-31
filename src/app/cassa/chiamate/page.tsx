"use client";

// L'elenco delle chiamate di una sera, come la finestra «Elenco chiamate» del 2Bit (REA 21 §5, REA 30 C3):
// ora, numero, cliente se lo conosciamo, se è stata presa. La colonna di /cassa mostra solo l'ultima, per
// 15 minuti: qui si ritrova chi ha chiamato prima e non ha ordinato, e si riapre la sua scheda.
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";
// Solo Edoardo (31/10/2026: «chi lavora in cassa deve avere solo la schermata cassa… la dashboard è solo mia»).
import SoloAdmin from "@/components/SoloAdmin";

interface Chiamata { id: string; numero: string; origine: string; ricevuta_il: string; gestita: boolean }

export default function ChiamatePagina() {
  return (
    <SoloAdmin><AuthGate>
      <Chiamate />
    </AuthGate></SoloAdmin>
  );
}

// la serata come nel riepilogo: dopo mezzanotte è ancora la sera prima, taglio alle 06:00 di Roma
const giornataDi = (iso: string) => new Date(new Date(iso).getTime() - 6 * 3_600_000).toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
const giornataOggi = () => giornataDi(new Date().toISOString());
function inizioGiornata(g: string): string {
  for (const off of ["+02:00", "+01:00"]) {
    const d = new Date(`${g}T06:00:00${off}`);
    if (d.toLocaleTimeString("it-IT", { hour: "2-digit", timeZone: "Europe/Rome" }).startsWith("06")) return d.toISOString();
  }
  return new Date(`${g}T05:00:00Z`).toISOString();
}
const spostaGiorno = (g: string, n: number) => new Date(Date.parse(g + "T12:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);
const oraDi = (iso: string) => new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
const dataLunga = (g: string) => new Date(g + "T12:00:00Z").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Rome" });
// il cliente si riconosce dalle ultime 9 cifre, come cerca_cliente: +39, spazi e trattini non contano
const chiave = (n: string) => n.replace(/\D/g, "").slice(-9);

function Chiamate() {
  const [giornata, setGiornata] = useState(giornataOggi);
  const [chiamate, setChiamate] = useState<Chiamata[] | null>(null);
  const [clienti, setClienti] = useState<Map<string, string>>(new Map());
  const [errore, setErrore] = useState<string | null>(null);
  const stasera = giornataOggi();
  const inCorso = giornata === stasera;
  const richiesta = useRef(0);

  useEffect(() => {
    const supabase = supabaseBrowser();
    const mia = ++richiesta.current;
    async function carica() {
      const dal = inizioGiornata(giornata);
      const al = inizioGiornata(spostaGiorno(giornata, 1));
      const { data, error } = await supabase.from("chiamata").select("id, numero, origine, ricevuta_il, gestita")
        .gte("ricevuta_il", dal).lt("ricevuta_il", al).order("ricevuta_il", { ascending: false });
      if (mia !== richiesta.current) return;
      if (error) { setErrore(error.message); return; }
      const lista = (data ?? []) as Chiamata[];
      setErrore(null);
      setChiamate(lista);
      const chiavi = [...new Set(lista.map((c) => chiave(c.numero)).filter((k) => k.length === 9))];
      if (chiavi.length === 0) { setClienti(new Map()); return; }
      const { data: cl } = await supabase.from("cliente").select("nome, telefono")
        .or(chiavi.map((k) => `telefono.ilike.%${k}`).join(","));
      if (mia !== richiesta.current) return;
      setClienti(new Map((cl ?? []).map((c: { nome: string | null; telefono: string }) => [chiave(c.telefono), c.nome ?? "senza nome"])));
    }
    carica();
    // stasera le chiamate nuove compaiono da sole
    if (!inCorso) return;
    const canale = supabase.channel("cassa-chiamate")
      .on("postgres_changes", { event: "*", schema: "public", table: "chiamata" }, () => carica())
      .subscribe();
    return () => { supabase.removeChannel(canale); };
  }, [giornata, inCorso]);

  const prese = (chiamate ?? []).filter((c) => c.gestita).length;

  return (
    <main className="riepilogo">
      <h1>Chiamate</h1>
      <div className="r-giorno">
        <button type="button" onClick={() => setGiornata(spostaGiorno(giornata, -1))}>‹ Prima</button>
        <strong>{inCorso ? "Stasera" : dataLunga(giornata)}</strong>
        <button type="button" disabled={giornata >= stasera} onClick={() => setGiornata(spostaGiorno(giornata, 1))}>Dopo ›</button>
      </div>
      {errore && <p className="r-errore">{errore}</p>}
      {chiamate === null ? <p className="muto">Leggo le chiamate…</p> : chiamate.length === 0 ? (
        <p className="muto">{inCorso ? "Nessuna chiamata stasera." : "Nessuna chiamata quella sera."}</p>
      ) : (
        <>
          <p className="muto">{chiamate.length} {chiamate.length === 1 ? "chiamata" : "chiamate"}, {prese} prese.</p>
          <ul className="ch-lista">
            {chiamate.map((c) => {
              const nome = clienti.get(chiave(c.numero));
              return (
                <li key={c.id} className={"carta ch-riga" + (c.gestita ? " ch-presa" : "")}>
                  <span className="ch-ora">{oraDi(c.ricevuta_il)}</span>
                  <span className="ch-chi">
                    <strong>{nome ?? "Cliente nuovo"}</strong>
                    <span className="muto">{c.numero}{c.origine === "prova" ? " · prova" : ""}</span>
                  </span>
                  <span className="ch-stato">{c.gestita ? "presa" : "non presa"}</span>
                  <span className="ch-azioni">
                    <a href={"/cassa/cliente?telefono=" + encodeURIComponent(c.numero)}>Scheda</a>
                    <a className="primario" href={"/cassa/nuovo?telefono=" + encodeURIComponent(c.numero)}>Ordine</a>
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </main>
  );
}
