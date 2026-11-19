"use server";
// Server actions du compte (US-05) : les formulaires fonctionnent même sans JavaScript.
// Next.js vérifie l'origine de chaque server action ; Better Auth applique la limitation des
// tentatives et ne reçoit jamais que l'email, le mot de passe et la langue.
import { redirect } from "next/navigation";
import type { EtatFormulaire, EtatIles } from "@/components/compte/Formulaires";
import { appelerAuth, utilisateurCourant } from "@/lib/auth/serveur";
import { enregistrerIlesSuivies, IleInconnueError, lireIlesSuivies } from "@/lib/db/ilesSuivies";
import { connexionComptes } from "@/lib/db/pool";
import { LANGUES, type Langue } from "@/lib/auth/options";

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
