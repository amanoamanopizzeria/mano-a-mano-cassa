// Ricerca indirizzi per la cassa: Google Maps (Places API, chiave GOOGLE_MAPS_API_KEY solo sul
// server) e, finché la chiave non c'è, Photon di komoot (OpenStreetMap, senza chiave).
// La ricerca è centrata sulla pizzeria (Via Novara 5/7, Roma) così «via tusc» trova prima
// Via Tuscolana che una via di Milano. SOLO lato server.
import "server-only";

export interface IndirizzoTrovato {
  testo: string;          // come si legge nella lista
  via: string | null;
  civico: string | null;
  cap: string | null;
  citta: string | null;
  lat: number | null;
  lng: number | null;
  place_id: string | null; // Google: i dettagli (coordinate) si leggono dopo, solo se scelto
  fonte: "google" | "osm";
}

export const PIZZERIA = { lat: 41.9176, lng: 12.5037 }; // Via Novara 5/7, 00198 Roma
const RAGGIO_M = 12_000;   // le zone arrivano a ~6 km; a 20 km entravano Frascati e Monterotondo (critico giro 3)

export function chiaveGoogle() {
  return process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || null;
}

export async function cercaIndirizzi(q: string): Promise<IndirizzoTrovato[]> {
  const chiave = chiaveGoogle();
  return chiave ? cercaGoogle(q, chiave) : cercaPhoton(q);
}

// ---- Google Places (New) ----
interface GoogleSuggest { placePrediction?: { placeId: string; text?: { text?: string } } }

async function cercaGoogle(q: string, chiave: string): Promise<IndirizzoTrovato[]> {
  const r = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": chiave },
    body: JSON.stringify({
      input: q, languageCode: "it", regionCode: "IT", includedRegionCodes: ["it"],
      includedPrimaryTypes: ["street_address", "route", "premise", "subpremise"],
      // restriction e non bias: Monterotondo, Corato e Gela non devono comparire (critico giro 1, lavoro 2)
      locationRestriction: { circle: { center: { latitude: PIZZERIA.lat, longitude: PIZZERIA.lng }, radius: RAGGIO_M } },
    }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error("Google autocomplete " + r.status + ": " + (await r.text()).slice(0, 200));
  const j = (await r.json()) as { suggestions?: GoogleSuggest[] };
  return (j.suggestions ?? [])
    .filter((s) => s.placePrediction?.placeId)
    .slice(0, 6)
    .map((s) => ({
      testo: s.placePrediction!.text?.text ?? "", via: null, civico: null, cap: null, citta: null,
      lat: null, lng: null, place_id: s.placePrediction!.placeId, fonte: "google" as const,
    }));
}

interface GoogleComp { longText?: string; shortText?: string; types?: string[] }

export async function dettaglioGoogle(placeId: string): Promise<IndirizzoTrovato | null> {
  const chiave = chiaveGoogle();
  if (!chiave) return null;
  const r = await fetch("https://places.googleapis.com/v1/places/" + encodeURIComponent(placeId), {
    headers: { "X-Goog-Api-Key": chiave, "X-Goog-FieldMask": "id,formattedAddress,location,addressComponents", "Accept-Language": "it" },
    cache: "no-store",
  });
  if (!r.ok) throw new Error("Google dettagli " + r.status);
  const j = (await r.json()) as { formattedAddress?: string; location?: { latitude: number; longitude: number }; addressComponents?: GoogleComp[] };
  const c = (tipo: string) => j.addressComponents?.find((x) => x.types?.includes(tipo))?.longText ?? null;
  return {
    testo: j.formattedAddress ?? "", via: c("route"), civico: c("street_number"), cap: c("postal_code"),
    citta: c("locality") ?? c("administrative_area_level_3") ?? null,
    lat: j.location?.latitude ?? null, lng: j.location?.longitude ?? null, place_id: placeId, fonte: "google",
  };
}

// ---- Photon (OpenStreetMap), senza chiave ----
interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: { name?: string; street?: string; housenumber?: string; postcode?: string; city?: string; district?: string; osm_key?: string; osm_value?: string; type?: string };
}

async function cercaPhoton(q: string): Promise<IndirizzoTrovato[]> {
  const u = new URL("https://photon.komoot.io/api/");
  u.searchParams.set("q", q);
  u.searchParams.set("lang", "default"); // Photon non ha "it": default usa i nomi locali
  u.searchParams.set("limit", "8");
  u.searchParams.set("lat", String(PIZZERIA.lat));
  u.searchParams.set("lon", String(PIZZERIA.lng));
  u.searchParams.set("zoom", "12");
  u.searchParams.set("location_bias_scale", "0.6");
  const r = await fetch(u, { cache: "no-store", headers: { "User-Agent": "mano-a-mano-cassa (pizzeria, Roma)" } });
  if (!r.ok) throw new Error("Photon " + r.status);
  const j = (await r.json()) as { features?: PhotonFeature[] };
  return (j.features ?? [])
    .filter((f) => ["highway", "place", "building", "amenity"].includes(f.properties.osm_key ?? "") || f.properties.housenumber)
    .filter((f) => kmDallaPizzeria(f.geometry.coordinates[1], f.geometry.coordinates[0]) <= RAGGIO_M / 1000)
    .slice(0, 6)
    .map((f) => {
      const p = f.properties;
      const via = p.street ?? (p.osm_key === "highway" ? p.name ?? null : null);
      const citta = p.city ?? null;
      const testo = [via ?? p.name, p.housenumber, p.postcode, citta, p.district && p.district !== citta ? p.district : null].filter(Boolean).join(" ");
      return {
        testo, via, civico: p.housenumber ?? null, cap: p.postcode ?? null, citta,
        lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], place_id: null, fonte: "osm" as const,
      };
    });
}

/** Distanza in km in linea d'aria dalla pizzeria (per dire subito «è lontano»). */
export function kmDallaPizzeria(lat: number, lng: number) {
  const R = 6371, dLat = ((lat - PIZZERIA.lat) * Math.PI) / 180, dLng = ((lng - PIZZERIA.lng) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((PIZZERIA.lat * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Da testo a coordinate (Google Geocoding), per le vie arrivate senza coordinate da Velocissimo. */
export async function geocodifica(testo: string): Promise<{ lat: number; lng: number; place_id: string | null } | null> {
  const chiave = chiaveGoogle();
  if (!chiave) return null;
  const u = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  u.searchParams.set("address", testo);
  u.searchParams.set("region", "it");
  u.searchParams.set("language", "it");
  u.searchParams.set("bounds", "41.80,12.35|42.03,12.65");
  u.searchParams.set("key", chiave);
  const r = await fetch(u, { cache: "no-store" });
  if (!r.ok) throw new Error("Google geocoding " + r.status);
  const j = (await r.json()) as { status: string; error_message?: string; results?: { place_id?: string; geometry: { location: { lat: number; lng: number } } }[] };
  if (j.status === "ZERO_RESULTS") return null;
  if (j.status !== "OK") throw new Error("Google geocoding " + j.status + (j.error_message ? ": " + j.error_message : ""));
  const g = j.results![0];
  return { lat: g.geometry.location.lat, lng: g.geometry.location.lng, place_id: g.place_id ?? null };
}
