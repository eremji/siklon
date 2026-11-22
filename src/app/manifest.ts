// Manifeste d'application (US-07b, #101). Indispensable au web push sur iPhone : iOS (16.4+) ne le
// permet qu'à un site ajouté à l'écran d'accueil et affiché en « standalone ». La portée « / » est
// celle du service worker (public/sw.js), qui couvre donc toute l'application installée.
import type { MetadataRoute } from "next";
import { ICONES } from "@/lib/pwa/icones";
import { JETONS_CLAIR } from "@/lib/pwa/jetons";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Siklon",
    short_name: "Siklon",
    description: "Suivi des cyclones tropicaux pour les Antilles.",
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: JETONS_CLAIR.header,
    background_color: JETONS_CLAIR.bg,
    icons: ICONES.map(({ nom, taille, maskable }) => ({
      src: `/icones/${nom}`,
      sizes: `${taille}x${taille}`,
      type: "image/png",
      purpose: maskable ? "maskable" : "any",
    })),
  };
}
