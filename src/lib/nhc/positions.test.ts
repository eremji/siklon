import { afterEach, describe, expect, it, vi } from "vitest";
import points from "./__fixtures__/prevision-at1-points.json";
import {
  PositionsInvalidesError,
  chargerPositionsPrevues,
  chargerToutesPositions,
  couchePositions,
  lirePositionsPrevues,
} from "./positions";
import { URL_SERVICE_PREVISIONS } from "./previsions";

const VIDE = { type: "FeatureCollection", features: [] };

interface EntiteModifiable {
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, unknown>;
}

// Copie modifiable de la fixture ; `modifier` reçoit toutes les entités.
function avec(modifier: (entites: EntiteModifiable[]) => void): unknown {
  const copie = structuredClone(points) as unknown as { features: EntiteModifiable[] };
  modifier(copie.features);
  return copie;
}

// Une seule position prévue, avec l'avis et l'échéance voulus.
function unePosition(advdate: string, tau: number, validtime: string): unknown {
  return avec((entites) => {
    entites.splice(1);
    Object.assign(entites[0].properties, { advdate, tau, validtime });
  });
}

describe("couchePositions", () => {
  it("donne la couche des positions prévues (Forecast Points) du service NOAA pour AT1 à AT5", () => {
    expect(couchePositions("AT1")).toBe(6);
    expect(couchePositions("AT2")).toBe(32);
    expect(couchePositions("AT5")).toBe(110);
  });

  it("ne donne rien hors de l'Atlantique ou pour un emplacement inconnu", () => {
    expect(couchePositions("EP1")).toBeNull();
    expect(couchePositions("AT6")).toBeNull();
  });
});

describe("lirePositionsPrevues", () => {
  it("lit le numéro et l'heure de l'avis, et chaque position prévue avec son heure de validité", () => {
    const lues = lirePositionsPrevues(points, "AT1");

    expect(lues?.avis).toEqual({ numero: "14", emisLe: "2026-09-10T15:00:00.000Z" });
    expect(lues?.positions).toHaveLength(8);
    expect(lues?.positions[0]).toEqual({ echeanceH: 0, valideLe: "2026-09-10T15:00:00.000Z", lat: 16.8, lon: -58.2 });
    expect(lues?.positions[1]).toEqual({ echeanceH: 12, valideLe: "2026-09-11T00:00:00.000Z", lat: 17.4, lon: -59.9 });
    expect(lues?.positions[7]).toEqual({ echeanceH: 120, valideLe: "2026-09-15T12:00:00.000Z", lat: 24.1, lon: -75 });
  });

  it("range les positions par échéance, quel que soit leur ordre dans la couche", () => {
    const lues = lirePositionsPrevues(avec((entites) => entites.reverse()), "AT1");

    expect(lues?.positions.map((p) => p.echeanceH)).toEqual([0, 12, 24, 36, 48, 72, 96, 120]);
  });

  it("ne donne rien quand aucune position n'est publiée", () => {
    expect(lirePositionsPrevues(VIDE, "AT1")).toBeNull();
  });

  it("convertit l'heure de l'avis selon le fuseau NHC indiqué", () => {
    const lues = lirePositionsPrevues(unePosition("500 PM EDT Mon Aug 31 2026", 0, "31/2100"), "AT1");

    expect(lues?.avis.emisLe).toBe("2026-08-31T21:00:00.000Z");
  });

  it("situe une heure de validité dans le mois suivant celui de l'avis", () => {
    const lues = lirePositionsPrevues(unePosition("1100 PM AST Sun Aug 30 2026", 24, "01/0000"), "AT1");

    expect(lues?.positions[0].valideLe).toBe("2026-09-01T00:00:00.000Z");
  });

  it("situe une heure de validité dans l'année suivante", () => {
    const lues = lirePositionsPrevues(unePosition("1100 PM AST Thu Dec 31 2026", 120, "05/1800"), "AT1");

    expect(lues?.avis.emisLe).toBe("2027-01-01T03:00:00.000Z");
    expect(lues?.positions[0].valideLe).toBe("2027-01-05T18:00:00.000Z");
  });

  it.each([
    ["l'emplacement ne correspond pas", (e: EntiteModifiable[]) => (e[0].properties.binnumber = "AT2")],
    ["les numéros d'avis diffèrent", (e: EntiteModifiable[]) => (e[3].properties.advisnum = "15")],
    ["les dates d'avis diffèrent", (e: EntiteModifiable[]) => (e[3].properties.advdate = "500 PM AST Thu Sep 10 2026")],
    ["le numéro d'avis est mal formé", (e: EntiteModifiable[]) => (e[0].properties.advisnum = "<b>14</b>")],
    ["la date d'avis est mal formée", (e: EntiteModifiable[]) => (e[0].properties.advdate = "hier")],
    ["le fuseau de l'avis est inconnu", (e: EntiteModifiable[]) => (e[0].properties.advdate = "1100 AM XYZ Thu Sep 10 2026")],
    ["l'échéance n'est pas un nombre entier", (e: EntiteModifiable[]) => (e[2].properties.tau = "24")],
    ["l'échéance dépasse 120 h", (e: EntiteModifiable[]) => (e[7].properties.tau = 168)],
    ["une échéance est en double", (e: EntiteModifiable[]) => (e[2].properties.tau = 12)],
    ["l'heure de validité est mal formée", (e: EntiteModifiable[]) => (e[2].properties.validtime = "11-1200")],
    ["l'heure de validité est loin de l'échéance", (e: EntiteModifiable[]) => (e[2].properties.validtime = "13/1200")],
    ["la géométrie n'est pas un point", (e: EntiteModifiable[]) => (e[0].geometry.type = "LineString")],
    ["une coordonnée est hors bornes", (e: EntiteModifiable[]) => (e[0].geometry.coordinates = [-58.2, 91])],
    ["il y a trop de positions", (e: EntiteModifiable[]) => e.push(...structuredClone(e), ...structuredClone(e), ...structuredClone(e))],
  ])("rejette la couche quand %s", (_cas, modifier) => {
    expect(() => lirePositionsPrevues(avec(modifier), "AT1")).toThrow(PositionsInvalidesError);
  });

  it("rejette une réponse qui n'est pas une FeatureCollection", () => {
    expect(() => lirePositionsPrevues({ error: "boom" }, "AT1")).toThrow(PositionsInvalidesError);
  });
});

describe("chargerPositionsPrevues", () => {
  afterEach(() => vi.restoreAllMocks());

  it("interroge la couche des positions prévues de l'emplacement, en GeoJSON", async () => {
    const appel = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(points));

    const lues = await chargerPositionsPrevues("AT1");

    const url = new URL(String(appel.mock.calls[0][0]));
    expect(`${url.origin}${url.pathname}`).toBe(`${URL_SERVICE_PREVISIONS}/6/query`);
    expect(url.searchParams.get("f")).toBe("geojson");
    expect(url.searchParams.get("outSR")).toBe("4326");
    expect(appel.mock.calls[0][1]).toMatchObject({ redirect: "error", cache: "no-store" });
    expect(lues?.positions).toHaveLength(8);
  });

  it("ne donne rien, sans lever d'erreur, quand le service échoue ou répond mal", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("", { status: 503 }));
    expect(await chargerPositionsPrevues("AT1")).toBeNull();

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ type: "FeatureCollection" }));
    expect(await chargerPositionsPrevues("AT1")).toBeNull();
  });

  it("n'interroge pas le service pour un emplacement hors de l'Atlantique", async () => {
    const appel = vi.spyOn(globalThis, "fetch");

    expect(await chargerPositionsPrevues("EP1")).toBeNull();
    expect(appel).not.toHaveBeenCalled();
  });
});

describe("chargerToutesPositions", () => {
  afterEach(() => vi.restoreAllMocks());

  it("associe les positions disponibles à l'identifiant de chaque système", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (entree) =>
      Response.json(String(entree).includes("/6/query") ? points : VIDE),
    );

    const toutes = await chargerToutesPositions([
      { id: "al112026", emplacement: "AT1" },
      { id: "al122026", emplacement: "AT2" },
    ]);

    expect(Object.keys(toutes)).toEqual(["al112026"]);
  });
});
