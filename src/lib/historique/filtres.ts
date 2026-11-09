// Filtres de la liste historique, lus depuis l'URL (donnée non fiable) : toute valeur
// invalide est ignorée plutôt que transmise à la base.
import type { Categorie } from "../hurdat2/passages";

export interface Filtres {
  categorieMin?: Categorie;
  anneeMin?: number;
  anneeMax?: number;
}

export const ANNEE_MIN_HURDAT2 = 1851;
export const ANNEE_MAX = 2100;

type Parametres = Record<string, string | string[] | undefined>;

const valeurUnique = (valeur: string | string[] | undefined) => (typeof valeur === "string" ? valeur : undefined);

function lireAnnee(valeur: string | undefined): number | undefined {
  if (valeur === undefined || !/^\d{4}$/.test(valeur)) return undefined;
  const annee = Number(valeur);
  return annee >= ANNEE_MIN_HURDAT2 && annee <= ANNEE_MAX ? annee : undefined;
}

export function lireFiltres(parametres: Parametres): Filtres {
  const filtres: Filtres = {};
  const categorie = valeurUnique(parametres.categorie);
  if (categorie !== undefined && /^-?\d$/.test(categorie) && +categorie >= -1 && +categorie <= 5) {
    filtres.categorieMin = +categorie as Categorie;
  }
  const anneeMin = lireAnnee(valeurUnique(parametres.de));
  if (anneeMin !== undefined) filtres.anneeMin = anneeMin;
  const anneeMax = lireAnnee(valeurUnique(parametres.a));
  if (anneeMax !== undefined) filtres.anneeMax = anneeMax;
  return filtres;
}
