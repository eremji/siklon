import { describe, expect, it } from "vitest";
import { NIVEAUX } from "@/lib/vigilance/niveaux";
import { CHECKLISTS, SOURCES } from "./contenu";

const elements = NIVEAUX.flatMap((niveau) => CHECKLISTS[niveau].sections.flatMap((section) => section.elements));

describe("contenu de la checklist de base", () => {
  it("a une liste pour chaque niveau de vigilance, avec au moins un élément", () => {
    for (const niveau of NIVEAUX) {
      expect(CHECKLISTS[niveau].sections.flatMap((section) => section.elements).length).toBeGreaterThan(0);
    }
  });

  it("donne à chaque élément un identifiant unique et stable (minuscules, chiffres, tirets)", () => {
    const ids = elements.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("préfixe chaque identifiant par son niveau, pour qu'un élément ne change jamais de liste", () => {
    for (const niveau of NIVEAUX) {
      for (const { id } of CHECKLISTS[niveau].sections.flatMap((section) => section.elements)) {
        expect(id.startsWith(`${niveau}-`)).toBe(true);
      }
    }
  });

  it("cite au moins une source connue pour chaque élément", () => {
    for (const element of elements) {
      expect(element.sources.length).toBeGreaterThan(0);
      for (const source of element.sources) expect(SOURCES[source]).toBeDefined();
    }
  });

  it("renvoie chaque source vers son document officiel en https", () => {
    for (const source of Object.values(SOURCES)) {
      expect(source.url).toMatch(/^https:\/\//);
      expect(source.auteur).not.toBe("");
      expect(source.titre).not.toBe("");
    }
  });

  it("cite la préfecture pour le délai de chaque niveau d'alerte", () => {
    expect(CHECKLISTS.vert.delai).toBeUndefined();
    for (const niveau of NIVEAUX.filter((n) => n !== "vert")) {
      expect(CHECKLISTS[niveau].delai?.source).toBe("prefecture-guadeloupe-niveaux");
    }
  });

  it("n'utilise que des sources citées par au moins un élément ou un délai", () => {
    const delais = NIVEAUX.flatMap((niveau) => CHECKLISTS[niveau].delai?.source ?? []);
    const citees = new Set([...elements.flatMap(({ sources }) => sources), ...delais]);
    expect([...citees].sort()).toEqual(Object.keys(SOURCES).sort());
  });

  it("reprend la quantité d'eau de la Croix-Rouge : 3 litres par personne et par jour pour 72 h", () => {
    const eau = elements.find(({ id }) => id === "vert-eau");
    expect(eau?.texte).toContain("3 litres par personne et par jour");
    expect(eau?.sources).toEqual(["croix-rouge-kit"]);
  });

  it("ne conseille jamais de bougie (la Croix-Rouge les déconseille)", () => {
    const conseils = elements.filter(({ texte }) => /bougie/i.test(texte));
    for (const { texte } of conseils) expect(texte).toMatch(/jamais de bougie/i);
  });
});
