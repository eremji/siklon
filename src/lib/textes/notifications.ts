// Textes des alertes envoyées par web push et par e-mail (US-07), dans la langue du compte (US-10).
// Libellés officiels comme sur la page Alerte : en anglais, la vigilance garde son terme d'origine
// français ; le NHC, son terme seul.
import { traductions } from "./traductions";

export const NOTIFICATIONS = traductions(
  {
    rayon: {
      titre: (ile: string, systeme: string) => `${ile} : ${systeme} menace l'île`,
      rayon: (km: number) => `Ce système est prévu à moins de ${km} km de votre île.`,
      conseil:
        "Pour un cyclone de taille moyenne, cette alerte arrive avant que les vents de tempête n'atteignent l'île : c'est le moment de se préparer.",
      passage: (heure: string, distance: string) => `Plus proche passage estimé : ${heure}, à ${distance}.`,
      avis: (numero: string, heure: string) => `Estimation d'après l'avis NHC n° ${numero} du ${heure}.`,
    },
    vigilance: {
      // `origine` : terme français de Météo-France, cité seulement en anglais.
      titre: (ile: string, _origine: string, libelle: string) => `${ile} : ${libelle}`,
      corps: (consigne: string, _origine: string, precedent: string, libelle: string, heure: string) =>
        `${consigne}. Météo-France passe de la ${precedent} à la ${libelle} (mise à jour du ${heure}).`,
    },
    nhc: {
      titre: (ile: string, libelle: string, origine: string) => `${ile} : ${libelle} (${origine})`,
      corps: (libelle: string, origine: string, avertissement: boolean, heure: string) =>
        `Le NHC a émis pour l'île ${avertissement ? "un" : "une"} ${libelle} (${origine}) : ` +
        `${avertissement ? "conditions attendues" : "conditions possibles"}. Avis du ${heure}.`,
      finTitre: (ile: string) => `${ile} : fin des veilles et avertissements`,
      finCorps: (heure: string) => `Le NHC n'a plus de veille ni d'avertissement en cours pour l'île (lu le ${heure}).`,
    },
    push: { source: (nom: string) => `Source : ${nom}.` },
    email: {
      ligne: (libelle: string, valeur: string) => `${libelle} : ${valeur}`,
      source: "Source",
      fiche: "Voir la fiche",
      compte: "Gérer vos alertes",
    },
  },
  {
    rayon: {
      titre: (ile: string, systeme: string) => `${ile}: ${systeme} threatens the island`,
      rayon: (km: number) => `This system is forecast to pass within ${km} km of your island.`,
      conseil:
        "For an average-sized cyclone, this alert comes before tropical-storm-force winds reach the island: now is the time to get prepared.",
      passage: (heure: string, distance: string) => `Estimated closest approach: ${heure}, ${distance} away.`,
      avis: (numero: string, heure: string) => `Estimate based on NHC advisory ${numero} issued ${heure}.`,
    },
    vigilance: {
      titre: (ile: string, origine: string, libelle: string) => `${ile}: ${libelle} (${origine})`,
      corps: (consigne: string, origine: string, precedent: string, libelle: string, heure: string) =>
        `${consigne} (${origine}). Météo-France has moved from ${precedent} to ${libelle} (updated ${heure}).`,
    },
    nhc: {
      titre: (ile: string, _libelle: string, origine: string) => `${ile}: ${origine}`,
      corps: (_libelle: string, origine: string, avertissement: boolean, heure: string) =>
        `The NHC has issued a ${origine} for the island: ` +
        `${avertissement ? "conditions expected" : "conditions possible"}. Advisory issued ${heure}.`,
      finTitre: (ile: string) => `${ile}: watches and warnings discontinued`,
      finCorps: (heure: string) => `The NHC no longer has any watch or warning in effect for the island (read ${heure}).`,
    },
    push: { source: (nom: string) => `Source: ${nom}.` },
    email: {
      ligne: (libelle: string, valeur: string) => `${libelle}: ${valeur}`,
      source: "Source",
      fiche: "View details",
      compte: "Manage your alerts",
    },
  },
);
