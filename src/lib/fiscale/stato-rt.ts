// Lo stato del registratore telematico (Epson FP-81 II RT) e la decisione sulla chiusura Z, senza mandare niente.
// I campi sono quelli che la stampante vera ha risposto a queryPrinterStatus il 31/10/2026 (REA 34):
// rtDailyOpen, rtNoWorkingPeriod, rtFileToSend, rtOldFileToSend, rtFileRejected, rtTrainingMode, rtExpiryCD…
//
// Le regole vengono dalle domande del critico (31/10): «se la Z si pianta a metà, come sai se è stata fatta?»,
// «e se la preme due volte?». La risposta: la Z non si manda MAI a occhi chiusi. Prima si legge lo stato: se la
// giornata è già chiusa (rtDailyOpen = 0) la Z è già stata fatta e non si ripete; se la risposta della Z si perde,
// si rilegge lo stato e si decide da lì. Il 2Bit non lo fa (REA 35: nessun retry, e il job del totem chiude
// comunque la cassa dopo una Z fallita): noi facciamo meglio.

export interface StatoRT {
  rtType?: string;
  rtMainStatus?: string;
  rtSubStatus?: string;
  rtDailyOpen?: string;        // "1" giornata aperta (ci sono scontrini non ancora chiusi da una Z), "0" chiusa
  rtNoWorkingPeriod?: string;  // "1" periodo di inattività
  rtFileToSend?: string;       // contatori a 4 cifre, es. "0000"
  rtOldFileToSend?: string;
  rtFileRejected?: string;
  rtExpiryCD?: string;         // AAAAMMGG
  rtExpiryCA?: string;
  rtTrainingMode?: string;
  [altro: string]: string | undefined;
}

/** I campi <nome>valore</nome> della risposta XML, così come sono. */
export function leggiStatoRT(xml: string): StatoRT {
  const campi: StatoRT = {};
  for (const m of xml.matchAll(/<([A-Za-z]+)>([^<]{1,40})<\/\1>/g)) campi[m[1]] = m[2];
  return campi;
}

const numero = (v?: string) => (v === undefined || v === "" ? 0 : Number.parseInt(v, 10) || 0);
const dataIt = (v?: string) => (v && /^\d{8}$/.test(v) ? `${v.slice(6, 8)}/${v.slice(4, 6)}/${v.slice(0, 4)}` : v ?? "?");

export interface Avviso { grave: boolean; testo: string }

/** Cosa c'è da sapere, in italiano, prima di toccare la stampante. */
export function avvisiRT(s: StatoRT): Avviso[] {
  const a: Avviso[] = [];
  if (s.rtTrainingMode === "1") a.push({ grave: true, testo: "la stampante è in modalità training: i documenti non sono fiscali" });
  if (s.rtNoWorkingPeriod === "1") a.push({ grave: true, testo: "periodo di inattività: la stampante non emette documenti" });
  if (numero(s.rtFileRejected) > 0) a.push({ grave: true, testo: `${numero(s.rtFileRejected)} file di corrispettivi rifiutati dall'Agenzia: da far guardare al tecnico` });
  if (numero(s.rtOldFileToSend) > 0) a.push({ grave: true, testo: `${numero(s.rtOldFileToSend)} file vecchi non ancora inviati` });
  if (numero(s.rtFileToSend) > 0) a.push({ grave: false, testo: `${numero(s.rtFileToSend)} file di corrispettivi in attesa di invio` });
  if (s.rtExpiryCD && /^\d{8}$/.test(s.rtExpiryCD)) {
    const scade = new Date(`${s.rtExpiryCD.slice(0, 4)}-${s.rtExpiryCD.slice(4, 6)}-${s.rtExpiryCD.slice(6, 8)}T00:00:00`);
    const giorni = Math.floor((scade.getTime() - Date.now()) / 86400000);
    if (giorni < 0) a.push({ grave: true, testo: `certificato del dispositivo SCADUTO il ${dataIt(s.rtExpiryCD)}` });
    else if (giorni < 60) a.push({ grave: false, testo: `certificato del dispositivo in scadenza il ${dataIt(s.rtExpiryCD)} (${giorni} giorni)` });
  }
  return a;
}

export type DecisioneZ =
  | { azione: "fai_z"; motivo: string }
  | { azione: "gia_fatta"; motivo: string }
  | { azione: "fermati"; motivo: string };

/**
 * Si può lanciare la Z adesso? Si decide SOLO dallo stato appena letto:
 * - giornata aperta → sì;
 * - giornata chiusa → è già stata fatta (anche se la risposta della nostra Z si era persa): non si ripete;
 * - training o inattività → ci si ferma e si chiama qualcuno.
 */
export function decidiChiusura(s: StatoRT): DecisioneZ {
  if (!s.rtType) return { azione: "fermati", motivo: "la stampante non ha risposto con lo stato del registratore telematico" };
  if (s.rtTrainingMode === "1") return { azione: "fermati", motivo: "stampante in modalità training" };
  if (s.rtNoWorkingPeriod === "1") return { azione: "fermati", motivo: "periodo di inattività" };
  if (s.rtDailyOpen !== "1") return { azione: "gia_fatta", motivo: "la giornata fiscale è già chiusa: la Z di oggi è stata fatta" };
  return { azione: "fai_z", motivo: "giornata fiscale aperta" };
}

/**
 * Dopo aver mandato la Z: la risposta è arrivata con success, oppure si è persa (timeout, rete).
 * Se si è persa, NON si rimanda: si rilegge lo stato e si guarda se la giornata risulta chiusa.
 */
export function esitoChiusura(risposta: { ok: boolean; codice: string | null } | null, statoDopo: StatoRT | null): { fatta: boolean; motivo: string } {
  if (risposta?.ok) return { fatta: true, motivo: "la stampante ha confermato la Z" };
  if (risposta && !risposta.ok) return { fatta: false, motivo: `la stampante ha rifiutato la Z (codice ${risposta.codice ?? "?"})` };
  if (!statoDopo) return { fatta: false, motivo: "risposta persa e stato non rileggibile: non rimandare la Z, controllare sulla carta" };
  if (statoDopo.rtDailyOpen === "0") return { fatta: true, motivo: "risposta persa, ma la giornata risulta chiusa: la Z è stata fatta" };
  return { fatta: false, motivo: "risposta persa e la giornata è ancora aperta: la Z non è stata fatta, si può rimandare" };
}
