// Copie des jetons de DESIGN.md pour ce qui ne lit pas les variables CSS : le manifeste
// d'application et les icônes dessinées par next/og. jetons.test.ts vérifie qu'ils suivent globals.css.

/** Thème clair : noms et valeurs des jetons de globals.css. */
export const JETONS_CLAIR = {
  bg: "#F2F7F6",
  header: "#0E5E6F",
  "header-text": "#FFFFFF",
} as const;

/** Thème sombre. */
export const JETONS_SOMBRE = {
  bg: "#0B1F24",
  header: "#12303A",
} as const;
