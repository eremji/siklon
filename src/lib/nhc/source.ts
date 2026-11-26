// Mode fixture pour les tests e2e : la page lit des fichiers locaux au lieu du NHC.
// Il ne s'active qu'avec NHC_FIXTURES=1, et jamais sur Vercel.
import actifs from "./__fixtures__/current-storms-actifs.json";
import vide from "./__fixtures__/current-storms-vide.json";
import coneKyle from "./__fixtures__/prevision-at1-cone.json";
import pointsKyle from "./__fixtures__/prevision-at1-points.json";
import trajectoireKyle from "./__fixtures__/prevision-at1-trajectoire.json";
import watchesKyle from "./__fixtures__/watch-warning-at1.json";
import watchesThirteen from "./__fixtures__/watch-warning-at3.json";
import type { EtatFlux } from "./client";
import { type PositionsPrevues, lirePositionsPrevues } from "./positions";
import { type Prevision, lireCone, lireTrajectoire } from "./previsions";
import { lireCurrentStorms } from "./systemes";
import { type SegmentAlerte, lireWatchWarning } from "./watches";

export const COOKIE_FIXTURE = "siklon-fixture-nhc";

// « ancien » : le NHC ne répond pas, la page montre la dernière lecture réussie, d'une heure (US-11).
const NOMS_FIXTURES = ["actifs", "vide", "indisponible", "ancien"] as const;
export type NomFixture = (typeof NOMS_FIXTURES)[number];

export function fixtureDemandee(
  env: Record<string, string | undefined>,
  demande: string | undefined,
): NomFixture | null {
  if (env.NHC_FIXTURES !== "1" || env.VERCEL_ENV) return null;
  return NOMS_FIXTURES.find((nom) => nom === demande) ?? "actifs";
}

const HEURE_MS = 3_600_000;

export function etatFixture(nom: NomFixture, luLe: string): EtatFlux {
  if (nom === "indisponible") return { etat: "indisponible", luLe };
  if (nom === "ancien") {
    const lu = new Date(Date.parse(luLe) - HEURE_MS).toISOString();
    return { etat: "ok", ...lireCurrentStorms(actifs), luLe: lu, echecLe: luLe };
  }
  return { etat: "ok", ...lireCurrentStorms(nom === "actifs" ? actifs : vide), luLe };
}

// « ancien » montre les mêmes systèmes que « actifs », lus une heure plus tôt.
const avecKyle = (nom: NomFixture) => nom === "actifs" || nom === "ancien";

// Avec « actifs » (et « ancien »), seul Kyle (AT1) a une trajectoire et un cône publiés.
export function previsionsFixture(nom: NomFixture): Record<string, Prevision> {
  if (!avecKyle(nom)) return {};
  const cone = lireCone(coneKyle, "AT1")!;
  const trajectoire = lireTrajectoire(trajectoireKyle, "AT1")!;
  return { al112026: { avis: cone.avis, cone: cone.polygones, trajectoire: trajectoire.lignes } };
}

// Avec « actifs », seul Kyle (AT1) a des positions prévues publiées (US-03).
// Avec « ancien », la lecture des positions a échoué aussi : ce sont les dernières connues (US-11).
const ECHEC_POSITIONS_FIXTURE = "2026-09-10T18:00:00.000Z";

export function positionsFixture(nom: NomFixture): Record<string, PositionsPrevues> {
  if (!avecKyle(nom)) return {};
  const kyle = lirePositionsPrevues(pointsKyle, "AT1")!;
  return { al112026: nom === "ancien" ? { ...kyle, echecLe: ECHEC_POSITIONS_FIXTURE } : kyle };
}

// Avec « actifs », Kyle (AT1) et Thirteen (AT3) ont des watches/warnings publiés (US-06b),
// lus par le même lecteur que la couche réelle.
export function watchesFixture(nom: NomFixture): (emplacement: string) => Promise<SegmentAlerte[]> {
  const couches: Record<string, unknown> = avecKyle(nom) ? { AT1: watchesKyle, AT3: watchesThirteen } : {};
  return async (emplacement) => (couches[emplacement] ? lireWatchWarning(couches[emplacement], emplacement) : []);
}
