import { describe, expect, it } from "vitest";
import { NIVEAUX } from "@/lib/vigilance/niveaux";
import { CHECKLISTS, SOURCES } from "./contenu";

const elements = NIVEAUX.flatMap((niveau) => CHECKLISTS.fr[niveau].sections.flatMap((section) => section.elements));

describe("contenu de la checklist de base", () => {
  it("a une liste pour chaque niveau de vigilance, avec au moins un élément", () => {
    for (const niveau of NIVEAUX) {
      expect(CHECKLISTS.fr[niveau].sections.flatMap((section) => section.elements).length).toBeGreaterThan(0);
    }
  });

  it("donne à chaque élément un identifiant unique et stable (minuscules, chiffres, tirets)", () => {
    const ids = elements.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("préfixe chaque identifiant par son niveau, pour qu'un élément ne change jamais de liste", () => {
    for (const niveau of NIVEAUX) {
      for (const { id } of CHECKLISTS.fr[niveau].sections.flatMap((section) => section.elements)) {
        expect(id.startsWith(`${niveau}-`)).toBe(true);
      }
    }
  });

  it("cite au moins une source connue pour chaque élément", () => {
    for (const element of elements) {
      expect(element.sources.length).toBeGreaterThan(0);
      for (const source of element.sources) expect(SOURCES.fr[source]).toBeDefined();
    }
  });

  it("renvoie chaque source vers son document officiel en https", () => {
    for (const source of Object.values(SOURCES.fr)) {
      expect(source.url).toMatch(/^https:\/\//);
      expect(source.auteur).not.toBe("");
      expect(source.titre).not.toBe("");
    }
  });

  it("cite la préfecture pour le délai de chaque niveau d'alerte", () => {
    expect(CHECKLISTS.fr.vert.delai).toBeUndefined();
    for (const niveau of NIVEAUX.filter((n) => n !== "vert")) {
      expect(CHECKLISTS.fr[niveau].delai?.source).toBe("prefecture-guadeloupe-niveaux");
    }
  });

  it("n'utilise que des sources citées par au moins un élément ou un délai", () => {
    const delais = NIVEAUX.flatMap((niveau) => CHECKLISTS.fr[niveau].delai?.source ?? []);
    const citees = new Set([...elements.flatMap(({ sources }) => sources), ...delais]);
    expect([...citees].sort()).toEqual(Object.keys(SOURCES.fr).sort());
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

describe("contenu de la checklist en anglais (US-10)", () => {
  // Structure d'une liste : sections, identifiants et sources, sans les textes.
  const structure = (langue: "fr" | "en") =>
    NIVEAUX.map((niveau) => ({
      niveau,
      delai: CHECKLISTS[langue][niveau].delai?.source,
      sections: CHECKLISTS[langue][niveau].sections.map((section) => ({
        titre: section.titre === undefined,
        elements: section.elements.map(({ id, sources }) => ({ id, sources })),
      })),
    }));
  const elementsEn = NIVEAUX.flatMap((niveau) => CHECKLISTS.en[niveau].sections.flatMap((section) => section.elements));

  it("garde les mêmes identifiants, dans le même ordre, avec les mêmes sources (états des comptes, US-08)", () => {
    expect(structure("en")).toEqual(structure("fr"));
  });

  it("traduit chaque élément, chaque titre et chaque délai", () => {
    const francais = new Map(elements.map(({ id, texte }) => [id, texte]));
    for (const { id, texte } of elementsEn) {
      expect(texte).not.toBe("");
      expect(texte).not.toBe(francais.get(id));
    }
    for (const niveau of NIVEAUX) {
      expect(CHECKLISTS.en[niveau].titre).not.toBe(CHECKLISTS.fr[niveau].titre);
      expect(CHECKLISTS.en[niveau].delai?.texte).not.toBe(CHECKLISTS.fr[niveau].delai?.texte ?? "absent");
    }
  });

  it("renvoie aux mêmes documents officiels français, et le dit", () => {
    expect(Object.keys(SOURCES.en)).toEqual(Object.keys(SOURCES.fr));
    for (const [id, source] of Object.entries(SOURCES.en)) {
      expect(source.url).toBe(SOURCES.fr[id as keyof typeof SOURCES.fr].url);
      expect(source.titre).toMatch(/in French\)$/);
    }
    expect(SOURCES.en["croix-rouge-kit"].auteur).toBe("French Red Cross (PIRAC)");
  });

  it("reprend la quantité d'eau de la Croix-Rouge en litres", () => {
    expect(elementsEn.find(({ id }) => id === "vert-eau")?.texte).toBe(
      "Drinking water: 3 litres per person per day, for 72 hours (9 litres per person).",
    );
  });

  it("explique les numéros d'urgence français à un lecteur non francophone", () => {
    expect(elementsEn.find(({ id }) => id === "vert-numeros")?.texte).toContain("15 (medical emergency), 17 (police), 18 (fire brigade)");
  });

  it("ne conseille jamais de bougie", () => {
    for (const { texte } of elementsEn.filter(({ texte }) => /candle/i.test(texte))) expect(texte).toMatch(/never candles/i);
  });
});
