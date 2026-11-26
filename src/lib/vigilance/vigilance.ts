// Niveau de vigilance d'une île : contrôle, puis bulletins de l'archive correspondant à son checksum.
import type { Lecture } from "@/lib/db/dernieresLectures";
import type { FichierVigilance } from "@/lib/iles";
import { raisonEchec } from "@/lib/nhc/journal";
import type { Controle } from "./controle";
import { extraireBulletin } from "./archive";
import { type Bulletin, DOMAINES, lireBulletin } from "./bulletin";
import { type Niveau, estNiveau } from "./niveaux";

/**
 * Niveau de vigilance. Quand Météo-France ne répond pas, le dernier niveau lu peut le remplacer (US-11) :
 * `misAJour` reste l'heure de Météo-France, et `echecLe` est l'heure de la mise à jour qui a échoué.
 */
export type EtatVigilance =
  | { etat: "ok"; niveau: Niveau; misAJour: string; echecLe?: string }
  | { etat: "indisponible" };

export type Bulletins = Partial<Record<FichierVigilance, Bulletin>>;

export interface Sources {
  controle: () => Promise<Controle>;
  /** Le checksum sert de clé de cache : l'archive n'est retéléchargée que s'il change. */
  bulletins: (checksum: string) => Promise<Bulletins>;
}

const FICHIERS = Object.keys(DOMAINES) as FichierVigilance[];

export function lireBulletins(archive: Uint8Array): Bulletins {
  const bulletins: Bulletins = {};
  for (const fichier of FICHIERS) {
    try {
      bulletins[fichier] = lireBulletin(extraireBulletin(archive, fichier), fichier);
    } catch (erreur) {
      console.warn("[vigilance] bulletin écarté", { fichier, raison: raisonEchec(erreur) });
    }
  }
  if (Object.keys(bulletins).length === 0) throw new Error("aucun bulletin lisible dans l'archive");
  return bulletins;
}

interface Options {
  /** Dernière lecture réussie du bulletin, relue quand Météo-France ne répond pas (US-11). */
  secours?: () => Promise<Lecture | null>;
  maintenant?: () => Date;
}

export async function chargerVigilance(
  fichier: FichierVigilance,
  sources: Sources,
  { secours, maintenant = () => new Date() }: Options = {},
): Promise<EtatVigilance> {
  try {
    const { checksum } = await sources.controle();
    const bulletin = (await sources.bulletins(checksum))[fichier];
    if (!bulletin) throw new Error(`bulletin ${fichier} écarté`);
    return { etat: "ok", ...bulletin };
  } catch (erreur) {
    console.warn("[vigilance] flux Météo-France indisponible", { fichier, raison: raisonEchec(erreur) });
    const derniere = await dernierBulletin(fichier, secours);
    return derniere ? { etat: "ok", ...derniere, echecLe: maintenant().toISOString() } : { etat: "indisponible" };
  }
}

/** Bulletin gardé en base, revalidé : un contenu inattendu vaut « indisponible ». */
async function dernierBulletin(fichier: FichierVigilance, secours: Options["secours"]): Promise<Bulletin | null> {
  if (!secours) return null;
  try {
    const lecture = await secours();
    if (!lecture) return null;
    const { niveau, misAJour } = (lecture.contenu ?? {}) as Record<string, unknown>;
    if (typeof niveau !== "string" || !estNiveau(niveau)) throw new Error("niveau gardé inconnu");
    if (typeof misAJour !== "string" || Number.isNaN(Date.parse(misAJour))) throw new Error("heure gardée invalide");
    return { niveau, misAJour: new Date(misAJour).toISOString() };
  } catch (erreur) {
    console.warn("[vigilance] dernière lecture illisible", { fichier, raison: raisonEchec(erreur) });
    return null;
  }
}
