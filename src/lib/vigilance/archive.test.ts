import { readFileSync } from "node:fs";
import { join } from "node:path";
import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { extraireBulletin, nomDansArchive, TAILLE_MAX_BULLETIN } from "./archive";

const fixture = (nom: string) => readFileSync(join(__dirname, "__fixtures__", nom));
const archiveReelle = new Uint8Array(fixture("vigilance-om-antilles.zip"));

describe("nomDansArchive", () => {
  it("nomme le fichier comme dans l'archive Météo-France", () => {
    expect(nomDansArchive("CDPV85TFFR")).toBe("CDPV85_TFFR_.txt");
  });
});

describe("extraireBulletin", () => {
  it.each(["CDPV85TFFF", "CDPV85TFFR", "CDPV85TFFJ"] as const)(
    "extrait le bulletin %s de l'archive réelle, à l'identique",
    (fichier) => {
      expect(extraireBulletin(archiveReelle, fichier)).toBe(fixture(nomDansArchive(fichier)).toString("utf-8"));
    },
  );

  it("refuse une archive où le bulletin manque", () => {
    const archive = zipSync({ "CDPV85_TFFF_.txt": strToU8("{}") });
    expect(() => extraireBulletin(archive, "CDPV85TFFR")).toThrow(/absent/);
  });

  it("refuse un bulletin trop gros une fois décompressé", () => {
    const archive = zipSync({ "CDPV85_TFFR_.txt": new Uint8Array(TAILLE_MAX_BULLETIN + 1) });
    expect(() => extraireBulletin(archive, "CDPV85TFFR")).toThrow(/absent/);
  });

  it("refuse un bulletin qui n'est pas de l'UTF-8 valide", () => {
    const archive = zipSync({ "CDPV85_TFFR_.txt": new Uint8Array([0xff, 0xfe, 0x7b]) });
    expect(() => extraireBulletin(archive, "CDPV85TFFR")).toThrow();
  });

  it("refuse des données qui ne sont pas une archive zip", () => {
    expect(() => extraireBulletin(strToU8("<html>Erreur</html>"), "CDPV85TFFR")).toThrow();
  });
});
