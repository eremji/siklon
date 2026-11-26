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
    // Étapes courtes (section Alertes du compte) : le texte entoure l'icône du menu d'iOS.
    etapes: {
      partagerIphone: { avant: "Touchez ≡ ou « ⋯ » à côté de l'adresse, puis Partager", apres: "." },
      partagerIpad: { avant: "Touchez Partager", apres: ", en haut à droite de l'écran." },
      ecranAccueil: { avant: "Touchez « En voir plus », puis « Sur l'écran d'accueil »", apres: "." },
      ajouter: "Touchez « Ajouter ».",
      ouvrir: "Ouvrez Siklon depuis son icône, puis revenez dans Compte pour activer les alertes.",
    },
    // Écran d'aide « Comment faire » (/compte/ecran-accueil).
    aide: {
      titre: "Ajouter Siklon à l'écran d'accueil",
      description: "Comment ajouter Siklon à l'écran d'accueil d'un iPhone ou d'un iPad pour recevoir les alertes.",
      retour: "Retour au compte",
      intro: "Sur iPhone et iPad, c'est la seule façon de recevoir les alertes de votre île quand Siklon est fermé.",
      etapes: "Étapes",
      partager: "Touchez le bouton Partager",
      partagerTexte:
        "Sur iPhone, touchez d'abord ≡ ou « ⋯ » à côté de l'adresse, puis Partager. Sur iPad, Partager est en haut à droite. Sur les versions plus anciennes d'iOS, c'est un carré avec une flèche vers le haut, en bas de l'écran.",
      ecranAccueil: "Touchez « Sur l'écran d'accueil »",
      favoris: "Ajouter aux favoris",
      menuEcranAccueil: "Sur l'écran d'accueil",
      ecranAccueilTexte: "Touchez d'abord « En voir plus » si vous ne le voyez pas. Faites défiler la liste si besoin.",
      ajouter: "Touchez « Ajouter »",
      annuler: "Annuler",
      boutonAjouter: "Ajouter",
      ajouterTexte: "En haut à droite de la fenêtre qui s'ouvre.",
      ouvrir: "Ouvrez Siklon depuis son icône",
      ouvrirTexte: "Puis, dans Compte, touchez « Recevoir les alertes sur cet appareil » et acceptez les notifications.",
      compris: "J'ai compris",
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
    etapes: {
      partagerIphone: { avant: "Tap ≡ or “⋯” next to the address, then Share", apres: "." },
      partagerIpad: { avant: "Tap Share", apres: ", at the top right of the screen." },
      ecranAccueil: { avant: "Tap “View More”, then “Add to Home Screen”", apres: "." },
      ajouter: "Tap “Add”.",
      ouvrir: "Open Siklon from its icon, then come back to Account to turn on alerts.",
    },
    aide: {
      titre: "Add Siklon to the Home Screen",
      description: "How to add Siklon to the Home Screen of an iPhone or iPad to receive alerts.",
      retour: "Back to account",
      intro: "On iPhone and iPad, this is the only way to receive alerts for your island when Siklon is closed.",
      etapes: "Steps",
      partager: "Tap the Share button",
      partagerTexte:
        "On iPhone, first tap ≡ or “⋯” next to the address, then Share. On iPad, Share is at the top right. On older versions of iOS, it is a square with an arrow pointing up, at the bottom of the screen.",
      ecranAccueil: "Tap “Add to Home Screen”",
      favoris: "Add Bookmark",
      menuEcranAccueil: "Add to Home Screen",
      ecranAccueilTexte: "First tap “View More” if you don't see it. Scroll the list if needed.",
      ajouter: "Tap “Add”",
      annuler: "Cancel",
      boutonAjouter: "Add",
      ajouterTexte: "At the top right of the window that opens.",
      ouvrir: "Open Siklon from its icon",
      ouvrirTexte: "Then, in Account, tap “Receive alerts on this device” and allow notifications.",
      compris: "Got it",
    },
  },
);
