import { readFileSync } from "node:fs";
import { join } from "node:path";
import { strToU8, zipSync } from "fflate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chargerVigilance, lireBulletins, type Sources } from "./vigilance";

const fixture = (nom: string) => readFileSync(join(__dirname, "__fixtures__", nom));
const archiveReelle = new Uint8Array(fixture("vigilance-om-antilles.zip"));
const jaune = { niveau: "jaune", misAJour: "2026-11-09T09:42:00.000Z" } as const;

describe("lireBulletins", () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  it("lit les trois bulletins des Antilles de l'archive réelle", () => {
    expect(lireBulletins(archiveReelle)).toEqual({
      CDPV85TFFR: jaune,
      CDPV85TFFF: { niveau: "vert", misAJour: "2026-11-09T09:48:00.000Z" },
      CDPV85TFFJ: { niveau: "vert", misAJour: "2026-11-09T09:48:00.000Z" },
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("écarte et journalise un bulletin invalide sans perdre les autres", () => {
    const archive = zipSync({
      "CDPV85_TFFR_.txt": new Uint8Array(fixture("CDPV85_TFFR_.txt")),
      "CDPV85_TFFF_.txt": strToU8("{ pas du JSON"),
    });

    expect(lireBulletins(archive)).toEqual({ CDPV85TFFR: jaune });
    expect(warn).toHaveBeenCalledWith("[vigilance] bulletin écarté", { fichier: "CDPV85TFFF", raison: "JSON invalide" });
    expect(warn).toHaveBeenCalledWith("[vigilance] bulletin écarté", expect.objectContaining({ fichier: "CDPV85TFFJ" }));
  });

  it("échoue quand aucun bulletin n'est lisible, pour que ce résultat ne soit pas mis en cache", () => {
    expect(() => lireBulletins(strToU8("<html>Erreur</html>"))).toThrow(/aucun bulletin/);
  });
});

describe("chargerVigilance", () => {
  let warn: ReturnType<typeof vi.spyOn>;
  const controle = vi.fn<Sources["controle"]>();
  const bulletins = vi.fn<Sources["bulletins"]>();
  const sources: Sources = { controle, bulletins };

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    controle.mockResolvedValue({ checksum: "1607393573", taille: 1079247 });
    bulletins.mockResolvedValue({ CDPV85TFFR: jaune });
  });

  afterEach(() => {
    warn.mockRestore();
    controle.mockReset();
    bulletins.mockReset();
  });

  it("renvoie le niveau et l'heure Météo-France de l'île", async () => {
    await expect(chargerVigilance("CDPV85TFFR", sources)).resolves.toEqual({ etat: "ok", ...jaune });
  });

  it("demande les bulletins pour le checksum du contrôle, qui sert de clé de cache", async () => {
    await chargerVigilance("CDPV85TFFR", sources);
    expect(bulletins).toHaveBeenCalledWith("1607393573");
  });

  it.each([
    ["le contrôle échoue", () => controle.mockRejectedValue(new Error("HTTP 401"))],
    ["l'archive échoue", () => bulletins.mockRejectedValue(new Error("archive trop volumineuse"))],
    ["le bulletin de l'île a été écarté", () => bulletins.mockResolvedValue({ CDPV85TFFF: jaune })],
  ])("signale la vigilance indisponible quand %s, et le journalise", async (_cas, preparer) => {
    preparer();

    await expect(chargerVigilance("CDPV85TFFR", sources)).resolves.toEqual({ etat: "indisponible" });
    expect(warn).toHaveBeenCalledWith(
      "[vigilance] flux Météo-France indisponible",
      expect.objectContaining({ fichier: "CDPV85TFFR", raison: expect.any(String) }),
    );
  });
});
