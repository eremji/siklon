import { RAYON_TERRE_KM } from "./constantes";

/** Position en degrés décimaux (latitude nord et longitude est positives). */
export interface Position {
  lat: number;
  lon: number;
}

const enRadians = (degres: number) => (degres * Math.PI) / 180;

/** Distance orthodromique en km entre deux positions (formule de haversine). */
export function distanceKm(a: Position, b: Position): number {
  const dLat = enRadians(b.lat - a.lat);
  const dLon = enRadians(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(enRadians(a.lat)) * Math.cos(enRadians(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * RAYON_TERRE_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}
