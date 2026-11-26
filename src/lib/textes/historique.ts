// Textes de l'historique des cyclones (US-04) : choix de l'île, historique d'une île, fiche d'un cyclone.
import { traductions } from "./traductions";

export const HISTORIQUE = traductions(
  {
    accueil: {
      titreOnglet: "Historique des cyclones · Siklon",
      description: "Les cyclones passés près des îles des Antilles depuis 1851 (base HURDAT2 du NHC).",
      titre: "Historique des cyclones",
      intro: (km: number) =>
        `Choisissez une île pour voir les cyclones passés à moins de ${km} km de sa ville principale, depuis 1851.`,
    },
    ile: {
      titreOnglet: (ile: string) => `Historique des cyclones : ${ile} · Siklon`,
      inconnue: "Île inconnue · Siklon",
      toutes: "Toutes les îles",
      titre: (ile: string) => `Historique des cyclones : ${ile}`,
      chargement: "Chargement de l'historique…",
      intro: (km: number, ville: string) =>
        `Cyclones passés à moins de ${km} km de ${ville}, du plus récent au plus ancien.`,
      nombre: (n: number) => `${n} ${n > 1 ? "cyclones" : "cyclone"}`,
      indisponible: "L'historique est momentanément indisponible. Réessayez plus tard.",
    },
    liste: {
      aucun: (km: number, ville: string) =>
        `Aucun cyclone n'est passé à moins de ${km} km de ${ville} avec ces filtres.`,
      intensite: "Intensité près de l'île",
      distance: "Distance minimale",
      passage: "Plus proche passage",
    },
    filtres: {
      nom: "Filtrer l'historique",
      intensite: "Intensité minimale",
      categories: [
        ["", "Toutes"],
        ["0", "Tempête et plus"],
        ["1", "Ouragan (catégorie 1 et plus)"],
        ["2", "Catégorie 2 et plus"],
        ["3", "Catégorie 3 et plus"],
        ["4", "Catégorie 4 et plus"],
        ["5", "Catégorie 5"],
      ] as [string, string][],
      de: "De (année)",
      a: "À (année)",
      filtrer: "Filtrer",
      effacer: "Effacer les filtres",
    },
    fiche: {
      titreOnglet: "Fiche d'un cyclone historique · Siklon",
      chargement: "Chargement de la fiche…",
      indisponible: "Cette fiche est momentanément indisponible. Réessayez plus tard.",
      historiqueDe: (ile: string) => `Historique de ${ile}`,
      intensiteMax: "Intensité maximale",
      periode: "Période suivie",
      duAu: (debut: string, fin: string) => `du ${debut} au ${fin}`,
      pres: (ile: string) => `Près de ${ile}`,
      passage: (distance: string, ville: string, date: string, categorie: string) =>
        `${distance} de ${ville} le ${date} (${categorie})`,
      voirPoints: "Voir les points de la trajectoire",
    },
    carte: {
      description: (titre: string, n: number, ile: string | null) =>
        `Carte de la trajectoire de ${titre}, ${n} points${ile ? `, près de ${ile}` : ""}`,
      ouest: "O",
      carre: "Carré : stade d'ouragan",
      rond: "Rond : autre stade",
      cercle: (km: number, ville: string) => `Cercle pointillé : ${km} km autour de ${ville}`,
    },
    tableau: {
      legende: (n: number) => `Points de la trajectoire (${n}), heures en UTC`,
      colonnes: ["Date et heure", "Stade", "Position", "Vent maximal", "Pression"],
      atterrissage: " (atterrissage)",
    },
    saison: {
      titre: "Saison à risque",
      mois: [
        "janvier", "février", "mars", "avril", "mai", "juin",
        "juillet", "août", "septembre", "octobre", "novembre", "décembre",
      ],
      initiales: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
      liste: (elements: string[]) =>
        elements.length < 2 ? elements.join("") : `${elements.slice(0, -1).join(", ")} et ${elements.at(-1)}`,
      tous: "Tous les passages",
      surDix: (n: number) => `${n} passages sur 10`,
      exact: (n: number, total: number) => `${n} passages sur ${total}`,
      en: (mois: string) => `en ${mois}`,
      entre: (debut: string, fin: string) => `entre ${debut} et ${fin}`,
      ontEuLieu: (sujet: string, quand: string) => `${sujet} ont eu lieu ${quand}.`,
      seul: (quand: string) => `Le seul passage a eu lieu ${quand}.`,
      plusActif: (mois: string) => `Le mois le plus actif est ${mois}.`,
      plusActifs: (mois: string) => `Les mois les plus actifs sont ${mois}.`,
      aucun: (annee: number) => `Aucun cyclone n'est passé près de l'île depuis ${annee}.`,
      graphique: (km: number, ville: string, valeurs: string) =>
        `Passages à moins de ${km} km de ${ville}, par mois : ${valeurs}.`,
      valeur: (mois: string, n: number) => `${mois} ${n}`,
      jour: (jour: number, mois: string) => `${jour === 1 ? "1er" : jour} ${mois}`,
      saisonOfficielle: (debut: string, fin: string) => `Saison officielle : ${debut} au ${fin}`,
      afficherTableau: "Afficher le tableau des 12 mois",
      legendeTableau: (km: number, ville: string, periode: string) =>
        `Passages à moins de ${km} km de ${ville}, par mois, ${periode}`,
      colonnes: ["Mois", "Passages", "Saison officielle"],
      oui: "oui",
      non: "non",
      periode: (debut: number, fin: number | null) => (fin === null ? `depuis ${debut}` : `de ${debut} à ${fin}`),
      mention: (n: number, km: number, ville: string, periode: string) =>
        `${n} ${n > 1 ? "cyclones passés" : "cyclone passé"} à moins de ${km} km de ${ville}, ${periode}, ` +
        `comptés au mois de leur plus proche passage (heure locale).`,
      source: (date: string | null) => `Source : HURDAT2, NHC.${date ? ` Import du ${date}.` : ""}`,
    },
    source: {
      version: (date: string) => `Source : base HURDAT2 du National Hurricane Center (NHC), version du ${date}.`,
      sansVersion: "Source : base HURDAT2 du National Hurricane Center (NHC).",
      lien: "Données HURDAT2 sur le site du NHC",
    },
  },
  {
    accueil: {
      titreOnglet: "Hurricane history · Siklon",
      description: "Past hurricanes and tropical storms near the Caribbean islands since 1851 (NHC HURDAT2 database).",
      titre: "Hurricane history",
      intro: (km: number) => `Choose an island to see the storms that passed within ${km} km of its main city since 1851.`,
    },
    ile: {
      titreOnglet: (ile: string) => `Hurricane history: ${ile} · Siklon`,
      inconnue: "Island not found · Siklon",
      toutes: "All islands",
      titre: (ile: string) => `Hurricane history: ${ile}`,
      chargement: "Loading history…",
      intro: (km: number, ville: string) => `Storms that passed within ${km} km of ${ville}, most recent first.`,
      nombre: (n: number) => `${n} ${n === 1 ? "storm" : "storms"}`,
      indisponible: "History is temporarily unavailable. Please try again later.",
    },
    liste: {
      aucun: (km: number, ville: string) => `No storm passed within ${km} km of ${ville} with these filters.`,
      intensite: "Intensity near the island",
      distance: "Closest distance",
      passage: "Closest approach",
    },
    filtres: {
      nom: "Filter history",
      intensite: "Minimum intensity",
      categories: [
        ["", "All"],
        ["0", "Tropical storm and above"],
        ["1", "Hurricane (category 1 and above)"],
        ["2", "Category 2 and above"],
        ["3", "Category 3 and above"],
        ["4", "Category 4 and above"],
        ["5", "Category 5"],
      ] as [string, string][],
      de: "From (year)",
      a: "To (year)",
      filtrer: "Filter",
      effacer: "Clear filters",
    },
    fiche: {
      titreOnglet: "Past storm · Siklon",
      chargement: "Loading storm details…",
      indisponible: "This page is temporarily unavailable. Please try again later.",
      historiqueDe: (ile: string) => `${ile} history`,
      intensiteMax: "Peak intensity",
      periode: "Tracked",
      duAu: (debut: string, fin: string) => `from ${debut} to ${fin}`,
      pres: (ile: string) => `Near ${ile}`,
      passage: (distance: string, ville: string, date: string, categorie: string) =>
        `${distance} from ${ville} on ${date} (${categorie})`,
      voirPoints: "Show track points",
    },
    carte: {
      description: (titre: string, n: number, ile: string | null) =>
        `Map of the track of ${titre}, ${n} points${ile ? `, near ${ile}` : ""}`,
      ouest: "W",
      carre: "Square: hurricane stage",
      rond: "Circle: other stage",
      cercle: (km: number, ville: string) => `Dashed circle: ${km} km around ${ville}`,
    },
    tableau: {
      legende: (n: number) => `Track points (${n}), times in UTC`,
      colonnes: ["Date and time", "Stage", "Position", "Maximum wind", "Pressure"],
      atterrissage: " (landfall)",
    },
    saison: {
      titre: "Risk season",
      mois: [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ],
      initiales: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
      liste: (elements: string[]) =>
        elements.length < 2 ? elements.join("") : `${elements.slice(0, -1).join(", ")} and ${elements.at(-1)}`,
      tous: "All passages",
      surDix: (n: number) => `${n} in 10 passages`,
      exact: (n: number, total: number) => `${n} of ${total} passages`,
      en: (mois: string) => `in ${mois}`,
      entre: (debut: string, fin: string) => `between ${debut} and ${fin}`,
      ontEuLieu: (sujet: string, quand: string) => `${sujet} took place ${quand}.`,
      seul: (quand: string) => `The only passage took place ${quand}.`,
      plusActif: (mois: string) => `The most active month is ${mois}.`,
      plusActifs: (mois: string) => `The most active months are ${mois}.`,
      aucun: (annee: number) => `No storm has passed near the island since ${annee}.`,
      graphique: (km: number, ville: string, valeurs: string) =>
        `Passages within ${km} km of ${ville}, by month: ${valeurs}.`,
      valeur: (mois: string, n: number) => `${mois} ${n}`,
      jour: (jour: number, mois: string) => `${jour} ${mois}`,
      saisonOfficielle: (debut: string, fin: string) => `Official season: ${debut} to ${fin}`,
      afficherTableau: "Show the 12-month table",
      legendeTableau: (km: number, ville: string, periode: string) =>
        `Passages within ${km} km of ${ville}, by month, ${periode}`,
      colonnes: ["Month", "Passages", "Official season"],
      oui: "yes",
      non: "no",
      periode: (debut: number, fin: number | null) => (fin === null ? `since ${debut}` : `from ${debut} to ${fin}`),
      mention: (n: number, km: number, ville: string, periode: string) =>
        `${n} ${n === 1 ? "storm" : "storms"} passed within ${km} km of ${ville}, ${periode}, ` +
        `counted in the month of their closest approach (local time).`,
      source: (date: string | null) => `Source: HURDAT2, NHC.${date ? ` Imported on ${date}.` : ""}`,
    },
    source: {
      version: (date: string) => `Source: National Hurricane Center (NHC) HURDAT2 database, version of ${date}.`,
      sansVersion: "Source: National Hurricane Center (NHC) HURDAT2 database.",
      lien: "HURDAT2 data on the NHC website",
    },
  },
);
