// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import actifs from "./__fixtures__/current-storms-actifs.json";
import { lireCurrentStorms } from "./systemes";

vi.mock("server-only", () => ({}));
const fluxEnCache = vi.fn();
const watchesEnCache = vi.fn();
const positionsEnCache = vi.fn();
vi.mock("./cache", () => ({ fluxEnCache, positionsEnCache, watchesEnCache }));
const baseLecture = { query: vi.fn() };
vi.mock("@/lib/db/pool", () => ({ connexion: () => baseLecture }));
const lireDerniereLecture = vi.fn();
vi.mock("@/lib/db/dernieresLectures", () => ({ lireDerniereLecture }));

const { alertesNhc, fluxNhc, fluxNhcEnDirect, positionsNhc, positionsNhcEnDirect } = await import("./lecture");

const DOMINIQUE = { slug: "dominique", emprise: { latMin: 15.18, latMax: 15.67, lonMin: -61.51, lonMax: -61.22 } };

const maintenant = () => new Date("2026-09-10T16:00:00.000Z");

describe("fluxNhc : point d'entrée unique des pages vers le flux CurrentStorms", () => {
  const fetchSimule = vi.fn<typeof fetch>();

  beforeEach(() => vi.stubGlobal("fetch", fetchSimule));
  afterEach(() => {
    fluxEnCache.mockReset();
    watchesEnCache.mockReset();
    lireDerniereLecture.mockReset();
    fetchSimule.mockReset();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rend la dernière lecture réussie, gardée en base, quand le NHC ne répond pas (US-11)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fluxEnCache.mockRejectedValue(new Error("HTTP 503"));
    lireDerniereLecture.mockResolvedValue({ contenu: actifs, luLe: "2026-09-10T12:00:00.000Z" });

    const flux = await fluxNhc(null, maintenant);

    expect(lireDerniereLecture).toHaveBeenCalledWith(baseLecture, "nhc-systemes");
    expect(flux).toMatchObject({ etat: "ok", luLe: "2026-09-10T12:00:00.000Z", echecLe: "2026-09-10T16:00:00.000Z" });
  });

  it("en direct (vérification des alertes), ne rend jamais une lecture ancienne", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fluxEnCache.mockRejectedValue(new Error("HTTP 503"));
    lireDerniereLecture.mockResolvedValue({ contenu: actifs, luLe: "2026-09-10T12:00:00.000Z" });

    expect(await fluxNhcEnDirect(null, maintenant)).toEqual({ etat: "indisponible", luLe: "2026-09-10T16:00:00.000Z" });
    expect(lireDerniereLecture).not.toHaveBeenCalled();
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

describe("alertesNhc : watches/warnings d'une île, par le cache partagé ou la fixture", () => {
  const fetchSimule = vi.fn<typeof fetch>();

  beforeEach(() => vi.stubGlobal("fetch", fetchSimule));
  afterEach(() => {
    fluxEnCache.mockReset();
    watchesEnCache.mockReset();
    fetchSimule.mockReset();
    vi.unstubAllGlobals();
  });

  it("lit le flux et chaque couche Watch-Warning à travers le cache partagé", async () => {
    fluxEnCache.mockResolvedValue({ ...lireCurrentStorms(actifs), luLe: "2026-09-10T15:59:00.000Z" });
    watchesEnCache.mockResolvedValue([]);

    const etat = await alertesNhc(null, DOMINIQUE, maintenant);

    expect(watchesEnCache.mock.calls.map(([emplacement]) => emplacement).sort()).toEqual(["AT1", "AT2", "AT3"]);
    expect(fetchSimule).not.toHaveBeenCalled();
    expect(etat).toEqual({ etat: "ok", alertes: [], luLe: "2026-09-10T15:59:00.000Z" });
  });

  it("lit les fixtures sans toucher au cache ni au réseau", async () => {
    const etat = await alertesNhc("actifs", DOMINIQUE, maintenant);

    expect(fluxEnCache).not.toHaveBeenCalled();
    expect(watchesEnCache).not.toHaveBeenCalled();
    expect(fetchSimule).not.toHaveBeenCalled();
    expect(etat.etat === "ok" && etat.alertes.map((a) => `${a.code} ${a.systeme.nom}`)).toEqual(["HWR Kyle"]);
  });

  it("avec la fixture « ancien », signale des alertes tirées de la dernière donnée connue (US-11)", async () => {
    const etat = await alertesNhc("ancien", DOMINIQUE, maintenant);

    expect(etat).toMatchObject({ etat: "ok", echecLe: "2026-09-10T16:00:00.000Z" });
    expect(etat.etat === "ok" && etat.alertes.map((a) => `${a.code} ${a.systeme.nom}`)).toEqual(["HWR Kyle"]);
  });

  it("rend les dernières alertes connues de l'île, gardées en base, quand une couche échoue (US-11)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fluxEnCache.mockResolvedValue({ ...lireCurrentStorms(actifs), luLe: "2026-09-10T15:59:00.000Z" });
    watchesEnCache.mockRejectedValue(new Error("HTTP 503"));
    lireDerniereLecture.mockResolvedValue({ contenu: { alertes: [] }, luLe: "2026-09-10T14:00:00.000Z" });

    const etat = await alertesNhc(null, DOMINIQUE, maintenant);

    expect(lireDerniereLecture).toHaveBeenCalledWith(baseLecture, "alertes-nhc:dominique");
    expect(etat).toEqual({ etat: "ok", alertes: [], luLe: "2026-09-10T14:00:00.000Z", echecLe: "2026-09-10T16:00:00.000Z" });
  });
});

describe("positionsNhc : positions prévues des systèmes actifs, par le cache partagé ou la fixture", () => {
  const fetchSimule = vi.fn<typeof fetch>();
  const systemes = lireCurrentStorms(actifs).systemes;

  beforeEach(() => vi.stubGlobal("fetch", fetchSimule));
  afterEach(() => {
    positionsEnCache.mockReset();
    fetchSimule.mockReset();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("lit les positions de chaque système à travers le cache partagé, jamais directement", async () => {
    const positions = { avis: { numero: "12", emisLe: "2026-09-10T15:00:00.000Z" }, positions: [] };
    positionsEnCache.mockImplementation(async (emplacement: string) => (emplacement === "AT1" ? positions : null));

    const lues = await positionsNhc(null, systemes);

    expect(positionsEnCache.mock.calls.map(([emplacement]) => emplacement).sort()).toEqual(["AT1", "AT2", "AT3"]);
    expect(fetchSimule).not.toHaveBeenCalled();
    expect(lues).toEqual({ al112026: positions });
  });

  it("écarte un système dont la lecture en cache échoue, sans lever d'erreur", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    positionsEnCache.mockRejectedValue(new Error("HTTP 503"));
    lireDerniereLecture.mockResolvedValue(null);

    expect(await positionsNhc(null, systemes)).toEqual({});
  });

  it("rend les dernières positions connues d'un système, gardées en base, quand sa lecture échoue (US-11)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const gardees = { avis: { numero: "13", emisLe: "2026-09-10T09:00:00.000Z" }, positions: [] };
    positionsEnCache.mockImplementation(async (emplacement: string) => {
      if (emplacement === "AT1") throw new Error("HTTP 503");
      return null;
    });
    lireDerniereLecture.mockResolvedValue({ contenu: gardees, luLe: "2026-09-10T10:00:00.000Z" });

    const lues = await positionsNhc(null, systemes, maintenant);

    expect(lireDerniereLecture).toHaveBeenCalledWith(baseLecture, "positions:al112026");
    expect(lues).toEqual({ al112026: { ...gardees, echecLe: "2026-09-10T16:00:00.000Z" } });
  });

  it("en direct (vérification des alertes), ne rend jamais des positions anciennes", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    positionsEnCache.mockRejectedValue(new Error("HTTP 503"));
    lireDerniereLecture.mockReset();

    expect(await positionsNhcEnDirect(null, systemes)).toEqual({});
    expect(lireDerniereLecture).not.toHaveBeenCalled();
  });

  it("lit la fixture demandée sans toucher au cache ni au réseau", async () => {
    const lues = await positionsNhc("actifs", systemes);

    expect(positionsEnCache).not.toHaveBeenCalled();
    expect(fetchSimule).not.toHaveBeenCalled();
    expect(Object.keys(lues)).toEqual(["al112026"]);
  });
});
