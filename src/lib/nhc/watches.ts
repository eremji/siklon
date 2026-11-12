// Watches/warnings NHC en cours : segments de côte de la couche « ATn Watch-Warning »
// du service cartographique NOAA (section « Watches/warnings NHC » de SPEC.md).
// Donnée externe non fiable : chaque entité est validée, et une seule entité invalide
// rend toute la couche invalide, pour ne jamais présenter une liste incomplète.
import { DELAI_MAX_MS } from "./client";
import { type Position, URL_SERVICE_PREVISIONS } from "./previsions";

/** Codes `tcww`, du plus grave au moins grave (SPEC.md). */
export const CODES_ALERTE = ["HWR", "TWR", "HWA", "TWA"] as const;
export type CodeAlerte = (typeof CODES_ALERTE)[number];

export interface SegmentAlerte {
  code: CodeAlerte;
  avis: { numero: string; emisLe: string };
  /** Lignes du segment, en [lon, lat]. */
  lignes: Position[][];
}

export class WatchesInvalidesError extends Error {
  constructor(raison: string) {
    super(`Watches/warnings NHC invalides : ${raison}`);
    this.name = "WatchesInvalidesError";
  }
}

// Groupe ATn à 4 + 26·(n−1), couche Watch-Warning à +5 (relevé sur MapServer/9 et /35 le 2026-11-12).
export function coucheWatchWarning(emplacement: string): number | null {
  const correspondance = /^AT([1-5])$/.exec(emplacement);
  if (!correspondance) return null;
  return 4 + 26 * (Number(correspondance[1]) - 1) + 5;
}

// Heure de l'avis, au format NHC « 1100 AM AST Thu Sep 10 2026 ».
const DATE_AVIS =
  /^(\d{1,2})(\d{2}) (AM|PM) (AST|EDT|EST|CDT|CST) (?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2}) (\d{4})$/;
const DECALAGE_H: Record<string, number> = { AST: -4, EDT: -4, EST: -5, CDT: -5, CST: -6 };
const MOIS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function lireDateAvis(texte: string): string | null {
  const c = DATE_AVIS.exec(texte);
  if (!c) return null;
  const [, heureTexte, minuteTexte, meridien, fuseau, moisTexte, jourTexte, anneeTexte] = c;
  const heure12 = Number(heureTexte);
  const minute = Number(minuteTexte);
  if (heure12 < 1 || heure12 > 12 || minute > 59) return null;
  const heure = (heure12 % 12) + (meridien === "PM" ? 12 : 0);
  const annee = Number(anneeTexte);
  const mois = MOIS.indexOf(moisTexte);
  const jour = Number(jourTexte);
  if (new Date(Date.UTC(annee, mois, jour)).getUTCDate() !== jour) return null;
  return new Date(Date.UTC(annee, mois, jour, heure - DECALAGE_H[fuseau], minute)).toISOString();
}

const MAX_ENTITES = 500;
const MAX_POINTS = 100_000;
const NUMERO_AVIS = /^\d{1,3}[A-Z]?$/;

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);
}

function estCode(valeur: unknown): valeur is CodeAlerte {
  return CODES_ALERTE.some((code) => code === valeur);
}

function lireLigne(brut: unknown, compteur: { points: number }): Position[] {
  if (!Array.isArray(brut) || brut.length < 2) throw new WatchesInvalidesError("ligne");
  return brut.map((point) => {
    if (!Array.isArray(point) || point.length < 2) throw new WatchesInvalidesError("position");
    const [lon, lat] = point;
    const valide = (v: unknown, borne: number) => typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= borne;
    if (!valide(lon, 180) || !valide(lat, 90)) throw new WatchesInvalidesError("coordonnée hors bornes");
    compteur.points += 1;
    if (compteur.points > MAX_POINTS) throw new WatchesInvalidesError("trop de points");
    return [lon, lat];
  });
}

function lireLignes(geometrie: Record<string, unknown>, compteur: { points: number }): Position[][] {
  if (geometrie.type === "LineString") return [lireLigne(geometrie.coordinates, compteur)];
  if (geometrie.type === "MultiLineString") {
    const lignes = geometrie.coordinates;
    if (!Array.isArray(lignes) || lignes.length === 0) throw new WatchesInvalidesError("lignes multiples");
    return lignes.map((ligne) => lireLigne(ligne, compteur));
  }
  throw new WatchesInvalidesError("type de géométrie");
}

/** Segments en cours d'un emplacement ; lève WatchesInvalidesError si la couche est invalide. */
export function lireWatchWarning(brut: unknown, emplacement: string): SegmentAlerte[] {
  if (!estObjet(brut) || brut.type !== "FeatureCollection" || !Array.isArray(brut.features)) {
    throw new WatchesInvalidesError("FeatureCollection attendue");
  }
  if (brut.features.length > MAX_ENTITES) throw new WatchesInvalidesError("trop d'entités");

  const compteur = { points: 0 };
  return brut.features.map((entite: unknown) => {
    if (!estObjet(entite) || !estObjet(entite.geometry) || !estObjet(entite.properties)) {
      throw new WatchesInvalidesError("entité");
    }
    const { binnumber, advisnum, advdate, tcww } = entite.properties;
    if (binnumber !== emplacement) throw new WatchesInvalidesError("emplacement");
    if (!estCode(tcww)) throw new WatchesInvalidesError("type d'alerte");
    if (typeof advisnum !== "string" || !NUMERO_AVIS.test(advisnum)) throw new WatchesInvalidesError("numéro d'avis");
    const emisLe = typeof advdate === "string" ? lireDateAvis(advdate) : null;
    if (!emisLe) throw new WatchesInvalidesError("date d'avis");
    return { code: tcww, avis: { numero: advisnum, emisLe }, lignes: lireLignes(entite.geometry, compteur) };
  });
}

/**
 * Lecture brute des watches/warnings d'un emplacement : liste vide hors Atlantique,
 * rejet en cas d'échec ou de donnée invalide, pour qu'un échec ne soit jamais mis en cache.
 */
export async function lireWatches(emplacement: string): Promise<SegmentAlerte[]> {
  const couche = coucheWatchWarning(emplacement);
  if (couche === null) return [];
  const url = new URL(`${URL_SERVICE_PREVISIONS}/${couche}/query`);
  url.search = new URLSearchParams({
    where: "1=1",
    outFields: "binnumber,advisnum,advdate,tcww",
    outSR: "4326",
    f: "geojson",
  }).toString();
  const reponse = await fetch(url, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(DELAI_MAX_MS) });
  if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
  return lireWatchWarning(await reponse.json(), emplacement);
}
