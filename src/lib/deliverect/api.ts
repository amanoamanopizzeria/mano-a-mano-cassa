// Le chiamate della cassa verso Deliverect, per quando saremo noi il POS (REA 26 §26.4).
// Documentazione letta il 27/10/2026: developers.deliverect.com (access-token, update-order-status,
// update-store-status, snooze-by-plu, how-to-handle-cancellations).
// STATO: spento. Senza DELIVERECT_CLIENT_ID e DELIVERECT_CLIENT_SECRET su Vercel ogni funzione risponde
// «spento» e non chiama nessuno. Nel mese in parallelo deve restare spento: gli stati li manda Velocissimo,
// e due che accettano lo stesso ordine confondono Glovo (REA 26 §26.5 n. 1).
import "server-only";

// staging finché non siamo certificati; la produzione si accende cambiando DELIVERECT_BASE su Vercel
const BASE = () => (process.env.DELIVERECT_BASE || "https://api.staging.deliverect.com").replace(/\/$/, "");

export const STATO = {
  accettato: 20, stampato: 40, in_preparazione: 50, preparato: 60, pronto_ritiro: 70,
  finito: 90, annullato: 110, fallito: 120,
} as const;

export type Esito = { ok: true; dati?: unknown } | { ok: false; motivo: string };

export const acceso = () => !!(process.env.DELIVERECT_CLIENT_ID && process.env.DELIVERECT_CLIENT_SECRET);

let gettone: { valore: string; scade: number } | null = null;

async function token(): Promise<string | null> {
  if (!acceso()) return null;
  if (gettone && gettone.scade > Date.now() + 60_000) return gettone.valore;
  const r = await fetch(`${BASE()}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.DELIVERECT_CLIENT_ID,
      client_secret: process.env.DELIVERECT_CLIENT_SECRET,
      audience: process.env.DELIVERECT_AUDIENCE || BASE(),
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });
  if (!r.ok) return null;
  const j = (await r.json()) as { access_token?: string; expires_in?: number };
  if (!j.access_token) return null;
  gettone = { valore: j.access_token, scade: Date.now() + (j.expires_in ?? 3600) * 1000 };
  return gettone.valore;
}

async function chiama(percorso: string, corpo: unknown): Promise<Esito> {
  if (!acceso()) return { ok: false, motivo: "spento" };
  const t = await token();
  if (!t) return { ok: false, motivo: "accesso a Deliverect non riuscito" };
  try {
    const r = await fetch(`${BASE()}${percorso}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${t}` },
      body: JSON.stringify(corpo),
      cache: "no-store",
    });
    const testo = await r.text();
    let dati: unknown = testo;
    try { dati = testo ? JSON.parse(testo) : null; } catch { /* resta testo */ }
    // snoozeByPlus risponde sempre 200 e mette l'errore nel corpo
    const errore = dati && typeof dati === "object" && "error" in dati ? String((dati as { error: unknown }).error) : null;
    if (!r.ok || errore) return { ok: false, motivo: errore ?? `HTTP ${r.status}: ${testo.slice(0, 200)}` };
    return { ok: true, dati };
  } catch (e) {
    return { ok: false, motivo: e instanceof Error ? e.message : String(e) };
  }
}

// lo stato di un ordine: idOrdine è il _id di Deliverect (in cassa sta in ordine.id_esterno)
export function aggiornaStato(idOrdine: string, stato: number, scontrino: string, motivo?: string) {
  return chiama(`/orderStatus/${encodeURIComponent(idOrdine)}`, {
    orderId: idOrdine, status: stato, receiptId: scontrino,
    timeStamp: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    ...(motivo ? { reason: motivo } : {}),
  });
}

// pieni: chiude la location sulle piattaforme fino a «fino» (o finché non si riapre); aperti: riapre
export function occupato(idLocation: string, pieno: boolean, fino?: Date) {
  return chiama(`/updateStoreStatus/${encodeURIComponent(idLocation)}`, {
    isActive: !pieno,
    ...(pieno && fino ? { disableAt: fino.toISOString() } : {}),
  });
}

// esaurito per stasera: si spegne il PLU fino a «fino»; per riaccenderlo si manda fino = adesso
export function esaurito(account: string, idLocation: string, plu: string[], fino: Date) {
  return chiama(`/products/snoozeByPlus`, {
    account, location: idLocation, plus: plu,
    snoozeStart: new Date().toISOString(), snoozeEnd: fino.toISOString(),
  });
}
