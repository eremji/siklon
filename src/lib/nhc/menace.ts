// Menace d'un système actif sur une île (US-03) : plus proche passage estimé à partir
// des positions prévues du NHC, comparé au rayon de surveillance RADIUS_WATCH_KM.
import { RADIUS_WATCH_KM } from "../constantes";
import { type Position, distanceKm } from "../distance";
import type { Ile } from "../iles";
import type { PositionPrevue, PositionsPrevues } from "./positions";

export interface Passage {
  /** Heure estimée du plus proche passage, ISO 8601 en UTC. */
  heure: string;
  /** Distance prévue entre le centre du système et le point de référence, en km. */
  distanceKm: number;
}

export interface Menace<S> {
  systeme: S;
  passage: Passage;
  avis: PositionsPrevues["avis"];
}

// Entre deux positions prévues (jusqu'à 24 h d'écart, soit plusieurs centaines de km),
// la trajectoire est interpolée linéairement et parcourue par pas de 15 minutes.
const PAS_MS = 15 * 60_000;

export function plusProchePassage(positions: PositionPrevue[], point: Position): Passage | null {
  if (positions.length === 0) return null;
  let meilleur: Passage = { heure: positions[0].valideLe, distanceKm: distanceKm(positions[0], point) };

  for (let i = 1; i < positions.length; i += 1) {
    const [debut, fin] = [positions[i - 1], positions[i]];
    const [t0, t1] = [Date.parse(debut.valideLe), Date.parse(fin.valideLe)];
    const pas = Math.max(1, Math.round((t1 - t0) / PAS_MS));
    for (let k = 1; k <= pas; k += 1) {
      const f = k / pas;
      const distance = distanceKm(
        { lat: debut.lat + (fin.lat - debut.lat) * f, lon: debut.lon + (fin.lon - debut.lon) * f },
        point,
      );
      if (distance < meilleur.distanceKm) {
        meilleur = { heure: new Date(t0 + (t1 - t0) * f).toISOString(), distanceKm: distance };
      }
    }
  }
  return meilleur;
}

// Systèmes dont la trajectoire prévue passe dans le rayon de surveillance de l'île,
// du passage le plus proche dans le temps au plus lointain.
export function evaluerMenaces<S extends { id: string }>(
  ile: Ile,
  systemes: S[],
  positions: Record<string, PositionsPrevues>,
): { menaces: Menace<S>[]; sansPrevision: S[] } {
  const menaces: Menace<S>[] = [];
  const sansPrevision: S[] = [];
  for (const systeme of systemes) {
    const prevision = positions[systeme.id];
    if (!prevision) {
      sansPrevision.push(systeme);
      continue;
    }
    const passage = plusProchePassage(prevision.positions, ile.pointReference);
    if (passage && passage.distanceKm <= RADIUS_WATCH_KM) menaces.push({ systeme, passage, avis: prevision.avis });
  }
  menaces.sort((a, b) => Date.parse(a.passage.heure) - Date.parse(b.passage.heure));
  return { menaces, sansPrevision };
}
