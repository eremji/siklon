// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const cacheLife = vi.fn();
const cacheTag = vi.fn();
vi.mock("next/cache", () => ({ cacheLife, cacheTag }));
const query = vi.fn();
vi.mock("../db/pool", () => ({ connexion: () => ({ query }) }));

const { chargerDernierImport, chargerPassages, chargerTempete } = await import("./chargement");

describe("lectures de l'historique HURDAT2 mises en cache", () => {
  afterEach(() => {
    cacheLife.mockReset();
    cacheTag.mockReset();
    query.mockReset();
  });

  it("lit les passages d'une île dans la base, en cache pour la journée sous le tag historique", async () => {
    const ligne = { tempeteId: "AL152017", nom: "MARIA", annee: 2017 };
    query.mockResolvedValue({ rows: [ligne] });

    expect(await chargerPassages({ ileSlug: "dominique", categorieMin: 3 })).toEqual([ligne]);
    expect(query.mock.calls[0][1]).toEqual(["dominique", 3, null, null]);
    expect(cacheLife).toHaveBeenCalledWith("days");
    expect(cacheTag).toHaveBeenCalledWith("historique");
  });

  it("lit une tempête dans la base, en cache pour la journée sous le tag historique", async () => {
    query.mockResolvedValue({ rows: [] });

    expect(await chargerTempete("AL152017")).toBeNull();
    expect(cacheLife).toHaveBeenCalledWith("days");
    expect(cacheTag).toHaveBeenCalledWith("historique");
  });

  it("lit le dernier import dans la base, en cache pour la journée sous le tag historique", async () => {
    query.mockResolvedValue({ rows: [] });

    expect(await chargerDernierImport()).toBeNull();
    expect(cacheLife).toHaveBeenCalledWith("days");
    expect(cacheTag).toHaveBeenCalledWith("historique");
  });

  // Sur Vercel (serverless), le cache « use cache » en mémoire ne survit pas d'une requête à l'autre
  // (doc Next.js 16, use-cache.md, « Runtime caching considerations ») : chaque visite interrogerait
  // Postgres. Seul le cache partagé entre instances évite ces allers-retours vers la base.
  it("utilise le cache partagé entre instances pour chaque lecture", () => {
    const source = readFileSync(join(import.meta.dirname, "chargement.ts"), "utf8");
    const fonctions = [...source.matchAll(/export async function (\w+)\([^)]*\)\s*\{\s*"([^"]+)"/g)].map(
      ([, nom, directive]) => [nom, directive],
    );

    expect(fonctions).toEqual([
      ["chargerPassages", "use cache: remote"],
      ["chargerTempete", "use cache: remote"],
      ["chargerDernierImport", "use cache: remote"],
    ]);
  });
});
