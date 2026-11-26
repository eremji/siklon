// Copie des jetons de DESIGN.md pour ce qui ne lit pas les variables CSS : le manifeste
// d'application, les icônes et l'image d'aperçu du partage (US-21) dessinées par next/og.
// jetons.test.ts vérifie qu'ils suivent globals.css.

/** Thème clair : noms et valeurs des jetons de globals.css. */
export const JETONS_CLAIR = {
  bg: "#F2F7F6",
  soft: "#E3F0EE",
  text: "#10292E",
  "text-2": "#3E5A60",
  header: "#0E5E6F",
  "header-text": "#FFFFFF",
  accent: "#0E5E6F",
  "vig-jaune": "#FACC15",
  "vig-orange": "#EA7A00",
  "vig-rouge": "#B91C1C",
  "vig-violet": "#6B21A8",
  "vig-gris": "#4B5563",
  "nhc-hwr": "#9D174D",
  "nhc-twr": "#1D4ED8",
  "nhc-hwa": "#F9A8D4",
  "nhc-twa": "#93C5FD",
  "on-vig-clair": "#10292E",
  "on-vig-fonce": "#FFFFFF",
} as const;

/** Thème sombre. */
export const JETONS_SOMBRE = {
  bg: "#0B1F24",
  header: "#12303A",
  /** Turquoise de la spirale sur l'icône (DESIGN.md, « Logo et icône »). */
  accent: "#5EC4C9",
} as const;
