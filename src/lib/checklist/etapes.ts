// Choix de la liste à afficher selon le niveau d'alerte de l'île (US-08). Les îles suivies par le NHC
// n'ont pas de vigilance Météo-France : une veille renvoie à la liste orange, un avertissement à la
// rouge, et l'absence d'alerte à la liste d'avant la saison (choix validé le 2026-11-20).
import type { NiveauAlerte } from "@/lib/notifications/evenements";
import { estNiveau, NIVEAUX, type Niveau } from "@/lib/vigilance/niveaux";

const ETAPES_NHC: Record<Exclude<NiveauAlerte, Niveau>, Niveau> = {
  aucune: "vert",
  TWA: "orange",
  HWA: "orange",
  TWR: "rouge",
  HWR: "rouge",
};

export function etapeChecklist(niveau: NiveauAlerte): Niveau {
  return estNiveau(niveau) ? niveau : ETAPES_NHC[niveau];
}

/**
 * Listes de préparation des niveaux précédents, à rappeler sous la liste en cours (« si ce n'est pas
 * encore fait »). Aucune en vigilance grise : on est après le passage du phénomène.
 */
export function etapesPrecedentes(etape: Niveau): Niveau[] {
  if (etape === "gris") return [];
  return NIVEAUX.slice(0, NIVEAUX.indexOf(etape));
}
