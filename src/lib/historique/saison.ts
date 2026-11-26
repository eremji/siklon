// US-17 : saison à risque d'une île. Chaque cyclone compte une fois, au mois (heure locale de l'île)
// de son plus proche passage à moins de RADIUS_IMPACT_KM, déjà calculé à l'import (US-04).
// Les mois vont de 0 (janvier) à 11 (décembre).
import { ANNEE_DEBUT_SAISON_RISQUE, DEBUT_SAISON, FIN_SAISON, PART_SAISON_RISQUE } from "../constantes";
import type { Langue } from "../langues";
import { HISTORIQUE } from "../textes/historique";

/** Ce que le calcul lit d'un passage : sa saison HURDAT2 et l'heure de son plus proche passage. */
export interface PassageDate {
  annee: number;
  horodatage: Date;
}

/** Suite de mois consécutifs, bornes incluses, et nombre de passages qu'elle regroupe. */
export interface FenetreSaison {
  debut: number;
  fin: number;
  nombre: number;
}

export interface SaisonRisque {
  /** 12 comptes, janvier en premier. */
  parMois: number[];
  total: number;
  /** Première saison comptée. */
  anneeMin: number;
  fenetre: FenetreSaison | null;
  /** Mois au compte le plus haut (plusieurs en cas d'égalité), vide sans passage. */
  plusActifs: number[];
}

const formatsMois = new Map<string, Intl.DateTimeFormat>();

/** Mois (0 à 11) de la date à l'heure locale du fuseau IANA donné. */
export function moisLocal(date: Date, fuseau: string): number {
  let format = formatsMois.get(fuseau);
  if (!format) {
    format = new Intl.DateTimeFormat("en-GB", { timeZone: fuseau, month: "numeric" });
    formatsMois.set(fuseau, format);
  }
  return Number(format.format(date)) - 1;
}

/** Le mois (0 à 11) tombe-t-il dans la saison officielle, de DEBUT_SAISON à FIN_SAISON ? */
export function dansSaisonOfficielle(mois: number): boolean {
  return mois >= DEBUT_SAISON.mois - 1 && mois <= FIN_SAISON.mois - 1;
}

/**
 * Plus courte suite de mois consécutifs (de janvier à décembre, sans boucler) qui regroupe au moins
 * `part` des passages ; à longueur égale, la plus chargée, puis la plus précoce.
 */
export function fenetreSaison(parMois: readonly number[], part = PART_SAISON_RISQUE): FenetreSaison | null {
  const total = parMois.reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  for (let longueur = 1; longueur <= 12; longueur++) {
    let meilleure: FenetreSaison | null = null;
    for (let debut = 0; debut + longueur <= 12; debut++) {
      const nombre = parMois.slice(debut, debut + longueur).reduce((a, b) => a + b, 0);
      if (nombre >= part * total && (meilleure === null || nombre > meilleure.nombre)) {
        meilleure = { debut, fin: debut + longueur - 1, nombre };
      }
    }
    if (meilleure) return meilleure;
  }
  return null; // Inatteignable : les 12 mois regroupent tous les passages.
}

export function calculerSaison(
  passages: readonly PassageDate[],
  fuseau: string,
  anneeMin = ANNEE_DEBUT_SAISON_RISQUE,
): SaisonRisque {
  const parMois = Array<number>(12).fill(0);
  for (const passage of passages) {
    if (passage.annee >= anneeMin) parMois[moisLocal(passage.horodatage, fuseau)]++;
  }
  const total = parMois.reduce((a, b) => a + b, 0);
  const max = Math.max(...parMois);
  const plusActifs = total === 0 ? [] : parMois.flatMap((n, mois) => (n === max ? [mois] : []));
  return { parMois, total, anneeMin, fenetre: fenetreSaison(parMois), plusActifs };
}

/** Phrase qui résume le graphique, entièrement calculée. */
export function phraseSaison(saison: SaisonRisque, langue: Langue): string {
  const t = HISTORIQUE[langue].saison;
  const { fenetre, total } = saison;
  if (fenetre === null) return t.aucun(saison.anneeMin);

  const quand =
    fenetre.debut === fenetre.fin ? t.en(t.mois[fenetre.debut]) : t.entre(t.mois[fenetre.debut], t.mois[fenetre.fin]);
  if (total === 1) return t.seul(quand);

  const sujet =
    fenetre.nombre === total
      ? t.tous
      : total >= 10
        ? t.surDix(Math.round((fenetre.nombre / total) * 10))
        : t.exact(fenetre.nombre, total);
  const phrase = t.ontEuLieu(sujet, quand);
  if (fenetre.debut === fenetre.fin) return phrase;

  const mois = saison.plusActifs.map((m) => t.mois[m]);
  return `${phrase} ${mois.length === 1 ? t.plusActif(mois[0]) : t.plusActifs(t.liste(mois))}`;
}
