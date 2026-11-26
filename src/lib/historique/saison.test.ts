// @vitest-environment node
// US-17 : saison à risque d'une île, calculée sur les passages HURDAT2 (fixture locale, jamais le réseau).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ANNEE_DEBUT_SAISON_RISQUE, DEBUT_SAISON, FIN_SAISON, PART_SAISON_RISQUE } from "../constantes";
import { preparerImport } from "../hurdat2/import";
import { trouverIle } from "../iles";
import {
  calculerSaison,
  dansSaisonOfficielle,
  fenetreSaison,
  moisLocal,
  type PassageDate,
  phraseSaison,
  type SaisonRisque,
} from "./saison";

const guadeloupe = trouverIle("guadeloupe")!;

/** Passage fictif au milieu du mois donné (1 à 12). */
const au = (mois: number, annee = 2000): PassageDate => ({ annee, horodatage: new Date(Date.UTC(annee, mois - 1, 15, 12)) });

/** Saison construite à partir d'un compte par mois (janvier en premier). */
function saison(parMois: number[]): SaisonRisque {
  return calculerSaison(
    parMois.flatMap((n, i) => Array.from({ length: n }, () => au(i + 1))),
    guadeloupe.fuseau,
  );
}

describe("constantes de la saison", () => {
  it("suivent SPEC.md : saison officielle du 1er juin au 30 novembre, depuis 1966, 75 % des passages", () => {
    expect(DEBUT_SAISON).toEqual({ mois: 6, jour: 1 });
    expect(FIN_SAISON).toEqual({ mois: 11, jour: 30 });
    expect(ANNEE_DEBUT_SAISON_RISQUE).toBe(1966);
    expect(PART_SAISON_RISQUE).toBe(0.75);
  });

  it("repère les mois de juin à novembre comme saison officielle", () => {
    expect(Array.from({ length: 12 }, (_, i) => dansSaisonOfficielle(i))).toEqual([
      false, false, false, false, false, true, true, true, true, true, true, false,
    ]);
  });
});

describe("moisLocal", () => {
  it("prend le mois à l'heure locale de l'île, pas en UTC", () => {
    // 1er septembre 02 h UTC = 31 août 22 h à Pointe-à-Pitre (UTC−4).
    expect(moisLocal(new Date("2010-09-01T02:00:00Z"), "America/Guadeloupe")).toBe(7);
    expect(moisLocal(new Date("2010-09-01T02:00:00Z"), "UTC")).toBe(8);
  });
});

describe("calculerSaison", () => {
  it("compte les passages par mois, sur 12 mois, y compris les mois à zéro", () => {
    const resultat = calculerSaison([au(9), au(9), au(8), au(10)], guadeloupe.fuseau);
    expect(resultat.parMois).toEqual([0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 0]);
    expect(resultat.total).toBe(4);
    expect(resultat.plusActifs).toEqual([8]);
  });

  it(`ignore les saisons antérieures à ${ANNEE_DEBUT_SAISON_RISQUE}`, () => {
    const resultat = calculerSaison([au(9, 1965), au(8, 1966)], guadeloupe.fuseau);
    expect(resultat.total).toBe(1);
    expect(resultat.parMois[7]).toBe(1);
    expect(resultat.anneeMin).toBe(1966);
  });

  it("donne tous les mois à égalité quand plusieurs sont les plus actifs", () => {
    expect(saison([0, 0, 0, 0, 0, 0, 0, 3, 3, 1, 0, 0]).plusActifs).toEqual([7, 8]);
  });

  it("n'a ni mois le plus actif ni fenêtre sans passage", () => {
    const vide = saison(Array(12).fill(0));
    expect(vide.total).toBe(0);
    expect(vide.plusActifs).toEqual([]);
    expect(vide.fenetre).toBeNull();
  });
});

describe("fenetreSaison", () => {
  it(`retient la plus courte suite de mois qui regroupe au moins ${PART_SAISON_RISQUE * 100} % des passages`, () => {
    // Chiffres de la maquette : 68 passages ; août-septembre = 46 (68 %), août-octobre = 57 (84 %).
    expect(fenetreSaison([0, 0, 0, 0, 0, 2, 6, 19, 27, 11, 3, 0])).toEqual({ debut: 7, fin: 9, nombre: 57 });
  });

  it("garde la fenêtre la plus chargée parmi celles de même longueur", () => {
    // Juillet-septembre = 6, août-octobre = 7 : toutes deux atteignent 6 sur 8.
    expect(fenetreSaison([0, 0, 0, 0, 0, 0, 1, 2, 3, 2, 0, 0])).toEqual({ debut: 7, fin: 9, nombre: 7 });
  });

  it("peut se réduire à un seul mois", () => {
    expect(fenetreSaison([0, 0, 0, 0, 0, 0, 0, 1, 9, 0, 0, 0])).toEqual({ debut: 8, fin: 8, nombre: 9 });
  });

  it("ne renvoie rien sans passage", () => {
    expect(fenetreSaison(Array(12).fill(0))).toBeNull();
  });
});

describe("phraseSaison", () => {
  it("résume en « X passages sur 10 » à partir de 10 passages", () => {
    const s = saison([0, 0, 0, 0, 0, 2, 6, 19, 27, 11, 3, 0]);
    expect(phraseSaison(s, "fr")).toBe(
      "8 passages sur 10 ont eu lieu entre août et octobre. Le mois le plus actif est septembre.",
    );
    expect(phraseSaison(s, "en")).toBe(
      "8 in 10 passages took place between August and October. The most active month is September.",
    );
  });

  it("donne les chiffres exacts sous 10 passages", () => {
    const s = saison([0, 0, 0, 0, 0, 0, 0, 2, 3, 1, 1, 0]);
    expect(phraseSaison(s, "fr")).toBe(
      "6 passages sur 7 ont eu lieu entre août et octobre. Le mois le plus actif est septembre.",
    );
    expect(phraseSaison(s, "en")).toBe(
      "6 of 7 passages took place between August and October. The most active month is September.",
    );
  });

  it("dit « tous les passages » quand la fenêtre les contient tous", () => {
    const s = saison([0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0]);
    expect(phraseSaison(s, "fr")).toBe(
      "Tous les passages ont eu lieu entre août et septembre. Les mois les plus actifs sont août et septembre.",
    );
    expect(phraseSaison(s, "en")).toBe(
      "All passages took place between August and September. The most active months are August and September.",
    );
  });

  it("ne répète pas le mois le plus actif quand la fenêtre tient en un mois", () => {
    const s = saison([0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0]);
    expect(phraseSaison(s, "fr")).toBe("Tous les passages ont eu lieu en septembre.");
    expect(phraseSaison(s, "en")).toBe("All passages took place in September.");
  });

  it("parle du seul passage quand il n'y en a qu'un", () => {
    const s = saison([0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0]);
    expect(phraseSaison(s, "fr")).toBe("Le seul passage a eu lieu en octobre.");
    expect(phraseSaison(s, "en")).toBe("The only passage took place in October.");
  });

  it("énumère trois mois à égalité ou plus", () => {
    const s = saison([0, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0]);
    expect(phraseSaison(s, "fr")).toBe(
      "Tous les passages ont eu lieu entre juillet et septembre. Les mois les plus actifs sont juillet, août et septembre.",
    );
    expect(phraseSaison(s, "en")).toBe(
      "All passages took place between July and September. The most active months are July, August and September.",
    );
  });

  it("le dit quand aucun cyclone n'est passé", () => {
    const s = saison(Array(12).fill(0));
    expect(phraseSaison(s, "fr")).toBe("Aucun cyclone n'est passé près de l'île depuis 1966.");
    expect(phraseSaison(s, "en")).toBe("No storm has passed near the island since 1966.");
  });
});

describe("sur la fixture HURDAT2", () => {
  const texte = readFileSync(join(import.meta.dirname, "__fixtures__/hurdat2-saison.txt"), "utf8");
  const preparation = preparerImport(texte, "hurdat2-1960-2010-010126.txt");
  if (!preparation.ok) throw new Error(preparation.erreurs.join("\n"));
  const { tempetes, passages } = preparation.donnees;
  const annees = new Map(tempetes.map((t) => [t.id, t.annee]));
  const pres = passages
    .filter((p) => p.ileSlug === "guadeloupe")
    .map((p) => ({ annee: annees.get(p.tempeteId)!, horodatage: p.horodatage }));
  const resultat = calculerSaison(pres, guadeloupe.fuseau);

  it("compte chaque cyclone une fois, au mois local de son plus proche passage, depuis 1966", () => {
    // GOLF (1960) est hors période, HOTEL reste loin ; INDIA approche deux fois mais compte une fois ;
    // FOXTROT passe le 1er septembre en UTC, le 31 août à Pointe-à-Pitre.
    expect(resultat.parMois).toEqual([0, 0, 0, 0, 0, 0, 1, 2, 3, 2, 0, 0]);
    expect(resultat.total).toBe(8);
  });

  it("donne la phrase de synthèse calculée", () => {
    expect(phraseSaison(resultat, "fr")).toBe(
      "7 passages sur 8 ont eu lieu entre août et octobre. Le mois le plus actif est septembre.",
    );
  });
});
