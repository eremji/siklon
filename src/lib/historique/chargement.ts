import "server-only";
// HURDAT2 n'est republié qu'une fois par an : les lectures sont mises en cache pour la journée,
// dans le cache partagé entre instances. Sur Vercel, le cache en mémoire (« use cache ») ne survit
// pas d'une requête à l'autre, et chaque visite interrogerait Postgres (fonctions en iad1, base à Paris).
import { cacheLife, cacheTag } from "next/cache";
import { type FiltresHistorique, lireDernierImport, lirePassages, lireTempete } from "../db/historique";
import { connexion } from "../db/pool";

export async function chargerPassages(filtres: FiltresHistorique) {
  "use cache: remote";
  cacheLife("days");
  cacheTag("historique");
  return lirePassages(connexion(), filtres);
}

export async function chargerTempete(id: string) {
  "use cache: remote";
  cacheLife("days");
  cacheTag("historique");
  return lireTempete(connexion(), id);
}

export async function chargerDernierImport() {
  "use cache: remote";
  cacheLife("days");
  cacheTag("historique");
  return lireDernierImport(connexion());
}
