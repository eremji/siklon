// Point d'entrée unique des pages vers le flux NHC CurrentStorms.json : la fixture e2e
// si elle est demandée, sinon le cache partagé (une lecture du NHC par minute au plus).
import "server-only";
import { fluxEnCache } from "./cache";
import { type EtatFlux, chargerSystemesActifs } from "./client";
import { type NomFixture, etatFixture } from "./source";

export async function fluxNhc(fixture: NomFixture | null, maintenant: () => Date = () => new Date()): Promise<EtatFlux> {
  if (fixture) return etatFixture(fixture, maintenant().toISOString());
  return chargerSystemesActifs({ lire: fluxEnCache, maintenant });
}
