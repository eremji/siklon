// Cache partagé entre instances (« use cache: remote ») des flux NHC et NOAA : quel que soit
// le nombre de visites, le NHC est lu au plus une fois par minute, et chaque prévision
// ou couche de watches/warnings aussi.
// Une lecture qui échoue rejette : rien n'est mis en cache et la visite suivante réessaie.
import "server-only";
import { cacheLife } from "next/cache";
import { lireFlux } from "./client";
import { lirePrevision } from "./previsions";
import { lireWatches } from "./watches";

// Les avis NHC paraissent toutes les 3 à 6 heures : une minute de retard au plus.
export const DUREE_CACHE_NHC = { stale: 60, revalidate: 60, expire: 300 };

export async function fluxEnCache() {
  "use cache: remote";
  cacheLife(DUREE_CACHE_NHC);
  return lireFlux();
}

export async function previsionEnCache(emplacement: string) {
  "use cache: remote";
  cacheLife(DUREE_CACHE_NHC);
  return lirePrevision(emplacement);
}

export async function watchesEnCache(emplacement: string) {
  "use cache: remote";
  cacheLife(DUREE_CACHE_NHC);
  return lireWatches(emplacement);
}
