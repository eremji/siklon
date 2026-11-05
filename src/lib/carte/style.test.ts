import { describe, expect, it } from "vitest";
import type { Prevision } from "@/lib/nhc/previsions";
import { JETONS_CARTE, styleCarte } from "./style";

const couleurs = {
  mer: "#CFE7E4",
  terre: "#3F6B4F",
  frontiere: "#6B8287",
  cone: "#B91C1C",
  trajectoire: "#10292E",
  halo: "#FFFFFF",
};

const prevision: Prevision = {
  avis: "14",
  trajectoire: [
    [
      [-58.2, 16.8],
      [-61.6, 18.0],
    ],
  ],
  cone: [
    [
      [
        [-58.2, 17.0],
        [-61.6, 18.9],
        [-61.6, 17.1],
        [-58.2, 17.0],
      ],
    ],
  ],
};

function peinture(style: ReturnType<typeof styleCarte>) {
  return Object.fromEntries(style.layers.map((couche) => [couche.id, couche.paint]));
}

describe("styleCarte", () => {
  it("lit ses couleurs dans les jetons de DESIGN.md", () => {
    expect(JETONS_CARTE).toEqual({
      mer: "--map-sea",
      terre: "--map-land",
      frontiere: "--field",
      cone: "--danger",
      trajectoire: "--text",
      halo: "--surface",
    });
  });

  it("peint la terre, la mer et les frontières avec les couleurs fournies", () => {
    const couches = peinture(styleCarte(couleurs));

    expect(couches.terre).toEqual({ "background-color": "#3F6B4F" });
    expect(couches.mer).toEqual({ "fill-color": "#CFE7E4" });
    expect(couches.frontieres).toMatchObject({ "line-color": "#6B8287" });
  });

  it("trace le cône et la trajectoire de chaque prévision", () => {
    const style = styleCarte(couleurs, [prevision]);
    const source = style.sources.previsions;

    expect(source.type).toBe("geojson");
    expect(source.data.features.map((f) => [f.properties.genre, f.geometry.type])).toEqual([
      ["cone", "Polygon"],
      ["trajectoire", "LineString"],
    ]);
    const couches = peinture(style);
    expect(couches["cone-fond"]).toMatchObject({ "fill-color": "#B91C1C" });
    expect(couches["cone-contour"]).toMatchObject({ "line-color": "#B91C1C" });
    expect(couches.trajectoire).toMatchObject({ "line-color": "#10292E" });
    expect(couches["trajectoire-halo"]).toMatchObject({ "line-color": "#FFFFFF" });
  });

  it("garde les mêmes couches sans prévision, avec une source vide", () => {
    const sans = styleCarte(couleurs);

    expect(sans.sources.previsions.data.features).toEqual([]);
    expect(sans.layers.map((c) => c.id)).toEqual(styleCarte(couleurs, [prevision]).layers.map((c) => c.id));
  });

  it("ne charge des tuiles que depuis OpenFreeMap, en HTTPS", () => {
    const { sources } = styleCarte(couleurs);

    expect(new URL(sources.openmaptiles.url).origin).toBe("https://tiles.openfreemap.org");
  });
});
