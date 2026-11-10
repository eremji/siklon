import { raisonEchec } from "./journal";
import { type SystemeActif, lireCurrentStorms } from "./systemes";

// Seul domaine interrogé pour les systèmes actifs (liste blanche).
export const URL_CURRENT_STORMS = "https://www.nhc.noaa.gov/CurrentStorms.json";
export const DELAI_MAX_MS = 10_000;

export interface FluxLu {
  systemes: SystemeActif[];
  rejetes: number;
  /** Heure de lecture du flux (ISO), conservée avec lui dans le cache. */
  luLe: string;
}

export type EtatFlux = ({ etat: "ok" } & FluxLu) | { etat: "indisponible"; luLe: string };

/** Lecture brute du flux : rejette en cas d'échec, pour qu'un échec ne soit jamais mis en cache. */
export async function lireFlux(maintenant: () => Date = () => new Date()): Promise<FluxLu> {
  const reponse = await fetch(URL_CURRENT_STORMS, {
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(DELAI_MAX_MS),
  });
  if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
  const { systemes, rejetes } = lireCurrentStorms(await reponse.json());
  return { systemes, rejetes, luLe: maintenant().toISOString() };
}

interface Options {
  maintenant?: () => Date;
  /** Source du flux : le cache partagé en production, la lecture directe par défaut. */
  lire?: () => Promise<FluxLu>;
}

export async function chargerSystemesActifs({ maintenant = () => new Date(), lire }: Options = {}): Promise<EtatFlux> {
  try {
    return { etat: "ok", ...(await (lire ?? (() => lireFlux(maintenant)))()) };
  } catch (erreur) {
    console.warn("[nhc] flux CurrentStorms indisponible", { raison: raisonEchec(erreur) });
    return { etat: "indisponible", luLe: maintenant().toISOString() };
  }
}
