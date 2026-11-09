import { describe, expect, it } from "vitest";
import { cadrer, creerProjection, pasGrille } from "./projection";

describe("cadrer", () => {
  it("entoure les positions d'une marge", () => {
    expect(cadrer([{ lat: 15, lon: -60 }, { lat: 20, lon: -70 }], { marge: 2, ecartMin: 0 })).toEqual({
      latMin: 13,
      latMax: 22,
      lonMin: -72,
      lonMax: -58,
    });
  });

  it("garantit une étendue minimale autour d'une trajectoire courte", () => {
    const cadre = cadrer([{ lat: 16, lon: -61 }], { marge: 0, ecartMin: 10 });
    expect(cadre).toEqual({ latMin: 11, latMax: 21, lonMin: -66, lonMax: -56 });
  });

  it("reste dans les bornes du globe", () => {
    const cadre = cadrer([{ lat: 89, lon: 179 }], { marge: 5, ecartMin: 0 });
    expect(cadre.latMax).toBe(90);
    expect(cadre.lonMax).toBe(180);
  });
});

describe("creerProjection", () => {
  const cadre = { latMin: 10, latMax: 30, lonMin: -80, lonMax: -50 };
  const projection = creerProjection(cadre, 600);

  it("place le coin nord-ouest en haut à gauche et le coin sud-est en bas à droite", () => {
    expect(projection.projeter({ lat: 30, lon: -80 })).toEqual({ x: 0, y: 0 });
    const sudEst = projection.projeter({ lat: 10, lon: -50 });
    expect(sudEst.x).toBeCloseTo(600, 9);
    expect(sudEst.y).toBeCloseTo(projection.hauteur, 9);
  });

  it("corrige les longitudes par le cosinus de la latitude moyenne", () => {
    // 30° de longitude × cos(20°) contre 20° de latitude.
    expect(projection.hauteur).toBeCloseTo((600 * 20) / (30 * Math.cos((20 * Math.PI) / 180)), 6);
  });

  it("convertit des kilomètres en unités de la carte", () => {
    const unDegreLat = projection.projeter({ lat: 29, lon: -80 }).y;
    expect(projection.kmVersUnites(111.19508)).toBeCloseTo(unDegreLat, 3);
  });
});

describe("pasGrille", () => {
  it.each([
    [8, 5],
    [30, 5],
    [31, 10],
    [60, 10],
    [61, 20],
    [120, 20],
  ])("garde au plus 6 lignes de grille sur %i degrés (pas de %i°)", (etendue, pas) => {
    expect(pasGrille(etendue)).toBe(pas);
  });
});
