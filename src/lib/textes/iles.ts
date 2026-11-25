// Textes de la liste des îles, de la page d'une île et de l'encadré de menace (US-03).
import { traductions } from "./traductions";

export const ILES_TEXTES = traductions(
  {
    liste: {
      titreOnglet: "Mon île · Siklon",
      description:
        "Choisissez une île des Antilles pour savoir dans combien de temps un système actif pourrait l'atteindre.",
      titre: "Mon île",
      intro: (km: number) =>
        `Choisissez une île pour savoir si un système actif est prévu à moins de ${km} km de sa ville principale, et dans combien de temps.`,
    },
    ile: {
      titreOnglet: (ile: string) => `${ile} : menaces en cours · Siklon`,
      introuvable: "Île introuvable · Siklon",
      toutes: "Toutes les îles",
      chargement: "Chargement de l'île…",
      autresInfos: (ile: string) => `Autres informations sur ${ile}`,
      alerte: "Alerte en cours",
      checklist: "Checklist de préparation",
      historique: "Historique des cyclones",
      menaces: "Systèmes qui menacent l'île",
      chargementPrevisions: "Chargement des prévisions du NHC…",
    },
    menace: {
      rayon: (km: number, ville: string, jours: number) =>
        `Systèmes dont la trajectoire prévue passe à moins de ${km} km de ${ville} dans les ${jours} prochains jours.`,
      liste: (ile: string) => `Systèmes qui menacent ${ile}`,
      passage: (heure: string, distance: string, ville: string) =>
        `Plus proche passage estimé : ${heure}, à ${distance} de ${ville}.`,
      estimation: (numero: string, heure: string) =>
        `Estimation Siklon calculée à partir des positions prévues de l'avis NHC n° ${numero} du ${heure} (heure locale).`,
      aucune: (ile: string) => `Aucun système ne menace ${ile} pour le moment.`,
      aucuneDisponible: (ile: string) => `Aucun système dont la prévision est disponible ne menace ${ile}.`,
      sansPrevision: (noms: string, n: number) =>
        n === 1
          ? `Prévision indisponible pour ${noms} : sa menace ne peut pas être évaluée.`
          : `Prévisions indisponibles pour ${noms} : leur menace ne peut pas être évaluée.`,
      illisibles: (n: number) =>
        n === 1
          ? "1 système n'a pas pu être lu : sa menace ne peut pas être évaluée."
          : `${n} systèmes n'ont pas pu être lus : leur menace ne peut pas être évaluée.`,
      consultez: "Consultez",
      indisponible: "Les données du NHC sont momentanément indisponibles : la menace ne peut pas être évaluée.",
      source: "Source : positions prévues du NHC (",
      sourceFin: "). Le délai et la distance sont des estimations, pas des prévisions officielles.",
    },
  },
  {
    liste: {
      titreOnglet: "My island · Siklon",
      description: "Choose a Caribbean island to find out how soon an active system could reach it.",
      titre: "My island",
      intro: (km: number) =>
        `Choose an island to find out whether an active system is forecast to pass within ${km} km of its main city, and how soon.`,
    },
    ile: {
      titreOnglet: (ile: string) => `${ile}: current threats · Siklon`,
      introuvable: "Island not found · Siklon",
      toutes: "All islands",
      chargement: "Loading island…",
      autresInfos: (ile: string) => `More about ${ile}`,
      alerte: "Current alert",
      checklist: "Preparedness checklist",
      historique: "Hurricane history",
      menaces: "Systems threatening the island",
      chargementPrevisions: "Loading NHC forecasts…",
    },
    menace: {
      rayon: (km: number, ville: string, jours: number) =>
        `Systems whose forecast track passes within ${km} km of ${ville} in the next ${jours} days.`,
      liste: (ile: string) => `Systems threatening ${ile}`,
      passage: (heure: string, distance: string, ville: string) =>
        `Closest estimated approach: ${heure}, ${distance} from ${ville}.`,
      estimation: (numero: string, heure: string) =>
        `Siklon estimate based on the forecast positions in NHC advisory ${numero} issued ${heure} (local time).`,
      aucune: (ile: string) => `No system is threatening ${ile} at the moment.`,
      aucuneDisponible: (ile: string) => `No system with an available forecast is threatening ${ile}.`,
      sansPrevision: (noms: string, n: number) =>
        n === 1
          ? `Forecast unavailable for ${noms}: its threat cannot be assessed.`
          : `Forecasts unavailable for ${noms}: their threat cannot be assessed.`,
      illisibles: (n: number) =>
        n === 1
          ? "1 system could not be read: its threat cannot be assessed."
          : `${n} systems could not be read: their threat cannot be assessed.`,
      consultez: "See",
      indisponible: "NHC data is temporarily unavailable: the threat cannot be assessed.",
      source: "Source: NHC forecast positions (",
      sourceFin: "). The time and distance are estimates, not official forecasts.",
    },
  },
);
