// Bulletin de vigilance CDPV85 (JSON) : niveau de l'île entière et heure de mise à jour.
import type { FichierVigilance } from "@/lib/iles";
import { type Niveau, niveauDepuisCode } from "./niveaux";

/** Domaine de l'île entière dans chaque bulletin ; les autres domaines sont des zones de l'île. */
export const DOMAINES: Record<FichierVigilance, string> = {
  CDPV85TFFR: "VIGI971",
  CDPV85TFFF: "VIGI972",
  CDPV85TFFJ: "VIGI978-977",
};

export interface Bulletin {
  niveau: Niveau;
  /** Heure de mise à jour Météo-France, ISO 8601 UTC. */
  misAJour: string;
}

const HEURE_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);
}

function lireHeure(valeur: unknown): string {
  if (typeof valeur !== "string" || !HEURE_UTC.test(valeur)) throw new Error("bulletin : update_time invalide");
  const date = new Date(valeur);
  // L'aller-retour écarte les dates impossibles que Date corrigerait en silence.
  if (Number.isNaN(date.getTime()) || date.toISOString() !== valeur.replace("Z", ".000Z")) {
    throw new Error("bulletin : update_time invalide");
  }
  return date.toISOString();
}

export function lireBulletin(texte: string, fichier: FichierVigilance): Bulletin {
  const bulletin: unknown = JSON.parse(texte);
  if (!estObjet(bulletin) || bulletin.warning_type !== "vigilance") throw new Error("bulletin : type inattendu");
  const misAJour = lireHeure(bulletin.update_time);

  const zones = estObjet(bulletin.timelaps) ? bulletin.timelaps.domain_ids : undefined;
  if (!Array.isArray(zones)) throw new Error("bulletin : domain_ids invalide");
  const domaines = zones.filter((zone) => estObjet(zone) && zone.domain_id === DOMAINES[fichier]);
  if (domaines.length !== 1) throw new Error(`bulletin : ${domaines.length} domaine(s) ${DOMAINES[fichier]}`);

  const niveau = niveauDepuisCode(domaines[0].max_color_id);
  if (!niveau) throw new Error("bulletin : max_color_id inconnu");
  return { niveau, misAJour };
}
