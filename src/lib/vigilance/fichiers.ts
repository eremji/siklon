// Fichier du flux vigilance outre-mer de chaque île française (SPEC.md, « Flux vigilance Météo-France »).
// Les identifiants d'île suivent le segment d'URL ; à aligner sur le référentiel des îles (US-04).
const FICHIERS = new Map<string, string>([
  ["guadeloupe", "CDPV85TFFR"],
  ["martinique", "CDPV85TFFF"],
  ["saint-martin", "CDPV85TFFJ"],
  ["saint-barthelemy", "CDPV85TFFJ"],
]);

export const ILES_VIGILANCE: readonly string[] = [...FICHIERS.keys()];

export function fichierVigilance(ile: string): string | undefined {
  return FICHIERS.get(ile);
}
