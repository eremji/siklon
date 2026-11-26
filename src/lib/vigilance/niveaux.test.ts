import { describe, expect, it } from "vitest";
import { estNiveau, infoNiveau, niveauDepuisCode, NIVEAUX } from "./niveaux";

describe("niveaux de vigilance Météo-France", () => {
  it("liste les six niveaux du dispositif Antilles, du plus faible au plus fort, puis le gris", () => {
    expect(NIVEAUX).toEqual(["vert", "jaune", "orange", "rouge", "violet", "gris"]);
  });

  it.each([
    ["vert", "Vigilance verte", "Pas de vigilance"],
    ["jaune", "Vigilance jaune", "Soyez attentifs"],
    ["orange", "Vigilance orange", "Préparez-vous"],
    ["rouge", "Vigilance rouge", "Protégez-vous"],
    ["violet", "Vigilance violette", "Confinez-vous"],
    ["gris", "Vigilance grise", "Restez prudents"],
  ] as const)("le niveau %s s'écrit « %s » avec la consigne « %s »", (niveau, libelle, consigne) => {
    expect(infoNiveau(niveau, "fr")).toMatchObject({ libelle, consigne });
  });

  it("seul le vert signifie qu'aucune alerte n'est en cours", () => {
    expect(NIVEAUX.filter((n) => !infoNiveau(n, "fr").alerte)).toEqual(["vert"]);
    expect(NIVEAUX.filter((n) => !infoNiveau(n, "en").alerte)).toEqual(["vert"]);
  });

  it.each([
    ["vert", "Green vigilance", "No vigilance"],
    ["jaune", "Yellow vigilance", "Be aware"],
    ["orange", "Orange vigilance", "Get prepared"],
    ["rouge", "Red vigilance", "Protect yourself"],
    ["violet", "Purple vigilance", "Shelter in place"],
    ["gris", "Grey vigilance", "Remain cautious"],
  ] as const)("en anglais, le niveau %s s'écrit « %s » avec la consigne « %s » (US-10)", (niveau, libelle, consigne) => {
    expect(infoNiveau(niveau, "en")).toMatchObject({ libelle, consigne });
  });

  it.each([
    [1, "vert"],
    [2, "jaune"],
    [3, "orange"],
    [4, "rouge"],
    [5, "violet"],
    [6, "gris"],
  ] as const)("le code couleur %i du flux correspond au niveau %s", (code, niveau) => {
    expect(niveauDepuisCode(code)).toBe(niveau);
  });

  it.each([0, -1, 7, 1.5, "1", null, undefined])("le code couleur %j ne correspond à aucun niveau", (code) => {
    expect(niveauDepuisCode(code)).toBeUndefined();
  });

  it("reconnaît les niveaux connus et rejette le reste", () => {
    expect(estNiveau("orange")).toBe(true);
    expect(estNiveau("bleu")).toBe(false);
    expect(estNiveau("Orange")).toBe(false);
    expect(estNiveau("constructor")).toBe(false);
    expect(estNiveau(3)).toBe(false);
    expect(estNiveau(undefined)).toBe(false);
  });
});
