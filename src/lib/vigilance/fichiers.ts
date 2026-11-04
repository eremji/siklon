// Fichier du flux vigilance outre-mer de chaque île française, lu dans le référentiel des îles.
import { ILES, trouverIle, type FichierVigilance } from "@/lib/iles";

export const ILES_VIGILANCE: readonly string[] = ILES.filter((ile) => ile.alerte.source === "meteo-france").map(
  (ile) => ile.slug,
);

export function fichierVigilance(slug: string): FichierVigilance | undefined {
  const alerte = trouverIle(slug)?.alerte;
  return alerte?.source === "meteo-france" ? alerte.fichier : undefined;
}
