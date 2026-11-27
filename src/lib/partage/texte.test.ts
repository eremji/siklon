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
        "Partagé le 10 septembre à 13 h 00 (heure des Antilles françaises). " +
        "Ouragan Kyle (cat. 4) : vents maximaux de 220 km/h, se déplace vers l'ouest-nord-ouest à 19 km/h. " +
        "Source : NHC, avis n° 14 du 10 septembre à 11 h 00 (heure des Antilles françaises).",
    });
  });

  it("existe en anglais", () => {
    expect(partageSysteme(kyle, "en", MAINTENANT)).toEqual({
      titre: "Hurricane Kyle · Siklon",
      texte:
        "Shared 10 September at 1:00 pm (Atlantic Standard Time, UTC−4). " +
        "Hurricane Kyle (cat. 4): maximum sustained winds 220 km/h, moving toward the west-northwest at 19 km/h. " +
        "Source: NHC, advisory 14 issued 10 September at 11:00 am (Atlantic Standard Time, UTC−4).",
    });
  });

  it("n'écrit pas de catégorie hors ouragan", () => {
    expect(partageSysteme(leah, "fr", MAINTENANT).texte).toMatch(
      /^Partagé le [^.]+\. Tempête tropicale Leah : vents maximaux de 85 km\/h, se déplace vers l'ouest à 24 km\/h\. Source : NHC, avis n° 3 /,
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
      /^Partagé le [^.]+\. Ouragan Kyle \(cat\. 4\) : vents maximaux de 220 km\/h\. Source : NHC/,
    );
  });

  it("signale un avis de plus de 6 h, comme la fiche", () => {
    const tard = new Date("2026-09-10T21:01:00.000Z");
    expect(partageSysteme(kyle, "fr", tard).texte).toMatch(
      /\(heure des Antilles françaises\)\. Données possiblement obsolètes : aucun nouvel avis du NHC depuis plus de 6 h\.$/,
    );
    expect(partageSysteme(kyle, "fr", MAINTENANT).texte).not.toContain("obsolètes");
  });

  it("garde la donnée d'une mise à jour NHC en échec, avec l'heure de la dernière lecture réussie (US-11)", () => {
    const luLe = "2026-09-10T16:00:00.000Z";
    expect(partageSysteme(kyle, "fr", MAINTENANT, luLe).texte).toBe(
      "Partagé le 10 septembre à 13 h 00 (heure des Antilles françaises). " +
        "Ouragan Kyle (cat. 4) : vents maximaux de 220 km/h, se déplace vers l'ouest-nord-ouest à 19 km/h. " +
        "Source : NHC, avis n° 14 du 10 septembre à 11 h 00 (heure des Antilles françaises). " +
        "Dernière donnée NHC lue le 10 septembre à 12 h 00 (heure des Antilles françaises) : la mise à jour a échoué.",
    );
    expect(partageSysteme(kyle, "en", MAINTENANT, luLe).texte).toMatch(
      /\(Atlantic Standard Time, UTC−4\)\. Last NHC data read 10 September at 12:00 pm \(Atlantic Standard Time, UTC−4\): the update failed\.$/,
    );
    expect(partageSysteme(kyle, "fr", MAINTENANT, null).texte).not.toContain("échoué");
  });

  it("date chaque partage, pour qu'il ne soit pas lu plus tard comme actuel", () => {
    expect(partageSysteme(kyle, "fr", MAINTENANT).texte).toMatch(
      /^Partagé le 10 septembre à 13 h 00 \(heure des Antilles françaises\)\. Ouragan Kyle /,
    );
    expect(partageSysteme(kyle, "en", MAINTENANT).texte).toMatch(
      /^Shared 10 September at 1:00 pm \(Atlantic Standard Time, UTC−4\)\. Hurricane Kyle /,
    );
  });
});
