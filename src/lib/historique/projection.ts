// Projection équirectangulaire pour la carte SVG d'une trajectoire : simple, sans dépendance,
// et suffisante à l'échelle des Antilles.
import { RAYON_TERRE_KM } from "../constantes";
import type { Position } from "../distance";

export interface Cadre {
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
}

export interface Projection {
  largeur: number;
  hauteur: number;
  projeter(position: Position): { x: number; y: number };
  kmVersUnites(km: number): number;
}

const KM_PAR_DEGRE = (Math.PI * RAYON_TERRE_KM) / 180;
const borner = (valeur: number, min: number, max: number) => Math.min(max, Math.max(min, valeur));

function etendre(min: number, max: number, marge: number, ecartMin: number): [number, number] {
  const complement = Math.max(0, (ecartMin - (max - min + 2 * marge)) / 2);
  return [min - marge - complement, max + marge + complement];
}

/** Rectangle qui contient toutes les positions, avec une marge et une étendue minimale (en degrés). */
export function cadrer(positions: readonly Position[], { marge = 2, ecartMin = 8 } = {}): Cadre {
  const lats = positions.map((p) => p.lat);
  const lons = positions.map((p) => p.lon);
  const [latMin, latMax] = etendre(Math.min(...lats), Math.max(...lats), marge, ecartMin);
  const [lonMin, lonMax] = etendre(Math.min(...lons), Math.max(...lons), marge, ecartMin);
  return {
    latMin: borner(latMin, -90, 90),
    latMax: borner(latMax, -90, 90),
    lonMin: borner(lonMin, -180, 180),
    lonMax: borner(lonMax, -180, 180),
  };
}

const PAS_GRILLE = [5, 10, 20, 30];

/** Pas de la grille (en degrés) pour ne pas dépasser 6 lignes, et garder des étiquettes lisibles. */
export function pasGrille(etendue: number): number {
  return PAS_GRILLE.find((pas) => etendue / pas <= 6) ?? PAS_GRILLE[PAS_GRILLE.length - 1];
}

export function creerProjection(cadre: Cadre, largeur: number): Projection {
  const cosMilieu = Math.cos((((cadre.latMin + cadre.latMax) / 2) * Math.PI) / 180);
  const unitesParDegreLat = largeur / ((cadre.lonMax - cadre.lonMin) * cosMilieu);
  return {
    largeur,
    hauteur: (cadre.latMax - cadre.latMin) * unitesParDegreLat,
    projeter: ({ lat, lon }) => ({
      x: (lon - cadre.lonMin) * cosMilieu * unitesParDegreLat,
      y: (cadre.latMax - lat) * unitesParDegreLat,
    }),
    kmVersUnites: (km) => (km / KM_PAR_DEGRE) * unitesParDegreLat,
  };
}
