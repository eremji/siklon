import type { StyleSpecification } from "maplibre-gl";

// Fond vectoriel OpenFreeMap (schéma OpenMapTiles), sans clé d'API.
const TUILES_OPENFREEMAP = "https://tiles.openfreemap.org/planet";

export interface CouleursCarte {
  mer: string;
  terre: string;
  frontiere: string;
}

// Jetons CSS de DESIGN.md d'où viennent les couleurs de la carte.
export const JETONS_CARTE: Record<keyof CouleursCarte, string> = {
  mer: "--map-sea",
  terre: "--map-land",
  frontiere: "--field",
};

export function styleCarte(couleurs: CouleursCarte) {
  return {
    version: 8,
    sources: {
      openmaptiles: { type: "vector", url: TUILES_OPENFREEMAP },
    },
    layers: [
      { id: "terre", type: "background", paint: { "background-color": couleurs.terre } },
      {
        id: "mer",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "water",
        paint: { "fill-color": couleurs.mer },
      },
      {
        id: "frontieres",
        type: "line",
        source: "openmaptiles",
        "source-layer": "boundary",
        filter: ["==", ["get", "admin_level"], 2],
        paint: { "line-color": couleurs.frontiere, "line-width": 1 },
      },
    ],
  } satisfies StyleSpecification;
}
