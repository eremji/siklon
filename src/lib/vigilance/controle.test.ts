import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { lireControle, TAILLE_MAX_ARCHIVE } from "./controle";

const reel = readFileSync(join(__dirname, "__fixtures__/controle.txt"), "utf-8");

describe("lireControle", () => {
  it("extrait le checksum et la taille de l'archive du fichier de contrôle réel", () => {
    expect(lireControle(reel)).toEqual({ checksum: "1607393573", taille: 1079247 });
  });

  it("accepte des fins de ligne Windows et des espaces en fin de ligne", () => {
    expect(lireControle("lun. 09 nov. 2026 18:45:02 GMT\r\n42 1000 vigilance_OM.zip  \r\n")).toEqual({
      checksum: "42",
      taille: 1000,
    });
  });

  it.each([
    ["un texte vide", ""],
    ["une seule ligne", "lun. 09 nov. 2026 18:45:02 GMT\n"],
    ["un autre nom d'archive", "date\n42 1000 autre.zip\n"],
    ["un checksum non numérique", "date\nabc 1000 vigilance_OM.zip\n"],
    ["une taille non numérique", "date\n42 mille vigilance_OM.zip\n"],
    ["une taille nulle", "date\n42 0 vigilance_OM.zip\n"],
    ["une taille au-delà du maximum", `date\n42 ${TAILLE_MAX_ARCHIVE + 1} vigilance_OM.zip\n`],
    ["un champ en trop", "date\n42 1000 vigilance_OM.zip extra\n"],
    ["une page HTML", "<html><body>Erreur</body></html>"],
  ])("rejette %s", (_cas, texte) => {
    expect(() => lireControle(texte)).toThrow(/contrôle/);
  });
});
