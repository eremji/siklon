import { describe, expect, it } from "vitest";
import { type Ile, trouverIle } from "@/lib/iles";
import { chargerAlertesNhc } from "@/lib/nhc/alertes";
import { evaluerMenaces } from "@/lib/nhc/menace";
import { etatFixture as fluxFixture, positionsFixture, watchesFixture } from "@/lib/nhc/source";
import { etatFixture as vigilanceFixture } from "@/lib/vigilance/fixtures";
import { type AlerteIle, ileMenacee, partageIle } from "./ile";

const LU_LE = "2026-09-10T19:00:00.000Z";
// Fixture : avis n° 14 de Kyle émis à 15 h UTC ; il est 19 h UTC.
const MAINTENANT = new Date(LU_LE);
const flux = fluxFixture("actifs", LU_LE);
const systemes = flux.etat === "ok" ? flux.systemes : [];

const ile = (slug: string): Ile => trouverIle(slug)!;
const menaces = (slug: string) => evaluerMenaces(ile(slug), systemes, positionsFixture("actifs")).menaces;
const vigilance = (nom: Parameters<typeof vigilanceFixture>[0]): AlerteIle => ({
  source: "meteo-france",
  etat: vigilanceFixture(nom),
});
async function alertesNhc(slug: string): Promise<AlerteIle> {
  const { alerte } = ile(slug);
  if (alerte.source !== "nhc") throw new Error(`${slug} suit la vigilance Météo-France`);
  return { source: "nhc", etat: await chargerAlertesNhc(flux, alerte.emprise, watchesFixture("actifs")) };
}

describe("partageIle (US-21)", () => {
  it("donne la menace comme une estimation, le niveau de vigilance et chaque source avec son heure", () => {
    expect(partageIle(ile("guadeloupe"), menaces("guadeloupe"), vigilance("rouge"), "fr", MAINTENANT)).toEqual({
      titre: "Guadeloupe · Siklon",
      texte:
        "Ouragan Kyle (cat. 4) : passage estimé à environ 180 km de Pointe-à-Pitre dans environ 12 h. " +
        "Guadeloupe : Vigilance rouge · Protégez-vous. " +
        "Sources : NHC, avis n° 14 du 10 septembre à 11 h 00 ; Météo-France, mise à jour du 9 novembre à 05 h 42 (heure locale).",
    });
  });

  it("existe en anglais, avec le terme d'origine de Météo-France", () => {
    expect(partageIle(ile("guadeloupe"), menaces("guadeloupe"), vigilance("rouge"), "en", MAINTENANT)).toEqual({
      titre: "Guadeloupe · Siklon",
      texte:
        "Hurricane Kyle (cat. 4): estimated closest approach about 180 km from Pointe-à-Pitre in about 12 hours. " +
        "Guadeloupe: Red vigilance · Protect yourself (Vigilance rouge · Protégez-vous). " +
        "Sources: NHC, advisory 14 issued 10 September at 11:00 am; Météo-France, updated 9 November at 5:42 am (local time).",
    });
  });

  it("partage une vigilance sans système menaçant, avec Météo-France pour seule source", () => {
    expect(partageIle(ile("martinique"), [], vigilance("jaune"), "fr", MAINTENANT).texte).toBe(
      "Martinique : Vigilance jaune · Soyez attentifs. Source : Météo-France, mise à jour du 9 novembre à 05 h 42 (heure locale).",
    );
  });

  it("n'écrit pas de niveau quand la vigilance est indisponible", () => {
    expect(partageIle(ile("guadeloupe"), menaces("guadeloupe"), vigilance("indisponible"), "fr", MAINTENANT).texte).toBe(
      "Ouragan Kyle (cat. 4) : passage estimé à environ 180 km de Pointe-à-Pitre dans environ 12 h. " +
        "Source : NHC, avis n° 14 du 10 septembre à 11 h 00 (heure locale).",
    );
  });

  it("donne la veille ou l'avertissement NHC le plus grave pour une île sans vigilance Météo-France", async () => {
    const texte = partageIle(ile("dominique"), menaces("dominique"), await alertesNhc("dominique"), "fr", MAINTENANT).texte;
    expect(texte).toContain("Dominique : Avertissement d'ouragan (Hurricane Warning) pour Kyle.");
    expect(texte).toMatch(/Source : NHC, avis n° 14 du 10 septembre à 11 h 00 \(heure locale\)\.$/);
  });

  it("donne le terme d'origine NHC seul en anglais", async () => {
    const texte = partageIle(ile("dominique"), menaces("dominique"), await alertesNhc("dominique"), "en", MAINTENANT).texte;
    expect(texte).toContain("Dominica: Hurricane Warning for Kyle.");
  });

  it("dit quand l'heure estimée du passage est déjà atteinte", () => {
    const tard = new Date("2026-09-11T09:00:00.000Z");
    expect(partageIle(ile("guadeloupe"), menaces("guadeloupe"), vigilance("rouge"), "fr", tard).texte).toMatch(
      /^Ouragan Kyle \(cat\. 4\) : passage estimé à environ 180 km de Pointe-à-Pitre, heure estimée déjà atteinte\./,
    );
  });

  it("signale un avis NHC de plus de 6 h, comme la page de l'île", () => {
    const tard = new Date("2026-09-10T23:00:00.000Z");
    expect(partageIle(ile("guadeloupe"), menaces("guadeloupe"), vigilance("rouge"), "fr", tard).texte).toMatch(
      /\(heure locale\)\. Données possiblement obsolètes : aucun nouvel avis du NHC depuis plus de 6 h\.$/,
    );
  });
  it("garde la menace d'une mise à jour NHC en échec, avec l'heure locale de la dernière lecture réussie (US-11)", () => {
    const luLe = "2026-09-10T18:00:00.000Z";
    const ancien = (langue: "fr" | "en") =>
      partageIle(ile("guadeloupe"), menaces("guadeloupe"), vigilance("rouge"), langue, MAINTENANT, luLe).texte;
    expect(ancien("fr")).toBe(
      "Ouragan Kyle (cat. 4) : passage estimé à environ 180 km de Pointe-à-Pitre dans environ 12 h. " +
        "Guadeloupe : Vigilance rouge · Protégez-vous. " +
        "Sources : NHC, avis n° 14 du 10 septembre à 11 h 00 ; Météo-France, mise à jour du 9 novembre à 05 h 42 (heure locale). " +
        "Dernière donnée NHC lue le 10 septembre à 14 h 00 (heure locale) : la mise à jour a échoué.",
    );
    expect(ancien("en")).toMatch(/\(local time\)\. Last NHC data read 10 September at 2:00 pm \(local time\): the update failed\.$/);
  });
});

describe("ileMenacee (US-21)", () => {
  const sansSysteme: ReturnType<typeof menaces> = [];

  it("vaut vrai dès qu'un système passe dans le rayon de surveillance", () => {
    expect(ileMenacee(menaces("guadeloupe"), vigilance("vert"))).toBe(true);
  });

  it("vaut vrai pour une vigilance jaune ou plus, ou une veille ou un avertissement NHC", async () => {
    expect(ileMenacee(sansSysteme, vigilance("jaune"))).toBe(true);
    expect(ileMenacee(sansSysteme, await alertesNhc("dominique"))).toBe(true);
  });

  it("vaut faux sans système menaçant ni alerte, ou quand l'alerte est indisponible", () => {
    expect(ileMenacee(sansSysteme, vigilance("vert"))).toBe(false);
    expect(ileMenacee(sansSysteme, vigilance("indisponible"))).toBe(false);
    expect(ileMenacee(sansSysteme, { source: "nhc", etat: { etat: "ok", alertes: [], luLe: LU_LE } })).toBe(false);
  });
});
