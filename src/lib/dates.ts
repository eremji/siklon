// Dates et heures affichées dans la langue de la page (US-10). Français : « 10 septembre à 11 h 00 »
// (24 h) ; anglais : « 10 September at 11:00 am » (12 h, comme les avis du NHC).
import type { Langue } from "./langues";

const OPTIONS: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" };

/** Parties de la date (jour, mois, heure, minute, et matin/après-midi en anglais) dans le fuseau donné. */
export function partiesDate(date: Date, fuseau: string, langue: Langue): Record<string, string> {
  const format =
    langue === "fr"
      ? new Intl.DateTimeFormat("fr-FR", { ...OPTIONS, timeZone: fuseau, hourCycle: "h23" })
      : new Intl.DateTimeFormat("en-GB", { ...OPTIONS, hour: "numeric", timeZone: fuseau, hourCycle: "h12" });
  return Object.fromEntries(format.formatToParts(date).map(({ type, value }) => [type, value]));
}

export function formaterJourHeure(date: Date, fuseau: string, langue: Langue): string {
  const { day, month, hour, minute, dayPeriod } = partiesDate(date, fuseau, langue);
  return langue === "fr" ? `${day} ${month} à ${hour} h ${minute}` : `${day} ${month} at ${hour}:${minute} ${dayPeriod}`;
}
