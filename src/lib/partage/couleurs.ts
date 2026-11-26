// Couleurs de l'image d'aperçu du partage (US-21), en thème clair : next/og ne lit pas les variables
// CSS. Les couleurs de vigilance et des watches/warnings NHC suivent DESIGN.md ; aucune pour le vert,
// qui n'est pas une alerte.
import type { CodeAlerte } from "@/lib/nhc/watches";
import { JETONS_CLAIR as J } from "@/lib/pwa/jetons";
import type { Niveau } from "@/lib/vigilance/niveaux";

export interface CouleursAlerte {
  fond: string;
  texte: string;
}

export const COULEURS_APERCU = {
  fond: J.bg,
  texte: J.text,
  secondaire: J["text-2"],
  /** Pastille d'un niveau sans alerte : neutre, jamais une couleur de vigilance. */
  neutre: J.soft,
  /** Couleur des bras « orange » d'origine du logo et du « o » (DESIGN.md, « Logo et icône »). */
  accent: J.accent,
} as const;

export const COULEURS_VIGILANCE: Record<Niveau, CouleursAlerte | null> = {
  vert: null,
  jaune: { fond: J["vig-jaune"], texte: J["on-vig-clair"] },
  orange: { fond: J["vig-orange"], texte: J["on-vig-clair"] },
  rouge: { fond: J["vig-rouge"], texte: J["on-vig-fonce"] },
  violet: { fond: J["vig-violet"], texte: J["on-vig-fonce"] },
  gris: { fond: J["vig-gris"], texte: J["on-vig-fonce"] },
};

export const COULEURS_NHC: Record<CodeAlerte, CouleursAlerte> = {
  HWR: { fond: J["nhc-hwr"], texte: J["on-vig-fonce"] },
  TWR: { fond: J["nhc-twr"], texte: J["on-vig-fonce"] },
  HWA: { fond: J["nhc-hwa"], texte: J["on-vig-clair"] },
  TWA: { fond: J["nhc-twa"], texte: J["on-vig-clair"] },
};
