// Extraction d'un bulletin de l'archive vigilance_OM.zip (/vigilanceom/flux/dernier).
import { unzipSync } from "fflate";
import type { FichierVigilance } from "@/lib/iles";

// Un bulletin réel pèse environ 20 Ko ; la limite protège d'une archive piégée.
export const TAILLE_MAX_BULLETIN = 1_000_000;

/** « CDPV85TFFR » est rangé sous « CDPV85_TFFR_.txt » dans l'archive. */
export function nomDansArchive(fichier: FichierVigilance): string {
  return `${fichier.slice(0, 6)}_${fichier.slice(6)}_.txt`;
}

export function extraireBulletin(archive: Uint8Array, fichier: FichierVigilance): string {
  const nom = nomDansArchive(fichier);
  // La taille annoncée borne le tampon de décompression : rien au-delà n'est extrait.
  const extraits = unzipSync(archive, {
    filter: (entree) => entree.name === nom && entree.originalSize <= TAILLE_MAX_BULLETIN,
  });
  const contenu = extraits[nom];
  if (!contenu) throw new Error(`bulletin ${fichier} absent de l'archive ou trop volumineux`);
  return new TextDecoder("utf-8", { fatal: true }).decode(contenu);
}
