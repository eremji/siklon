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
    expect(infoNiveau(niveau)).toMatchObject({ libelle, consigne });
  });

  it("seul le vert signifie qu'aucune alerte n'est en cours", () => {
    expect(NIVEAUX.filter((n) => !infoNiveau(n).alerte)).toEqual(["vert"]);
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
