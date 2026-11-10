// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import actifs from "./__fixtures__/current-storms-actifs.json";
import { lireCurrentStorms } from "./systemes";

vi.mock("server-only", () => ({}));
const fluxEnCache = vi.fn();
vi.mock("./cache", () => ({ fluxEnCache }));

const { fluxNhc } = await import("./lecture");

const maintenant = () => new Date("2026-09-10T16:00:00.000Z");

describe("fluxNhc : point d'entrée unique des pages vers le flux CurrentStorms", () => {
  const fetchSimule = vi.fn<typeof fetch>();

  beforeEach(() => vi.stubGlobal("fetch", fetchSimule));
  afterEach(() => {
    fluxEnCache.mockReset();
    fetchSimule.mockReset();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("lit le flux à travers le cache partagé, jamais directement", async () => {
    const lu = { ...lireCurrentStorms(actifs), luLe: "2026-09-10T15:59:00.000Z" };
    fluxEnCache.mockResolvedValue(lu);

    const flux = await fluxNhc(null, maintenant);

    expect(fluxEnCache).toHaveBeenCalledTimes(1);
    expect(fetchSimule).not.toHaveBeenCalled();
    expect(flux).toEqual({ etat: "ok", ...lu });
  });

  it("signale un flux indisponible quand la lecture en cache échoue", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fluxEnCache.mockRejectedValue(new Error("HTTP 503"));

    expect(await fluxNhc(null, maintenant)).toEqual({ etat: "indisponible", luLe: "2026-09-10T16:00:00.000Z" });
  });

  it("lit la fixture demandée sans toucher au cache ni au réseau", async () => {
    const flux = await fluxNhc("actifs", maintenant);

    expect(fluxEnCache).not.toHaveBeenCalled();
    expect(fetchSimule).not.toHaveBeenCalled();
    expect(flux.etat === "ok" && flux.systemes.map((s) => s.nom)).toEqual(["Kyle", "Leah", "Thirteen"]);
    expect(flux.luLe).toBe("2026-09-10T16:00:00.000Z");
  });
});
