// Copie des jetons de DESIGN.md pour ce qui ne lit pas les variables CSS : le manifeste d'application,
// les icônes et les images de démarrage dessinées par next/og. jetons.test.ts vérifie qu'ils suivent
// globals.css.

/** Thème clair : noms et valeurs des jetons de globals.css. */
export const JETONS_CLAIR = {
  bg: "#F2F7F6",
  text: "#10292E",
  accent: "#0E5E6F",
  header: "#0E5E6F",
  "header-text": "#FFFFFF",
} as const;

/** Thème sombre. */
export const JETONS_SOMBRE = {
  bg: "#0B1F24",
  text: "#E6F2F0",
  header: "#12303A",
  /** Turquoise de la spirale sur l'icône (DESIGN.md, « Logo et icône »). */
  accent: "#5EC4C9",
} as const;
