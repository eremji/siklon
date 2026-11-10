// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import actifs from "./__fixtures__/current-storms-actifs.json";

vi.mock("server-only", () => ({}));
const cacheLife = vi.fn();
vi.mock("next/cache", () => ({ cacheLife }));

const { DUREE_CACHE_NHC, fluxEnCache, previsionEnCache } = await import("./cache");

describe("cache partagé des flux NHC", () => {
  const fetchSimule = vi.fn<typeof fetch>();

  beforeEach(() => vi.stubGlobal("fetch", fetchSimule));
  afterEach(() => {
    fetchSimule.mockReset();
    cacheLife.mockReset();
    vi.unstubAllGlobals();
  });

  it("relit le NHC au plus une fois par minute", () => {
    expect(DUREE_CACHE_NHC).toEqual({ stale: 60, revalidate: 60, expire: 300 });
  });

  it("met en cache le flux CurrentStorms avec cette durée", async () => {
    fetchSimule.mockResolvedValue(new Response(JSON.stringify(actifs)));

    const flux = await fluxEnCache();

    expect(cacheLife).toHaveBeenCalledWith(DUREE_CACHE_NHC);
    expect(flux.systemes).toHaveLength(3);
  });

  it("rejette en cas d'échec, pour que l'échec ne soit pas mis en cache", async () => {
    fetchSimule.mockResolvedValue(new Response("", { status: 503 }));

    await expect(fluxEnCache()).rejects.toThrow();
    await expect(previsionEnCache("AT1")).rejects.toThrow();
  });

  it("met en cache les prévisions par emplacement avec la même durée", async () => {
    fetchSimule.mockImplementation(async () => new Response(JSON.stringify({ type: "FeatureCollection", features: [] })));

    expect(await previsionEnCache("AT1")).toBeNull();
    expect(cacheLife).toHaveBeenCalledWith(DUREE_CACHE_NHC);
  });
});
