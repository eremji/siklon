// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parserHurdat2 } from "./parseur";

// Fixture synthétique au format HURDAT2 (valeurs inventées, pas des données NHC).
const synthetique = readFileSync(new URL("./__fixtures__/synthetique.txt", import.meta.url), "utf8");

const RAYONS = " -999, -999, -999, -999, -999, -999, -999, -999, -999, -999, -999, -999, -999,";
const point = (champs: string) => `${champs},${RAYONS}`;
const P1 = point("19900815, 0000,  , TD, 14.0N,  55.0W,  30, 1008");
const P2 = point("19900815, 0600,  , TS, 14.5N,  56.5W,  40, 1004");
const enTete = (points: number, id = "AL031990", nom = "BRAVO") => `${id}, ${nom.padStart(18)}, ${String(points).padStart(6)},`;
const fichier = (...lignes: string[]) => lignes.join("\n") + "\n";

describe("parserHurdat2 : fichier valide", () => {
  const { tempetes, erreurs } = parserHurdat2(synthetique);

  it("lit toutes les tempêtes sans erreur", () => {
    expect(erreurs).toEqual([]);
    expect(tempetes.map((t) => t.id)).toEqual(["AL011990", "AL021990"]);
  });

  it("décode l'en-tête : bassin, numéro, année et nom", () => {
    expect(tempetes[0]).toMatchObject({ id: "AL011990", bassin: "AL", numero: 1, annee: 1990, nom: "ALPHA" });
    expect(tempetes[1].nom).toBe("UNNAMED");
  });

  it("lit chaque point de trajectoire, en UTC", () => {
    expect(tempetes[0].points).toHaveLength(4);
    expect(tempetes[0].points[0]).toEqual({
      horodatage: new Date("1990-08-15T00:00:00Z"),
      identifiant: null,
      statut: "TD",
      lat: 14,
      lon: -55,
      ventKt: 30,
      pressionMb: 1008,
    });
  });

  it("garde les heures hors synoptiques et l'identifiant d'atterrissage", () => {
    expect(tempetes[0].points[3]).toMatchObject({
      horodatage: new Date("1990-08-15T18:30:00Z"),
      identifiant: "L",
      statut: "HU",
    });
  });

  it("convertit les valeurs manquantes (-99, -999) en null", () => {
    expect(tempetes[1].points[0]).toMatchObject({ ventKt: null, pressionMb: null });
  });

  it("compte les longitudes est en positif et ouest en négatif", () => {
    expect(tempetes[1].points.map((p) => p.lon)).toEqual([-2.5, 0.5]);
  });

  it("accepte les fins de ligne Windows", () => {
    expect(parserHurdat2(synthetique.replaceAll("\n", "\r\n"))).toEqual({ tempetes, erreurs: [] });
  });
});

describe("parserHurdat2 : validation stricte", () => {
  const erreursDe = (texte: string) => parserHurdat2(texte).erreurs;

  it("signale un en-tête illisible avec son numéro de ligne", () => {
    expect(erreursDe(fichier("PAS UN EN-TÊTE", P1))).toEqual([
      { ligne: 1, message: expect.stringContaining("en-tête") },
      { ligne: 2, message: expect.stringContaining("en-tête") },
    ]);
  });

  it("refuse un autre bassin que l'Atlantique", () => {
    expect(erreursDe(fichier(enTete(1, "EP031990"), P1))).toEqual([
      { ligne: 1, message: expect.stringContaining("bassin") },
    ]);
  });

  it("signale une trajectoire plus courte que annoncé, puis lit la tempête suivante", () => {
    const resultat = parserHurdat2(fichier(enTete(3), P1, P2, enTete(1, "AL041990", "CHARLIE"), P1));
    expect(resultat.erreurs).toEqual([{ ligne: 4, message: expect.stringContaining("3 points annoncés") }]);
    expect(resultat.tempetes.map((t) => t.id)).toEqual(["AL041990"]);
  });

  it("signale un fichier qui s'arrête au milieu d'une trajectoire", () => {
    expect(erreursDe(fichier(enTete(3), P1, P2))).toEqual([
      { ligne: 4, message: expect.stringContaining("3 points annoncés") },
    ]);
  });

  it.each([
    ["une date impossible", "19900231, 0000,  , TD, 14.0N,  55.0W,  30, 1008", "date"],
    ["une heure impossible", "19900815, 2460,  , TD, 14.0N,  55.0W,  30, 1008", "heure"],
    ["un identifiant inconnu", "19900815, 0000, Z, TD, 14.0N,  55.0W,  30, 1008", "identifiant"],
    ["un statut inconnu", "19900815, 0000,  , XX, 14.0N,  55.0W,  30, 1008", "statut"],
    ["une latitude hors bornes", "19900815, 0000,  , TD, 95.0N,  55.0W,  30, 1008", "latitude"],
    ["une longitude sans hémisphère", "19900815, 0000,  , TD, 14.0N,  55.0,  30, 1008", "longitude"],
    ["un vent non numérique", "19900815, 0000,  , TD, 14.0N,  55.0W,  3O, 1008", "vent"],
    ["un vent négatif autre que -99", "19900815, 0000,  , TD, 14.0N,  55.0W,  -5, 1008", "vent"],
    ["une pression hors bornes", "19900815, 0000,  , TD, 14.0N,  55.0W,  30,  500", "pression"],
  ])("refuse %s", (_cas, champs, mot) => {
    expect(erreursDe(fichier(enTete(1), point(champs)))).toEqual([
      { ligne: 2, message: expect.stringContaining(mot) },
    ]);
  });

  it("refuse un point incomplet", () => {
    expect(erreursDe(fichier(enTete(1), "19900815, 0000,  , TD, 14.0N,  55.0W,  30,"))).toEqual([
      { ligne: 2, message: expect.stringContaining("champs") },
    ]);
  });

  it("refuse des rayons de vent non numériques", () => {
    expect(erreursDe(fichier(enTete(1), P1.replace(" -999,", " abc,")))).toEqual([
      { ligne: 2, message: expect.stringContaining("rayon") },
    ]);
  });

  it("refuse des points qui ne se suivent pas dans le temps", () => {
    expect(erreursDe(fichier(enTete(2), P2, P1))).toEqual([
      { ligne: 3, message: expect.stringContaining("chronologique") },
    ]);
  });

  it("ne garde pas une tempête qui contient une erreur", () => {
    const resultat = parserHurdat2(fichier(enTete(2), P1, P1.replace("TD", "XX")));
    expect(resultat.tempetes).toEqual([]);
    expect(resultat.erreurs).toHaveLength(1);
  });

  it("ignore les lignes vides en fin de fichier", () => {
    expect(parserHurdat2(fichier(enTete(1), P1) + "\n\n").erreurs).toEqual([]);
  });
});
