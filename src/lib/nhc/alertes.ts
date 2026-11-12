// Watches/warnings NHC en cours pour une île sans vigilance Météo-France (US-06b) :
// segments de côte des systèmes actifs de l'Atlantique, rattachés à l'île par son emprise.
import type { Emprise } from "@/lib/iles";
import type { EtatFlux } from "./client";
import { raisonEchec } from "./journal";
import { descriptionSysteme } from "./systemes";
import { CODES_ALERTE, type CodeAlerte, lireWatches, type SegmentAlerte } from "./watches";

/** Libellés français des quatre types, avec leur terme d'origine (DESIGN.md). */
export const TYPES_ALERTE: Record<CodeAlerte, { libelle: string; origine: string; nature: "veille" | "avertissement" }> = {
  HWR: { libelle: "Avertissement d'ouragan", origine: "Hurricane Warning", nature: "avertissement" },
  TWR: { libelle: "Avertissement de tempête tropicale", origine: "Tropical Storm Warning", nature: "avertissement" },
  HWA: { libelle: "Veille d'ouragan", origine: "Hurricane Watch", nature: "veille" },
  TWA: { libelle: "Veille de tempête tropicale", origine: "Tropical Storm Watch", nature: "veille" },
};

export interface AlerteNhc {
  code: CodeAlerte;
  systeme: { id: string; nom: string; description: string };
  avis: { numero: string; emisLe: string };
}

export type EtatAlertesNhc = { etat: "ok"; alertes: AlerteNhc[]; luLe: string } | { etat: "indisponible"; luLe: string };

/** Source des segments d'un emplacement : le cache partagé en production, la lecture directe par défaut. */
export type SourceWatches = (emplacement: string) => Promise<SegmentAlerte[]>;

const EMPLACEMENT_ATLANTIQUE = /^AT[1-5]$/;

export function segmentDansEmprise(segment: SegmentAlerte, { latMin, latMax, lonMin, lonMax }: Emprise): boolean {
  return segment.lignes.some((ligne) =>
    ligne.some(([lon, lat]) => lat >= latMin && lat <= latMax && lon >= lonMin && lon <= lonMax),
  );
}

function gravite(code: CodeAlerte): number {
  return CODES_ALERTE.indexOf(code);
}

export async function chargerAlertesNhc(
  flux: EtatFlux,
  emprise: Emprise,
  lire: SourceWatches = lireWatches,
): Promise<EtatAlertesNhc> {
  if (flux.etat === "indisponible") return flux;
  const systemes = flux.systemes.filter((systeme) => EMPLACEMENT_ATLANTIQUE.test(systeme.emplacement));

  let couches: SegmentAlerte[][];
  try {
    couches = await Promise.all(
      systemes.map((systeme) =>
        lire(systeme.emplacement).catch((erreur: unknown) => {
          console.warn("[nhc] watches/warnings indisponibles", {
            emplacement: systeme.emplacement,
            raison: raisonEchec(erreur),
          });
          throw erreur;
        }),
      ),
    );
  } catch {
    // Une seule couche manquante suffit : une liste incomplète ne doit jamais passer pour complète.
    return { etat: "indisponible", luLe: flux.luLe };
  }

  const alertes = new Map<string, AlerteNhc>();
  systemes.forEach((systeme, index) => {
    for (const segment of couches[index]) {
      const cle = `${segment.code} ${systeme.id}`;
      if (alertes.has(cle) || !segmentDansEmprise(segment, emprise)) continue;
      alertes.set(cle, {
        code: segment.code,
        systeme: { id: systeme.id, nom: systeme.nom, description: descriptionSysteme(systeme) },
        avis: segment.avis,
      });
    }
  });

  const triees = [...alertes.values()].sort(
    (a, b) => gravite(a.code) - gravite(b.code) || a.systeme.nom.localeCompare(b.systeme.nom, "fr"),
  );
  return { etat: "ok", alertes: triees, luLe: flux.luLe };
}
