"use server";
// Server actions de la checklist (US-08), pour l'utilisateur connecté : cocher, masquer, ajouter et
// supprimer des éléments. Après un changement de liste, refresh() réaffiche la page depuis le serveur.
import { refresh } from "next/cache";
import { utilisateurCourant } from "@/lib/auth/serveur";
import {
  ajouterElementPerso,
  cocherElement,
  cocherElementPerso,
  ElementInconnuError,
  LIMITE_ELEMENTS_PERSO,
  LimiteAtteinteError,
  LONGUEUR_MAX_TEXTE,
  masquerElement,
  supprimerElementPerso,
  TexteInvalideError,
} from "@/lib/db/checklist";
import { connexionComptes } from "@/lib/db/pool";

export type ResultatCoche = { ok: true } | { ok: false; message: string };

/** État des formulaires de la checklist : un message d'échec, ou rien. */
export type EtatAction = { message?: string; texte?: string; ajoute?: true } | null;

const SESSION_EXPIREE = "Votre session a expiré. Reconnectez-vous pour enregistrer votre checklist.";
const ELEMENT_INCONNU = "Cet élément ne fait pas partie de la checklist.";

const champ = (donnees: FormData, nom: string) => {
  const valeur = donnees.get(nom);
  return typeof valeur === "string" ? valeur : "";
};

/**
 * Exécute l'écriture pour l'utilisateur connecté ; traduit un élément inconnu en message.
 * `valide` : faux si les arguments venus du navigateur n'ont pas le bon type.
 */
async function pourUtilisateur(ecrire: (utilisateurId: string) => Promise<void>, valide = true): Promise<string | null> {
  const utilisateur = await utilisateurCourant();
  if (!utilisateur) return SESSION_EXPIREE;
  if (!valide) return ELEMENT_INCONNU;
  try {
    await ecrire(utilisateur.id);
  } catch (erreur) {
    if (erreur instanceof ElementInconnuError) return ELEMENT_INCONNU;
    throw erreur;
  }
  return null;
}

async function cocher(
  ecrire: (utilisateurId: string) => Promise<void>,
  element: unknown,
  coche: unknown,
): Promise<ResultatCoche> {
  // Arguments venus du navigateur : on vérifie leur type avant d'écrire.
  const message = await pourUtilisateur(ecrire, typeof element === "string" && typeof coche === "boolean");
  return message ? { ok: false, message } : { ok: true };
}

export async function cocherElementChecklist(element: string, coche: boolean): Promise<ResultatCoche> {
  return cocher((id) => cocherElement(connexionComptes(), id, element, coche), element, coche);
}

export async function cocherElementPersoChecklist(element: string, coche: boolean): Promise<ResultatCoche> {
  return cocher((id) => cocherElementPerso(connexionComptes(), id, element, coche), element, coche);
}

export async function masquerElementChecklist(_etat: EtatAction, donnees: FormData): Promise<EtatAction> {
  const element = champ(donnees, "element");
  const masque = champ(donnees, "masque") === "1";
  const message = await pourUtilisateur((id) => masquerElement(connexionComptes(), id, element, masque));
  if (message) return { message };
  refresh();
  return {};
}

export async function supprimerElementChecklist(_etat: EtatAction, donnees: FormData): Promise<EtatAction> {
  const element = champ(donnees, "id");
  const message = await pourUtilisateur((id) => supprimerElementPerso(connexionComptes(), id, element));
  if (message) return { message };
  refresh();
  return {};
}

export async function ajouterElementChecklist(_etat: EtatAction, donnees: FormData): Promise<EtatAction> {
  const texte = champ(donnees, "texte");
  const utilisateur = await utilisateurCourant();
  if (!utilisateur) return { message: SESSION_EXPIREE, texte };
  try {
    await ajouterElementPerso(connexionComptes(), utilisateur.id, texte);
  } catch (erreur) {
    if (erreur instanceof TexteInvalideError) {
      return { message: `Écrivez un élément de 1 à ${LONGUEUR_MAX_TEXTE} caractères.`, texte };
    }
    if (erreur instanceof LimiteAtteinteError) {
      return {
        message: `Vous avez déjà ajouté ${LIMITE_ELEMENTS_PERSO} éléments. Supprimez-en un pour en ajouter un autre.`,
        texte,
      };
    }
    throw erreur;
  }
  refresh();
  return { ajoute: true };
}
