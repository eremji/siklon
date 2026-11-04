import { describe, expect, it } from "vitest";
import { JETONS_CARTE, styleCarte } from "./style";

const couleurs = { mer: "#CFE7E4", terre: "#3F6B4F", frontiere: "#6B8287" };

describe("styleCarte", () => {
  it("lit ses couleurs dans les jetons de DESIGN.md", () => {
    expect(JETONS_CARTE).toEqual({ mer: "--map-sea", terre: "--map-land", frontiere: "--field" });
  });

  it("peint la terre, la mer et les frontières avec les couleurs fournies", () => {
    const { layers } = styleCarte(couleurs);
    const peinture = Object.fromEntries(layers.map((couche) => [couche.id, couche.paint]));

    expect(peinture.terre).toEqual({ "background-color": "#3F6B4F" });
    expect(peinture.mer).toEqual({ "fill-color": "#CFE7E4" });
    expect(peinture.frontieres).toMatchObject({ "line-color": "#6B8287" });
  });

  it("ne charge des tuiles que depuis OpenFreeMap, en HTTPS", () => {
    const { sources } = styleCarte(couleurs);

    for (const source of Object.values(sources)) {
      expect("url" in source && new URL(source.url as string).origin).toBe("https://tiles.openfreemap.org");
    }
  });
});
