// Branchement Next du flux vigilance : cache partagé entre instances (« use cache: remote »)
// pour rester sous le quota de l'API (60 requêtes par minute). La clé ne quitte pas le serveur.
import "server-only";
import { cacheLife } from "next/cache";
import { lireDerniereLecture } from "@/lib/db/dernieresLectures";
import { connexion } from "@/lib/db/pool";
import type { FichierVigilance } from "@/lib/iles";
import { telechargerArchive, telechargerControle } from "./client";
import { chargerVigilance, type EtatVigilance, lireBulletins, type Sources } from "./vigilance";

// SPEC.md : le fichier de contrôle est relu chaque minute.
async function controleEnCache() {
  "use cache: remote";
  cacheLife({ stale: 60, revalidate: 60, expire: 300 });
  return telechargerControle(process.env.METEOFRANCE_API_KEY);
}

// Une entrée par checksum : l'archive n'est retéléchargée que quand il change.
async function bulletinsEnCache(checksum: string) {
  "use cache: remote";
  cacheLife("days");
  void checksum; // clé de cache uniquement
  return lireBulletins(await telechargerArchive(process.env.METEOFRANCE_API_KEY));
}

export const SOURCES_METEO_FRANCE: Sources = { controle: controleEnCache, bulletins: bulletinsEnCache };

/**
 * Niveau montré par les pages : quand Météo-France ne répond pas, le dernier niveau lu par la
 * vérification de chaque minute, gardé en base (US-11). La vérification lit, elle, en direct.
 */
export function vigilanceAffichee(fichier: FichierVigilance): Promise<EtatVigilance> {
  return chargerVigilance(fichier, SOURCES_METEO_FRANCE, {
    secours: () => lireDerniereLecture(connexion(), `vigilance:${fichier}`),
  });
}
