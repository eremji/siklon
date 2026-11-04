// Mode fixture pour les tests e2e : la page lit des fichiers locaux au lieu du NHC.
// Il ne s'active qu'avec NHC_FIXTURES=1, et jamais sur Vercel.
import actifs from "./__fixtures__/current-storms-actifs.json";
import vide from "./__fixtures__/current-storms-vide.json";
import type { EtatFlux } from "./client";
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
