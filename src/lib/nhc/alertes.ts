// Watches/warnings NHC en cours pour une île sans vigilance Météo-France (US-06b) :
// segments de côte des systèmes actifs de l'Atlantique, rattachés à l'île par son emprise.
import type { Lecture } from "@/lib/db/dernieresLectures";
import type { Emprise } from "@/lib/iles";
import type { EtatFlux } from "./client";
import { raisonEchec } from "./journal";
import { CLASSIFICATIONS, type SystemeActif } from "./systemes";
import { CODES_ALERTE, type CodeAlerte, estCode, lireWatches, type SegmentAlerte } from "./watches";

/** Libellés français des quatre types, avec leur terme d'origine (DESIGN.md). */
export const TYPES_ALERTE: Record<CodeAlerte, { libelle: string; origine: string; nature: "veille" | "avertissement" }> = {
  HWR: { libelle: "Avertissement d'ouragan", origine: "Hurricane Warning", nature: "avertissement" },
  TWR: { libelle: "Avertissement de tempête tropicale", origine: "Tropical Storm Warning", nature: "avertissement" },
  HWA: { libelle: "Veille d'ouragan", origine: "Hurricane Watch", nature: "veille" },
  TWA: { libelle: "Veille de tempête tropicale", origine: "Tropical Storm Watch", nature: "veille" },
};

export interface AlerteNhc {
  code: CodeAlerte;
  // Classification et vent plutôt qu'une description : elle est rédigée dans la langue de la page (US-10).
  systeme: Pick<SystemeActif, "id" | "nom" | "classification" | "ventKt">;
  avis: { numero: string; emisLe: string };
}

/**
 * Alertes NHC d'une île. Quand le NHC ou la NOAA ne répond pas, les dernières alertes connues peuvent
 * les remplacer (US-11) : `luLe` est alors leur heure de lecture, et `echecLe` l'heure de l'échec.
 */
export type EtatAlertesNhc =
  | { etat: "ok"; alertes: AlerteNhc[]; luLe: string; echecLe?: string }
  | { etat: "indisponible"; luLe: string };

interface OptionsAlertes {
  /** Dernières alertes connues de l'île, relues quand une source ne répond pas (US-11). */
  secours?: () => Promise<Lecture | null>;
  maintenant?: () => Date;
}

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
  options: OptionsAlertes = {},
): Promise<EtatAlertesNhc> {
  const etat = await alertesEnDirect(flux, emprise, lire);
  if (etat.etat === "ok") return etat;
  return (await dernieresAlertes(options)) ?? etat;
}

async function alertesEnDirect(flux: EtatFlux, emprise: Emprise, lire: SourceWatches): Promise<EtatAlertesNhc> {
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
        systeme: { id: systeme.id, nom: systeme.nom, classification: systeme.classification, ventKt: systeme.ventKt },
        avis: segment.avis,
      });
    }
  });

  const triees = [...alertes.values()].sort(
    (a, b) => gravite(a.code) - gravite(b.code) || a.systeme.nom.localeCompare(b.systeme.nom, "fr"),
  );
  // Un flux qui est lui-même la dernière donnée connue (US-11) rend ces alertes anciennes aussi.
  return { etat: "ok", alertes: triees, luLe: flux.luLe, ...(flux.echecLe && { echecLe: flux.echecLe }) };
}

const estObjet = (valeur: unknown): valeur is Record<string, unknown> =>
  typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);

/** Alerte gardée en base, revalidée : un contenu inattendu rend toute la lecture illisible. */
function lireAlerteGardee(valeur: unknown): AlerteNhc {
  if (!estObjet(valeur) || !estCode(valeur.code) || !estObjet(valeur.systeme) || !estObjet(valeur.avis)) {
    throw new Error("alerte gardée invalide");
  }
  const { id, nom, classification, ventKt } = valeur.systeme;
  const { numero, emisLe } = valeur.avis;
  if (
    typeof id !== "string" ||
    typeof nom !== "string" ||
    !CLASSIFICATIONS.some((c) => c === classification) ||
    typeof ventKt !== "number" ||
    typeof numero !== "string" ||
    typeof emisLe !== "string" ||
    Number.isNaN(Date.parse(emisLe))
  ) {
    throw new Error("alerte gardée invalide");
  }
  return {
    code: valeur.code,
    systeme: { id, nom, classification: classification as SystemeActif["classification"], ventKt },
    avis: { numero, emisLe },
  };
}

async function dernieresAlertes({ secours, maintenant = () => new Date() }: OptionsAlertes): Promise<EtatAlertesNhc | null> {
  if (!secours) return null;
  try {
    const lecture = await secours();
    if (!lecture) return null;
    const alertes = estObjet(lecture.contenu) ? lecture.contenu.alertes : undefined;
    if (!Array.isArray(alertes)) throw new Error("alertes gardées invalides");
    return {
      etat: "ok",
      alertes: alertes.map(lireAlerteGardee),
      luLe: lecture.luLe,
      echecLe: maintenant().toISOString(),
    };
  } catch (erreur) {
    console.warn("[nhc] dernières alertes illisibles", { raison: raisonEchec(erreur) });
    return null;
  }
}
