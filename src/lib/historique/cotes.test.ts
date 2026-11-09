import { describe, expect, it } from "vitest";
import { type Anneau, cotesDansCadre, decouperAnneau, simplifierAnneau } from "./cotes";

const cadre = { latMin: 0, latMax: 10, lonMin: 0, lonMax: 10 };

describe("decouperAnneau", () => {
  it("garde tel quel un anneau entièrement dans le cadre", () => {
    const carre: Anneau = [[2, 2], [4, 2], [4, 4], [2, 4]];
    expect(decouperAnneau(carre, cadre)).toEqual(carre);
  });

  it("coupe un anneau qui déborde, le long du bord", () => {
    const debordant: Anneau = [[8, 2], [12, 2], [12, 4], [8, 4]];
    expect(decouperAnneau(debordant, cadre)).toEqual([[8, 2], [10, 2], [10, 4], [8, 4]]);
  });

  it("renvoie un anneau vide hors du cadre", () => {
    expect(decouperAnneau([[20, 20], [22, 20], [22, 22]], cadre)).toEqual([]);
  });
});

describe("simplifierAnneau", () => {
  it("retire les points plus proches que la tolérance du dernier point gardé", () => {
    expect(simplifierAnneau([[0, 0], [0.01, 0], [1, 0], [1, 1]], 0.1)).toEqual([[0, 0], [1, 0], [1, 1]]);
  });
});

describe("cotesDansCadre (Natural Earth 1:50 m)", () => {
  it("dessine la Guadeloupe autour de Pointe-à-Pitre", () => {
    const anneaux = cotesDansCadre({ latMin: 12, latMax: 20, lonMin: -66, lonMax: -58 });
    const contientPointeAPitre = anneaux.some((anneau) => {
      const lons = anneau.map(([lon]) => lon);
      const lats = anneau.map(([, lat]) => lat);
      return Math.min(...lons) <= -61.53 && Math.max(...lons) >= -61.53 && Math.min(...lats) <= 16.24 && Math.max(...lats) >= 16.24;
    });
    expect(contientPointeAPitre).toBe(true);
  });

  it("ne renvoie que des points dans le cadre", () => {
    const zone = { latMin: 15, latMax: 25, lonMin: -85, lonMax: -70 };
    for (const anneau of cotesDansCadre(zone)) {
      for (const [lon, lat] of anneau) {
        expect(lon).toBeGreaterThanOrEqual(zone.lonMin);
        expect(lon).toBeLessThanOrEqual(zone.lonMax);
        expect(lat).toBeGreaterThanOrEqual(zone.latMin);
        expect(lat).toBeLessThanOrEqual(zone.latMax);
      }
    }
  });

  it("allège le tracé d'une grande carte", () => {
    const points = (anneaux: Anneau[]) => anneaux.reduce((n, a) => n + a.length, 0);
    const grande = cotesDansCadre({ latMin: 5, latMax: 60, lonMin: -100, lonMax: 0 });
    expect(points(grande)).toBeLessThan(5000);
  });
});
