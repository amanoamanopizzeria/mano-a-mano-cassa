"use client";

// App Rider: consegne libere e mie, prendi/ritirata/consegnata, naviga e chiama,
// posizione inviata in automatico al cloud (per la mappa live della cassa).
// Come l'app Velocissimo RIDER (REA, docs/rea/04_RIDER.md): il rider si prende da solo la prima
// comanda, vede le note fisse del cliente e come paga («paga con 50 → resto 26,50»), e in fondo lo
// storico delle consegne fatte e non ancora saldate alla cassa: dopo il dare-avere spariscono.
import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthGate from "@/components/AuthGate";
import type { ConsegnaRider, RiderBorsello } from "@/lib/types";

const euro = (n: number) => n.toFixed(2).replace(".", ",") + " €";

export default function RiderPagina() {
  return (
    <AuthGate>
      <Rider />
    </AuthGate>
  );
}

function Rider() {
  const [consegne, setConsegne] = useState<ConsegnaRider[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const [gps, setGps] = useState<string>("GPS spento");
  const [borsello, setBorsello] = useState<RiderBorsello | null>(null);
  const supabaseRef = useRef<ReturnType<typeof supabaseBrowser> | null>(null);

  const carica = useCallback(async () => {
    const supabase = supabaseRef.current!;
    const [{ data, error }, b, me] = await Promise.all([supabase.rpc("consegne_rider2"), supabase.rpc("rider_borsello"), supabase.from("profilo").select("ruolo, id_rider").maybeSingle()]);
    // È rider chi ha un rider collegato (mig. 0032): l'utenza della cassa fa anche da «Rider di prova».
    if (me.data && !me.data.id_rider) { setErrore(`Questa utenza è «${me.data.ruolo}» e non ha un rider collegato: le consegne si vedono entrando come rider. Da cassa: /cassa/rider e /cassa/mappa.`); return; }
    if (error) setErrore(error.message);
    else setConsegne((data ?? []) as ConsegnaRider[]);
    const mio = ((b.data ?? []) as RiderBorsello[])[0];
    if (mio) setBorsello({ ...mio, in_mano: Number(mio.in_mano), da_saldare: Number(mio.da_saldare) });
  }, []);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setErrore("Supabase non configurato.");
      return;
    }
    supabaseRef.current = supabaseBrowser();
    carica();

    // ogni cambio sulle consegne ricarica la lista (libere + mie)
    const canale = supabaseRef.current
      .channel("rider-consegne")
      .on("postgres_changes", { event: "*", schema: "public", table: "consegna" }, () => carica())
      .subscribe();

    // posizione: inviata quando cambia, al massimo una volta ogni 10 secondi
    let ultimoInvio = 0;
    let watchId: number | null = null;
    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const ora = Date.now();
          if (ora - ultimoInvio < 10_000) return;
          ultimoInvio = ora;
          const { latitude: lat, longitude: lng } = pos.coords;
          setGps(`GPS attivo · ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          await supabaseRef.current!.rpc("segnala_posizione", { p_lat: lat, p_lng: lng });
        },
        // critico giro 15: il telefono parlava inglese («User denied Geolocation»)
        (e) => setGps(e.code === 1 ? "GPS negato: consenti la posizione a questo sito nelle impostazioni del telefono" : e.code === 2 ? "GPS: posizione non trovata, riprovo" : "GPS lento: riprovo"),
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
    }

    return () => {
      supabaseRef.current?.removeChannel(canale);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [carica]);

  async function prendi(id: string) {
    const { error } = await supabaseRef.current!.rpc("prendi_consegna", { p_id: id });
    if (error) setErrore(error.message);
    else carica();
  }

  // L'avviso al cliente «è partito, seguilo qui» nasce quando il rider la ritira (mig. 0032) e resta
  // in notifica_cliente in attesa della push nell'app: Edoardo (24/10) non vuole WhatsApp («a pagamento;
  // chi ha l'app ha già le autorizzazioni»). Come mandarla lo dice il REA.
  async function aggiorna(id: string, stato: "ritirata" | "consegnata") {
    const { error } = await supabaseRef.current!.rpc("aggiorna_consegna", { p_id: id, p_stato: stato });
    if (error) setErrore(error.message);
    else carica();
  }

  const libere = consegne.filter((c) => c.stato === "da_assegnare");
  const mie = consegne.filter((c) => c.stato === "assegnata" || c.stato === "ritirata");
  // critico giro 15: due consegne allo stesso indirizzo erano due schede uguali e nessuno diceva il contante totale
  const chiave = (c: ConsegnaRider) => [c.via, c.civico].filter(Boolean).join(" ").toLowerCase().trim();
  const insieme = (c: ConsegnaRider) => mie.filter((x) => x.id !== c.id && chiave(x) && chiave(x) === chiave(c)).map((x) => `#${x.numero}`);
  const contantiMie = mie.reduce((t, c) => t + (c.pagato_online ? 0 : Number(c.contanti_da_incassare)), 0);
  const daSaldare = consegne.filter((c) => c.stato === "consegnata");

  return (
    <main className="rider">
      <h1>Rider — consegne</h1>
      <p className={"muto r-gps" + (gps.startsWith("GPS attivo") ? " on" : "")}>{gps}</p>
      {errore && <p className="r-errore">{errore}</p>}

      <h2>Le mie ({mie.length})</h2>
      {mie.length === 0 && <p className="muto">Nessuna consegna in corso.</p>}
      {mie.length > 1 && <p className="r-tutto"><span>In tutto da incassare in contanti</span><b>{euro(contantiMie)}</b></p>}
      <div className="griglia">
        {mie.map((c) => (
          <SchedaConsegna key={c.id} c={c} insieme={insieme(c)}>
            {c.stato === "assegnata" && (
              <button className="primario r-azione" onClick={() => aggiorna(c.id, "ritirata")}>Ritirata</button>
            )}
            {c.stato === "ritirata" && (
              <button className="primario r-azione" onClick={() => aggiorna(c.id, "consegnata")}>Consegnata</button>
            )}
          </SchedaConsegna>
        ))}
      </div>

      <h2 className="r-sez">Disponibili ({libere.length})</h2>
      {libere.length === 0 && <p className="muto">Nessuna consegna libera. Quando arriva, compare qui.</p>}
      <div className="griglia">
        {libere.map((c, i) => (
          <SchedaConsegna key={c.id} c={c}>
            <button className="primario r-azione" onClick={() => prendi(c.id)}>{i === 0 ? "La prendo io" : "Prendi"}</button>
          </SchedaConsegna>
        ))}
      </div>

      <h2 className="r-sez">Da saldare alla cassa ({daSaldare.length})</h2>
      {borsello && (
        <p className="muto r-borsello">
          Hai in mano <b>{euro(borsello.in_mano)}</b>
          {borsello.da_saldare > 0 && <> · da versare in cassa {euro(borsello.da_saldare)}</>}
          . A fine serata si fa il dare-avere in cassa e queste spariscono.
        </p>
      )}
      {daSaldare.length === 0 && <p className="muto">Niente da saldare.</p>}
      <div className="griglia">
        {daSaldare.map((c) => (
          <article key={c.id} className="carta r-saldo">
            <span className="chi"><strong>#{c.numero}</strong> <span className="muto">{c.consegnata_il ? new Date(c.consegnata_il).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : ""} · {[c.via, c.civico].filter(Boolean).join(" ")}</span></span>
            <span className="cifra">{euro(Number(c.contanti_da_incassare))}</span>
          </article>
        ))}
      </div>
    </main>
  );
}

function SchedaConsegna({ c, children, insieme = [] }: { c: ConsegnaRider; children: React.ReactNode; insieme?: string[] }) {
  const indirizzo = [c.via, c.civico, c.cap, c.citta].filter(Boolean).join(" ");
  const naviga = c.lat && c.lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`
    : indirizzo
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(indirizzo)}`
      : null;
  return (
    <article className="carta r-scheda">
      <div className="r-intesta">
        <strong>#{c.numero}</strong>
        <span className={`badge ${c.stato === "da_assegnare" ? "ricevuto" : "in_consegna"}`}>{c.stato.replace("_", " ")}</span>
      </div>
      <div className="muto r-quando">
        {c.zona ?? "—"} ·{" "}
        {c.ora_consegna
          ? "per le " + new Date(c.ora_consegna).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
          : "appena pronto"}
      </div>
      {indirizzo && <div className="r-via">{indirizzo}</div>}
      {insieme.length > 0 && <div className="r-insieme">Stesso indirizzo di <b>{insieme.join(", ")}</b>: portale insieme</div>}
      {c.cliente_nome && <div className="r-nome">{c.cliente_nome}</div>}
      {c.cliente_note && <div className="r-avviso">⚠ {c.cliente_note}</div>}
      <div className="r-soldi">
        {c.pagato_online
          ? <>Già pagato <span className="muto come">niente da incassare</span></>
          : c.pagamento === "pos"
            ? <>{euro(Number(c.totale))} <span className="muto come">col POS · niente contanti</span></>
            : Number(c.contanti_da_incassare) === 0
            ? <>Già pagato <span className="muto come">niente da incassare</span></>
            : <>{euro(Number(c.contanti_da_incassare))} <span className="muto come">in contanti</span>
                {c.paga_con != null && Number(c.paga_con) > Number(c.contanti_da_incassare) && (
                  <div className="resto">paga con {euro(Number(c.paga_con))} → resto {euro(Number(c.paga_con) - Number(c.contanti_da_incassare))}</div>
                )}</>}
      </div>
      <ul className="muto r-righe">
        {c.righe.map((r, i) => (
          <li key={i}>{Number(r.quantita)}× {r.descrizione}</li>
        ))}
      </ul>
      {c.note && <div className="r-note">Note: {c.note}</div>}
      <div className="azioni r-azioni">
        {children}
        {naviga && <a href={naviga} target="_blank" rel="noreferrer"><button className="r-azione">Naviga</button></a>}
        {c.cliente_telefono && <a href={`tel:${c.cliente_telefono}`}><button className="r-azione">Chiama</button></a>}
      </div>
    </article>
  );
}
