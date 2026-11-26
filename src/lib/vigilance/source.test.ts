// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: () => {} }));
const telechargerControle = vi.fn();
vi.mock("./client", () => ({ telechargerControle, telechargerArchive: vi.fn() }));
const baseLecture = { query: vi.fn() };
vi.mock("@/lib/db/pool", () => ({ connexion: () => baseLecture }));
const lireDerniereLecture = vi.fn();
vi.mock("@/lib/db/dernieresLectures", () => ({ lireDerniereLecture }));

const { vigilanceAffichee } = await import("./source");

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
