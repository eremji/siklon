import { describe, expect, it } from "vitest";
import { RAYON_TERRE_KM } from "./constantes";
import { distanceKm } from "./distance";

describe("distanceKm (orthodromie)", () => {
  it("vaut 0 entre un point et lui-même", () => {
    expect(distanceKm({ lat: 16.24, lon: -61.53 }, { lat: 16.24, lon: -61.53 })).toBe(0);
  });

  it("vaut un degré d'arc le long de l'équateur", () => {
    const unDegre = (Math.PI * RAYON_TERRE_KM) / 180;
    expect(distanceKm({ lat: 0, lon: 0 }, { lat: 0, lon: 1 })).toBeCloseTo(unDegre, 6);
  });

  it("vaut un quart de méridien entre l'équateur et le pôle", () => {
    expect(distanceKm({ lat: 0, lon: -61 }, { lat: 90, lon: -61 })).toBeCloseTo(
      (Math.PI * RAYON_TERRE_KM) / 2,
      6,
    );
  });

  it("prend le chemin le plus court à travers l'antiméridien", () => {
    const deuxDegres = (2 * Math.PI * RAYON_TERRE_KM) / 180;
    expect(distanceKm({ lat: 0, lon: 179 }, { lat: 0, lon: -179 })).toBeCloseTo(deuxDegres, 6);
  });

  it("est symétrique", () => {
    const pointeAPitre = { lat: 16.24, lon: -61.53 };
    const fortDeFrance = { lat: 14.6, lon: -61.07 };
    expect(distanceKm(pointeAPitre, fortDeFrance)).toBeCloseTo(distanceKm(fortDeFrance, pointeAPitre), 9);
  });

  it("mesure environ 189 km entre Pointe-à-Pitre et Fort-de-France", () => {
    expect(distanceKm({ lat: 16.24, lon: -61.53 }, { lat: 14.6, lon: -61.07 })).toBeCloseTo(189.0, 0);
  });
});
