// Conversion des unités du NHC (nœuds, mph, degrés) vers le système métrique.

const KMH_PAR_KT = 1.852;
const MPH_PAR_KT = 1.150779;
const KMH_PAR_MPH = 1.609344;

// Les avis publics du NHC arrondissent les vents convertis à 5 près
// (120 kt : 140 mph, 220 km/h) ; on fait de même pour rester cohérent avec eux.
function arrondiA5(valeur: number): number {
  return Math.round(valeur / 5) * 5;
}

export function ktVersKmh(kt: number): number {
  return arrondiA5(kt * KMH_PAR_KT);
}

export function ktVersMph(kt: number): number {
  return arrondiA5(kt * MPH_PAR_KT);
}

// Vitesse de déplacement : les avis la donnent à l'unité (12 mph, 19 km/h).
export function mphVersKmh(mph: number): number {
  return Math.round(mph * KMH_PAR_MPH);
}

// Rose des vents à 16 directions, à partir du nord, dans le sens horaire.
const DIRECTIONS = [
  "nord",
  "nord-nord-est",
  "nord-est",
  "est-nord-est",
  "est",
  "est-sud-est",
  "sud-est",
  "sud-sud-est",
  "sud",
  "sud-sud-ouest",
  "sud-ouest",
  "ouest-sud-ouest",
  "ouest",
  "ouest-nord-ouest",
  "nord-ouest",
  "nord-nord-ouest",
] as const;

// Le NHC donne la direction vers laquelle le système se déplace, en degrés.
export function directionDeplacement(degres: number): string {
  const index = Math.round((((degres % 360) + 360) % 360) / 22.5) % DIRECTIONS.length;
  const direction = DIRECTIONS[index];
  return /^[eo]/.test(direction) ? `vers l'${direction}` : `vers le ${direction}`;
}

const UNE_DECIMALE = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function formaterPosition(latitude: number, longitude: number): string {
  const lat = `${UNE_DECIMALE.format(Math.abs(latitude))}° ${latitude < 0 ? "S" : "N"}`;
  const lon = `${UNE_DECIMALE.format(Math.abs(longitude))}° ${longitude < 0 ? "O" : "E"}`;
  return `${lat}, ${lon}`;
}
