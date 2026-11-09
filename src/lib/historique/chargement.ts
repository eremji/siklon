import "server-only";
// HURDAT2 n'est republié qu'une fois par an : les lectures sont mises en cache pour la journée.
import { cacheLife, cacheTag } from "next/cache";
import { type FiltresHistorique, lireDernierImport, lirePassages, lireTempete } from "../db/historique";
import { connexion } from "../db/pool";

export async function chargerPassages(filtres: FiltresHistorique) {
  "use cache";
  cacheLife("days");
  cacheTag("historique");
  return lirePassages(connexion(), filtres);
}

export async function chargerTempete(id: string) {
  "use cache";
  cacheLife("days");
  cacheTag("historique");
  return lireTempete(connexion(), id);
}

export async function chargerDernierImport() {
  "use cache";
  cacheLife("days");
  cacheTag("historique");
  return lireDernierImport(connexion());
}
