import Link from "next/link";
import SoloAdmin from "./SoloAdmin";

export default function Home() {
  return (
    <SoloAdmin>
    <main className="home">
      <div className="testa">
        <div className="sabbia"><img src="/brand/logo-amanoamano.png" alt="A Mano a Mano" className="logo" /><img src="/brand/bollino.png" alt="" className="bollino" /></div>
        <div className="vino"><h1>Mano a Mano Cassa</h1><span>Scegli la postazione</span></div>
      </div>
      <div className="griglia">
        <Link href="/cassa/nuovo" className="carta principale">
          <strong>Nuovo ordine</strong>
          <p className="muto">Banco, tavolo, asporto o domicilio: dal menù, alla cucina.</p>
        </Link>
        <div className="sez">La sera</div>
        <Link href="/cassa" className="carta">
          <strong>Cassa</strong>
          <p className="muto">Ordini in arrivo, stati, stampa comanda.</p>
        </Link>
        <Link href="/rider" className="carta">
          <strong>Rider</strong>
          <p className="muto">Consegne libere, prendi, naviga, consegnato.</p>
        </Link>
        <Link href="/cassa/tavoli" className="carta">
          <strong>Sala</strong>
          <p className="muto">10 tavoli dentro, 5 fuori: apri, conto, libera.</p>
        </Link>
        <Link href="/cassa/mappa" className="carta">
          <strong>Mappa rider</strong>
          <p className="muto">Dove sono i rider, in tempo reale.</p>
        </Link>
        <Link href="/cassa/rider" className="carta">
          <strong>Rider e borsello</strong>
          <p className="muto">Quanto ha in mano ciascuno, il fondo, il dare-avere di fine serata.</p>
        </Link>
        <div className="sez">I clienti</div>
        <Link href="/cassa/cliente" className="carta">
          <strong>Cliente</strong>
          <p className="muto">Cerca dal telefono, scheda, note fisse, indirizzi.</p>
        </Link>
        <Link href="/ordina" className="carta">
          <strong>Ordina online</strong>
          <p className="muto">La pagina d&apos;ordine nostra per i clienti: a casa o da ritirare, con le fasce libere. È quella a cui punterà il sito.</p>
        </Link>
        <Link href="/totem" className="carta">
          <strong>Totem</strong>
          <p className="muto">Ordina al self-order (profilo totem).</p>
        </Link>
        <div className="sez">Il giorno</div>
        <Link href="/cassa/fasce" className="carta">
          <strong>Planner fasce</strong>
          <p className="muto">Quarto d&apos;ora per quarto d&apos;ora: pizze e rider occupati sui posti, gli ordini della fascia, il massimo da cambiare al volo.</p>
        </Link>
        <Link href="/cassa/capacita" className="carta">
          <strong>Capacità</strong>
          <p className="muto">Turni del giorno, pizze e consegne per quarto d&apos;ora, blocchi.</p>
        </Link>
        <Link href="/cassa/dashboard" className="carta">
          <strong>Conti e cruscotto</strong>
          <p className="muto">Venduto, origini, pagamenti, rider e tutti gli ordini, con il CSV.</p>
        </Link>
        <Link href="/cassa/chiamate" className="carta">
          <strong>Chiamate</strong>
          <p className="muto">Chi ha chiamato stasera o in una sera passata: ora, numero, cliente, se è stata presa.</p>
        </Link>
        <Link href="/cassa/riepilogo" className="carta">
          <strong>Riepilogo</strong>
          <p className="muto">Ordini di oggi per canale, pizze, consegne e incasso.</p>
        </Link>
        <Link href="/cassa/menu" className="carta">
          <strong>Menù</strong>
          <p className="muto">Prodotti, varianti e pacchetti.</p>
        </Link>
      </div>
    </main>
    </SoloAdmin>
  );
}
