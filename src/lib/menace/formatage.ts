// Présentation de la menace (US-03) : le passage est une estimation, ses valeurs sont arrondies.
import { formaterJourHeure, partiesDate } from "@/lib/dates";
import type { Langue } from "@/lib/langues";

const MS_PAR_HEURE = 3_600_000;
const HEURES_EN_JOURS_DES = 48;

export function formaterHeurePassage(iso: string, fuseau: string, langue: Langue): string {
  const arrondie = new Date(Math.round(Date.parse(iso) / MS_PAR_HEURE) * MS_PAR_HEURE);
  const { day, month, hour, dayPeriod } = partiesDate(arrondie, fuseau, langue);
  return langue === "fr" ? `${day} ${month} vers ${Number(hour)} h` : `${day} ${month} around ${hour} ${dayPeriod}`;
}

export function formaterHeureAvis(iso: string, fuseau: string, langue: Langue): string {
  return formaterJourHeure(new Date(iso), fuseau, langue);
}

export function formaterDistance(km: number, langue: Langue): string {
  const arrondie = Math.round(km / 10) * 10;
  if (langue === "en") return arrondie === 0 ? "less than 10 km" : `about ${arrondie} km`;
  return arrondie === 0 ? "moins de 10 km" : `environ ${arrondie} km`;
}

const DELAIS: Record<Langue, { atteint: string; moinsUneHeure: string; heures: (n: number) => string; jours: (n: number) => string }> = {
  fr: {
    atteint: "Passage estimé déjà atteint",
    moinsUneHeure: "Dans moins d'une heure",
    heures: (n) => `Dans environ ${n} h`,
    jours: (n) => `Dans environ ${n} jours`,
  },
  en: {
    atteint: "Estimated passage time already reached",
    moinsUneHeure: "In less than an hour",
    heures: (n) => `In about ${n} hours`,
    jours: (n) => `In about ${n} days`,
  },
};

export function formaterDelai(heurePassage: string, maintenant: Date, langue: Langue): string {
  const textes = DELAIS[langue];
  const heures = (Date.parse(heurePassage) - maintenant.getTime()) / MS_PAR_HEURE;
  if (heures <= 0) return textes.atteint;
  if (heures < 1) return textes.moinsUneHeure;
  if (heures < HEURES_EN_JOURS_DES) return textes.heures(Math.round(heures));
  return textes.jours(Math.round(heures / 24));
}
