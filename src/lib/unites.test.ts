import { describe, expect, it } from "vitest";
import { directionDeplacement, formaterPosition, ktVersKmh, ktVersMph, mphVersKmh } from "./unites";

describe("vents : nœuds convertis et arrondis à 5 près, comme dans les avis du NHC", () => {
  it.each([
    // [nœuds, km/h, mph] relevés dans des avis publics du NHC
    [35, 65, 40],
    [52, 95, 60],
    [70, 130, 80],
    [95, 175, 110],
    [120, 220, 140],
  ])("%i kt donnent %i km/h et %i mph", (kt, kmh, mph) => {
    expect(ktVersKmh(kt)).toBe(kmh);
    expect(ktVersMph(kt)).toBe(mph);
  });

  it("garde zéro pour un vent nul", () => {
    expect(ktVersKmh(0)).toBe(0);
    expect(ktVersMph(0)).toBe(0);
  });
});

describe("vitesse de déplacement : mph convertis en km/h, arrondis à l'unité", () => {
  it.each([
    [3, 5],
    [12, 19],
    [18, 29],
    [0, 0],
  ])("%i mph donnent %i km/h", (mph, kmh) => {
    expect(mphVersKmh(mph)).toBe(kmh);
  });
});

describe("directionDeplacement", () => {
  it.each([
    [0, "vers le nord"],
    [360, "vers le nord"],
    [10, "vers le nord"],
    [45, "vers le nord-est"],
    [90, "vers l'est"],
    [112, "vers l'est-sud-est"],
    [180, "vers le sud"],
    [200, "vers le sud-sud-ouest"],
    [270, "vers l'ouest"],
    [285, "vers l'ouest-nord-ouest"],
    [340, "vers le nord-nord-ouest"],
    [350, "vers le nord"],
  ])("%i° se lit « %s »", (degres, texte) => {
    expect(directionDeplacement(degres)).toBe(texte);
  });
});

describe("formaterPosition", () => {
  it("écrit latitude et longitude en degrés décimaux avec les points cardinaux", () => {
    expect(formaterPosition(16.8, -58.2)).toBe("16,8° N, 58,2° O");
  });

  it("gère l'hémisphère sud et l'est, et garde une décimale", () => {
    expect(formaterPosition(-5, 12.25)).toBe("5,0° S, 12,3° E");
  });
});
