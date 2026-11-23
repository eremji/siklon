import { describe, expect, it } from "vitest";
import { COMMUN } from "./commun";
import { traductions } from "./traductions";

describe("traductions", () => {
  it("range les textes d'une partie de l'interface par langue", () => {
    expect(traductions({ bonjour: "Bonjour" }, { bonjour: "Hello" })).toEqual({
      fr: { bonjour: "Bonjour" },
      en: { bonjour: "Hello" },
    });
  });

  it("refuse, au typage, un texte anglais qui manque", () => {
    // @ts-expect-error : la clé « nuit » manque en anglais.
    traductions({ jour: "Jour", nuit: "Nuit" }, { jour: "Day" });
    // @ts-expect-error : une fonction attendue, pas un texte.
    traductions({ km: (n: number) => `${n} km` }, { km: "km" });
  });
});

describe("textes communs", () => {
  it("donnent la mention officielle dans chaque langue (US-12)", () => {
    expect(COMMUN.fr.mention).toBe("Siklon ne remplace pas les consignes officielles. Suivez les autorités locales.");
    expect(COMMUN.en.mention).toBe("Siklon does not replace official instructions. Follow local authorities.");
  });

  it("donnent la description du site dans chaque langue", () => {
    expect(COMMUN.fr.description).toBe("Suivi des cyclones tropicaux pour les Antilles.");
    expect(COMMUN.en.description).toBe("Tropical cyclone tracking for the Caribbean.");
  });
});
