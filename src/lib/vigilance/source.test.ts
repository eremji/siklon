// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const cacheLife = vi.fn();
vi.mock("next/cache", () => ({ cacheLife }));
const telechargerControle = vi.fn();
const telechargerArchive = vi.fn();
vi.mock("./client", () => ({ telechargerControle, telechargerArchive }));
const baseLecture = { query: vi.fn() };
vi.mock("@/lib/db/pool", () => ({ connexion: () => baseLecture }));
const lireDerniereLecture = vi.fn();
vi.mock("@/lib/db/dernieresLectures", () => ({ lireDerniereLecture }));

const { vigilanceAffichee, DUREE_CACHE_CONTROLE } = await import("./source");
const { INTERVALLE_CONTROLE_VIGILANCE_S } = await import("@/lib/constantes");

describe("vigilanceAffichee : niveau montré par les pages (US-11)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("montre le dernier niveau lu, gardé en base, quand Météo-France ne répond pas", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    telechargerControle.mockRejectedValue(new Error("HTTP 503"));
    lireDerniereLecture.mockResolvedValue({
      contenu: { niveau: "orange", misAJour: "2026-09-10T12:00:00.000Z" },
      luLe: "2026-09-10T15:00:00.000Z",
    });

    const etat = await vigilanceAffichee("CDPV85TFFF");

    expect(lireDerniereLecture).toHaveBeenCalledWith(baseLecture, "vigilance:CDPV85TFFF");
    expect(etat).toMatchObject({ etat: "ok", niveau: "orange", misAJour: "2026-09-10T12:00:00.000Z" });
    expect(etat.etat === "ok" && etat.echecLe).toEqual(expect.any(String));
  });
});

describe("cadence de lecture de Météo-France (US-11)", () => {
  afterEach(() => {
    cacheLife.mockReset();
    telechargerControle.mockReset();
    telechargerArchive.mockReset();
    vi.restoreAllMocks();
  });

  it("relit le fichier de contrôle chaque minute", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    telechargerControle.mockRejectedValue(new Error("HTTP 503"));
    lireDerniereLecture.mockResolvedValue(null);

    await vigilanceAffichee("CDPV85TFFR");

    expect(INTERVALLE_CONTROLE_VIGILANCE_S).toBe(60);
    expect(DUREE_CACHE_CONTROLE.revalidate).toBe(INTERVALLE_CONTROLE_VIGILANCE_S);
    expect(cacheLife).toHaveBeenCalledWith(DUREE_CACHE_CONTROLE);
  });

  it("ne télécharge l'archive que sous le checksum du contrôle, gardée tant qu'il ne change pas", async () => {
    telechargerControle.mockResolvedValue({ checksum: "1607393573", taille: 1079247 });
    telechargerArchive.mockResolvedValue(new Uint8Array());
    vi.spyOn(console, "warn").mockImplementation(() => {});

    await vigilanceAffichee("CDPV85TFFR");

    expect(telechargerArchive).toHaveBeenCalledOnce();
    expect(cacheLife).toHaveBeenCalledWith("days");
  });
});
