// Mode fixture pour les tests e2e : la page lit des fichiers locaux au lieu du NHC.
// Il ne s'active qu'avec NHC_FIXTURES=1, et jamais sur Vercel.
import actifs from "./__fixtures__/current-storms-actifs.json";
import vide from "./__fixtures__/current-storms-vide.json";
import coneKyle from "./__fixtures__/prevision-at1-cone.json";
import trajectoireKyle from "./__fixtures__/prevision-at1-trajectoire.json";
import type { EtatFlux } from "./client";
import { type Prevision, lireCone, lireTrajectoire } from "./previsions";
import { lireCurrentStorms } from "./systemes";

export const COOKIE_FIXTURE = "siklon-fixture-nhc";

const NOMS_FIXTURES = ["actifs", "vide", "indisponible"] as const;
export type NomFixture = (typeof NOMS_FIXTURES)[number];

export function fixtureDemandee(
  env: Record<string, string | undefined>,
  demande: string | undefined,
): NomFixture | null {
  if (env.NHC_FIXTURES !== "1" || env.VERCEL_ENV) return null;
  return NOMS_FIXTURES.find((nom) => nom === demande) ?? "actifs";
}

export function etatFixture(nom: NomFixture, luLe: string): EtatFlux {
  if (nom === "indisponible") return { etat: "indisponible", luLe };
  return { etat: "ok", ...lireCurrentStorms(nom === "actifs" ? actifs : vide), luLe };
}

// Avec « actifs », seul Kyle (AT1) a une trajectoire et un cône publiés.
export function previsionsFixture(nom: NomFixture): Record<string, Prevision> {
  if (nom !== "actifs") return {};
  const cone = lireCone(coneKyle, "AT1")!;
  const trajectoire = lireTrajectoire(trajectoireKyle, "AT1")!;
  return { al112026: { avis: cone.avis, cone: cone.polygones, trajectoire: trajectoire.lignes } };
}
