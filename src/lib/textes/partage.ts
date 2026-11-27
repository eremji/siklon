// Textes du partage d'une alerte (US-21) : message envoyé avec le lien et bouton « Partager ».
import { traductions } from "./traductions";

export const PARTAGE = traductions(
  {
    titre: (nom: string) => `${nom} · Siklon`,
    nomSysteme: (type: string, nom: string, categorie: number | null) =>
      categorie ? `${type} ${nom} (cat. ${categorie})` : `${type} ${nom}`,
    systeme: (nom: string, kmh: number, deplacement: string | null) =>
      `${nom} : vents maximaux de ${kmh} km/h${deplacement ? `, ${deplacement}` : ""}.`,
    deplacement: (direction: string, kmh: number) => `se déplace ${direction} à ${kmh} km/h`,
    stationnaire: "stationnaire",
    sourceNhc: (numero: string, heure: string, fuseau: string) => `Source : NHC, avis n° ${numero} du ${heure} (${fuseau}).`,
    partage: (heure: string, fuseau: string) => `Partagé le ${heure} (${fuseau}).`,
    menace: (nom: string, distance: string, ville: string, heure: string, delai: string | null) =>
      `${nom} : passage estimé à ${distance} de ${ville} le ${heure}${delai ? `, ${delai}` : ", heure estimée déjà atteinte"}.`,
    vigilance: (ile: string, libelle: string, consigne: string, origine: string | null) =>
      `${ile} : ${libelle} · ${consigne}${origine ? ` (${origine})` : ""}.`,
    alerteNhc: (ile: string, type: string, origine: string, systeme: string) => `${ile} : ${type} (${origine}) pour ${systeme}.`,
    aucuneAlerteNhc: (ile: string) => `${ile} : aucune veille ni aucun avertissement du NHC.`,
    sources: (sources: string[], fuseau: string) =>
      `${sources.length > 1 ? "Sources" : "Source"} : ${sources.join(" ; ")} (${fuseau}).`,
    avisNhc: (numeros: string[]) => `NHC, ${numeros.join(" et ")}`,
    avis: (numero: string, heure: string) => `avis n° ${numero} du ${heure}`,
    meteoFrance: (heure: string) => `Météo-France, mise à jour du ${heure}`,
    echecNhc: (heure: string, fuseau: string) => `Dernière donnée NHC lue le ${heure} (${fuseau}) : la mise à jour a échoué.`,
    heureLocale: "heure locale",
    apercuPassage: (distance: string, ville: string, heure: string, delai: string | null) =>
      `Passage estimé à ${distance} de ${ville} le ${heure}${delai ? `, ${delai}` : ", heure estimée déjà atteinte"}`,
    situation: (heure: string, fuseau: string) => `Situation au ${heure} (${fuseau})`,
    apercuVents: (kmh: number) => `Vents maximaux de ${kmh} km/h`,
    apercuAucuneAlerteNhc: "Aucune veille ni aucun avertissement du NHC",
    altIle: "Systèmes qui menacent l'île et niveau d'alerte officiel, avec leurs sources (Siklon)",
    altSysteme: "Système actif : vents, déplacement et avis NHC (Siklon)",
    bouton: "Partager cette alerte",
    copie: "Lien copié. Collez-le dans WhatsApp ou un SMS.",
    copieImpossible: "Copiez ce lien pour le partager :",
  },
  {
    titre: (nom: string) => `${nom} · Siklon`,
    nomSysteme: (type: string, nom: string, categorie: number | null) =>
      categorie ? `${type} ${nom} (cat. ${categorie})` : `${type} ${nom}`,
    systeme: (nom: string, kmh: number, deplacement: string | null) =>
      `${nom}: maximum sustained winds ${kmh} km/h${deplacement ? `, ${deplacement}` : ""}.`,
    deplacement: (direction: string, kmh: number) => `moving ${direction} at ${kmh} km/h`,
    stationnaire: "stationary",
    sourceNhc: (numero: string, heure: string, fuseau: string) => `Source: NHC, advisory ${numero} issued ${heure} (${fuseau}).`,
    partage: (heure: string, fuseau: string) => `Shared ${heure} (${fuseau}).`,
    menace: (nom: string, distance: string, ville: string, heure: string, delai: string | null) =>
      `${nom}: estimated closest approach ${distance} from ${ville} on ${heure}${delai ? `, ${delai}` : ", estimated time already reached"}.`,
    vigilance: (ile: string, libelle: string, consigne: string, origine: string | null) =>
      `${ile}: ${libelle} · ${consigne}${origine ? ` (${origine})` : ""}.`,
    alerteNhc: (ile: string, _type: string, origine: string, systeme: string) => `${ile}: ${origine} for ${systeme}.`,
    aucuneAlerteNhc: (ile: string) => `${ile}: no NHC watches or warnings.`,
    sources: (sources: string[], fuseau: string) =>
      `${sources.length > 1 ? "Sources" : "Source"}: ${sources.join("; ")} (${fuseau}).`,
    avisNhc: (numeros: string[]) => `NHC, ${numeros.join(" and ")}`,
    avis: (numero: string, heure: string) => `advisory ${numero} issued ${heure}`,
    meteoFrance: (heure: string) => `Météo-France, updated ${heure}`,
    echecNhc: (heure: string, fuseau: string) => `Last NHC data read ${heure} (${fuseau}): the update failed.`,
    heureLocale: "local time",
    apercuPassage: (distance: string, ville: string, heure: string, delai: string | null) =>
      `Estimated closest approach ${distance} from ${ville} on ${heure}${delai ? `, ${delai}` : ", estimated time already reached"}`,
    situation: (heure: string, fuseau: string) => `As of ${heure} (${fuseau})`,
    apercuVents: (kmh: number) => `Maximum sustained winds ${kmh} km/h`,
    apercuAucuneAlerteNhc: "No NHC watches or warnings",
    altIle: "Systems threatening the island and official alert level, with sources (Siklon)",
    altSysteme: "Active system: winds, movement and NHC advisory (Siklon)",
    bouton: "Share this alert",
    copie: "Link copied. Paste it into WhatsApp or a text message.",
    copieImpossible: "Copy this link to share it:",
  },
);
