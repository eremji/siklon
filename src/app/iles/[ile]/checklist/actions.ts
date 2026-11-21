"use server";
// Server action de la checklist (US-08) : coche ou décoche un élément pour l'utilisateur connecté.
import { utilisateurCourant } from "@/lib/auth/serveur";
import { cocherElement, ElementInconnuError } from "@/lib/db/checklist";
import { connexionComptes } from "@/lib/db/pool";

export type ResultatCoche = { ok: true } | { ok: false; message: string };

const ELEMENT_INCONNU: ResultatCoche = { ok: false, message: "Cet élément ne fait pas partie de la checklist." };

export async function cocherElementChecklist(element: string, coche: boolean): Promise<ResultatCoche> {
  const utilisateur = await utilisateurCourant();
  if (!utilisateur) return { ok: false, message: "Votre session a expiré. Reconnectez-vous pour enregistrer votre checklist." };
  // Arguments venus du navigateur : on vérifie leur type avant d'écrire.
  if (typeof element !== "string" || typeof coche !== "boolean") return ELEMENT_INCONNU;
  try {
    await cocherElement(connexionComptes(), utilisateur.id, element, coche);
  } catch (erreur) {
    if (erreur instanceof ElementInconnuError) return ELEMENT_INCONNU;
    throw erreur;
  }
  return { ok: true };
}
