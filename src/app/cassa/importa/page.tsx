"use client";

// L'import dello storico di Velocissimo (mig. 0079–0080): Edoardo sceglie dal suo computer il CSV degli
// ordini letto dal back-office (velocissimo_ordini_storico.csv, 27/10/2026), la pagina lo legge qui e lo
// manda a lotti di 1000 righe a velocissimo_importa. Ogni lotto si scrive una volta sola: se si ferma a
// metà, si rilancia lo stesso file e riprende senza raddoppiare.
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";
// Solo Edoardo (31/10/2026: «chi lavora in cassa deve avere solo la schermata cassa… la dashboard è solo mia»).
import SoloAdmin from "@/components/SoloAdmin";

export default function ImportaPagina() {
  return <SoloAdmin><AuthGate><Importa /></AuthGate></SoloAdmin>;
}

// CSV con le virgolette (le note hanno virgole e a capo)
function leggiCsv(testo: string): string[][] {
  const righe: string[][] = [];
  let campo = "", riga: string[] = [], dentro = false;
  for (let i = 0; i < testo.length; i++) {
    const c = testo[i];
    if (dentro) {
      if (c === '"') { if (testo[i + 1] === '"') { campo += '"'; i++; } else dentro = false; }
      else campo += c;
    } else if (c === '"') dentro = true;
    else if (c === ",") { riga.push(campo); campo = ""; }
    else if (c === "\n") { riga.push(campo); righe.push(riga); riga = []; campo = ""; }
    else if (c !== "\r") campo += c;
  }
  if (campo !== "" || riga.length) { riga.push(campo); righe.push(riga); }
  return righe;
}
// «06/04/2024 19:59:35» → «2024-04-06 19:59:35» (ora di Roma: la converte il database)
const data = (v: string) => { const m = /^(\d\d)\/(\d\d)\/(\d{4}) (\d\d:\d\d:\d\d)/.exec(v ?? ""); return m ? `${m[3]}-${m[2]}-${m[1]} ${m[4]}` : ""; };
// «1.234,50 €» → «1234.50»
const euro = (v: string) => { const x = (v ?? "").replace(/[€\s\u00a0]/g, "").replace(/\./g, "").replace(",", "."); return /^-?\d+(\.\d+)?$/.test(x) ? x : ""; };
const intero = (v: string) => (/^-?\d+$/.test(v ?? "") ? v : "");

// colonna del file → campo della tabella (le intestazioni sono quelle della lista Ordini del back-office)
const CAMPI: [string, string, (v: string) => string][] = [
  ["numero", "#", (v) => v], ["comanda", "# Comanda", (v) => v], ["stato", "Stato", (v) => v], ["tipo", "Tipo", (v) => v],
  ["origine", "Origine", (v) => v], ["pagamento", "Pagamento", (v) => v], ["cliente", "Cliente", (v) => v],
  ["cellulare", "Cellulare", (v) => v], ["telefono", "Telefono", (v) => v], ["indirizzo", "Indirizzo (2)", (v) => v],
  ["civico", "Civico", (v) => v], ["citta", "Città", (v) => v], ["provincia", "Provincia", (v) => v], ["zona", "Zona", (v) => v],
  ["gruppo_zone", "Gruppo di zone", (v) => v], ["rider", "Rider", (v) => v], ["tavolo", "Tavolo", (v) => v], ["sala", "Sala", (v) => v],
  ["creato_il", "Data creazione (2)", data], ["ora_ordine", "Data ed ora ordine (2)", data],
  ["orario_ritiro", "Orario di ritiro", (v) => v], ["orario_richiesto", "Orario richiesto", (v) => v],
  ["ora_associazione_rider", "Orario associazione rider (2)", (v) => v], ["ora_partenza", "Orario di partenza (2)", (v) => v],
  ["ora_consegna", "Orario di consegna effettivo (2)", (v) => v], ["distanza", "Distanza percorsa", (v) => v],
  ["ritardo_secondi", "Ritardo consegna (s.)", intero], ["totale", "Totale", euro], ["costo_consegna", "Costo Consegna", euro],
  ["sconto", "Sconto", euro], ["coperti_asporto", "Coperti asporto", intero], ["note", "Note", (v) => v],
];
const LOTTO = 1000;

function Importa() {
  const [stato, setStato] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [fatti, setFatti] = useState<{ lotti: number; di: number; righe: number } | null>(null);
  const [lavoro, setLavoro] = useState(false);

  async function scegli(file: File) {
    setErrore(null); setFatti(null); setLavoro(true);
    try {
      setStato(`Leggo ${file.name}…`);
      const tabella = leggiCsv((await file.text()).replace(/^\ufeff/, ""));
      const intest = tabella[0] ?? [];
      const indice = CAMPI.map(([, col]) => intest.indexOf(col));
      const manca = CAMPI.filter((_, i) => indice[i] < 0).map(([, col]) => col);
      if (manca.length) throw new Error(`Non è il file degli ordini di Velocissimo: mancano le colonne ${manca.join(", ")}.`);
      const righe = tabella.slice(1).filter((r) => r.length > 1).map((r) =>
        Object.fromEntries(CAMPI.map(([campo, , f], i) => [campo, f(r[indice[i]] ?? "")])));
      const di = Math.ceil(righe.length / LOTTO);
      let scritte = 0;
      for (let l = 0; l < di; l++) {
        setStato(`Mando il lotto ${l + 1} di ${di}…`);
        const { data, error } = await supabaseBrowser().rpc("velocissimo_importa", { p_file: file.name, p_lotto: l, p_righe: righe.slice(l * LOTTO, (l + 1) * LOTTO) });
        if (error) throw new Error(`Lotto ${l + 1}: ${error.message}. Rilancia lo stesso file: riparte da qui.`);
        scritte += Number((data as { righe?: number })?.righe ?? 0);
        setFatti({ lotti: l + 1, di, righe: scritte });
      }
      setStato(`Fatto: ${righe.length.toLocaleString("it-IT")} ordini nel file, ${scritte.toLocaleString("it-IT")} scritti adesso (i lotti già fatti prima non si riscrivono).`);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : String(e)); setStato(null);
    } finally { setLavoro(false); }
  }

  return (
    <main className="riepilogo">
      <h1>Storico di Velocissimo</h1>
      <p className="muto">Scegli il file <b>velocissimo_ordini_storico.csv</b> dai Download. Gli ordini entrano nello storico, a parte: non toccano gli ordini della cassa, i clienti né i punti.</p>
      <input type="file" accept=".csv,text/csv" disabled={lavoro} onChange={(e) => { const f = e.target.files?.[0]; if (f) scegli(f); }} style={{ minHeight: 48, fontSize: 16, margin: "12px 0" }} />
      {fatti && <progress max={fatti.di} value={fatti.lotti} style={{ width: "100%", height: 16 }} />}
      {stato && <p>{stato}</p>}
      {errore && <p className="r-errore">{errore}</p>}
    </main>
  );
}
