// Sources de la vérification des alertes (US-07) : les mêmes caches partagés que les pages, donc au
// plus une lecture du NHC, de la NOAA et de Météo-France par minute. En local, NHC_FIXTURES et
// VIGILANCE_FIXTURES font lire les fixtures, comme pour les pages (jamais sur Vercel).
import "server-only";
import { chargerAlertesNhc } from "@/lib/nhc/alertes";
import { watchesEnCache } from "@/lib/nhc/cache";
import { fluxNhc, positionsNhc } from "@/lib/nhc/lecture";
import { fixtureDemandee as fixtureNhcDemandee, watchesFixture } from "@/lib/nhc/source";
import { etatFixture, fixtureDemandee as fixtureVigilanceDemandee } from "@/lib/vigilance/fixtures";
import { SOURCES_METEO_FRANCE } from "@/lib/vigilance/source";
import { chargerVigilance } from "@/lib/vigilance/vigilance";
import type { SourcesAlertes } from "./verification";

export function sourcesAlertes(env: Record<string, string | undefined>): SourcesAlertes {
  const fixtureNhc = fixtureNhcDemandee(env, undefined);
  const fixtureVigilance = fixtureVigilanceDemandee(env, undefined);
  return {
    flux: () => fluxNhc(fixtureNhc),
    positions: (systemes) => positionsNhc(fixtureNhc, systemes),
    vigilance: async (fichier) =>
      fixtureVigilance ? etatFixture(fixtureVigilance) : chargerVigilance(fichier, SOURCES_METEO_FRANCE),
    alertesNhc: (_ile, emprise, flux) =>
      chargerAlertesNhc(flux, emprise, fixtureNhc ? watchesFixture(fixtureNhc) : watchesEnCache),
  };
}
