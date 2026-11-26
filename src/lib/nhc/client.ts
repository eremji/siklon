import type { Lecture } from "@/lib/db/dernieresLectures";
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
  /** Réponse brute du NHC, mémorisée comme dernière lecture réussie (US-11) ; absente des fixtures. */
  brut?: unknown;
}

/**
 * Flux lu. Quand le NHC ne répond pas, la dernière lecture réussie peut le remplacer (US-11) :
 * `luLe` est alors son heure, et `echecLe` l'heure de la mise à jour qui a échoué.
 */
export type EtatFlux = ({ etat: "ok"; echecLe?: string } & FluxLu) | { etat: "indisponible"; luLe: string };

/** Lecture brute du flux : rejette en cas d'échec, pour qu'un échec ne soit jamais mis en cache. */
export async function lireFlux(maintenant: () => Date = () => new Date()): Promise<FluxLu> {
  const reponse = await fetch(URL_CURRENT_STORMS, {
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(DELAI_MAX_MS),
  });
  if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
  const brut: unknown = await reponse.json();
  const { systemes, rejetes } = lireCurrentStorms(brut);
  return { systemes, rejetes, luLe: maintenant().toISOString(), brut };
}

interface Options {
  maintenant?: () => Date;
  /** Source du flux : le cache partagé en production, la lecture directe par défaut. */
  lire?: () => Promise<FluxLu>;
  /** Dernière lecture réussie, relue quand le NHC ne répond pas (US-11). */
  secours?: () => Promise<Lecture | null>;
}

export async function chargerSystemesActifs({ maintenant = () => new Date(), lire, secours }: Options = {}): Promise<EtatFlux> {
  try {
    return { etat: "ok", ...(await (lire ?? (() => lireFlux(maintenant)))()) };
  } catch (erreur) {
    console.warn("[nhc] flux CurrentStorms indisponible", { raison: raisonEchec(erreur) });
    const echecLe = maintenant().toISOString();
    return (await derniereLecture(secours, echecLe)) ?? { etat: "indisponible", luLe: echecLe };
  }
}

async function derniereLecture(secours: Options["secours"], echecLe: string): Promise<EtatFlux | null> {
  if (!secours) return null;
  try {
    const lecture = await secours();
    if (!lecture) return null;
    const { systemes, rejetes } = lireCurrentStorms(lecture.contenu);
    return { etat: "ok", systemes, rejetes, luLe: lecture.luLe, brut: lecture.contenu, echecLe };
  } catch (erreur) {
    console.warn("[nhc] dernière lecture du flux illisible", { raison: raisonEchec(erreur) });
    return null;
  }
}
