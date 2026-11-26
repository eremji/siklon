// Niveau d'alerte officiel d'une île pour le partage (US-21), lu par la même voie que la page Alerte :
// fixtures e2e si elles sont demandées, sinon les caches partagés de Météo-France et du NHC.
import "server-only";
import type { Ile } from "@/lib/iles";
import { alertesNhc } from "@/lib/nhc/lecture";
import { type NomFixture as FixtureNhc } from "@/lib/nhc/source";
import { type NomFixture as FixtureVigilance, etatFixture } from "@/lib/vigilance/fixtures";
import { SOURCES_METEO_FRANCE } from "@/lib/vigilance/source";
import { chargerVigilance } from "@/lib/vigilance/vigilance";
import type { AlerteIle } from "./ile";

export async function chargerAlerteIle(
  ile: Ile,
  fixtures: { nhc: FixtureNhc | null; vigilance: FixtureVigilance | null },
): Promise<AlerteIle> {
  if (ile.alerte.source === "nhc") return { source: "nhc", etat: await alertesNhc(fixtures.nhc, ile.alerte.emprise) };
  const etat = fixtures.vigilance
    ? etatFixture(fixtures.vigilance)
    : await chargerVigilance(ile.alerte.fichier, SOURCES_METEO_FRANCE);
  return { source: "meteo-france", etat };
}
