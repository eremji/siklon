import { describe, expect, it } from "vitest";
import actifs from "@/lib/nhc/__fixtures__/current-storms-actifs.json";
import { type SystemeActif, lireCurrentStorms } from "@/lib/nhc/systemes";
import { partageSysteme } from "./texte";

const { systemes } = lireCurrentStorms(actifs);
const [kyle, leah] = systemes;
// Deux heures après l'avis n° 14 de Kyle (15 h 00 UTC, 11 h 00 aux Antilles).
const MAINTENANT = new Date("2026-09-10T17:00:00.000Z");

describe("partageSysteme (US-21)", () => {
  it("résume un ouragan avec sa catégorie, ses vents, son déplacement, sa source et l'heure de l'avis", () => {
    expect(partageSysteme(kyle, "fr", MAINTENANT)).toEqual({
      titre: "Ouragan Kyle · Siklon",
      texte:
        "Ouragan Kyle (cat. 4) : vents maximaux de 220 km/h, se déplace vers l'ouest-nord-ouest à 19 km/h. " +
        "Source : NHC, avis n° 14 du 10 septembre à 11 h 00 (heure des Antilles françaises).",
    });
  });

  it("existe en anglais", () => {
    expect(partageSysteme(kyle, "en", MAINTENANT)).toEqual({
      titre: "Hurricane Kyle · Siklon",
      texte:
        "Hurricane Kyle (cat. 4): maximum sustained winds 220 km/h, moving toward the west-northwest at 19 km/h. " +
        "Source: NHC, advisory 14 issued 10 September at 11:00 am (Atlantic Standard Time, UTC−4).",
    });
  });

  it("n'écrit pas de catégorie hors ouragan", () => {
    expect(partageSysteme(leah, "fr", MAINTENANT).texte).toMatch(
      /^Tempête tropicale Leah : vents maximaux de 85 km\/h, se déplace vers l'ouest à 24 km\/h\. Source : NHC, avis n° 3 /,
    );
  });

  it("dit stationnaire quand le système ne se déplace pas", () => {
    const immobile: SystemeActif = { ...kyle, deplacement: { directionDeg: 0, vitesseMph: 0 } };
    expect(partageSysteme(immobile, "fr", MAINTENANT).texte).toContain("vents maximaux de 220 km/h, stationnaire.");
    expect(partageSysteme(immobile, "en", MAINTENANT).texte).toContain("winds 220 km/h, stationary.");
  });

  it("n'invente pas de déplacement quand le NHC n'en donne pas", () => {
    const sansDeplacement: SystemeActif = { ...kyle, deplacement: undefined };
    expect(partageSysteme(sansDeplacement, "fr", MAINTENANT).texte).toMatch(
      /^Ouragan Kyle \(cat\. 4\) : vents maximaux de 220 km\/h\. Source : NHC/,
    );
  });

  it("signale un avis de plus de 6 h, comme la fiche", () => {
    const tard = new Date("2026-09-10T21:01:00.000Z");
    expect(partageSysteme(kyle, "fr", tard).texte).toMatch(
      /\(heure des Antilles françaises\)\. Données possiblement obsolètes : aucun nouvel avis du NHC depuis plus de 6 h\.$/,
    );
    expect(partageSysteme(kyle, "fr", MAINTENANT).texte).not.toContain("obsolètes");
  });
});
