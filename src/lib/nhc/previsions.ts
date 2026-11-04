// Trajectoire prévue et cône d'incertitude des systèmes actifs, lus sur le
// service cartographique officiel de la NOAA (export GeoJSON des couches NHC).
// Donnée externe non fiable : géométries, bornes et volume sont validés.
import { DELAI_MAX_MS } from "./client";
import { raisonEchec } from "./journal";

// Seul service interrogé pour les prévisions (liste blanche).
export const URL_SERVICE_PREVISIONS =
  "https://mapservices.weather.noaa.gov/tropical/rest/services/tropical/NHC_tropical_weather/MapServer";

export type Position = [number, number];

export interface Prevision {
  avis: string;
  trajectoire: Position[][];
  cone: Position[][][];
}

export class PrevisionInvalideError extends Error {
  constructor(raison: string) {
    super(`Prévision NHC invalide : ${raison}`);
    this.name = "PrevisionInvalideError";
  }
}

// Couches du service : groupe ATn à 4 + 26·(n−1), trajectoire +3, cône +4
// (relevé sur MapServer?f=json le 2026-11-04).
export function couchesPrevision(emplacement: string): { trajectoire: number; cone: number } | null {
  const correspondance = /^AT([1-5])$/.exec(emplacement);
  if (!correspondance) return null;
  const groupe = 4 + 26 * (Number(correspondance[1]) - 1);
  return { trajectoire: groupe + 3, cone: groupe + 4 };
}

const MAX_ENTITES = 20;
const MAX_POINTS = 20_000;
const NUMERO_AVIS = /^\d{1,3}[A-Z]?$/;

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);
}

class Compteur {
  points = 0;
  ajouter() {
    this.points += 1;
    if (this.points > MAX_POINTS) throw new PrevisionInvalideError("trop de points");
  }
}

function position(brut: unknown, compteur: Compteur): Position {
  if (!Array.isArray(brut) || brut.length < 2) throw new PrevisionInvalideError("position");
  const [lon, lat] = brut;
  const valide = (v: unknown, borne: number) => typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= borne;
  if (!valide(lon, 180) || !valide(lat, 90)) throw new PrevisionInvalideError("coordonnée hors bornes");
  compteur.ajouter();
  return [lon, lat];
}

function suite(brut: unknown, minimum: number, compteur: Compteur): Position[] {
  if (!Array.isArray(brut) || brut.length < minimum) throw new PrevisionInvalideError("suite de positions");
  return brut.map((p) => position(p, compteur));
}

function polygone(brut: unknown, compteur: Compteur): Position[][] {
  if (!Array.isArray(brut) || brut.length === 0) throw new PrevisionInvalideError("polygone");
  return brut.map((anneau) => suite(anneau, 4, compteur));
}

function liste<T>(brut: unknown, lire: (element: unknown) => T): T[] {
  if (!Array.isArray(brut) || brut.length === 0) throw new PrevisionInvalideError("géométrie multiple");
  return brut.map(lire);
}

type LecteurGeometrie<T> = Record<string, (coordonnees: unknown, compteur: Compteur) => T[]>;

function lireCouche<T>(brut: unknown, emplacement: string, lecteurs: LecteurGeometrie<T>) {
  if (!estObjet(brut) || brut.type !== "FeatureCollection" || !Array.isArray(brut.features)) {
    throw new PrevisionInvalideError("FeatureCollection attendue");
  }
  if (brut.features.length === 0) return null;
  if (brut.features.length > MAX_ENTITES) throw new PrevisionInvalideError("trop d'entités");

  const compteur = new Compteur();
  let avis = "";
  const elements: T[] = [];
  for (const entite of brut.features) {
    if (!estObjet(entite) || !estObjet(entite.geometry) || !estObjet(entite.properties)) {
      throw new PrevisionInvalideError("entité");
    }
    const { binnumber, advisnum } = entite.properties;
    if (binnumber !== emplacement) throw new PrevisionInvalideError("emplacement");
    if (typeof advisnum !== "string" || !NUMERO_AVIS.test(advisnum)) throw new PrevisionInvalideError("numéro d'avis");
    const lecteur = typeof entite.geometry.type === "string" ? lecteurs[entite.geometry.type] : undefined;
    if (!lecteur) throw new PrevisionInvalideError("type de géométrie");
    elements.push(...lecteur(entite.geometry.coordinates, compteur));
    avis = advisnum;
  }
  return { avis, elements };
}

export function lireTrajectoire(brut: unknown, emplacement: string) {
  const lue = lireCouche<Position[]>(brut, emplacement, {
    LineString: (c, compteur) => [suite(c, 2, compteur)],
    MultiLineString: (c, compteur) => liste(c, (ligne) => suite(ligne, 2, compteur)),
  });
  return lue && { avis: lue.avis, lignes: lue.elements };
}

export function lireCone(brut: unknown, emplacement: string) {
  const lu = lireCouche<Position[][]>(brut, emplacement, {
    Polygon: (c, compteur) => [polygone(c, compteur)],
    MultiPolygon: (c, compteur) => liste(c, (p) => polygone(p, compteur)),
  });
  return lu && { avis: lu.avis, polygones: lu.elements };
}

async function lireGeoJson(couche: number): Promise<unknown> {
  const url = new URL(`${URL_SERVICE_PREVISIONS}/${couche}/query`);
  url.search = new URLSearchParams({ where: "1=1", outFields: "binnumber,advisnum", outSR: "4326", f: "geojson" }).toString();
  const reponse = await fetch(url, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(DELAI_MAX_MS) });
  if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
  return reponse.json();
}

export async function chargerPrevision(emplacement: string): Promise<Prevision | null> {
  const couches = couchesPrevision(emplacement);
  if (!couches) return null;
  try {
    const [bruteTrajectoire, bruteCone] = await Promise.all([
      lireGeoJson(couches.trajectoire),
      lireGeoJson(couches.cone),
    ]);
    const trajectoire = lireTrajectoire(bruteTrajectoire, emplacement);
    const cone = lireCone(bruteCone, emplacement);
    if (!trajectoire && !cone) return null;
    return {
      avis: (cone ?? trajectoire)!.avis,
      trajectoire: trajectoire?.lignes ?? [],
      cone: cone?.polygones ?? [],
    };
  } catch (erreur) {
    console.warn("[nhc] prévision indisponible", { emplacement, raison: raisonEchec(erreur) });
    return null;
  }
}
