// Métadonnées de l'application installée (US-07b, #101), reprises par src/app/layout.tsx.
import type { Metadata, Viewport } from "next";
import { JETONS_CLAIR, JETONS_SOMBRE } from "./jetons";

/** iOS : plein écran depuis l'écran d'accueil, nom affiché sous l'icône, barre d'état par défaut. */
export const APPLE_WEB_APP = {
  capable: true,
  title: "Siklon",
  statusBarStyle: "default",
} as const satisfies Metadata["appleWebApp"];

/** Barre du navigateur (et de l'app installée) : couleur de l'en-tête, en clair et en sombre. */
export const COULEURS_THEME = [
  { media: "(prefers-color-scheme: light)", color: JETONS_CLAIR.header },
  { media: "(prefers-color-scheme: dark)", color: JETONS_SOMBRE.header },
] satisfies Viewport["themeColor"];
