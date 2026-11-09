// Plus proche passage d'une tempête HURDAT2 près d'une île. Les points sont espacés de 6 h :
// la trajectoire est interpolée linéairement entre deux points (position, heure, vent) pour ne
// pas manquer un système qui traverse le rayon entre deux relevés.
import { RADIUS_IMPACT_KM, RAYON_TERRE_KM } from "../constantes";
import { distanceKm } from "../distance";
import type { Ile } from "../iles";
import type { PointHurdat2, TempeteHurdat2 } from "./parseur";

/** -1 : dépression (< 34 kt), 0 : tempête (34–63 kt), 1 à 5 : ouragan (Saffir-Simpson). */
export type Categorie = -1 | 0 | 1 | 2 | 3 | 4 | 5;

export interface PassageIle {
  ileSlug: string;
  tempeteId: string;
  distanceMinKm: number;
  /** Heure (UTC) du plus proche passage. */
  horodatage: Date;
  /** Vent maximal soutenu sur la portion de trajectoire dans le rayon. */
  ventMaxKt: number | null;
  categorie: Categorie | null;
}

const SEUILS_KT: [number, Categorie][] = [
  [137, 5],
  [113, 4],
  [96, 3],
  [83, 2],
  [64, 1],
  [34, 0],
];

export function categorieVent(ventKt: number | null): Categorie | null {
  if (ventKt === null) return null;
  return SEUILS_KT.find(([seuil]) => ventKt >= seuil)?.[1] ?? -1;
}

const KM_PAR_DEGRE = (Math.PI * RAYON_TERRE_KM) / 180;
const interpoler = (a: number, b: number, t: number) => a + (b - a) * t;

function ventA(a: PointHurdat2, b: PointHurdat2, t: number): number | null {
  if (a.ventKt === null) return b.ventKt;
  if (b.ventKt === null) return a.ventKt;
  return interpoler(a.ventKt, b.ventKt, t);
}

/** Plus proche passage de la tempête à moins de `rayonKm` du point de référence, ou null. */
export function calculerPassage(
  tempete: Pick<TempeteHurdat2, "id" | "points">,
  ile: Ile,
  rayonKm = RADIUS_IMPACT_KM,
): PassageIle | null {
  const ref = ile.pointReference;
  // Projection équirectangulaire centrée sur l'île : linéaire en lat/lon, donc fidèle à
  // l'interpolation, et précise à mieux que 1 % à l'échelle du rayon.
  const cosLat = Math.cos((ref.lat * Math.PI) / 180);
  const projeter = (p: PointHurdat2) => ({
    x: (p.lon - ref.lon) * cosLat * KM_PAR_DEGRE,
    y: (p.lat - ref.lat) * KM_PAR_DEGRE,
  });

  let meilleur: { distance: number; horodatage: number } | null = null;
  let ventMax: number | null = null;
  const retenirVent = (vent: number | null) => {
    if (vent !== null && (ventMax === null || vent > ventMax)) ventMax = vent;
  };

  const points = tempete.points;
  const segments = points.length === 1 ? [[points[0], points[0]]] : points.slice(1).map((b, i) => [points[i], b]);

  for (const [a, b] of segments) {
    const pa = projeter(a);
    const pb = projeter(b);
    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    const longueur2 = dx * dx + dy * dy;
    const produit = pa.x * dx + pa.y * dy;

    const t = longueur2 === 0 ? 0 : Math.min(1, Math.max(0, -produit / longueur2));
    const distance = distanceKm(ref, { lat: interpoler(a.lat, b.lat, t), lon: interpoler(a.lon, b.lon, t) });
    if (distance > rayonKm) continue;

    const horodatage = interpoler(a.horodatage.getTime(), b.horodatage.getTime(), t);
    if (meilleur === null || distance < meilleur.distance) meilleur = { distance, horodatage };

    // Portion du segment dans le rayon : |pa + s·d|² ≤ r², bornée à [0, 1].
    const c = pa.x * pa.x + pa.y * pa.y - rayonKm * rayonKm;
    const discriminant = produit * produit - longueur2 * c;
    if (longueur2 === 0 || discriminant < 0) {
      retenirVent(ventA(a, b, t));
      continue;
    }
    const racine = Math.sqrt(discriminant);
    const entree = Math.max(0, (-produit - racine) / longueur2);
    const sortie = Math.min(1, (-produit + racine) / longueur2);
    retenirVent(ventA(a, b, entree));
    retenirVent(ventA(a, b, sortie));
  }

  if (meilleur === null) return null;
  const ventMaxKt = ventMax === null ? null : Math.round(ventMax);
  return {
    ileSlug: ile.slug,
    tempeteId: tempete.id,
    distanceMinKm: meilleur.distance,
    horodatage: new Date(Math.round(meilleur.horodatage / 60_000) * 60_000),
    ventMaxKt,
    categorie: categorieVent(ventMaxKt),
  };
}
