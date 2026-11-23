import { describe, expect, it } from "vitest";
import { formaterDelai, formaterDistance, formaterHeureAvis, formaterHeurePassage } from "./formatage";

describe("formaterHeurePassage", () => {
  it("arrondit l'heure estimée à l'heure la plus proche, à l'heure locale de l'île", () => {
    expect(formaterHeurePassage("2026-09-11T07:15:00.000Z", "America/Guadeloupe", "fr")).toBe("11 septembre vers 3 h");
    expect(formaterHeurePassage("2026-09-11T07:30:00.000Z", "America/Guadeloupe", "fr")).toBe("11 septembre vers 4 h");
  });

  it("suit l'heure d'été des îles qui l'appliquent", () => {
    expect(formaterHeurePassage("2026-09-11T16:00:00.000Z", "America/Havana", "fr")).toBe("11 septembre vers 12 h");
    expect(formaterHeurePassage("2026-12-11T17:00:00.000Z", "America/Havana", "fr")).toBe("11 décembre vers 12 h");
  });
});

describe("formaterHeureAvis", () => {
  it("donne l'heure exacte de l'avis NHC, à l'heure locale de l'île", () => {
    expect(formaterHeureAvis("2026-09-10T15:00:00.000Z", "America/Guadeloupe", "fr")).toBe("10 septembre à 11 h 00");
    expect(formaterHeureAvis("2026-09-10T15:00:00.000Z", "America/Jamaica", "fr")).toBe("10 septembre à 10 h 00");
  });
});

describe("formaterDistance", () => {
  it("arrondit la distance prévue à la dizaine de km", () => {
    expect(formaterDistance(181.04, "fr")).toBe("environ 180 km");
    expect(formaterDistance(55, "fr")).toBe("environ 60 km");
    expect(formaterDistance(3, "fr")).toBe("moins de 10 km");
  });
});

describe("formaterDelai", () => {
  const maintenant = new Date("2026-09-10T19:00:00.000Z");

  it("donne le délai avant le passage en heures, puis en jours au-delà de 48 h", () => {
    expect(formaterDelai("2026-09-11T07:15:00.000Z", maintenant, "fr")).toBe("Dans environ 12 h");
    expect(formaterDelai("2026-09-12T18:00:00.000Z", maintenant, "fr")).toBe("Dans environ 47 h");
    expect(formaterDelai("2026-09-13T08:45:00.000Z", maintenant, "fr")).toBe("Dans environ 3 jours");
  });

  it("signale un passage imminent ou déjà atteint", () => {
    expect(formaterDelai("2026-09-10T19:40:00.000Z", maintenant, "fr")).toBe("Dans moins d'une heure");
    expect(formaterDelai("2026-09-10T15:00:00.000Z", maintenant, "fr")).toBe("Passage estimé déjà atteint");
  });
});

describe("en anglais (US-10)", () => {
  const maintenant = new Date("2026-09-10T19:00:00.000Z");

  it("écrit l'heure de passage arrondie à l'heure, sur 12 h", () => {
    expect(formaterHeurePassage("2026-09-11T07:15:00.000Z", "America/Guadeloupe", "en")).toBe("11 September around 3 am");
    expect(formaterHeurePassage("2026-09-11T16:00:00.000Z", "America/Havana", "en")).toBe("11 September around 12 pm");
  });

  it("écrit l'heure de l'avis", () => {
    expect(formaterHeureAvis("2026-09-10T15:00:00.000Z", "America/Guadeloupe", "en")).toBe("10 September at 11:00 am");
  });

  it("écrit la distance arrondie", () => {
    expect(formaterDistance(181.04, "en")).toBe("about 180 km");
    expect(formaterDistance(3, "en")).toBe("less than 10 km");
  });

  it("écrit le délai avant le passage", () => {
    expect(formaterDelai("2026-09-11T07:15:00.000Z", maintenant, "en")).toBe("In about 12 hours");
    expect(formaterDelai("2026-09-13T08:45:00.000Z", maintenant, "en")).toBe("In about 3 days");
    expect(formaterDelai("2026-09-10T19:40:00.000Z", maintenant, "en")).toBe("In less than an hour");
    expect(formaterDelai("2026-09-10T15:00:00.000Z", maintenant, "en")).toBe("Estimated passage time already reached");
  });
});
