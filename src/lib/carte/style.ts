import type { FilterSpecification, StyleSpecification } from "maplibre-gl";
import type { Prevision } from "@/lib/nhc/previsions";

// Fond vectoriel OpenFreeMap (schéma OpenMapTiles), sans clé d'API.
const TUILES_OPENFREEMAP = "https://tiles.openfreemap.org/planet";
export const SOURCE_FOND = "openmaptiles";

export interface CouleursCarte {
  mer: string;
  terre: string;
  frontiere: string;
  cone: string;
  trajectoire: string;
  halo: string;
}

// Jetons CSS de DESIGN.md d'où viennent les couleurs de la carte.
export const JETONS_CARTE: Record<keyof CouleursCarte, string> = {
  mer: "--map-sea",
  terre: "--map-land",
  frontiere: "--field",
  cone: "--danger",
  trajectoire: "--text",
  halo: "--surface",
};

function entitesPrevisions(previsions: Prevision[]) {
  return previsions.flatMap((prevision) => [
    ...prevision.cone.map((anneaux) => ({
      type: "Feature" as const,
      properties: { genre: "cone" },
      geometry: { type: "Polygon" as const, coordinates: anneaux },
    })),
    ...prevision.trajectoire.map((ligne) => ({
      type: "Feature" as const,
      properties: { genre: "trajectoire" },
      geometry: { type: "LineString" as const, coordinates: ligne },
    })),
  ]);
}

const CONE: FilterSpecification = ["==", ["get", "genre"], "cone"];
const TRAJECTOIRE: FilterSpecification = ["==", ["get", "genre"], "trajectoire"];

// Le schéma OpenMapTiles n'a pas de couche « terre » : la terre est le fond, et les tuiles
// dessinent l'eau par-dessus. Tant qu'aucune tuile n'est chargée (connexion faible, US-14),
// le fond reste la mer : une carte sans tuiles ne devient pas un aplat de terre.
export function styleCarte(couleurs: CouleursCarte, previsions: Prevision[] = [], tuilesChargees = false) {
  return {
    version: 8,
    sources: {
      [SOURCE_FOND]: { type: "vector", url: TUILES_OPENFREEMAP },
      previsions: {
        type: "geojson",
        data: { type: "FeatureCollection", features: entitesPrevisions(previsions) },
      },
    },
    layers: [
      {
        id: "fond",
        type: "background",
        paint: { "background-color": tuilesChargees ? couleurs.terre : couleurs.mer },
      },
      {
        id: "mer",
        type: "fill",
        source: SOURCE_FOND,
        "source-layer": "water",
        paint: { "fill-color": couleurs.mer },
      },
      {
        id: "frontieres",
        type: "line",
        source: SOURCE_FOND,
        "source-layer": "boundary",
        filter: ["==", ["get", "admin_level"], 2],
        paint: { "line-color": couleurs.frontiere, "line-width": 1 },
      },
      // Liserés clairs sous les tracés : lisibles sur la terre comme sur la mer.
      {
        id: "cone-fond",
        type: "fill",
        source: "previsions",
        filter: CONE,
        paint: { "fill-color": couleurs.cone, "fill-opacity": 0.25 },
      },
      {
        id: "cone-halo",
        type: "line",
        source: "previsions",
        filter: CONE,
        paint: { "line-color": couleurs.halo, "line-width": 4 },
      },
      {
        id: "cone-contour",
        type: "line",
        source: "previsions",
        filter: CONE,
        paint: { "line-color": couleurs.cone, "line-width": 2 },
      },
      {
        id: "trajectoire-halo",
        type: "line",
        source: "previsions",
        filter: TRAJECTOIRE,
        paint: { "line-color": couleurs.halo, "line-width": 5 },
      },
      {
        id: "trajectoire",
        type: "line",
        source: "previsions",
        filter: TRAJECTOIRE,
        paint: { "line-color": couleurs.trajectoire, "line-width": 2.5, "line-dasharray": [2, 1] },
      },
    ],
  } satisfies StyleSpecification;
}
