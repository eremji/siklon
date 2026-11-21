import { describe, expect, it } from "vitest";
import { etapeChecklist, etapesPrecedentes } from "./etapes";

describe("etapeChecklist", () => {
  it.each(["vert", "jaune", "orange", "rouge", "violet", "gris"] as const)(
    "affiche la liste du même niveau en vigilance %s",
    (niveau) => {
      expect(etapeChecklist(niveau)).toBe(niveau);
    },
  );

  it.each([
    ["TWA", "orange"],
    ["HWA", "orange"],
    ["TWR", "rouge"],
    ["HWR", "rouge"],
  ] as const)("associe le code NHC %s à la liste %s", (code, etape) => {
    expect(etapeChecklist(code)).toBe(etape);
  });

  it("affiche la liste d'avant la saison quand aucune veille ni aucun avertissement NHC n'est en cours", () => {
    expect(etapeChecklist("aucune")).toBe("vert");
  });
});

describe("etapesPrecedentes", () => {
  it("n'a rien avant la liste d'avant la saison", () => {
    expect(etapesPrecedentes("vert")).toEqual([]);
  });

  it("rappelle les listes de préparation des niveaux précédents, du plus ancien au plus récent", () => {
    expect(etapesPrecedentes("orange")).toEqual(["vert", "jaune"]);
    expect(etapesPrecedentes("violet")).toEqual(["vert", "jaune", "orange", "rouge"]);
  });

  it("ne rappelle aucune liste de préparation en vigilance grise : le plus fort est passé", () => {
    expect(etapesPrecedentes("gris")).toEqual([]);
  });
});
