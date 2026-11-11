import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import at1 from "./__fixtures__/watch-warning-at1.json";
import at3 from "./__fixtures__/watch-warning-at3.json";
import { URL_SERVICE_PREVISIONS } from "./previsions";
import { coucheWatchWarning, lireDateAvis, lireWatches, lireWatchWarning } from "./watches";

function copie<T>(valeur: T): T {
  return structuredClone(valeur);
}

function entite(proprietes: Record<string, unknown> = {}, geometrie?: unknown) {
  const base = copie(at3.features[0]) as Record<string, unknown> & { properties: Record<string, unknown> };
  return {
    ...base,
    properties: { ...base.properties, ...proprietes },
    ...(geometrie === undefined ? {} : { geometry: geometrie }),
  };
}

function collection(...features: unknown[]) {
  return { type: "FeatureCollection", features };
}

describe("coucheWatchWarning", () => {
  it.each([
    ["AT1", 9],
    ["AT2", 35],
    ["AT5", 113],
  ])("situe la couche Watch-Warning de %s au numéro %i", (emplacement, couche) => {
    expect(coucheWatchWarning(emplacement)).toBe(couche);
  });

  it.each(["EP1", "AT6", "AT0", "at1", "AT1 ", ""])("refuse l'emplacement %j", (emplacement) => {
    expect(coucheWatchWarning(emplacement)).toBeNull();
  });
});

describe("lireDateAvis", () => {
  it.each([
    ["1100 AM AST Thu Sep 10 2026", "2026-09-10T15:00:00.000Z"],
    ["500 PM EDT Tue Oct 28 2025", "2025-10-28T21:00:00.000Z"],
    ["800 AM EDT Thu Sep 10 2026", "2026-09-10T12:00:00.000Z"],
    ["1200 PM AST Sat Jun 29 2024", "2024-06-29T16:00:00.000Z"],
    ["1200 AM EST Mon Nov 30 2026", "2026-11-30T05:00:00.000Z"],
    ["1000 PM CDT Wed Aug 26 2020", "2020-08-27T03:00:00.000Z"],
    ["400 AM CST Fri Nov 6 2026", "2026-11-06T10:00:00.000Z"],
  ])("convertit « %s » en heure UTC", (texte, iso) => {
    expect(lireDateAvis(texte)).toBe(iso);
  });

  it.each([
    "",
    "11:00 AM AST Thu Sep 10 2026",
    "1100 AM XYZ Thu Sep 10 2026",
    "1100 AM AST Thu Foo 10 2026",
    "1300 PM AST Thu Sep 10 2026",
    "1160 AM AST Thu Sep 10 2026",
    "1100 AM AST Thu Feb 30 2026",
    "1100 AM AST Thu Sep 10 2026 <script>",
  ])("refuse le texte %j", (texte) => {
    expect(lireDateAvis(texte)).toBeNull();
  });
});

describe("lireWatchWarning", () => {
  it("lit chaque segment avec son type, son avis et ses points", () => {
    const segments = lireWatchWarning(at3, "AT3");

    expect(segments).toEqual([
      {
        code: "TWA",
        avis: { numero: "1", emisLe: "2026-09-10T12:00:00.000Z" },
        lignes: [
          [
            [-83.05, 22.95],
            [-83.9, 22.6],
            [-84.45, 22.25],
            [-84.95, 21.87],
          ],
        ],
      },
    ]);
  });

  it("lit les lignes multiples et les quatre types de la fixture de Kyle", () => {
    const segments = lireWatchWarning(at1, "AT1");

    expect(segments.map((segment) => segment.code)).toEqual(["HWR", "HWR", "TWR", "TWR", "HWA"]);
    expect(segments[1].lignes).toHaveLength(2);
    expect(segments.every((segment) => segment.avis.numero === "14")).toBe(true);
  });

  it("renvoie une liste vide sans watch ni warning", () => {
    expect(lireWatchWarning(collection(), "AT1")).toEqual([]);
  });

  it.each([
    ["une réponse qui n'est pas une FeatureCollection", { type: "Feature" }],
    ["une liste d'entités absente", { type: "FeatureCollection" }],
    ["un code de type inconnu", collection(entite({ tcww: "SSW" }))],
    ["un code de type absent", collection(entite({ tcww: undefined }))],
    ["un autre emplacement", collection(entite({ binnumber: "AT1" }))],
    ["un numéro d'avis invalide", collection(entite({ advisnum: "<b>1</b>" }))],
    ["une date d'avis illisible", collection(entite({ advdate: "demain" }))],
    ["une géométrie de polygone", collection(entite({}, { type: "Polygon", coordinates: [] }))],
    ["une ligne d'un seul point", collection(entite({}, { type: "LineString", coordinates: [[-83, 22]] }))],
    [
      "une coordonnée hors bornes",
      collection(entite({}, { type: "LineString", coordinates: [[-83, 22], [-200, 22]] })),
    ],
    [
      "une coordonnée non numérique",
      collection(entite({}, { type: "LineString", coordinates: [[-83, 22], ["-84", 22]] })),
    ],
    ["une entité sans propriétés", collection({ type: "Feature", geometry: at3.features[0].geometry })],
  ])("rejette %s", (_cas, brut) => {
    expect(() => lireWatchWarning(brut, "AT3")).toThrow(/Watches\/warnings NHC invalides/);
  });

  it("rejette une couche trop volumineuse", () => {
    const entites = Array.from({ length: 501 }, () => entite());
    expect(() => lireWatchWarning(collection(...entites), "AT3")).toThrow(/trop d'entités/);
  });

  it("rejette une couche avec trop de points", () => {
    const longue = Array.from({ length: 100_001 }, (_, i) => [-83 + (i % 100) / 1000, 22]);
    expect(() =>
      lireWatchWarning(collection(entite({}, { type: "LineString", coordinates: longue })), "AT3"),
    ).toThrow(/trop de points/);
  });
});

describe("lireWatches", () => {
  const fetchSimule = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchSimule.mockResolvedValue(new Response(JSON.stringify(at1), { status: 200 }));
    vi.stubGlobal("fetch", fetchSimule);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchSimule.mockReset();
  });

  it("interroge la seule couche Watch-Warning de l'emplacement, en GeoJSON", async () => {
    const segments = await lireWatches("AT1");

    expect(segments).toHaveLength(5);
    expect(fetchSimule).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSimule.mock.calls[0];
    const lue = new URL(String(url));
    expect(`${lue.origin}${lue.pathname}`).toBe(`${URL_SERVICE_PREVISIONS}/9/query`);
    expect(lue.searchParams.get("f")).toBe("geojson");
    expect(lue.searchParams.get("outSR")).toBe("4326");
    expect(lue.searchParams.get("outFields")).toBe("binnumber,advisnum,advdate,tcww");
    expect(options).toMatchObject({ redirect: "error", cache: "no-store" });
  });

  it("n'interroge rien pour un emplacement hors Atlantique", async () => {
    expect(await lireWatches("EP1")).toEqual([]);
    expect(fetchSimule).not.toHaveBeenCalled();
  });

  it("rejette une réponse HTTP en erreur, pour qu'elle ne soit pas mise en cache", async () => {
    fetchSimule.mockResolvedValue(new Response("", { status: 503 }));
    await expect(lireWatches("AT1")).rejects.toThrow("HTTP 503");
  });

  it("rejette une réponse invalide", async () => {
    fetchSimule.mockResolvedValue(new Response(JSON.stringify({ type: "Feature" }), { status: 200 }));
    await expect(lireWatches("AT1")).rejects.toThrow(/invalides/);
  });
});
