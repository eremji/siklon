// Emprise de départ de la carte : [[ouest, sud], [est, nord]] en degrés.
export type Emprise = [[number, number], [number, number]];

// Des Antilles occidentales (Cuba) aux petites Antilles (Barbade, Trinité).
export const EMPRISE_ANTILLES: Emprise = [
  [-86, 9],
  [-58, 25],
];

export const MARGE_DEGRES = 2;

export function emprise(points: { latitude: number; longitude: number }[]): Emprise {
  return points.reduce<Emprise>(
    ([[ouest, sud], [est, nord]], { latitude, longitude }) => [
      [Math.min(ouest, longitude - MARGE_DEGRES), Math.min(sud, latitude - MARGE_DEGRES)],
      [Math.max(est, longitude + MARGE_DEGRES), Math.max(nord, latitude + MARGE_DEGRES)],
    ],
    EMPRISE_ANTILLES,
  );
}
