// Quand proposer d'ajouter Siklon à l'écran d'accueil (US-07c, #110). Jamais à la toute première page
// vue ; ensuite dès la page d'une île, ou sur toute page un autre jour que la première visite. Après une
// fermeture, pas avant 30 jours ; après 3 refus, plus jamais d'elle-même. Le mémo reste sur l'appareil
// (stockage local) : des dates et un compteur, sans compte ni donnée personnelle (US-13).
import { decouperChemin } from "@/lib/langues";

/** Clé du mémo dans le stockage local de l'appareil. */
export const CLE_MEMO = "siklon-ecran-accueil";
/** Délai avant de reproposer après une fermeture. */
export const JOURS_AVANT_RETOUR = 30;
/** Nombre de refus après lequel la proposition ne s'affiche plus d'elle-même. */
export const REFUS_MAX = 3;

const MS_PAR_JOUR = 24 * 3600 * 1000;

export interface Memo {
  /** Jour calendaire (AAAA-MM-JJ, heure de l'appareil) de la première page vue. */
  premiereVisite?: string;
  /** Fermetures par « Plus tard », la croix, un glissement vers le bas ou Échap. */
  refus: number;
  /** Date (ISO) de la dernière fermeture, refus ou ouverture de l'aide en images. */
  derniereFermeture?: string;
}

export const MEMO_VIDE: Memo = { refus: 0 };

const deuxChiffres = (n: number) => String(n).padStart(2, "0");

export function jourLocal(date: Date): string {
  return `${date.getFullYear()}-${deuxChiffres(date.getMonth() + 1)}-${deuxChiffres(date.getDate())}`;
}

/** Page d'une île ou l'une de ses sous-pages (alerte, checklist, historique), quelle que soit la langue. */
export function estPageIle(chemin: string): boolean {
  const { langue, reste } = decouperChemin(chemin);
  return langue !== undefined && /^\/iles\/[^/]+(\/|$)/.test(reste);
}

/**
 * Page d'alerte ou checklist d'une île : elle affiche la vigilance ou les veilles et avertissements, et
 * choisit elle-même entre la feuille et le bandeau selon qu'une alerte est en cours.
 */
export function pageAvecAlertes(chemin: string): boolean {
  const { langue, reste } = decouperChemin(chemin);
  return langue !== undefined && /^\/iles\/[^/]+\/(alerte|checklist)$/.test(reste);
}

export function noterVisite(memo: Memo, maintenant: Date): Memo {
  return memo.premiereVisite ? memo : { ...memo, premiereVisite: jourLocal(maintenant) };
}

export function noterFermeture(memo: Memo, maintenant: Date, { refus }: { refus: boolean }): Memo {
  return { ...memo, refus: memo.refus + (refus ? 1 : 0), derniereFermeture: maintenant.toISOString() };
}

export function doitProposer({ memo, maintenant, pageIle }: { memo: Memo; maintenant: Date; pageIle: boolean }): boolean {
  if (!memo.premiereVisite) return false;
  if (memo.refus >= REFUS_MAX) return false;
  if (memo.derniereFermeture) {
    const ecoule = maintenant.getTime() - new Date(memo.derniereFermeture).getTime();
    if (ecoule < JOURS_AVANT_RETOUR * MS_PAR_JOUR) return false;
  }
  return pageIle || jourLocal(maintenant) !== memo.premiereVisite;
}

export function ecrireMemo(memo: Memo): string {
  return JSON.stringify(memo);
}

export function lireMemo(texte: string | null): Memo {
  if (!texte) return MEMO_VIDE;
  try {
    const brut: unknown = JSON.parse(texte);
    if (typeof brut !== "object" || brut === null) return MEMO_VIDE;
    const { premiereVisite, refus, derniereFermeture } = brut as Record<string, unknown>;
    if (typeof refus !== "number" || !Number.isInteger(refus) || refus < 0) return MEMO_VIDE;
    if (premiereVisite !== undefined && typeof premiereVisite !== "string") return MEMO_VIDE;
    if (derniereFermeture !== undefined && typeof derniereFermeture !== "string") return MEMO_VIDE;
    return {
      refus,
      ...(premiereVisite ? { premiereVisite } : {}),
      ...(derniereFermeture ? { derniereFermeture } : {}),
    };
  } catch {
    return MEMO_VIDE;
  }
}
