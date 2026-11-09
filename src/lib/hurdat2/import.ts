// Préparation d'un import HURDAT2 : lecture stricte, empreinte du fichier, passages près des îles.
import { createHash } from "node:crypto";
import type { ImportHistorique } from "../db/historique";
import { ILES, type Ile } from "../iles";
import { parserHurdat2 } from "./parseur";
import { calculerPassage } from "./passages";

// Nom publié par le NHC : hurdat2-<première année>-<dernière année>-<MMJJAA ou MMJJAAAA>.txt
const NOM_FICHIER = /^hurdat2-\d{4}-\d{4}-(\d{2})(\d{2})(\d{2}|20\d{2})\.txt$/;

/** Date de version (AAAA-MM-JJ) tirée du nom de fichier NHC, ou null s'il ne suit pas le format. */
export function versionDepuisNomFichier(nom: string): string | null {
  const trouve = NOM_FICHIER.exec(nom);
  if (!trouve) return null;
  const [, mm, jj, annee] = trouve;
  const iso = `${annee.length === 2 ? `20${annee}` : annee}-${mm}-${jj}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(iso) ? iso : null;
}

export type ResultatPreparation = { ok: true; donnees: ImportHistorique } | { ok: false; erreurs: string[] };

/** Tout ou rien : la moindre erreur refuse le fichier entier. */
export function preparerImport(texte: string, nomFichier: string, iles: readonly Ile[] = ILES): ResultatPreparation {
  const versionNhc = versionDepuisNomFichier(nomFichier);
  if (versionNhc === null) {
    return { ok: false, erreurs: [`nom de fichier inattendu (hurdat2-AAAA-AAAA-MMJJAA[AA].txt attendu)`] };
  }
  const { tempetes, erreurs } = parserHurdat2(texte);
  if (erreurs.length > 0) return { ok: false, erreurs: erreurs.map((e) => `ligne ${e.ligne} : ${e.message}`) };
  if (tempetes.length === 0) return { ok: false, erreurs: ["aucune tempête dans le fichier"] };

  const passages = tempetes.flatMap((tempete) =>
    iles.flatMap((ile) => {
      const passage = calculerPassage(tempete, ile);
      return passage ? [passage] : [];
    }),
  );
  const sha256 = createHash("sha256").update(texte).digest("hex");
  return { ok: true, donnees: { fichier: nomFichier, sha256, versionNhc, tempetes, passages } };
}
