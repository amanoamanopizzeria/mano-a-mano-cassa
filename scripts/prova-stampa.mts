// Prova della comanda ESC/POS senza stampante: una comanda finta (con modifica, menu, note, resto)
// passa da comandaEscPos e torna testo con anteprimaTesto. Controlla accenti, euro, a capo e copie.
// npx --yes tsx scripts/prova-stampa.mts
import { comandaEscPos, anteprimaTesto, codifica, aCapo } from "../src/lib/stampa/escpos";
import type { Comanda } from "../src/lib/comanda";

const c: Comanda = {
  id: "x", numero: 57, numero_visibile: "C-57", canale: "telefono", tipo: "domicilio", stato: "ricevuto",
  creato_il: "2026-10-24T18:40:00Z", ora_consegna: "2026-10-24T19:30:00Z", totale: 31.3, note: "Citofono rotto, chiamare al numero",
  pagamento: "contanti", costo_consegna: 1.5, cliente: "Prova Critico", telefono: "333 000 0000", cliente_note: "Senza glutine: attenzione",
  paga_con: 50, pagato_online: false, sconto: 2, codice_coupon: "BENVENUTO", modificato_il: "2026-10-24T18:52:00Z", stampe: 1,
  righe_prima: [
    { id: "p1", id_riga_padre: null, descrizione: "Margherita", quantita: 1, variazioni: [] },
    { id: "p2", id_riga_padre: null, descrizione: "Coca Cola", quantita: 1, variazioni: [] },
  ],
  tavolo: null, indirizzo: { via: "Via Novara", civico: "5", cap: "00198", citta: "Roma", zona: "Centro" },
  righe: [
    { id: "r1", descrizione: "Margherita", quantita: 2, variazioni: [], note: null, destinazione: "cucina", reparto: "Pizze classiche", reparto_ordine: 1 },
    { id: "r1b", descrizione: "Diavola con una descrizione lunghissima che deve andare a capo", quantita: 1, variazioni: [{ nome: "bufala", prezzo: 1.5, tipo: "aggiunta" }, { nome: "basilico", prezzo: 0, tipo: "rimozione" }], note: null, destinazione: "cucina", reparto: "Pizze classiche", reparto_ordine: 1 },
    { id: "r2", descrizione: "Menù Bimbo", quantita: 1, variazioni: [], note: "ben cotta", destinazione: "cucina", reparto: "Menù", reparto_ordine: 3, incluso: "bibita" },
    { id: "r3", id_riga_padre: "r2", descrizione: "Würstel e patatine", quantita: 1, variazioni: [], note: null, destinazione: "cucina", reparto: "Pizze classiche", reparto_ordine: 1 },
    { id: "r4", descrizione: "Supplì", quantita: 3, variazioni: [{ nome: "piccante — molto", prezzo: 0, tipo: "nota" }], note: null, destinazione: "cucina", reparto: "Fritti", reparto_ordine: 2 },
  ],
};

let errori = 0;
const ok = (cond: boolean, cosa: string) => { if (!cond) { errori++; console.log("NO  " + cosa); } else console.log("ok  " + cosa); };

for (const [ruolo, colonne] of [["cucina", 48], ["cassa", 42]] as const) {
  const b = comandaEscPos(c, { ruolo, colonne, adesso: new Date("2026-10-24T18:55:00Z") });
  const t = anteprimaTesto(b);
  console.log(`\n===== ${ruolo} · ${colonne} colonne · ${b.length} byte =====\n${t}`);
  ok(t.split("\n").every((r) => r.length <= colonne), `${ruolo}: nessuna riga oltre ${colonne}`);
  ok(t.includes("C-57") && t.includes("MODIFICATA - RISTAMPA 20:52"), `${ruolo}: numero e ristampa in ora di Roma`);
  ok(t.includes("NUOVA") && t.includes("+1 (ora 2)") && t.includes("TOLTE") && t.includes("COCA COLA") && !t.includes("x MARGHERITA"), `${ruolo}: nuove, cresciute e tolte`);
  ok(t.includes(" 2  MARGHERITA") && /\n {4}\S/.test(t), `${ruolo}: quantità in colonna e il resto rientrato sotto`);
  ok(t.includes("SENZA basilico") && t.includes("CON bufala") && t.includes("Würstel"), `${ruolo}: varianti e figlie con gli accenti`);
  ok(t.includes("Supplì") || t.includes("SUPPLÌ"), `${ruolo}: Supplì con l'accento`);
  ok(b[b.length - 4] === 0x1d && b[b.length - 3] === 0x56, `${ruolo}: finisce col taglio`);
  ok(t.includes(`copia ${ruolo}`), `${ruolo}: la riga in fondo dice di chi è la copia`);
  ok(t.includes("TOTALE") && t.includes("31,30 €") && t.includes("RESTO 18,70 €") && t.includes("Via Novara 5") && t.includes("CONTANTI"), `${ruolo}: completa anche lei: totale, resto, via, pagamento`);
}
{
  const { quandoComanda } = await import("../src/lib/comanda");
  // 28/03/2027 23:30 di Roma (prima del cambio d'ora): domani 20:00 è il 29, e non è «adesso + 24 ore»
  ok(quandoComanda("2027-03-29T18:00:00Z", new Date("2027-03-28T21:30:00Z")).testo === "DOMANI alle 20:00", "DOMANI giusto anche la notte del cambio d'ora");
  ok(quandoComanda("2026-10-25T19:00:00Z", new Date("2026-10-24T20:30:00Z")).testo === "DOMANI alle 20:00", "DOMANI giusto la notte che torna l'ora solare");
  const ann = anteprimaTesto(comandaEscPos({ ...c, stato: "annullato" }, { ruolo: "cucina" }));
  ok(ann.includes("ANNULLATO - NON FARE"), "un ordine annullato lo dice sulla carta");
}
ok(codifica("€àèéìòù«»").join(",") === [0xd5, 0x85, 0x8a, 0x82, 0x8d, 0x95, 0x97, 0xae, 0xaf].join(","), "euro e accenti nella tabella PC858");
ok(codifica("🍕x→").join(",") === [0x78, 0x2d, 0x3e].join(","), "emoji tolte, freccia in ->");
ok(aCapo("una parola lunghissimaaaaaaaaaa qui", 10).every((r) => r.length <= 10), "a capo che spezza le parole troppo lunghe");
console.log(errori ? `\n${errori} prove NON passate` : "\ntutte le prove passate");
process.exit(errori ? 1 : 0);
