import { describe, expect, it } from "vitest";
import { lireFiltres } from "./filtres";

describe("lireFiltres (paramètres d'URL, donnée non fiable)", () => {
  it("renvoie aucun filtre sans paramètre", () => {
    expect(lireFiltres({})).toEqual({});
  });

  it("lit la catégorie minimale et la période", () => {
    expect(lireFiltres({ categorie: "3", de: "1950", a: "2000" })).toEqual({ categorieMin: 3, anneeMin: 1950, anneeMax: 2000 });
  });

  it("accepte la catégorie -1 (dépression)", () => {
    expect(lireFiltres({ categorie: "-1" })).toEqual({ categorieMin: -1 });
  });

  it.each([
    ["une catégorie hors échelle", { categorie: "6" }],
    ["une catégorie non entière", { categorie: "2.5" }],
    ["une catégorie injectée", { categorie: "3 or 1=1" }],
    ["une année avant HURDAT2", { de: "1850" }],
    ["une année trop lointaine", { a: "2101" }],
    ["une année non numérique", { de: "19x0" }],
    ["un paramètre répété", { categorie: ["3", "4"] }],
    ["des valeurs vides", { categorie: "", de: "", a: "" }],
  ])("ignore %s", (_cas, parametres) => {
    expect(lireFiltres(parametres)).toEqual({});
  });

  it("garde les filtres valides quand un autre est invalide", () => {
    expect(lireFiltres({ categorie: "abc", de: "1989" })).toEqual({ anneeMin: 1989 });
  });
});
