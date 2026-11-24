import { describe, expect, it } from "vitest";
import { formaterJourHeure } from "./dates";

describe("formaterJourHeure", () => {
  const avis = new Date("2026-09-10T15:00:00.000Z");

  it("écrit en français le jour, le mois et l'heure sur 24 h, à l'heure du fuseau", () => {
    expect(formaterJourHeure(avis, "America/Guadeloupe", "fr")).toBe("10 septembre à 11 h 00");
    expect(formaterJourHeure(avis, "America/Jamaica", "fr")).toBe("10 septembre à 10 h 00");
  });

  it("écrit en anglais le jour, le mois et l'heure sur 12 h", () => {
    expect(formaterJourHeure(avis, "America/Guadeloupe", "en")).toBe("10 September at 11:00 am");
    expect(formaterJourHeure(new Date("2026-09-10T16:05:00.000Z"), "America/Guadeloupe", "en")).toBe(
      "10 September at 12:05 pm",
    );
    expect(formaterJourHeure(new Date("2026-09-11T04:00:00.000Z"), "America/Guadeloupe", "en")).toBe(
      "11 September at 12:00 am",
    );
  });
});
