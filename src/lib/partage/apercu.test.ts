import { describe, expect, it } from "vitest";
import { type Ile, trouverIle } from "@/lib/iles";
import { chargerAlertesNhc } from "@/lib/nhc/alertes";
import { evaluerMenaces } from "@/lib/nhc/menace";
import { etatFixture as fluxFixture, positionsFixture, watchesFixture } from "@/lib/nhc/source";
import { etatFixture as vigilanceFixture } from "@/lib/vigilance/fixtures";
import { apercuIle, apercuSysteme } from "./apercu";
import { COULEURS_NHC, COULEURS_VIGILANCE } from "./couleurs";
import type { AlerteIle } from "./ile";

const LU_LE = "2026-09-10T19:00:00.000Z";
// Fixture : avis n° 14 de Kyle émis à 15 h UTC ; il est 19 h UTC.
const MAINTENANT = new Date(LU_LE);
const flux = fluxFixture("actifs", LU_LE);
const systemes = flux.etat === "ok" ? flux.systemes : [];
const [kyle] = systemes;

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

describe("apercuIle (US-21)", () => {
  it("donne l'île, la vigilance avec sa couleur, la menace estimée et les sources avec leur heure", () => {
    expect(apercuIle(ile("guadeloupe"), menaces("guadeloupe"), vigilance("rouge"), "fr", MAINTENANT)).toEqual({
      titre: "Guadeloupe",
      niveau: { libelle: "Vigilance rouge · Protégez-vous", origine: null, couleurs: COULEURS_VIGILANCE.rouge },
      lignes: [
        { fort: "Ouragan Kyle (cat. 4)", detail: "Passage estimé à environ 180 km de Pointe-à-Pitre dans environ 12 h" },
      ],
      sources:
        "Sources : NHC, avis n° 14 du 10 septembre à 11 h 00 ; Météo-France, mise à jour du 9 novembre à 05 h 42 (heure locale).",
      avertissement: null,
      echec: null,
      mention: "Siklon ne remplace pas les consignes officielles. Suivez les autorités locales.",
    });
  });

  it("existe en anglais, avec le terme d'origine de Météo-France", () => {
    const apercu = apercuIle(ile("guadeloupe"), menaces("guadeloupe"), vigilance("rouge"), "en", MAINTENANT);
    expect(apercu.niveau).toEqual({
      libelle: "Red vigilance · Protect yourself",
      origine: "Vigilance rouge · Protégez-vous",
      couleurs: COULEURS_VIGILANCE.rouge,
    });
    expect(apercu.lignes).toEqual([
      { fort: "Hurricane Kyle (cat. 4)", detail: "Estimated closest approach about 180 km from Pointe-à-Pitre in about 12 hours" },
    ]);
  });

  it("n'a pas de couleur de vigilance quand aucune alerte n'est en cours, et dit qu'aucun système ne menace l'île", () => {
    const apercu = apercuIle(ile("martinique"), [], vigilance("vert"), "fr", MAINTENANT);
    expect(apercu.niveau).toEqual({ libelle: "Vigilance verte · Pas de vigilance", origine: null, couleurs: null });
    expect(apercu.lignes).toEqual([{ fort: "Aucun système ne menace Martinique pour le moment.", detail: "" }]);
  });

  it("n'écrit ni niveau ni source Météo-France quand la vigilance est indisponible", () => {
    const apercu = apercuIle(ile("guadeloupe"), menaces("guadeloupe"), vigilance("indisponible"), "fr", MAINTENANT);
    expect(apercu.niveau).toBeNull();
    expect(apercu.sources).toBe("Source : NHC, avis n° 14 du 10 septembre à 11 h 00 (heure locale).");
  });

  it("prend la couleur de l'avertissement NHC le plus grave pour une île sans vigilance Météo-France", async () => {
    const alerte = await alertesNhc("dominique");
    expect(apercuIle(ile("dominique"), menaces("dominique"), alerte, "fr", MAINTENANT).niveau).toEqual({
      libelle: "Avertissement d'ouragan (Hurricane Warning)",
      origine: null,
      couleurs: COULEURS_NHC.HWR,
    });
    expect(apercuIle(ile("dominique"), menaces("dominique"), alerte, "en", MAINTENANT).niveau?.libelle).toBe(
      "Hurricane Warning",
    );
  });

  it("n'a pas de couleur sans veille ni avertissement NHC", () => {
    const alerte: AlerteIle = { source: "nhc", etat: { etat: "ok", alertes: [], luLe: LU_LE } };
    expect(apercuIle(ile("dominique"), [], alerte, "fr", MAINTENANT).niveau).toEqual({
      libelle: "Aucune veille ni aucun avertissement du NHC",
      origine: null,
      couleurs: null,
    });
  });

  it("dit quand l'heure estimée du passage est atteinte, et signale un avis de plus de 6 h", () => {
    const tard = new Date("2026-09-11T09:00:00.000Z");
    const apercu = apercuIle(ile("guadeloupe"), menaces("guadeloupe"), vigilance("rouge"), "fr", tard);
    expect(apercu.lignes[0].detail).toBe("Passage estimé à environ 180 km de Pointe-à-Pitre, heure estimée déjà atteinte");
    expect(apercu.avertissement).toBe("Données possiblement obsolètes : aucun nouvel avis du NHC depuis plus de 6 h.");
  });
  it("garde la menace d'une mise à jour NHC en échec et l'écrit avec l'heure locale de la dernière lecture (US-11)", () => {
    const ancien = apercuIle(ile("guadeloupe"), menaces("guadeloupe"), vigilance("rouge"), "fr", MAINTENANT, "2026-09-10T18:00:00.000Z");
    expect(ancien.lignes[0].fort).toBe("Ouragan Kyle (cat. 4)");
    expect(ancien.echec).toBe("Dernière donnée NHC lue le 10 septembre à 14 h 00 (heure locale) : la mise à jour a échoué.");
    expect(apercuIle(ile("guadeloupe"), menaces("guadeloupe"), vigilance("rouge"), "fr", MAINTENANT).echec).toBeNull();
  });
});

describe("apercuSysteme (US-21)", () => {
  it("donne le système, ses vents, son déplacement et l'avis NHC avec son heure, sans couleur de vigilance", () => {
    expect(apercuSysteme(kyle, "fr", MAINTENANT)).toEqual({
      titre: "Ouragan Kyle (cat. 4)",
      niveau: null,
      lignes: [{ fort: "Vents maximaux de 220 km/h", detail: "Se déplace vers l'ouest-nord-ouest à 19 km/h" }],
      sources: "Source : NHC, avis n° 14 du 10 septembre à 11 h 00 (heure des Antilles françaises).",
      avertissement: null,
      echec: null,
      mention: "Siklon ne remplace pas les consignes officielles. Suivez les autorités locales.",
    });
  });

  it("existe en anglais", () => {
    expect(apercuSysteme(kyle, "en", MAINTENANT).lignes).toEqual([
      { fort: "Maximum sustained winds 220 km/h", detail: "Moving toward the west-northwest at 19 km/h" },
    ]);
  });

  it("n'invente pas de déplacement, et signale un avis de plus de 6 h", () => {
    const apercu = apercuSysteme({ ...kyle, deplacement: undefined }, "fr", new Date("2026-09-10T21:01:00.000Z"));
    expect(apercu.lignes).toEqual([{ fort: "Vents maximaux de 220 km/h", detail: "" }]);
    expect(apercu.avertissement).toMatch(/^Données possiblement obsolètes/);
  });

  it("écrit une mise à jour NHC en échec avec l'heure de la dernière lecture réussie (US-11)", () => {
    expect(apercuSysteme(kyle, "en", MAINTENANT, "2026-09-10T16:00:00.000Z").echec).toBe(
      "Last NHC data read 10 September at 12:00 pm (Atlantic Standard Time, UTC−4): the update failed.",
    );
  });
});
