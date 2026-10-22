import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>Mano a Mano Cassa</h1>
      <p className="muto">Il sistema ordini della pizzeria. Scegli la postazione.</p>
      <div className="griglia">
        <Link href="/cassa" className="carta">
          <strong>Cassa</strong>
          <p className="muto">Ordini in arrivo, stati, stampa comanda.</p>
        </Link>
        <Link href="/rider" className="carta">
          <strong>Rider</strong>
          <p className="muto">Consegne libere, prendi, naviga, consegnato.</p>
        </Link>
        <Link href="/cassa/cliente" className="carta">
          <strong>Cliente</strong>
          <p className="muto">Cerca dal telefono, scheda, note fisse, indirizzi.</p>
        </Link>
        <Link href="/cassa/menu" className="carta">
          <strong>Menù</strong>
          <p className="muto">Prodotti, varianti e pacchetti.</p>
        </Link>
        <Link href="/cassa/tavoli" className="carta">
          <strong>Sala</strong>
          <p className="muto">20 tavoli dentro, 15 fuori: apri, conto, libera.</p>
        </Link>
        <Link href="/totem" className="carta">
          <strong>Totem</strong>
          <p className="muto">Ordina al self-order (profilo totem).</p>
        </Link>
        <Link href="/cassa/capacita" className="carta">
          <strong>Capacità</strong>
          <p className="muto">Turni del giorno, pizze e consegne per quarto d&apos;ora, blocchi.</p>
        </Link>
        <Link href="/cassa/riepilogo" className="carta">
          <strong>Riepilogo</strong>
          <p className="muto">Ordini di oggi per canale, pizze, consegne e incasso.</p>
        </Link>
        <Link href="/cassa/mappa" className="carta">
          <strong>Mappa rider</strong>
          <p className="muto">Dove sono i rider, in tempo reale.</p>
        </Link>
      </div>
    </main>
  );
}
