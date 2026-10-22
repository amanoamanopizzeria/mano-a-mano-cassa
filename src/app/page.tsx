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
        <div className="carta" aria-disabled>
          <strong>Rider</strong>
          <p className="muto">Consegne e mappa live — in arrivo.</p>
        </div>
        <div className="carta" aria-disabled>
          <strong>Cliente</strong>
          <p className="muto">Menù e ordini — in arrivo.</p>
        </div>
      </div>
    </main>
  );
}
