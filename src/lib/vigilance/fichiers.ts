// Fichier du flux vigilance outre-mer de chaque île française, lu dans le référentiel des îles.
import { ILES, trouverIle, type FichierVigilance } from "@/lib/iles";

export const ILES_VIGILANCE: readonly string[] = ILES.filter((ile) => ile.alerte.source === "meteo-france").map(
  (ile) => ile.slug,
);

// Page publique de la vigilance outre-mer couverte par chaque fichier (Saint-Martin et Saint-Barthélemy
// partagent bulletin et page). Vérifiées sur meteofrance.gp et meteofrance.mq le 9 novembre 2026.
const PAGES_VIGILANCE: Record<FichierVigilance, string> = {
  CDPV85TFFR: "https://meteofrance.gp/fr/vigilance/guadeloupe",
  CDPV85TFFF: "https://meteofrance.mq/fr/vigilance",
  CDPV85TFFJ: "https://meteofrance.gp/fr/vigilance/saint-martin-saint-barthelemy",
};

export function pageVigilance(fichier: FichierVigilance): string {
  return PAGES_VIGILANCE[fichier];
}

export function fichierVigilance(slug: string): FichierVigilance | undefined {
  const alerte = trouverIle(slug)?.alerte;
  return alerte?.source === "meteo-france" ? alerte.fichier : undefined;
}
