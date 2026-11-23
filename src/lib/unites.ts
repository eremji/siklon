// Conversion des unités du NHC (nœuds, mph, degrés) vers le système métrique.
import type { Langue } from "./langues";

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
const DIRECTIONS: Record<Langue, readonly string[]> = {
  fr: [
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
  ],
  en: [
    "north",
    "north-northeast",
    "northeast",
    "east-northeast",
    "east",
    "east-southeast",
    "southeast",
    "south-southeast",
    "south",
    "south-southwest",
    "southwest",
    "west-southwest",
    "west",
    "west-northwest",
    "northwest",
    "north-northwest",
  ],
};

// Le NHC donne la direction vers laquelle le système se déplace, en degrés.
export function directionDeplacement(degres: number, langue: Langue): string {
  const index = Math.round((((degres % 360) + 360) % 360) / 22.5) % 16;
  const direction = DIRECTIONS[langue][index];
  if (langue === "en") return `toward the ${direction}`;
  return /^[eo]/.test(direction) ? `vers l'${direction}` : `vers le ${direction}`;
}

const UNE_DECIMALE: Record<Langue, Intl.NumberFormat> = {
  fr: new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
  en: new Intl.NumberFormat("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
};

// Ouest : « O » en français, « W » en anglais.
const OUEST: Record<Langue, string> = { fr: "O", en: "W" };

export function formaterPosition(latitude: number, longitude: number, langue: Langue): string {
  const format = UNE_DECIMALE[langue];
  const lat = `${format.format(Math.abs(latitude))}° ${latitude < 0 ? "S" : "N"}`;
  const lon = `${format.format(Math.abs(longitude))}° ${longitude < 0 ? OUEST[langue] : "E"}`;
  return `${lat}, ${lon}`;
}
