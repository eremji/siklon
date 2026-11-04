import { describe, expect, it } from "vitest";
import { fichierVigilance, ILES_VIGILANCE } from "./fichiers";

describe("correspondance île → fichier Météo-France", () => {
  it.each([
    ["martinique", "CDPV85TFFF"],
    ["guadeloupe", "CDPV85TFFR"],
    ["saint-martin", "CDPV85TFFJ"],
    ["saint-barthelemy", "CDPV85TFFJ"],
  ])("%s lit le fichier %s", (ile, fichier) => {
    expect(fichierVigilance(ile)).toBe(fichier);
  });

  it("couvre exactement les quatre îles françaises", () => {
    expect(ILES_VIGILANCE).toEqual(["guadeloupe", "martinique", "saint-martin", "saint-barthelemy"]);
  });

  it.each(["dominique", "Martinique", "", "constructor", "__proto__", "toString"])(
    "n'associe aucun fichier à « %s »",
    (ile) => {
      expect(fichierVigilance(ile)).toBeUndefined();
    },
  );
});
