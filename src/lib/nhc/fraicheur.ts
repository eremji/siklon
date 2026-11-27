// Fraîcheur des avis NHC : au-delà de ce délai sans nouvel avis, les données
// sont signalées comme possiblement obsolètes (US-01).
import { formaterJourHeure } from "@/lib/dates";
import type { Langue } from "@/lib/langues";

export const SEUIL_OBSOLESCENCE_H = 6;

const MS_PAR_HEURE = 3_600_000;

export function estObsolete(emisLe: string, maintenant: Date): boolean {
  return maintenant.getTime() - Date.parse(emisLe) > SEUIL_OBSOLESCENCE_H * MS_PAR_HEURE;
}

/**
 * Règle d'US-11 : une donnée NHC est ancienne quand sa mise à jour a échoué et qu'on montre la dernière
 * lecture réussie (`echecLe` présent). Rend l'heure de la plus ancienne de ces lectures, ou null.
 */
export function derniereDonneeGardee(sources: ({ luLe?: string; echecLe?: string } | undefined)[]): string | null {
  const heures = sources.flatMap((source) => (source?.echecLe && source.luLe ? [source.luLe] : []));
  if (heures.length === 0) return null;
  return heures.reduce((ancienne, heure) => (Date.parse(heure) < Date.parse(ancienne) ? heure : ancienne));
}

export function avisLePlusRecent(heures: string[]): string | null {
  if (heures.length === 0) return null;
  return heures.reduce((recent, heure) => (Date.parse(heure) > Date.parse(recent) ? heure : recent));
}

// Heure des Antilles françaises (UTC−4, sans heure d'été).
const FUSEAU_ANTILLES = "America/Martinique";

export function formaterHeureAntilles(iso: string, langue: Langue): string {
  return formaterJourHeure(new Date(iso), FUSEAU_ANTILLES, langue);
}

const LIBELLES_HEURE_ANTILLES: Record<Langue, string> = {
  fr: "heure des Antilles françaises",
  en: "Atlantic Standard Time, UTC−4",
};

/** Nom du fuseau, à écrire entre parenthèses après une heure des Antilles. */
export const libelleHeureAntilles = (langue: Langue): string => LIBELLES_HEURE_ANTILLES[langue];
