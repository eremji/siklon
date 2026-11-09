import { describe, expect, it } from "vitest";
import { fichierVigilance, ILES_VIGILANCE, pageVigilance } from "./fichiers";

describe("page de vigilance Météo-France de chaque île", () => {
  it.each([
    ["guadeloupe", "https://meteofrance.gp/fr/vigilance/guadeloupe"],
    ["martinique", "https://meteofrance.mq/fr/vigilance"],
    ["saint-martin", "https://meteofrance.gp/fr/vigilance/saint-martin-saint-barthelemy"],
    ["saint-barthelemy", "https://meteofrance.gp/fr/vigilance/saint-martin-saint-barthelemy"],
  ])("%s renvoie vers la page outre-mer %s", (ile, url) => {
    expect(pageVigilance(fichierVigilance(ile)!)).toBe(url);
  });
});

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
