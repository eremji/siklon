// Branchement Next du flux vigilance : cache partagé entre instances (« use cache: remote »)
// pour rester sous le quota de l'API (60 requêtes par minute). La clé ne quitte pas le serveur.
import "server-only";
import { cacheLife } from "next/cache";
import { telechargerArchive, telechargerControle } from "./client";
import { lireBulletins, type Sources } from "./vigilance";

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
