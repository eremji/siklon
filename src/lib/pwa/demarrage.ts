// Images de démarrage de l'app installée sur iPhone et iPad (US-07c, #110). iOS ne dessine pas d'écran
// de démarrage à partir du manifeste : sans image à la taille exacte de l'écran, il affiche du blanc,
// même en thème sombre. Une image par écran (en portrait) et par thème, dessinée au build par next/og
// (src/app/demarrage/[nom]/route.tsx) : aucun fichier image dans le dépôt.

export interface Ecran {
  /** Taille de l'écran en points CSS, en portrait. */
  largeur: number;
  hauteur: number;
  /** Densité de pixels (window.devicePixelRatio). */
  ratio: 2 | 3;
}

/** Tailles d'écran des iPhone et iPad qui reçoivent le web push (iOS 16.4+), sans doublon. */
export const ECRANS: readonly Ecran[] = [
  // iPhone
  { largeur: 320, hauteur: 568, ratio: 2 }, // SE (1re génération)
  { largeur: 375, hauteur: 667, ratio: 2 }, // SE (2e et 3e), 8
  { largeur: 414, hauteur: 736, ratio: 3 }, // 8 Plus
  { largeur: 375, hauteur: 812, ratio: 3 }, // X, XS, 11 Pro, 12 mini, 13 mini
  { largeur: 414, hauteur: 896, ratio: 2 }, // XR, 11
  { largeur: 414, hauteur: 896, ratio: 3 }, // XS Max, 11 Pro Max
  { largeur: 390, hauteur: 844, ratio: 3 }, // 12, 13, 14, 16e
  { largeur: 428, hauteur: 926, ratio: 3 }, // 12 Pro Max, 13 Pro Max, 14 Plus
  { largeur: 393, hauteur: 852, ratio: 3 }, // 14 Pro, 15, 15 Pro, 16
  { largeur: 430, hauteur: 932, ratio: 3 }, // 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus
  { largeur: 402, hauteur: 874, ratio: 3 }, // 16 Pro, 17, 17 Pro
  { largeur: 420, hauteur: 912, ratio: 3 }, // Air
  { largeur: 440, hauteur: 956, ratio: 3 }, // 16 Pro Max, 17 Pro Max
  // iPad
  { largeur: 744, hauteur: 1133, ratio: 2 }, // mini (6e génération et suivantes)
  { largeur: 768, hauteur: 1024, ratio: 2 }, // 9,7 pouces, mini (5e)
  { largeur: 810, hauteur: 1080, ratio: 2 }, // 10,2 pouces
  { largeur: 820, hauteur: 1180, ratio: 2 }, // Air (4e et suivantes), 10e génération
  { largeur: 834, hauteur: 1112, ratio: 2 }, // Air (3e), Pro 10,5 pouces
  { largeur: 834, hauteur: 1194, ratio: 2 }, // Pro 11 pouces
  { largeur: 834, hauteur: 1210, ratio: 2 }, // Pro 11 pouces (M4)
  { largeur: 1024, hauteur: 1366, ratio: 2 }, // Pro 12,9 pouces, Air 13 pouces
  { largeur: 1032, hauteur: 1376, ratio: 2 }, // Pro 13 pouces (M4)
];

export type Theme = "clair" | "sombre";

export interface ImageDemarrage {
  /** Nom du fichier sous /demarrage/. */
  nom: string;
  ecran: Ecran;
  theme: Theme;
  largeurPx: number;
  hauteurPx: number;
}

export const IMAGES_DEMARRAGE: readonly ImageDemarrage[] = ECRANS.flatMap((ecran) =>
  (["clair", "sombre"] as const).map((theme) => ({
    nom: `${ecran.largeur}x${ecran.hauteur}@${ecran.ratio}x-${theme}.png`,
    ecran,
    theme,
    largeurPx: ecran.largeur * ecran.ratio,
    hauteurPx: ecran.hauteur * ecran.ratio,
  })),
);

export function trouverImageDemarrage(nom: string): ImageDemarrage | undefined {
  return IMAGES_DEMARRAGE.find((image) => image.nom === nom);
}

function media({ ecran: { largeur, hauteur, ratio }, theme }: ImageDemarrage): string {
  return [
    `(device-width: ${largeur}px)`,
    `(device-height: ${hauteur}px)`,
    `(-webkit-device-pixel-ratio: ${ratio})`,
    "(orientation: portrait)",
    `(prefers-color-scheme: ${theme === "clair" ? "light" : "dark"})`,
  ].join(" and ");
}

/** Pour les métadonnées : un <link rel="apple-touch-startup-image"> par image. */
export const IMAGES_DEMARRAGE_APPLE = IMAGES_DEMARRAGE.map((image) => ({
  url: `/demarrage/${image.nom}`,
  media: media(image),
}));
