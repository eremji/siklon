// Libellés de l'historique. Les noms viennent d'un fichier externe : React les échappe à l'affichage.
import type { Position } from "../distance";
import type { Categorie } from "../hurdat2/passages";
import type { StatutHurdat2 } from "../hurdat2/parseur";
import type { Langue } from "../langues";

const KM_H_PAR_NOEUD = 1.852;

const STATUTS: Record<Langue, Record<StatutHurdat2, string>> = {
  fr: {
    TD: "Dépression tropicale",
    TS: "Tempête tropicale",
    HU: "Ouragan",
    EX: "Extratropical",
    SD: "Dépression subtropicale",
    SS: "Tempête subtropicale",
    LO: "Dépression non tropicale",
    WV: "Onde tropicale",
    DB: "Perturbation",
  },
  en: {
    TD: "Tropical depression",
    TS: "Tropical storm",
    HU: "Hurricane",
    EX: "Extratropical",
    SD: "Subtropical depression",
    SS: "Subtropical storm",
    LO: "Non-tropical low",
    WV: "Tropical wave",
    DB: "Disturbance",
  },
};

export const libelleStatut = (statut: StatutHurdat2, langue: Langue): string => STATUTS[langue][statut];

const degres = (valeur: number, langue: Langue) => {
  const texte = Math.abs(valeur).toFixed(1);
  return `${langue === "fr" ? texte.replace(".", ",") : texte}°`;
};

export function formaterPosition({ lat, lon }: Position, langue: Langue): string {
  const ouest = langue === "fr" ? "O" : "W";
  return `${degres(lat, langue)} ${lat < 0 ? "S" : "N"} ${degres(lon, langue)} ${lon < 0 ? ouest : "E"}`;
}

export function nomTempete(nom: string, id: string, langue: Langue): string {
  if (nom === "UNNAMED") return langue === "fr" ? `Sans nom (${id})` : `Unnamed (${id})`;
  return nom
    .toLowerCase()
    .replace(/(^|-)([a-z])/g, (_, debut: string, lettre: string) => debut + lettre.toUpperCase());
}

export function libelleCategorie(categorie: Categorie | null, langue: Langue): string {
  const fr = langue === "fr";
  if (categorie === null) return fr ? "Intensité inconnue" : "Unknown intensity";
  if (categorie === -1) return fr ? "Dépression" : "Depression";
  if (categorie === 0) return fr ? "Tempête" : "Storm";
  return fr ? `Ouragan de catégorie ${categorie}` : `Category ${categorie} hurricane`;
}

export function formaterVent(ventKt: number | null, langue: Langue): string {
  const fr = langue === "fr";
  if (ventKt === null) return fr ? "vent inconnu" : "unknown wind";
  return `${Math.round(ventKt * KM_H_PAR_NOEUD)} km/h (${ventKt} ${fr ? "nœuds" : "knots"})`;
}

const ENTIER_ANGLAIS = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

export function formaterDistance(km: number, langue: Langue): string {
  if (langue === "en") return km < 1 ? "less than 1 km" : `${ENTIER_ANGLAIS.format(Math.round(km))} km`;
  return km < 1 ? "moins de 1 km" : `${Math.round(km)} km`;
}

/** Date du jour à l'heure locale du fuseau IANA donné. */
export function formaterDate(date: Date, fuseau: string, langue: Langue): string {
  return new Intl.DateTimeFormat(langue === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: fuseau,
  }).format(date);
}

// HURDAT2 date ses points en UTC : l'heure reste en UTC, sur 24 h dans les deux langues (comme le NHC).
const OPTIONS_UTC: Intl.DateTimeFormatOptions = {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
};
const FORMATS_UTC: Record<Langue, Intl.DateTimeFormat> = {
  fr: new Intl.DateTimeFormat("fr-FR", OPTIONS_UTC),
  en: new Intl.DateTimeFormat("en-GB", OPTIONS_UTC),
};

/** « 25 août 1979 à 12 h 00 UTC » ; « 25 August 1979 at 12:00 UTC ». */
export function formaterDateHeureUtc(date: Date, langue: Langue): string {
  const p = Object.fromEntries(FORMATS_UTC[langue].formatToParts(date).map(({ type, value }) => [type, value]));
  return langue === "fr"
    ? `${p.day} ${p.month} ${p.year} à ${p.hour} h ${p.minute} UTC`
    : `${p.day} ${p.month} ${p.year} at ${p.hour}:${p.minute} UTC`;
}
