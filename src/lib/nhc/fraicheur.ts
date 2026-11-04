// Fraîcheur des avis NHC : au-delà de ce délai sans nouvel avis, les données
// sont signalées comme possiblement obsolètes (US-01).
export const SEUIL_OBSOLESCENCE_H = 6;

const MS_PAR_HEURE = 3_600_000;

export function estObsolete(emisLe: string, maintenant: Date): boolean {
  return maintenant.getTime() - Date.parse(emisLe) > SEUIL_OBSOLESCENCE_H * MS_PAR_HEURE;
}

export function avisLePlusRecent(heures: string[]): string | null {
  if (heures.length === 0) return null;
  return heures.reduce((recent, heure) => (Date.parse(heure) > Date.parse(recent) ? heure : recent));
}

// Heure des Antilles françaises (UTC−4, sans heure d'été).
const FORMAT_ANTILLES = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "America/Martinique",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formaterHeureAntilles(iso: string): string {
  const parties = Object.fromEntries(
    FORMAT_ANTILLES.formatToParts(new Date(iso)).map(({ type, value }) => [type, value]),
  );
  return `${parties.day} ${parties.month} à ${parties.hour} h ${parties.minute}`;
}
