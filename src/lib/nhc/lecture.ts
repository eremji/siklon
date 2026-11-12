// Point d'entrée unique des pages vers le flux NHC CurrentStorms.json : la fixture e2e
// si elle est demandée, sinon le cache partagé (une lecture du NHC par minute au plus).
import "server-only";
import type { Emprise } from "@/lib/iles";
import { type EtatAlertesNhc, chargerAlertesNhc } from "./alertes";
import { fluxEnCache, watchesEnCache } from "./cache";
import { type EtatFlux, chargerSystemesActifs } from "./client";
import { type NomFixture, etatFixture, watchesFixture } from "./source";

export async function fluxNhc(fixture: NomFixture | null, maintenant: () => Date = () => new Date()): Promise<EtatFlux> {
  if (fixture) return etatFixture(fixture, maintenant().toISOString());
  return chargerSystemesActifs({ lire: fluxEnCache, maintenant });
}

/** Watches/warnings NHC en cours dans l'emprise d'une île (US-06b), par la même voie que le flux. */
export async function alertesNhc(
  fixture: NomFixture | null,
  emprise: Emprise,
  maintenant: () => Date = () => new Date(),
): Promise<EtatAlertesNhc> {
  const flux = await fluxNhc(fixture, maintenant);
  return chargerAlertesNhc(flux, emprise, fixture ? watchesFixture(fixture) : watchesEnCache);
}
