// Point d'entrée unique des pages vers le flux NHC CurrentStorms.json : la fixture e2e
// si elle est demandée, sinon le cache partagé (une lecture du NHC par minute au plus).
// Quand le NHC ne répond pas, les pages montrent la dernière lecture réussie, gardée en base (US-11).
import "server-only";
import { lireDerniereLecture } from "@/lib/db/dernieresLectures";
import { connexion } from "@/lib/db/pool";
import type { Emprise } from "@/lib/iles";
import { type EtatAlertesNhc, chargerAlertesNhc } from "./alertes";
import { fluxEnCache, positionsEnCache, watchesEnCache } from "./cache";
import { type EtatFlux, chargerSystemesActifs } from "./client";
import { type PositionsPrevues, chargerToutesPositions } from "./positions";
import { type NomFixture, etatFixture, positionsFixture, watchesFixture } from "./source";

export async function fluxNhc(fixture: NomFixture | null, maintenant: () => Date = () => new Date()): Promise<EtatFlux> {
  if (fixture) return etatFixture(fixture, maintenant().toISOString());
  return chargerSystemesActifs({
    lire: fluxEnCache,
    maintenant,
    secours: () => lireDerniereLecture(connexion(), "nhc-systemes"),
  });
}

/** Flux tel que le NHC le publie en ce moment, sans dernière lecture de secours : pour la vérification des alertes. */
export async function fluxNhcEnDirect(
  fixture: NomFixture | null,
  maintenant: () => Date = () => new Date(),
): Promise<EtatFlux> {
  if (fixture) return etatFixture(fixture, maintenant().toISOString());
  return chargerSystemesActifs({ lire: fluxEnCache, maintenant });
}

/**
 * Watches/warnings NHC en cours pour une île (US-06b), par la même voie que le flux. Quand une source
 * ne répond pas, les dernières alertes connues de l'île, gardées en base (US-11).
 */
export async function alertesNhc(
  fixture: NomFixture | null,
  { slug, emprise }: { slug: string; emprise: Emprise },
  maintenant: () => Date = () => new Date(),
): Promise<EtatAlertesNhc> {
  const flux = await fluxNhc(fixture, maintenant);
  if (fixture) return chargerAlertesNhc(flux, emprise, watchesFixture(fixture));
  return chargerAlertesNhc(flux, emprise, watchesEnCache, {
    secours: () => lireDerniereLecture(connexion(), `alertes-nhc:${slug}`),
    maintenant,
  });
}

/** Positions prévues des systèmes actifs (US-03), par identifiant de système, par la même voie que le flux. */
export async function positionsNhc(
  fixture: NomFixture | null,
  systemes: { id: string; emplacement: string }[],
): Promise<Record<string, PositionsPrevues>> {
  if (fixture) return positionsFixture(fixture);
  return chargerToutesPositions(systemes, positionsEnCache);
}
