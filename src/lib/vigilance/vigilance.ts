// Niveau de vigilance d'une île : contrôle, puis bulletins de l'archive correspondant à son checksum.
import type { FichierVigilance } from "@/lib/iles";
import { raisonEchec } from "@/lib/nhc/journal";
import type { Controle } from "./controle";
import { extraireBulletin } from "./archive";
import { type Bulletin, DOMAINES, lireBulletin } from "./bulletin";
import type { Niveau } from "./niveaux";

export type EtatVigilance = { etat: "ok"; niveau: Niveau; misAJour: string } | { etat: "indisponible" };

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

export async function chargerVigilance(fichier: FichierVigilance, sources: Sources): Promise<EtatVigilance> {
  try {
    const { checksum } = await sources.controle();
    const bulletin = (await sources.bulletins(checksum))[fichier];
    if (!bulletin) throw new Error(`bulletin ${fichier} écarté`);
    return { etat: "ok", ...bulletin };
  } catch (erreur) {
    console.warn("[vigilance] flux Météo-France indisponible", { fichier, raison: raisonEchec(erreur) });
    return { etat: "indisponible" };
  }
}
