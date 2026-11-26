// Mode fixture pour les tests e2e : la page affiche un niveau choisi au lieu du flux Météo-France.
// Il ne s'active qu'avec VIGILANCE_FIXTURES=1, et jamais sur Vercel.
import { NIVEAUX } from "./niveaux";
import type { EtatVigilance } from "./vigilance";

export const COOKIE_FIXTURE = "siklon-fixture-vigilance";
export const MIS_A_JOUR_FIXTURE = "2026-11-09T09:42:00.000Z";

// « ancien » : Météo-France ne répond pas, la page montre le dernier niveau lu, jaune (US-11).
const NOMS_FIXTURES = [...NIVEAUX, "indisponible", "ancien"] as const;
const ECHEC_FIXTURE = "2026-11-09T13:00:00.000Z";
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
  if (nom === "ancien") return { etat: "ok", niveau: "jaune", misAJour: MIS_A_JOUR_FIXTURE, echecLe: ECHEC_FIXTURE };
  return { etat: "ok", niveau: nom, misAJour: MIS_A_JOUR_FIXTURE };
}
