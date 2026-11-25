// Métadonnées de l'application installée (US-07b, #101), reprises par src/app/[langue]/layout.tsx.
import type { Metadata, Viewport } from "next";
import { IMAGES_DEMARRAGE_APPLE } from "./demarrage";
import { JETONS_CLAIR, JETONS_SOMBRE } from "./jetons";

/**
 * iOS : plein écran depuis l'écran d'accueil, nom affiché sous l'icône, barre d'état opaque (le contenu
 * ne passe pas dessous) et écran de démarrage à la taille de chaque iPhone et iPad (US-07c).
 */
export const APPLE_WEB_APP = {
  capable: true,
  title: "Siklon",
  statusBarStyle: "default",
  startupImage: IMAGES_DEMARRAGE_APPLE,
} as const satisfies Metadata["appleWebApp"];

/**
 * Barre d'état de l'app installée (et barre du navigateur) : fond --bg du thème en cours (US-07c,
 * #110), pour qu'elle se fonde dans la page ; iOS y écrit en foncé ou en clair selon ce fond.
 */
export const COULEURS_THEME = [
  { media: "(prefers-color-scheme: light)", color: JETONS_CLAIR.bg },
  { media: "(prefers-color-scheme: dark)", color: JETONS_SOMBRE.bg },
] satisfies Viewport["themeColor"];
