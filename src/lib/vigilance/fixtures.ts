// Mode fixture pour les tests e2e : la page affiche un niveau choisi au lieu du flux Météo-France.
// Il ne s'active qu'avec VIGILANCE_FIXTURES=1, et jamais sur Vercel.
import { NIVEAUX } from "./niveaux";
import type { EtatVigilance } from "./vigilance";

export const COOKIE_FIXTURE = "siklon-fixture-vigilance";
export const MIS_A_JOUR_FIXTURE = "2026-11-09T09:42:00.000Z";

const NOMS_FIXTURES = [...NIVEAUX, "indisponible"] as const;
export type NomFixture = (typeof NOMS_FIXTURES)[number];

export function fixtureDemandee(
  env: Record<string, string | undefined>,
  demande: string | undefined,
): NomFixture | null {
  if (env.VIGILANCE_FIXTURES !== "1" || env.VERCEL_ENV) return null;
  return NOMS_FIXTURES.find((nom) => nom === demande) ?? "vert";
}

export function etatFixture(nom: NomFixture): EtatVigilance {
  if (nom === "indisponible") return { etat: "indisponible" };
  return { etat: "ok", niveau: nom, misAJour: MIS_A_JOUR_FIXTURE };
}
