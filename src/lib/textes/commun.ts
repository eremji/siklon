// Textes communs à toutes les pages : navigation, pied de page, mention officielle, métadonnées.
import { traductions } from "./traductions";

export const COMMUN = traductions(
  {
    description: "Suivi des cyclones tropicaux pour les Antilles.",
    mention: "Siklon ne remplace pas les consignes officielles. Suivez les autorités locales.",
    navigation: { nom: "Navigation principale", carte: "Carte", monIle: "Mon île", compte: "Compte" },
    pied: { confidentialite: "Confidentialité" },
  },
  {
    description: "Tropical cyclone tracking for the Caribbean.",
    mention: "Siklon does not replace official instructions. Follow local authorities.",
    navigation: { nom: "Main navigation", carte: "Map", monIle: "My island", compte: "Account" },
    pied: { confidentialite: "Privacy" },
  },
);
