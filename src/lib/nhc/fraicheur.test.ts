import { describe, expect, it } from "vitest";
import { SEUIL_OBSOLESCENCE_H, avisLePlusRecent, estObsolete, formaterHeureAntilles, libelleHeureAntilles } from "./fraicheur";

const emisLe = "2026-09-10T15:00:00.000Z";

describe("estObsolete", () => {
  it("fixe le seuil à 6 h", () => {
    expect(SEUIL_OBSOLESCENCE_H).toBe(6);
  });

  it.each([
    ["5 h 59", "2026-09-10T20:59:00.000Z", false],
    ["6 h 00 pile", "2026-09-10T21:00:00.000Z", false],
    ["6 h 01", "2026-09-10T21:01:00.000Z", true],
    ["un jour", "2026-09-11T15:00:00.000Z", true],
  ])("après %s sans nouvel avis : obsolète = %s", (_duree, maintenant, attendu) => {
    expect(estObsolete(emisLe, new Date(maintenant))).toBe(attendu);
  });
});

describe("formaterHeureAntilles", () => {
  it("affiche l'heure des Antilles françaises (UTC−4)", () => {
    expect(formaterHeureAntilles(emisLe, "fr")).toBe("10 septembre à 11 h 00");
  });

  it("change de jour quand il le faut", () => {
    expect(formaterHeureAntilles("2026-09-11T02:30:00.000Z", "fr")).toBe("10 septembre à 22 h 30");
  });
});

describe("avisLePlusRecent", () => {
  it("renvoie l'heure d'avis la plus récente, ou null sans avis", () => {
    expect(avisLePlusRecent(["2026-09-10T12:00:00.000Z", emisLe, "2026-09-09T21:00:00.000Z"])).toBe(emisLe);
    expect(avisLePlusRecent([])).toBeNull();
  });
});

describe("heure des Antilles en anglais (US-10)", () => {
  it("écrit la date et l'heure sur 12 h", () => {
    expect(formaterHeureAntilles("2026-09-10T15:00:00.000Z", "en")).toBe("10 September at 11:00 am");
  });

  it("nomme le fuseau dans chaque langue", () => {
    expect(libelleHeureAntilles("fr")).toBe("heure des Antilles françaises");
    expect(libelleHeureAntilles("en")).toBe("Atlantic Standard Time, UTC−4");
  });
});
