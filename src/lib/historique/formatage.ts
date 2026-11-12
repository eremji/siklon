// Libellés de l'historique. Les noms viennent d'un fichier externe : React les échappe à l'affichage.
import type { Position } from "../distance";
import type { Categorie } from "../hurdat2/passages";
import type { StatutHurdat2 } from "../hurdat2/parseur";

const KM_H_PAR_NOEUD = 1.852;

const STATUTS: Record<StatutHurdat2, string> = {
  TD: "Dépression tropicale",
  TS: "Tempête tropicale",
  HU: "Ouragan",
  EX: "Extratropical",
  SD: "Dépression subtropicale",
  SS: "Tempête subtropicale",
  LO: "Dépression non tropicale",
  WV: "Onde tropicale",
  DB: "Perturbation",
};

export const libelleStatut = (statut: StatutHurdat2): string => STATUTS[statut];

const degres = (valeur: number) => `${Math.abs(valeur).toFixed(1).replace(".", ",")}°`;

export function formaterPosition({ lat, lon }: Position): string {
  return `${degres(lat)} ${lat < 0 ? "S" : "N"} ${degres(lon)} ${lon < 0 ? "O" : "E"}`;
}

export function nomTempete(nom: string, id: string): string {
  if (nom === "UNNAMED") return `Sans nom (${id})`;
  return nom
    .toLowerCase()
    .replace(/(^|-)([a-z])/g, (_, debut: string, lettre: string) => debut + lettre.toUpperCase());
}

export function libelleCategorie(categorie: Categorie | null): string {
  if (categorie === null) return "Intensité inconnue";
  if (categorie === -1) return "Dépression";
  if (categorie === 0) return "Tempête";
  return `Ouragan de catégorie ${categorie}`;
}

export function formaterVent(ventKt: number | null): string {
  if (ventKt === null) return "vent inconnu";
  return `${Math.round(ventKt * KM_H_PAR_NOEUD)} km/h (${ventKt} nœuds)`;
}

export function formaterDistance(km: number): string {
  return km < 1 ? "moins de 1 km" : `${Math.round(km)} km`;
}

/** Date du jour à l'heure locale du fuseau IANA donné. */
export function formaterDate(date: Date, fuseau: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: fuseau }).format(date);
}

// HURDAT2 date ses points en UTC : l'heure reste en UTC, écrite comme le reste de l'app.
const FORMAT_UTC = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** « 25 août 1979 à 12 h 00 UTC ». */
export function formaterDateHeureUtc(date: Date): string {
  const parties = Object.fromEntries(FORMAT_UTC.formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parties.day} ${parties.month} ${parties.year} à ${parties.hour} h ${parties.minute} UTC`;
}
