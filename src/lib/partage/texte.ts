// Message partagé avec le lien (US-21) : uniquement des données officielles, avec leur source et
// l'heure de l'avis (CLAUDE.md). Calculé au moment du partage, pour signaler un avis devenu ancien.
import type { Langue } from "@/lib/langues";
import { SEUIL_OBSOLESCENCE_H, estObsolete, formaterHeureAntilles, libelleHeureAntilles } from "@/lib/nhc/fraicheur";
import { type SystemeActif, categorieSaffirSimpson, libelleType } from "@/lib/nhc/systemes";
import { PARTAGE } from "@/lib/textes/partage";
import { SYSTEMES } from "@/lib/textes/systemes";
import { directionDeplacement, ktVersKmh, mphVersKmh } from "@/lib/unites";

export interface ContenuPartage {
  titre: string;
  texte: string;
}

/** « Ouragan Kyle (cat. 4) », « Tempête tropicale Leah ». */
export function nomComplet(systeme: SystemeActif, langue: Langue): string {
  const categorie = systeme.classification === "HU" ? categorieSaffirSimpson(systeme.ventKt) : null;
  return PARTAGE[langue].nomSysteme(libelleType(systeme.classification, langue), systeme.nom, categorie);
}

export function deplacement({ deplacement }: SystemeActif, langue: Langue): string | null {
  const textes = PARTAGE[langue];
  if (!deplacement) return null;
  if (deplacement.vitesseMph === 0) return textes.stationnaire;
  return textes.deplacement(directionDeplacement(deplacement.directionDeg, langue), mphVersKmh(deplacement.vitesseMph));
}

/**
 * Message partagé depuis la fiche d'un système actif (US-02). `nhcAncien` est l'heure de la dernière
 * lecture réussie quand la mise à jour du NHC a échoué (US-11, `derniereDonneeGardee`).
 */
export function partageSysteme(
  systeme: SystemeActif,
  langue: Langue,
  maintenant: Date,
  nhcAncien: string | null = null,
): ContenuPartage {
  const textes = PARTAGE[langue];
  const { avis } = systeme;
  const phrases = [
    textes.systeme(nomComplet(systeme, langue), ktVersKmh(systeme.ventKt), deplacement(systeme, langue)),
    textes.sourceNhc(avis.numero, formaterHeureAntilles(avis.emisLe, langue), libelleHeureAntilles(langue)),
  ];
  if (nhcAncien) phrases.push(textes.echecNhc(formaterHeureAntilles(nhcAncien, langue), libelleHeureAntilles(langue)));
  if (estObsolete(avis.emisLe, maintenant)) phrases.push(SYSTEMES[langue].obsolescence(SEUIL_OBSOLESCENCE_H));
  return {
    titre: textes.titre(`${libelleType(systeme.classification, langue)} ${systeme.nom}`),
    texte: phrases.join(" "),
  };
}
