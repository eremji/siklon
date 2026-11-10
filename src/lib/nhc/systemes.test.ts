import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import actifs from "./__fixtures__/current-storms-actifs.json";
import vide from "./__fixtures__/current-storms-vide.json";
import { FluxInvalideError, categorieSaffirSimpson, libelleType, lireCurrentStorms } from "./systemes";

// Copie modifiable du premier système de la fixture.
function fluxAvec(modifier: (systeme: Record<string, unknown>) => void) {
  const copie = structuredClone(actifs) as { activeStorms: Record<string, unknown>[] };
  modifier(copie.activeStorms[0]);
  return copie;
}

describe("lireCurrentStorms", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it("lit les systèmes de l'Atlantique avec leurs champs utiles", () => {
    const { systemes, rejetes } = lireCurrentStorms(actifs);

    expect(rejetes).toBe(0);
    expect(systemes.map((s) => s.nom)).toEqual(["Kyle", "Leah", "Thirteen"]);
    expect(systemes[0]).toEqual({
      id: "al112026",
      emplacement: "AT1",
      nom: "Kyle",
      classification: "HU",
      ventKt: 120,
      pressionHpa: 948,
      latitude: 16.8,
      longitude: -58.2,
      avis: {
        numero: "14",
        emisLe: "2026-09-10T15:00:00.000Z",
        url: "https://www.nhc.noaa.gov/text/MIATCPAT1.shtml",
      },
      deplacement: { directionDeg: 285, vitesseMph: 12 },
    });
  });

  it("ignore sans le signaler les systèmes des autres bassins", () => {
    const { systemes } = lireCurrentStorms(actifs);

    expect(systemes.some((s) => s.id.startsWith("ep"))).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });

  it("renvoie une liste vide quand aucun système n'est actif", () => {
    expect(lireCurrentStorms(vide)).toEqual({ systemes: [], rejetes: 0 });
  });

  it.each([
    ["la racine n'est pas un objet", null],
    ["activeStorms manque", {}],
    ["activeStorms n'est pas un tableau", { activeStorms: "Kyle" }],
  ])("rejette le flux entier quand %s", (_cas, brut) => {
    expect(() => lireCurrentStorms(brut)).toThrow(FluxInvalideError);
  });

  it.each([
    ["le nom manque", (s: Record<string, unknown>) => delete s.name],
    ["le nom contient du HTML", (s: Record<string, unknown>) => (s.name = "<img src=x onerror=alert(1)>")],
    ["la classification est inconnue", (s: Record<string, unknown>) => (s.classification = "XX")],
    ["le vent n'est pas un nombre", (s: Record<string, unknown>) => (s.intensity = "fort")],
    ["le vent est hors bornes", (s: Record<string, unknown>) => (s.intensity = "400")],
    ["la pression est hors bornes", (s: Record<string, unknown>) => (s.pressure = "200")],
    ["la latitude est hors bornes", (s: Record<string, unknown>) => (s.latitudeNumeric = 95)],
    ["la longitude manque", (s: Record<string, unknown>) => delete s.longitudeNumeric],
    ["l'identifiant est mal formé", (s: Record<string, unknown>) => (s.id = "../al112026")],
    ["l'emplacement est mal formé", (s: Record<string, unknown>) => (s.binNumber = "AT9")],
    ["l'avis public manque", (s: Record<string, unknown>) => delete s.publicAdvisory],
    [
      "l'heure de l'avis n'est pas une date",
      (s: Record<string, unknown>) => (s.publicAdvisory = { advNum: "14", issuance: "hier" }),
    ],
  ])("écarte et journalise un système quand %s, sans perdre les autres", (_cas, modifier) => {
    const { systemes, rejetes } = lireCurrentStorms(fluxAvec(modifier));

    expect(systemes.map((s) => s.nom)).toEqual(["Leah", "Thirteen"]);
    expect(rejetes).toBe(1);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("ne recopie pas la valeur reçue dans le journal", () => {
    lireCurrentStorms(fluxAvec((s) => (s.name = "<script>secret</script>")));

    expect(JSON.stringify(warn.mock.calls)).not.toContain("secret");
  });

  it("accepte vent et pression donnés en nombres", () => {
    const { systemes } = lireCurrentStorms(
      fluxAvec((s) => {
        s.intensity = 120;
        s.pressure = 948;
      }),
    );

    expect(systemes[0]).toMatchObject({ ventKt: 120, pressionHpa: 948 });
  });
});

describe("lireCurrentStorms : champs facultatifs de la fiche (US-02)", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it("accepte un système immobile et des valeurs de déplacement données en texte", () => {
    const { systemes } = lireCurrentStorms(
      fluxAvec((s) => {
        s.movementDir = "0";
        s.movementSpeed = "0";
      }),
    );

    expect(systemes[0].deplacement).toEqual({ directionDeg: 0, vitesseMph: 0 });
  });

  it.each([
    ["la direction manque", (s: Record<string, unknown>) => delete s.movementDir],
    ["la direction est hors bornes", (s: Record<string, unknown>) => (s.movementDir = 400)],
    ["la vitesse est négative", (s: Record<string, unknown>) => (s.movementSpeed = -3)],
    ["la vitesse n'est pas un nombre", (s: Record<string, unknown>) => (s.movementSpeed = "rapide")],
  ])("garde le système sans déplacement quand %s, et journalise le champ", (_cas, modifier) => {
    const { systemes, rejetes } = lireCurrentStorms(fluxAvec(modifier));

    expect(rejetes).toBe(0);
    expect(systemes[0].nom).toBe("Kyle");
    expect(systemes[0]).not.toHaveProperty("deplacement");
    expect(warn).toHaveBeenCalledWith("[nhc] champ facultatif ignoré", expect.objectContaining({ champ: expect.any(String) }));
  });

  it.each([
    ["en http", "http://www.nhc.noaa.gov/text/MIATCPAT1.shtml"],
    ["sur un autre domaine", "https://www.nhc.noaa.gov.exemple.com/text/MIATCPAT1.shtml"],
    ["hors du dossier des avis", "https://www.nhc.noaa.gov/../MIATCPAT1.shtml"],
    ["en javascript", "javascript:alert(1)"],
    ["qui n'est pas du texte", 42],
  ])("ignore une URL d'avis %s : le système reste affiché sans ce lien", (_cas, url) => {
    const { systemes, rejetes } = lireCurrentStorms(
      fluxAvec((s) => (s.publicAdvisory = { ...(s.publicAdvisory as object), url })),
    );

    expect(rejetes).toBe(0);
    expect(systemes[0].avis).toEqual({ numero: "14", emisLe: "2026-09-10T15:00:00.000Z" });
    expect(JSON.stringify(warn.mock.calls)).not.toContain("alert");
  });
});

describe("categorieSaffirSimpson", () => {
  it.each([
    [63, null],
    [64, 1],
    [82, 1],
    [83, 2],
    [95, 2],
    [96, 3],
    [112, 3],
    [113, 4],
    [136, 4],
    [137, 5],
    [160, 5],
  ])("un vent de %i kt donne la catégorie %s", (ventKt, categorie) => {
    expect(categorieSaffirSimpson(ventKt)).toBe(categorie);
  });
});

describe("libelleType", () => {
  it.each([
    ["TD", "Dépression tropicale"],
    ["STD", "Dépression subtropicale"],
    ["TS", "Tempête tropicale"],
    ["STS", "Tempête subtropicale"],
    ["HU", "Ouragan"],
    ["PTC", "Cyclone potentiel ou post-tropical"],
  ] as const)("traduit %s", (code, libelle) => {
    expect(libelleType(code)).toBe(libelle);
  });
});
