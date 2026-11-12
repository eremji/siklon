// Table « Îles et points de référence » de SPEC.md.
import type { Position } from "./distance";

/** Fichiers JSON du flux vigilance Météo-France (section « Flux vigilance Météo-France » de SPEC.md). */
export type FichierVigilance = "CDPV85TFFR" | "CDPV85TFFF" | "CDPV85TFFJ";

/**
 * Rectangle qui couvre toute l'île, bornes incluses : un segment de côte NHC concerne l'île
 * dès qu'un de ses points y tombe (« Watches/warnings NHC et emprises des îles », SPEC.md).
 */
export interface Emprise {
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
}

export type SourceAlerte =
  | { source: "meteo-france"; fichier: FichierVigilance }
  | { source: "nhc"; emprise: Emprise };

export interface Ile {
  /** Identifiant d'URL, stable. */
  slug: string;
  nom: string;
  /** Ville principale ; les distances sont mesurées depuis ce point. */
  pointReference: Position & { nom: string };
  /** Fuseau horaire IANA, pour afficher les dates à l'heure locale. */
  fuseau: string;
  alerte: SourceAlerte;
}

export const ILES: readonly Ile[] = [
  {
    slug: "guadeloupe",
    nom: "Guadeloupe",
    pointReference: { nom: "Pointe-à-Pitre", lat: 16.24, lon: -61.53 },
    fuseau: "America/Guadeloupe",
    alerte: { source: "meteo-france", fichier: "CDPV85TFFR" },
  },
  {
    slug: "martinique",
    nom: "Martinique",
    pointReference: { nom: "Fort-de-France", lat: 14.6, lon: -61.07 },
    fuseau: "America/Martinique",
    alerte: { source: "meteo-france", fichier: "CDPV85TFFF" },
  },
  {
    slug: "saint-martin",
    nom: "Saint-Martin",
    pointReference: { nom: "Marigot", lat: 18.07, lon: -63.08 },
    fuseau: "America/Marigot",
    alerte: { source: "meteo-france", fichier: "CDPV85TFFJ" },
  },
  {
    slug: "saint-barthelemy",
    nom: "Saint-Barthélemy",
    pointReference: { nom: "Gustavia", lat: 17.9, lon: -62.85 },
    fuseau: "America/St_Barthelemy",
    alerte: { source: "meteo-france", fichier: "CDPV85TFFJ" },
  },
  {
    slug: "dominique",
    nom: "Dominique",
    pointReference: { nom: "Roseau", lat: 15.3, lon: -61.39 },
    fuseau: "America/Dominica",
    alerte: {
      source: "nhc",
      emprise: { latMin: 15.18, latMax: 15.67, lonMin: -61.51, lonMax: -61.22 },
    },
  },
  {
    slug: "sainte-lucie",
    nom: "Sainte-Lucie",
    pointReference: { nom: "Castries", lat: 14.01, lon: -60.99 },
    fuseau: "America/St_Lucia",
    alerte: {
      source: "nhc",
      emprise: { latMin: 13.68, latMax: 14.13, lonMin: -61.1, lonMax: -60.85 },
    },
  },
  {
    slug: "barbade",
    nom: "Barbade",
    pointReference: { nom: "Bridgetown", lat: 13.1, lon: -59.62 },
    fuseau: "America/Barbados",
    alerte: {
      source: "nhc",
      emprise: { latMin: 13.02, latMax: 13.35, lonMin: -59.67, lonMax: -59.4 },
    },
  },
  {
    slug: "trinite",
    nom: "Trinité",
    pointReference: { nom: "Port of Spain", lat: 10.66, lon: -61.51 },
    fuseau: "America/Port_of_Spain",
    alerte: {
      source: "nhc",
      emprise: { latMin: 10.02, latMax: 10.86, lonMin: -61.95, lonMax: -60.88 },
    },
  },
  {
    slug: "porto-rico",
    nom: "Porto Rico",
    pointReference: { nom: "San Juan", lat: 18.47, lon: -66.11 },
    fuseau: "America/Puerto_Rico",
    alerte: {
      source: "nhc",
      emprise: { latMin: 17.86, latMax: 18.54, lonMin: -67.29, lonMax: -65.2 },
    },
  },
  {
    slug: "haiti",
    nom: "Haïti",
    pointReference: { nom: "Port-au-Prince", lat: 18.54, lon: -72.34 },
    fuseau: "America/Port-au-Prince",
    alerte: {
      source: "nhc",
      emprise: { latMin: 17.98, latMax: 20.1, lonMin: -74.5, lonMax: -71.75 },
    },
  },
  {
    slug: "republique-dominicaine",
    nom: "République dominicaine",
    pointReference: { nom: "Saint-Domingue", lat: 18.49, lon: -69.93 },
    fuseau: "America/Santo_Domingo",
    alerte: {
      source: "nhc",
      emprise: { latMin: 17.45, latMax: 19.95, lonMin: -71.75, lonMax: -68.3 },
    },
  },
  {
    slug: "jamaique",
    nom: "Jamaïque",
    pointReference: { nom: "Kingston", lat: 17.97, lon: -76.79 },
    fuseau: "America/Jamaica",
    alerte: {
      source: "nhc",
      emprise: { latMin: 17.68, latMax: 18.55, lonMin: -78.39, lonMax: -76.16 },
    },
  },
  {
    slug: "cuba",
    nom: "Cuba",
    pointReference: { nom: "La Havane", lat: 23.13, lon: -82.38 },
    fuseau: "America/Havana",
    alerte: {
      source: "nhc",
      emprise: { latMin: 19.8, latMax: 23.3, lonMin: -84.97, lonMax: -74.12 },
    },
  },
];

/** Île correspondant au slug, ou undefined (le slug vient souvent d'une URL : donnée non fiable). */
export function trouverIle(slug: string): Ile | undefined {
  return ILES.find((ile) => ile.slug === slug);
}
