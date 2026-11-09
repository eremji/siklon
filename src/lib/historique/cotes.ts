// Traits de côte pour la carte des trajectoires : terres Natural Earth au 1:50 m (domaine public,
// naturalearthdata.com), extraites pour l'Atlantique (110° O–20° E, 0–70° N), simplifiées à 0,05°.
// Fichier lu côté serveur uniquement : seul le tracé visible part dans le HTML.
import type { Cadre } from "./projection";
import donnees from "./cotes-atlantique.json";

/** Anneau de polygone : points [longitude, latitude]. */
export type Anneau = [number, number][];

const ANNEAUX = donnees as Anneau[];
// Environ 2 px sur une carte de 600 unités de large.
const POINTS_PAR_LARGEUR = 300;

type Point = [number, number];

const BORDS: { dedans: (p: Point, c: Cadre) => boolean; couper: (a: Point, b: Point, c: Cadre) => Point }[] = [
  {
    dedans: ([lon], c) => lon >= c.lonMin,
    couper: (a, b, c) => [c.lonMin, a[1] + ((c.lonMin - a[0]) / (b[0] - a[0])) * (b[1] - a[1])],
  },
  {
    dedans: ([lon], c) => lon <= c.lonMax,
    couper: (a, b, c) => [c.lonMax, a[1] + ((c.lonMax - a[0]) / (b[0] - a[0])) * (b[1] - a[1])],
  },
  {
    dedans: ([, lat], c) => lat >= c.latMin,
    couper: (a, b, c) => [a[0] + ((c.latMin - a[1]) / (b[1] - a[1])) * (b[0] - a[0]), c.latMin],
  },
  {
    dedans: ([, lat], c) => lat <= c.latMax,
    couper: (a, b, c) => [a[0] + ((c.latMax - a[1]) / (b[1] - a[1])) * (b[0] - a[0]), c.latMax],
  },
];

/** Découpe un anneau au cadre (algorithme de Sutherland-Hodgman). */
export function decouperAnneau(anneau: Anneau, cadre: Cadre): Anneau {
  let points = anneau;
  for (const { dedans, couper } of BORDS) {
    const resultat: Anneau = [];
    points.forEach((courant, i) => {
      const precedent = points[(i + points.length - 1) % points.length];
      if (dedans(courant, cadre)) {
        if (!dedans(precedent, cadre)) resultat.push(couper(precedent, courant, cadre));
        resultat.push(courant);
      } else if (dedans(precedent, cadre)) {
        resultat.push(couper(precedent, courant, cadre));
      }
    });
    points = resultat;
  }
  return points;
}

/** Retire les points plus proches que `tolerance` (en degrés) du dernier point gardé. */
export function simplifierAnneau(anneau: Anneau, tolerance: number): Anneau {
  const garde: Anneau = [];
  for (const point of anneau) {
    const dernier = garde.at(-1);
    if (!dernier || Math.hypot(point[0] - dernier[0], point[1] - dernier[1]) >= tolerance) garde.push(point);
  }
  return garde;
}

/** Terres visibles dans le cadre, découpées et allégées selon la taille de la carte. */
export function cotesDansCadre(cadre: Cadre, anneaux: readonly Anneau[] = ANNEAUX): Anneau[] {
  const tolerance = Math.max(cadre.lonMax - cadre.lonMin, cadre.latMax - cadre.latMin) / POINTS_PAR_LARGEUR;
  return anneaux
    .map((anneau) => simplifierAnneau(decouperAnneau(anneau, cadre), tolerance))
    .filter((anneau) => anneau.length >= 3);
}
