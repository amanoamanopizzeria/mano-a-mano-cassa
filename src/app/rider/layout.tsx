import type { Metadata, Viewport } from "next";

// L'app dei rider si installa sul telefono dalla pagina (Edoardo, 26/10/2026: «può essere una PWA, è per
// noi, non serve metterla sugli store»): Android la propone da Chrome, iPhone con Condividi → Aggiungi
// alla schermata Home.
export const metadata: Metadata = {
  title: "Rider · A Mano A Mano",
  manifest: "/rider.webmanifest",
  appleWebApp: { capable: true, title: "Rider", statusBarStyle: "default" },
  icons: { apple: "/brand/rider-192.png" },
};

export const viewport: Viewport = { themeColor: "#8a1538" };

export default function RiderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
