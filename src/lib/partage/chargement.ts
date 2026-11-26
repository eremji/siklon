// Données du partage d'une île (US-21), lues par la même voie que les pages : fixtures e2e si elles
// sont demandées, sinon les caches partagés du NHC et de Météo-France. Servent au bouton « Partager »
// de la page et à l'image d'aperçu du lien, qui montrent donc le même bulletin.
import "server-only";
import type { Ile } from "@/lib/iles";
import { alertesNhc, fluxNhc, positionsNhc } from "@/lib/nhc/lecture";
import { type Menace, evaluerMenaces } from "@/lib/nhc/menace";
import { COOKIE_FIXTURE as COOKIE_NHC, type NomFixture as FixtureNhc, fixtureDemandee as fixtureNhc } from "@/lib/nhc/source";
import type { SystemeActif } from "@/lib/nhc/systemes";
import {
  COOKIE_FIXTURE as COOKIE_VIGILANCE,
  type NomFixture as FixtureVigilance,
  etatFixture,
  fixtureDemandee as fixtureVigilance,
} from "@/lib/vigilance/fixtures";
import { SOURCES_METEO_FRANCE } from "@/lib/vigilance/source";
import { chargerVigilance } from "@/lib/vigilance/vigilance";
import type { AlerteIle } from "./ile";

interface Fixtures {
  nhc: FixtureNhc | null;
  vigilance: FixtureVigilance | null;
}

/** Fixtures demandées par les cookies des tests e2e (jamais actives sur Vercel). */
export function fixturesDemandees(biscuits: { get(nom: string): { value: string } | undefined }): Fixtures {
  return {
    nhc: fixtureNhc(process.env, biscuits.get(COOKIE_NHC)?.value),
    vigilance: fixtureVigilance(process.env, biscuits.get(COOKIE_VIGILANCE)?.value),
  };
}

export async function chargerAlerteIle(ile: Ile, fixtures: Fixtures): Promise<AlerteIle> {
  if (ile.alerte.source === "nhc") return { source: "nhc", etat: await alertesNhc(fixtures.nhc, ile.alerte.emprise) };
  const etat = fixtures.vigilance
    ? etatFixture(fixtures.vigilance)
    : await chargerVigilance(ile.alerte.fichier, SOURCES_METEO_FRANCE);
  return { source: "meteo-france", etat };
}

/** Systèmes qui menacent l'île (US-03) et son niveau d'alerte officiel (US-06). */
export async function chargerPartageIle(
  ile: Ile,
  fixtures: Fixtures,
): Promise<{ menaces: Menace<SystemeActif>[]; alerte: AlerteIle }> {
  const flux = await fluxNhc(fixtures.nhc);
  const systemes = flux.etat === "ok" ? flux.systemes : [];
  const [positions, alerte] = await Promise.all([positionsNhc(fixtures.nhc, systemes), chargerAlerteIle(ile, fixtures)]);
  return { menaces: evaluerMenaces(ile, systemes, positions).menaces, alerte };
}
