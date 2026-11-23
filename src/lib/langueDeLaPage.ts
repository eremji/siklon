// Langue de la page en cours, pour les composants serveur (US-10) : premier segment de l'adresse,
// lu avec next/root-params. La mise en page racine renvoie une 404 pour toute autre valeur.
import { langue } from "next/root-params";
import { estLangue, LANGUE_PAR_DEFAUT, type Langue } from "./langues";

export async function langueDeLaPage(): Promise<Langue> {
  const valeur = await langue();
  return estLangue(valeur) ? valeur : LANGUE_PAR_DEFAUT;
}
