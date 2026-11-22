import { describe, expect, it } from "vitest";
import { chemin, decouperChemin, estLangue, langueDuNavigateur, LANGUE_PAR_DEFAUT } from "./langues";

describe("langueDuNavigateur", () => {
  it("prend l'anglais pour un navigateur en anglais", () => {
    expect(langueDuNavigateur("en-US,en;q=0.9")).toBe("en");
  });

  it("prend le français pour un navigateur en français", () => {
    expect(langueDuNavigateur("fr-FR,fr;q=0.9,en;q=0.8")).toBe("fr");
  });

  it("prend la première langue connue de l'app dans la liste du navigateur", () => {
    expect(langueDuNavigateur("es-ES,es;q=0.9,en;q=0.5")).toBe("en");
  });

  it("suit les poids q plutôt que l'ordre d'écriture", () => {
    expect(langueDuNavigateur("en;q=0.3, fr;q=0.8")).toBe("fr");
  });

  it("ignore une langue de poids nul", () => {
    expect(langueDuNavigateur("en;q=0, es")).toBe(LANGUE_PAR_DEFAUT);
  });

  it("ne tient pas compte de la casse", () => {
    expect(langueDuNavigateur("EN-gb")).toBe("en");
  });

  it("prend le français quand le navigateur ne propose ni français ni anglais", () => {
    expect(LANGUE_PAR_DEFAUT).toBe("fr");
    expect(langueDuNavigateur("de-DE,de;q=0.9")).toBe("fr");
    expect(langueDuNavigateur("*")).toBe("fr");
  });

  it("prend le français sans en-tête", () => {
    expect(langueDuNavigateur(null)).toBe("fr");
    expect(langueDuNavigateur("")).toBe("fr");
  });
});

describe("estLangue", () => {
  it("n'accepte que fr et en", () => {
    expect(estLangue("fr")).toBe(true);
    expect(estLangue("en")).toBe(true);
    expect(estLangue("es")).toBe(false);
    expect(estLangue("EN")).toBe(false);
    expect(estLangue(undefined)).toBe(false);
  });
});

describe("chemin", () => {
  it("préfixe un chemin par la langue", () => {
    expect(chemin("en", "/iles/guadeloupe")).toBe("/en/iles/guadeloupe");
    expect(chemin("fr", "/compte?x=1")).toBe("/fr/compte?x=1");
  });

  it("donne l'accueil de la langue pour la racine", () => {
    expect(chemin("fr", "/")).toBe("/fr");
  });
});

describe("decouperChemin", () => {
  it("sépare la langue du reste du chemin", () => {
    expect(decouperChemin("/en/iles/guadeloupe")).toEqual({ langue: "en", reste: "/iles/guadeloupe" });
    expect(decouperChemin("/fr")).toEqual({ langue: "fr", reste: "/" });
    expect(decouperChemin("/fr/")).toEqual({ langue: "fr", reste: "/" });
  });

  it("ne voit pas de langue dans un chemin qui n'en a pas", () => {
    expect(decouperChemin("/iles")).toEqual({ langue: undefined, reste: "/iles" });
    expect(decouperChemin("/")).toEqual({ langue: undefined, reste: "/" });
    expect(decouperChemin("/english")).toEqual({ langue: undefined, reste: "/english" });
    expect(decouperChemin("/frites/x")).toEqual({ langue: undefined, reste: "/frites/x" });
  });
});
