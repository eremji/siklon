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
    menace: (nom: string, distance: string, ville: string, delai: string | null) =>
      `${nom} : passage estimé à ${distance} de ${ville}${delai ? ` ${delai}` : ", heure estimée déjà atteinte"}.`,
    vigilance: (ile: string, libelle: string, consigne: string, origine: string | null) =>
      `${ile} : ${libelle} · ${consigne}${origine ? ` (${origine})` : ""}.`,
    alerteNhc: (ile: string, type: string, origine: string, systeme: string) => `${ile} : ${type} (${origine}) pour ${systeme}.`,
    aucuneAlerteNhc: (ile: string) => `${ile} : aucune veille ni aucun avertissement du NHC.`,
    sources: (sources: string[], fuseau: string) =>
      `${sources.length > 1 ? "Sources" : "Source"} : ${sources.join(" ; ")} (${fuseau}).`,
    avisNhc: (numeros: string[]) => `NHC, ${numeros.join(" et ")}`,
    avis: (numero: string, heure: string) => `avis n° ${numero} du ${heure}`,
    meteoFrance: (heure: string) => `Météo-France, mise à jour du ${heure}`,
    heureLocale: "heure locale",
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
    menace: (nom: string, distance: string, ville: string, delai: string | null) =>
      `${nom}: estimated closest approach ${distance} from ${ville}${delai ? ` ${delai}` : ", estimated time already reached"}.`,
    vigilance: (ile: string, libelle: string, consigne: string, origine: string | null) =>
      `${ile}: ${libelle} · ${consigne}${origine ? ` (${origine})` : ""}.`,
    alerteNhc: (ile: string, _type: string, origine: string, systeme: string) => `${ile}: ${origine} for ${systeme}.`,
    aucuneAlerteNhc: (ile: string) => `${ile}: no NHC watches or warnings.`,
    sources: (sources: string[], fuseau: string) =>
      `${sources.length > 1 ? "Sources" : "Source"}: ${sources.join("; ")} (${fuseau}).`,
    avisNhc: (numeros: string[]) => `NHC, ${numeros.join(" and ")}`,
    avis: (numero: string, heure: string) => `advisory ${numero} issued ${heure}`,
    meteoFrance: (heure: string) => `Météo-France, updated ${heure}`,
    heureLocale: "local time",
    bouton: "Share this alert",
    copie: "Link copied. Paste it into WhatsApp or a text message.",
    copieImpossible: "Copy this link to share it:",
  },
);
