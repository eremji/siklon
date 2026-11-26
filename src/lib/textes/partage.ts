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
    bouton: "Share this alert",
    copie: "Link copied. Paste it into WhatsApp or a text message.",
    copieImpossible: "Copy this link to share it:",
  },
);
