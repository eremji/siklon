"use server";
// Server actions du compte (US-05) : les formulaires fonctionnent même sans JavaScript.
// Next.js vérifie l'origine de chaque server action ; Better Auth applique la limitation des
// tentatives et ne reçoit jamais que l'email, le mot de passe et la langue.
import { redirect } from "next/navigation";
import type { ResultatAbonnement } from "@/components/compte/AbonnementAppareil";
import type { EtatFormulaire, EtatIles } from "@/components/compte/Formulaires";
import { appelerAuth, confirmerEmail, utilisateurCourant } from "@/lib/auth/serveur";
import { enregistrerAbonnement, supprimerAbonnement } from "@/lib/db/abonnementsPush";
import { enregistrerIlesSuivies, IleInconnueError, lireIlesSuivies } from "@/lib/db/ilesSuivies";
import { connexionComptes } from "@/lib/db/pool";
import { LANGUES, type Langue } from "@/lib/auth/options";
import { lireAbonnement } from "@/lib/notifications/abonnement";

const champ = (donnees: FormData, nom: string) => {
  const valeur = donnees.get(nom);
  return typeof valeur === "string" ? valeur : "";
};

const estLangue = (valeur: string): valeur is Langue => (LANGUES as readonly string[]).includes(valeur);

export async function inscrire(_etat: EtatFormulaire, donnees: FormData): Promise<EtatFormulaire> {
  const email = champ(donnees, "email").trim();
  const langue = champ(donnees, "langue");
  if (!estLangue(langue)) return { message: "Choisissez le français ou l'anglais.", email };

  const resultat = await appelerAuth("/sign-up/email", {
    email,
    password: champ(donnees, "motDePasse"),
    // Données minimales : Siklon ne demande pas le nom, que Better Auth exige.
    name: "",
    langue,
  });
  if (!resultat.ok) return { message: resultat.message, email };
  redirect("/compte");
}

export async function connecter(_etat: EtatFormulaire, donnees: FormData): Promise<EtatFormulaire> {
  const email = champ(donnees, "email").trim();
  const resultat = await appelerAuth("/sign-in/email", { email, password: champ(donnees, "motDePasse") });
  if (!resultat.ok) return { message: resultat.message, email };
  redirect("/compte");
}

export async function deconnecter(): Promise<void> {
  await appelerAuth("/sign-out", {});
  redirect("/compte");
}

/** Supprime le compte et toutes ses données, sur confirmation du mot de passe (RGPD). */
export async function supprimerCompte(_etat: EtatFormulaire, donnees: FormData): Promise<EtatFormulaire> {
  const resultat = await appelerAuth("/delete-user", { password: champ(donnees, "motDePasse") });
  if (!resultat.ok) return { message: resultat.message };
  redirect("/compte/supprime");
}

/** Remplace les îles suivies par celles cochées (US-05) : décocher une île la retire. */
export async function enregistrerIles(etat: EtatIles, donnees: FormData): Promise<EtatIles> {
  const utilisateur = await utilisateurCourant();
  if (!utilisateur) return { message: "Votre session a expiré. Reconnectez-vous pour enregistrer vos îles." };
  const iles = donnees.getAll("ile").filter((valeur) => typeof valeur === "string");
  try {
    await enregistrerIlesSuivies(connexionComptes(), utilisateur.id, iles);
  } catch (erreur) {
    if (erreur instanceof IleInconnueError) return { message: "Cette île ne fait pas partie de la liste.", iles: etat.iles };
    throw erreur;
  }
  return { confirmation: "Vos îles sont enregistrées.", iles: await lireIlesSuivies(connexionComptes(), utilisateur.id) };
}

const LIEN_INVALIDE = "Ce lien n'est pas valable ou a déjà servi. Demandez-en un nouveau.";

/** Confirme l'adresse : bouton de la page ouverte depuis le lien reçu par email. */
export async function confirmerAdresse(_etat: EtatFormulaire, donnees: FormData): Promise<EtatFormulaire> {
  const jeton = champ(donnees, "jeton");
  if (!jeton) return { message: LIEN_INVALIDE };
  const resultat = await confirmerEmail(jeton);
  if (!resultat.ok) return { message: resultat.message };
  return { confirmation: "Votre adresse est confirmée." };
}

/** Renvoie le lien de confirmation à l'utilisateur connecté (le premier a pu expirer ou se perdre). */
export async function renvoyerConfirmation(): Promise<EtatFormulaire> {
  const utilisateur = await utilisateurCourant();
  if (!utilisateur) return { message: "Votre session a expiré. Reconnectez-vous pour recevoir un nouveau lien." };
  const resultat = await appelerAuth("/send-verification-email", { email: utilisateur.email });
  if (!resultat.ok) return { message: resultat.message };
  return { confirmation: `Un nouveau lien vient d'être envoyé à ${utilisateur.email}.` };
}

/** Demande un lien de réinitialisation. Même réponse avec ou sans compte : rien ne trahit une adresse. */
export async function demanderReinitialisation(_etat: EtatFormulaire, donnees: FormData): Promise<EtatFormulaire> {
  const email = champ(donnees, "email").trim();
  const resultat = await appelerAuth("/request-password-reset", { email });
  if (!resultat.ok) return { message: resultat.message, email };
  return {
    confirmation:
      "Si un compte existe avec cette adresse, un lien pour choisir un nouveau mot de passe vient de lui être envoyé. Il reste valable 1 heure.",
  };
}

/** Choisit un nouveau mot de passe avec le jeton du lien ; les sessions ouvertes sont fermées. */
export async function reinitialiserMotDePasse(_etat: EtatFormulaire, donnees: FormData): Promise<EtatFormulaire> {
  const resultat = await appelerAuth("/reset-password", {
    token: champ(donnees, "jeton"),
    newPassword: champ(donnees, "motDePasse"),
  });
  if (!resultat.ok) return { message: resultat.message };
  return { confirmation: "Votre mot de passe est changé. Connectez-vous avec le nouveau." };
}

/**
 * Abonne l'appareil aux alertes (US-07) : reçoit l'abonnement web push du navigateur
 * (PushSubscription.toJSON()), vérifié avant l'enregistrement.
 */
export async function abonnerAppareil(abonnement: unknown): Promise<ResultatAbonnement> {
  const utilisateur = await utilisateurCourant();
  if (!utilisateur) return { ok: false, message: "Votre session a expiré. Reconnectez-vous pour recevoir les alertes." };
  if (!utilisateur.emailVerifie) {
    return { ok: false, message: "Confirmez d'abord votre adresse email pour recevoir les alertes." };
  }
  const valide = lireAbonnement(abonnement);
  if (!valide) return { ok: false, message: "Cet appareil n'a pas pu être abonné. Réessayez plus tard." };
  await enregistrerAbonnement(connexionComptes(), utilisateur.id, valide);
  return { ok: true };
}

/** Désabonne l'appareil : seulement s'il appartient à l'utilisateur connecté. */
export async function desabonnerAppareil(endpoint: unknown): Promise<ResultatAbonnement> {
  const utilisateur = await utilisateurCourant();
  if (!utilisateur) return { ok: false, message: "Votre session a expiré. Reconnectez-vous pour gérer vos alertes." };
  if (typeof endpoint === "string") await supprimerAbonnement(connexionComptes(), utilisateur.id, endpoint);
  return { ok: true };
}
