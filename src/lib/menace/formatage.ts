// Présentation de la menace (US-03) : le passage est une estimation, ses valeurs sont arrondies.
const MS_PAR_HEURE = 3_600_000;
const HEURES_EN_JOURS_DES = 48;

function parties(date: Date, fuseau: string): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat("fr-FR", {
      timeZone: fuseau,
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  );
}

export function formaterHeurePassage(iso: string, fuseau: string): string {
  const { day, month, hour } = parties(new Date(Math.round(Date.parse(iso) / MS_PAR_HEURE) * MS_PAR_HEURE), fuseau);
  return `${day} ${month} vers ${Number(hour)} h`;
}

export function formaterHeureAvis(iso: string, fuseau: string): string {
  const { day, month, hour, minute } = parties(new Date(iso), fuseau);
  return `${day} ${month} à ${hour} h ${minute}`;
}

export function formaterDistance(km: number): string {
  const arrondie = Math.round(km / 10) * 10;
  return arrondie === 0 ? "moins de 10 km" : `environ ${arrondie} km`;
}

export function formaterDelai(heurePassage: string, maintenant: Date): string {
  const heures = (Date.parse(heurePassage) - maintenant.getTime()) / MS_PAR_HEURE;
  if (heures <= 0) return "Passage estimé déjà atteint";
  if (heures < 1) return "Dans moins d'une heure";
  if (heures < HEURES_EN_JOURS_DES) return `Dans environ ${Math.round(heures)} h`;
  return `Dans environ ${Math.round(heures / 24)} jours`;
}
