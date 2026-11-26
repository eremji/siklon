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
import { estLangue, LANGUE_PAR_DEFAUT, type Langue } from "@/lib/langues";
import { CHECKLIST } from "@/lib/textes/checklist";

export type ResultatCoche = { ok: true } | { ok: false; message: string };

/** État des formulaires de la checklist : un message d'échec, ou rien. */
export type EtatAction = { message?: string; texte?: string; ajoute?: true } | null;

const champ = (donnees: FormData, nom: string) => {
  const valeur = donnees.get(nom);
  return typeof valeur === "string" ? valeur : "";
};

/** Messages dans la langue de la page (valeur venue du navigateur : vérifiée, français par défaut). */
const messages = (langue: unknown) => CHECKLIST[estLangue(langue) ? langue : LANGUE_PAR_DEFAUT].actions;

/** Langue de la page d'où part le formulaire : champ caché « langueInterface » (US-10). */
const messagesDuFormulaire = (donnees: FormData) => messages(champ(donnees, "langueInterface"));

/**
 * Exécute l'écriture pour l'utilisateur connecté ; traduit un élément inconnu en message.
 * `valide` : faux si les arguments venus du navigateur n'ont pas le bon type.
 */
async function pourUtilisateur(
  ecrire: (utilisateurId: string) => Promise<void>,
  textes: ReturnType<typeof messages>,
  valide = true,
): Promise<string | null> {
  const utilisateur = await utilisateurCourant();
  if (!utilisateur) return textes.sessionExpiree;
  if (!valide) return textes.elementInconnu;
  try {
    await ecrire(utilisateur.id);
  } catch (erreur) {
    if (erreur instanceof ElementInconnuError) return textes.elementInconnu;
    throw erreur;
  }
  return null;
}

async function cocher(
  ecrire: (utilisateurId: string) => Promise<void>,
  element: unknown,
  coche: unknown,
  langue: unknown,
): Promise<ResultatCoche> {
  // Arguments venus du navigateur : on vérifie leur type avant d'écrire.
  const message = await pourUtilisateur(ecrire, messages(langue), typeof element === "string" && typeof coche === "boolean");
  return message ? { ok: false, message } : { ok: true };
}

export async function cocherElementChecklist(element: string, coche: boolean, langue?: Langue): Promise<ResultatCoche> {
  return cocher((id) => cocherElement(connexionComptes(), id, element, coche), element, coche, langue);
}

export async function cocherElementPersoChecklist(element: string, coche: boolean, langue?: Langue): Promise<ResultatCoche> {
  return cocher((id) => cocherElementPerso(connexionComptes(), id, element, coche), element, coche, langue);
}

export async function masquerElementChecklist(_etat: EtatAction, donnees: FormData): Promise<EtatAction> {
  const element = champ(donnees, "element");
  const masque = champ(donnees, "masque") === "1";
  const message = await pourUtilisateur(
    (id) => masquerElement(connexionComptes(), id, element, masque),
    messagesDuFormulaire(donnees),
  );
  if (message) return { message };
  refresh();
  return {};
}

export async function supprimerElementChecklist(_etat: EtatAction, donnees: FormData): Promise<EtatAction> {
  const element = champ(donnees, "id");
  const message = await pourUtilisateur(
    (id) => supprimerElementPerso(connexionComptes(), id, element),
    messagesDuFormulaire(donnees),
  );
  if (message) return { message };
  refresh();
  return {};
}

export async function ajouterElementChecklist(_etat: EtatAction, donnees: FormData): Promise<EtatAction> {
  const texte = champ(donnees, "texte");
  const textes = messagesDuFormulaire(donnees);
  const utilisateur = await utilisateurCourant();
  if (!utilisateur) return { message: textes.sessionExpiree, texte };
  try {
    await ajouterElementPerso(connexionComptes(), utilisateur.id, texte);
  } catch (erreur) {
    if (erreur instanceof TexteInvalideError) {
      return { message: textes.texteInvalide(LONGUEUR_MAX_TEXTE), texte };
    }
    if (erreur instanceof LimiteAtteinteError) {
      return { message: textes.limiteAtteinte(LIMITE_ELEMENTS_PERSO), texte };
    }
    throw erreur;
  }
  refresh();
  return { ajoute: true };
}
