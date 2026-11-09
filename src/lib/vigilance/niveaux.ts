// Niveaux de vigilance Météo-France aux Antilles : libellés et consignes de DESIGN.md.
export const NIVEAUX = ["vert", "jaune", "orange", "rouge", "violet", "gris"] as const;

export type Niveau = (typeof NIVEAUX)[number];

export interface InfoNiveau {
  libelle: string;
  consigne: string;
  /** Faux uniquement pour le vert : aucune alerte en cours. */
  alerte: boolean;
}

const INFOS: Record<Niveau, InfoNiveau> = {
  vert: { libelle: "Vigilance verte", consigne: "Pas de vigilance", alerte: false },
  jaune: { libelle: "Vigilance jaune", consigne: "Soyez attentifs", alerte: true },
  orange: { libelle: "Vigilance orange", consigne: "Préparez-vous", alerte: true },
  rouge: { libelle: "Vigilance rouge", consigne: "Protégez-vous", alerte: true },
  violet: { libelle: "Vigilance violette", consigne: "Confinez-vous", alerte: true },
  gris: { libelle: "Vigilance grise", consigne: "Restez prudents", alerte: true },
};

export function estNiveau(valeur: unknown): valeur is Niveau {
  return typeof valeur === "string" && (NIVEAUX as readonly string[]).includes(valeur);
}

/**
 * Niveau correspondant au `max_color_id` d'un bulletin CDPV85 : 1 à 6 dans l'ordre de NIVEAUX.
 * 1 et 2 sont confirmés par un échantillon réel ; 3 à 6 suivent l'ordre du dispositif Antilles.
 */
export function niveauDepuisCode(code: unknown): Niveau | undefined {
  return Number.isInteger(code) ? NIVEAUX[(code as number) - 1] : undefined;
}

export function infoNiveau(niveau: Niveau): InfoNiveau {
  return INFOS[niveau];
}
