import { type SystemeActif, lireCurrentStorms } from "./systemes";

// Seul domaine interrogé pour les systèmes actifs (liste blanche).
export const URL_CURRENT_STORMS = "https://www.nhc.noaa.gov/CurrentStorms.json";
export const DELAI_MAX_MS = 10_000;

export type EtatFlux =
  | { etat: "ok"; systemes: SystemeActif[]; rejetes: number; luLe: string }
  | { etat: "indisponible"; luLe: string };

interface Options {
  maintenant?: () => Date;
}

export async function chargerSystemesActifs({ maintenant = () => new Date() }: Options = {}): Promise<EtatFlux> {
  try {
    const reponse = await fetch(URL_CURRENT_STORMS, {
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(DELAI_MAX_MS),
    });
    if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
    const { systemes, rejetes } = lireCurrentStorms(await reponse.json());
    return { etat: "ok", systemes, rejetes, luLe: maintenant().toISOString() };
  } catch (erreur) {
    // Le message d'une SyntaxError cite la réponse reçue : seul son type est journalisé.
    const raison =
      erreur instanceof SyntaxError ? "JSON invalide" : erreur instanceof Error ? `${erreur.name}: ${erreur.message}` : "inconnue";
    console.warn("[nhc] flux CurrentStorms indisponible", { raison });
    return { etat: "indisponible", luLe: maintenant().toISOString() };
  }
}
