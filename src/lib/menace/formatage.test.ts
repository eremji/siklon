import { describe, expect, it } from "vitest";
import { formaterDelai, formaterDistance, formaterHeureAvis, formaterHeurePassage } from "./formatage";

describe("formaterHeurePassage", () => {
  it("arrondit l'heure estimée à l'heure la plus proche, à l'heure locale de l'île", () => {
    expect(formaterHeurePassage("2026-09-11T07:15:00.000Z", "America/Guadeloupe")).toBe("11 septembre vers 3 h");
    expect(formaterHeurePassage("2026-09-11T07:30:00.000Z", "America/Guadeloupe")).toBe("11 septembre vers 4 h");
  });

  it("suit l'heure d'été des îles qui l'appliquent", () => {
    expect(formaterHeurePassage("2026-09-11T16:00:00.000Z", "America/Havana")).toBe("11 septembre vers 12 h");
    expect(formaterHeurePassage("2026-12-11T17:00:00.000Z", "America/Havana")).toBe("11 décembre vers 12 h");
  });
});

describe("formaterHeureAvis", () => {
  it("donne l'heure exacte de l'avis NHC, à l'heure locale de l'île", () => {
    expect(formaterHeureAvis("2026-09-10T15:00:00.000Z", "America/Guadeloupe")).toBe("10 septembre à 11 h 00");
    expect(formaterHeureAvis("2026-09-10T15:00:00.000Z", "America/Jamaica")).toBe("10 septembre à 10 h 00");
  });
});

describe("formaterDistance", () => {
  it("arrondit la distance prévue à la dizaine de km", () => {
    expect(formaterDistance(181.04)).toBe("environ 180 km");
    expect(formaterDistance(55)).toBe("environ 60 km");
    expect(formaterDistance(3)).toBe("moins de 10 km");
  });
});

describe("formaterDelai", () => {
  const maintenant = new Date("2026-09-10T19:00:00.000Z");

  it("donne le délai avant le passage en heures, puis en jours au-delà de 48 h", () => {
    expect(formaterDelai("2026-09-11T07:15:00.000Z", maintenant)).toBe("Dans environ 12 h");
    expect(formaterDelai("2026-09-12T18:00:00.000Z", maintenant)).toBe("Dans environ 47 h");
    expect(formaterDelai("2026-09-13T08:45:00.000Z", maintenant)).toBe("Dans environ 3 jours");
  });

  it("signale un passage imminent ou déjà atteint", () => {
    expect(formaterDelai("2026-09-10T19:40:00.000Z", maintenant)).toBe("Dans moins d'une heure");
    expect(formaterDelai("2026-09-10T15:00:00.000Z", maintenant)).toBe("Passage estimé déjà atteint");
  });
});
