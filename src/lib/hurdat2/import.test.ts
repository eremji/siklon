// @vitest-environment node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { preparerImport, versionDepuisNomFichier } from "./import";

const NOM = "hurdat2-1851-2024-040425.txt";
const synthetique = readFileSync(new URL("./__fixtures__/synthetique.txt", import.meta.url), "utf8");

describe("versionDepuisNomFichier", () => {
  it("lit la date de version (MMJJAA) du nom de fichier NHC", () => {
    expect(versionDepuisNomFichier(NOM)).toBe("2025-04-04");
  });

  it("lit aussi une date de version sur 8 chiffres (MMJJAAAA)", () => {
    expect(versionDepuisNomFichier("hurdat2-1851-2025-02272026.txt")).toBe("2026-02-27");
  });

  it.each(["hurdat2.txt", "hurdat2-1851-2024-040425.csv", "hurdat2-1851-2024-133225.txt", "../hurdat2-1851-2024-040425.txt"])(
    "refuse le nom « %s »",
    (nom) => {
      expect(versionDepuisNomFichier(nom)).toBeNull();
    },
  );
});

describe("preparerImport", () => {
  it("prépare les tempêtes, leurs passages près des îles et l'empreinte du fichier", () => {
    const resultat = preparerImport(synthetique, NOM);
    if (!resultat.ok) throw new Error(resultat.erreurs.join("\n"));
    const { donnees } = resultat;
    expect(donnees).toMatchObject({ fichier: NOM, versionNhc: "2025-04-04" });
    expect(donnees.sha256).toBe(createHash("sha256").update(synthetique).digest("hex"));
    expect(donnees.tempetes.map((t) => t.id)).toEqual(["AL011990", "AL021990"]);
    const iles = donnees.passages.filter((p) => p.tempeteId === "AL011990").map((p) => p.ileSlug);
    expect(iles).toContain("guadeloupe");
    expect(iles).not.toContain("cuba");
    expect(donnees.passages.some((p) => p.tempeteId === "AL021990")).toBe(false);
  });

  it("refuse tout le fichier à la moindre erreur, avec les numéros de ligne", () => {
    const resultat = preparerImport(synthetique.replace(" TS,", " XX,"), NOM);
    expect(resultat).toEqual({ ok: false, erreurs: [expect.stringMatching(/^ligne 3 : statut inconnu/)] });
  });

  it("refuse un nom de fichier sans date de version", () => {
    expect(preparerImport(synthetique, "export.txt")).toEqual({
      ok: false,
      erreurs: [expect.stringContaining("nom de fichier")],
    });
  });

  it("refuse un fichier sans tempête", () => {
    expect(preparerImport("\n", NOM)).toEqual({ ok: false, erreurs: [expect.stringContaining("aucune tempête")] });
  });
});

describe("fixture des tests e2e", () => {
  const fixture = readFileSync(new URL("../../../e2e/fixtures/hurdat2-1851-2005-010126.txt", import.meta.url), "utf8");

  it("est un fichier HURDAT2 valide, avec les passages près de la Guadeloupe décrits dans son README", () => {
    const resultat = preparerImport(fixture, "hurdat2-1851-2005-010126.txt");
    if (!resultat.ok) throw new Error(resultat.erreurs.join("\n"));
    const guadeloupe = resultat.donnees.passages.filter((p) => p.ileSlug === "guadeloupe");
    expect(Object.fromEntries(guadeloupe.map((p) => [p.tempeteId, p.categorie]))).toEqual({
      AL122005: 5,
      AL051990: 2,
      AL091989: 1,
      AL031899: 0,
    });
    expect(resultat.donnees.passages.some((p) => p.tempeteId === "AL101950")).toBe(false);
  });
});
