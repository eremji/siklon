// Positions prévues des systèmes actifs (couche « Forecast Points » du NHC),
// lues sur le service cartographique officiel de la NOAA.
// Donnée externe non fiable : dates, échéances, coordonnées et volume sont validés.
import { DELAI_MAX_MS } from "./client";
import { raisonEchec } from "./journal";
import { URL_SERVICE_PREVISIONS } from "./previsions";

export interface PositionPrevue {
  /** Échéance de la prévision, en heures (0 = position à l'heure de l'avis). */
  echeanceH: number;
  /** Heure de validité de la position, ISO 8601 en UTC. */
  valideLe: string;
  lat: number;
  lon: number;
}

export interface PositionsPrevues {
  avis: { numero: string; emisLe: string };
  positions: PositionPrevue[];
}

export class PositionsInvalidesError extends Error {
  constructor(raison: string) {
    super(`Positions prévues NHC invalides : ${raison}`);
    this.name = "PositionsInvalidesError";
  }
}

// Groupe ATn à 4 + 26·(n−1), positions prévues +2 (relevé sur MapServer?f=json le 2026-11-10).
export function couchePositions(emplacement: string): number | null {
  const correspondance = /^AT([1-5])$/.exec(emplacement);
  if (!correspondance) return null;
  return 4 + 26 * (Number(correspondance[1]) - 1) + 2;
}

const MAX_POSITIONS = 20;
/** Dernière échéance des prévisions NHC (5 jours). */
export const ECHEANCE_MAX_H = 120;
const NUMERO_AVIS = /^\d{1,3}[A-Z]?$/;
// Exemple : « 1100 AM AST Thu Sep 10 2026 ».
const DATE_AVIS =
  /^(\d{1,2})(\d{2}) (AM|PM) ([A-Z]{3}) (?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2}) (\d{4})$/;
const MOIS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// Fuseaux utilisés par le NHC pour l'Atlantique, en heures par rapport à UTC.
const FUSEAUX_NHC: Record<string, number> = { AST: -4, EDT: -4, EST: -5, CDT: -5, CST: -6, UTC: 0, GMT: 0 };
// Heure de validité « JJ/HHMM », en UTC.
const HEURE_VALIDITE = /^(\d{2})\/(\d{2})(\d{2})$/;
// Écart toléré entre l'heure de validité et « heure de l'avis + échéance » (heure synoptique, avis intermédiaires).
const ECART_MAX_MS = 12 * 3_600_000;
const MS_PAR_HEURE = 3_600_000;

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);
}

function lireDateAvis(brut: unknown): Date {
  const parties = typeof brut === "string" ? DATE_AVIS.exec(brut) : null;
  if (!parties) throw new PositionsInvalidesError("date d'avis");
  const [, heure, minute, periode, fuseau, mois, jour, annee] = parties;
  const decalage = FUSEAUX_NHC[fuseau];
  if (decalage === undefined) throw new PositionsInvalidesError("fuseau de l'avis");
  const heure24 = (Number(heure) % 12) + (periode === "PM" ? 12 : 0);
  if (Number(heure) > 12 || Number(minute) > 59) throw new PositionsInvalidesError("date d'avis");
  return new Date(
    Date.UTC(Number(annee), MOIS.indexOf(mois), Number(jour), heure24 - decalage, Number(minute)),
  );
}

// « JJ/HHMM » ne donne ni le mois ni l'année : on retient, parmi le mois de l'avis
// et ses voisins, la date la plus proche de « heure de l'avis + échéance ».
function lireHeureValidite(brut: unknown, emisLe: Date, echeanceH: number): string {
  const parties = typeof brut === "string" ? HEURE_VALIDITE.exec(brut) : null;
  if (!parties) throw new PositionsInvalidesError("heure de validité");
  const [jour, heure, minute] = parties.slice(1).map(Number);
  if (jour < 1 || jour > 31 || heure > 23 || minute > 59) throw new PositionsInvalidesError("heure de validité");
  const attendue = emisLe.getTime() + echeanceH * MS_PAR_HEURE;
  const candidates = [-1, 0, 1]
    .map((mois) => Date.UTC(emisLe.getUTCFullYear(), emisLe.getUTCMonth() + mois, jour, heure, minute))
    .filter((date) => new Date(date).getUTCDate() === jour);
  const retenue = candidates.reduce((meilleure, date) =>
    Math.abs(date - attendue) < Math.abs(meilleure - attendue) ? date : meilleure,
  );
  if (Math.abs(retenue - attendue) > ECART_MAX_MS) throw new PositionsInvalidesError("heure de validité");
  return new Date(retenue).toISOString();
}

function coordonnees(geometrie: Record<string, unknown>): { lat: number; lon: number } {
  if (geometrie.type !== "Point" || !Array.isArray(geometrie.coordinates)) {
    throw new PositionsInvalidesError("type de géométrie");
  }
  const [lon, lat] = geometrie.coordinates;
  const valide = (v: unknown, borne: number) => typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= borne;
  if (!valide(lon, 180) || !valide(lat, 90)) throw new PositionsInvalidesError("coordonnée hors bornes");
  return { lat, lon };
}

export function lirePositionsPrevues(brut: unknown, emplacement: string): PositionsPrevues | null {
  if (!estObjet(brut) || brut.type !== "FeatureCollection" || !Array.isArray(brut.features)) {
    throw new PositionsInvalidesError("FeatureCollection attendue");
  }
  if (brut.features.length === 0) return null;
  if (brut.features.length > MAX_POSITIONS) throw new PositionsInvalidesError("trop de positions");

  let avis: { numero: string; brut: string; emisLe: Date } | null = null;
  const positions: PositionPrevue[] = [];
  for (const entite of brut.features) {
    if (!estObjet(entite) || !estObjet(entite.geometry) || !estObjet(entite.properties)) {
      throw new PositionsInvalidesError("entité");
    }
    const { binnumber, advisnum, advdate, tau, validtime } = entite.properties;
    if (binnumber !== emplacement) throw new PositionsInvalidesError("emplacement");
    if (typeof advisnum !== "string" || !NUMERO_AVIS.test(advisnum)) throw new PositionsInvalidesError("numéro d'avis");
    if (!avis) avis = { numero: advisnum, brut: String(advdate), emisLe: lireDateAvis(advdate) };
    if (advisnum !== avis.numero || advdate !== avis.brut) throw new PositionsInvalidesError("avis mélangés");
    if (typeof tau !== "number" || !Number.isInteger(tau) || tau < 0 || tau > ECHEANCE_MAX_H) {
      throw new PositionsInvalidesError("échéance");
    }
    if (positions.some((position) => position.echeanceH === tau)) throw new PositionsInvalidesError("échéance en double");
    positions.push({
      echeanceH: tau,
      valideLe: lireHeureValidite(validtime, avis.emisLe, tau),
      ...coordonnees(entite.geometry),
    });
  }

  return {
    avis: { numero: avis!.numero, emisLe: avis!.emisLe.toISOString() },
    positions: positions.sort((a, b) => a.echeanceH - b.echeanceH),
  };
}

export async function chargerPositionsPrevues(emplacement: string): Promise<PositionsPrevues | null> {
  const couche = couchePositions(emplacement);
  if (couche === null) return null;
  try {
    const url = new URL(`${URL_SERVICE_PREVISIONS}/${couche}/query`);
    url.search = new URLSearchParams({
      where: "1=1",
      outFields: "binnumber,advisnum,advdate,tau,validtime",
      outSR: "4326",
      f: "geojson",
    }).toString();
    const reponse = await fetch(url, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(DELAI_MAX_MS) });
    if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
    return lirePositionsPrevues(await reponse.json(), emplacement);
  } catch (erreur) {
    console.warn("[nhc] positions prévues indisponibles", { emplacement, raison: raisonEchec(erreur) });
    return null;
  }
}

// Positions prévues disponibles des systèmes actifs, par identifiant de système.
export async function chargerToutesPositions(
  systemes: { id: string; emplacement: string }[],
): Promise<Record<string, PositionsPrevues>> {
  const lues = await Promise.all(systemes.map((systeme) => chargerPositionsPrevues(systeme.emplacement)));
  return Object.fromEntries(
    systemes.flatMap((systeme, index) => {
      const positions = lues[index];
      return positions ? [[systeme.id, positions]] : [];
    }),
  );
}
