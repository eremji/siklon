// Textes de la proposition d'ajouter Siklon à l'écran d'accueil (US-07c, #110). Les menus d'iOS sont
// nommés comme iOS les affiche dans la langue du site.
import type { Appareil } from "@/lib/ecranAccueil/detection";
import { traductions } from "./traductions";

const nomAppareil = (appareil: Appareil) => (appareil === "ipad" ? "iPad" : "iPhone");

export const ECRAN_ACCUEIL = traductions(
  {
    feuille: {
      titre: (appareil: Appareil) => `Recevez les alertes de votre île sur votre ${nomAppareil(appareil)}`,
      pourquoi: "Ajoutez Siklon à l'écran d'accueil pour recevoir les alertes de votre île, même quand l'app est fermée.",
      // iOS 26 et plus : Partager est dans le menu ≡ (ou « ⋯ ») de Safari, sauf sur iPad.
      partager: (appareil: Appareil): string =>
        appareil === "ipad" ? "Touchez Partager, en haut à droite" : "Touchez ≡ ou « ⋯ », puis Partager",
      ecranAccueil: "Puis « En voir plus » et « Sur l'écran d'accueil »",
      aide: "Voir en images",
      plusTard: "Plus tard",
      fermer: "Fermer",
    },
    bandeau: {
      nom: "Ajouter Siklon à l'écran d'accueil",
      texte: (appareil: Appareil) =>
        `Sur ${nomAppareil(appareil)}, ajoutez Siklon à l'écran d'accueil pour recevoir les alertes de votre île, même quand l'app est fermée.`,
      lien: "Voir comment faire",
    },
  },
  {
    feuille: {
      titre: (appareil: Appareil) => `Get alerts for your island on your ${nomAppareil(appareil)}`,
      pourquoi: "Add Siklon to your Home Screen to get alerts for your island, even when the app is closed.",
      partager: (appareil: Appareil) => (appareil === "ipad" ? "Tap Share, at the top right" : "Tap ≡ or “⋯”, then Share"),
      ecranAccueil: "Then “View More” and “Add to Home Screen”",
      aide: "See in pictures",
      plusTard: "Not now",
      fermer: "Close",
    },
    bandeau: {
      nom: "Add Siklon to your Home Screen",
      texte: (appareil: Appareil) =>
        `On ${nomAppareil(appareil)}, add Siklon to your Home Screen to get alerts for your island, even when the app is closed.`,
      lien: "See how",
    },
  },
);
