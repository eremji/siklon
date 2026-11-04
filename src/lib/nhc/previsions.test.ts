import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import cone from "./__fixtures__/prevision-at1-cone.json";
import trajectoire from "./__fixtures__/prevision-at1-trajectoire.json";
import {
  PrevisionInvalideError,
  URL_SERVICE_PREVISIONS,
  chargerPrevision,
  couchesPrevision,
  lireCone,
  lireTrajectoire,
} from "./previsions";

const VIDE = { type: "FeatureCollection", features: [] };

interface EntiteModifiable {
  geometry: { type: string; coordinates: unknown[][] };
  properties: Record<string, unknown>;
}

// Copie modifiable de la première entité d'une fixture.
function avec<T>(fixture: T, modifier: (entite: EntiteModifiable) => void): T {
  const copie = structuredClone(fixture) as unknown as { features: EntiteModifiable[] };
  modifier(copie.features[0]);
  return copie as T;
}

describe("couchesPrevision", () => {
  it("donne les couches trajectoire et cône du service NOAA pour AT1 à AT5", () => {
    expect(couchesPrevision("AT1")).toEqual({ trajectoire: 7, cone: 8 });
    expect(couchesPrevision("AT2")).toEqual({ trajectoire: 33, cone: 34 });
    expect(couchesPrevision("AT5")).toEqual({ trajectoire: 111, cone: 112 });
  });

  it("ne donne rien hors de l'Atlantique ou pour un emplacement inconnu", () => {
    expect(couchesPrevision("EP1")).toBeNull();
    expect(couchesPrevision("AT6")).toBeNull();
  });
});

describe("lireTrajectoire et lireCone", () => {
  it("lisent la trajectoire prévue et le numéro d'avis", () => {
    const lue = lireTrajectoire(trajectoire, "AT1");

    expect(lue?.avis).toBe("14");
    expect(lue?.lignes).toHaveLength(1);
    expect(lue?.lignes[0][0]).toEqual([-58.2, 16.8]);
  });

  it("lisent le cône d'incertitude", () => {
    const lu = lireCone(cone, "AT1");

    expect(lu?.avis).toBe("14");
    expect(lu?.polygones).toHaveLength(1);
    expect(lu?.polygones[0][0][0]).toEqual([-58.2, 17.0]);
  });

  it("acceptent les géométries multiples", () => {
    const multi = avec(cone, (entite) => {
      entite.geometry = { type: "MultiPolygon", coordinates: [entite.geometry.coordinates, entite.geometry.coordinates] };
    });

    expect(lireCone(multi, "AT1")?.polygones).toHaveLength(2);
  });

  it("renvoient null quand le NHC ne publie pas de prévision", () => {
    expect(lireTrajectoire(VIDE, "AT1")).toBeNull();
    expect(lireCone(VIDE, "AT1")).toBeNull();
  });

  it.each([
    ["la racine n'est pas une FeatureCollection", () => ({ type: "Feature" })],
    ["le type de géométrie est inattendu", () => avec(cone, (e) => (e.geometry = { type: "Point", coordinates: [[0, 0]] }))],
    ["une coordonnée est hors bornes", () => avec(cone, (e) => (e.geometry.coordinates[0][1] = [-58.2, 95]))],
    ["une coordonnée n'est pas un nombre", () => avec(cone, (e) => (e.geometry.coordinates[0][1] = ["-58.2", 17]))],
    ["l'emplacement ne correspond pas", () => avec(cone, (e) => (e.properties.binnumber = "AT2"))],
    ["le numéro d'avis est mal formé", () => avec(cone, (e) => (e.properties.advisnum = "<b>14</b>"))],
    [
      "le nombre de points est démesuré",
      () => avec(cone, (e) => (e.geometry.coordinates = [Array.from({ length: 20_001 }, () => [-58, 17])])),
    ],
  ])("rejettent le cône quand %s", (_cas, fabriquer) => {
    expect(() => lireCone(fabriquer(), "AT1")).toThrow(PrevisionInvalideError);
  });

  it("rejette une trajectoire qui n'est pas une ligne", () => {
    expect(() => lireTrajectoire(cone, "AT1")).toThrow(PrevisionInvalideError);
  });
});

describe("chargerPrevision", () => {
  let warn: ReturnType<typeof vi.spyOn>;
  const fetchSimule = vi.fn<typeof fetch>();

  function repondre(parCouche: Record<number, unknown>) {
    fetchSimule.mockImplementation(async (url) => {
      const couche = Number(new URL(String(url)).pathname.split("/").at(-2));
      const corps = parCouche[couche];
      return corps === undefined ? new Response("", { status: 500 }) : new Response(JSON.stringify(corps));
    });
  }

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", fetchSimule);
  });

  afterEach(() => {
    warn.mockRestore();
    fetchSimule.mockReset();
    vi.unstubAllGlobals();
  });

  it("interroge seulement le service NOAA, en GeoJSON, sans suivre de redirection", async () => {
    repondre({ 7: trajectoire, 8: cone });

    await chargerPrevision("AT1");

    const appels = fetchSimule.mock.calls.map(([url, options]) => ({ url: new URL(String(url)), options }));
    expect(appels.map(({ url }) => url.pathname.split("/").at(-2))).toEqual(["7", "8"]);
    for (const { url, options } of appels) {
      expect(url.href.startsWith(`${URL_SERVICE_PREVISIONS}/`)).toBe(true);
      expect(url.searchParams.get("f")).toBe("geojson");
      expect(url.searchParams.get("outSR")).toBe("4326");
      expect(options).toMatchObject({ redirect: "error", cache: "no-store", signal: expect.any(AbortSignal) });
    }
  });

  it("assemble trajectoire et cône du même système", async () => {
    repondre({ 7: trajectoire, 8: cone });

    const prevision = await chargerPrevision("AT1");

    expect(prevision?.avis).toBe("14");
    expect(prevision?.trajectoire).toHaveLength(1);
    expect(prevision?.cone).toHaveLength(1);
  });

  it("renvoie null sans rien journaliser quand rien n'est publié", async () => {
    repondre({ 7: VIDE, 8: VIDE });

    expect(await chargerPrevision("AT1")).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  it("n'interroge rien pour un système hors de l'Atlantique", async () => {
    expect(await chargerPrevision("EP1")).toBeNull();
    expect(fetchSimule).not.toHaveBeenCalled();
  });

  it.each([
    ["une couche répond en erreur", { 7: trajectoire }],
    ["une couche est invalide", { 7: trajectoire, 8: { type: "Feature" } }],
  ])("renvoie null et journalise quand %s", async (_cas, parCouche) => {
    repondre(parCouche);

    expect(await chargerPrevision("AT1")).toBeNull();
    expect(warn).toHaveBeenCalled();
  });
});
