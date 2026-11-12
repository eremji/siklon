"use server";
// Server actions du compte (US-05) : les formulaires fonctionnent même sans JavaScript.
// Next.js vérifie l'origine de chaque server action ; Better Auth applique la limitation des
// tentatives et ne reçoit jamais que l'email, le mot de passe et la langue.
import { redirect } from "next/navigation";
import type { EtatFormulaire } from "@/components/compte/Formulaires";
import { appelerAuth } from "@/lib/auth/serveur";
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
