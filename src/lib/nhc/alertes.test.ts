import { afterEach, describe, expect, it, vi } from "vitest";
import { ILES, type Emprise } from "@/lib/iles";
import actifs from "./__fixtures__/current-storms-actifs.json";
import at1 from "./__fixtures__/watch-warning-at1.json";
import at3 from "./__fixtures__/watch-warning-at3.json";
import { type AlerteNhc, chargerAlertesNhc, segmentDansEmprise, TYPES_ALERTE } from "./alertes";
import type { EtatFlux } from "./client";
import { lireCurrentStorms } from "./systemes";
import { type CodeAlerte, lireWatchWarning, type SegmentAlerte } from "./watches";

const LU_LE = "2026-09-10T15:10:00.000Z";
const FLUX: EtatFlux = { etat: "ok", ...lireCurrentStorms(actifs), luLe: LU_LE };

function emprise(slug: string): Emprise {
  const ile = ILES.find((i) => i.slug === slug);
  if (ile?.alerte.source !== "nhc") throw new Error(`${slug} n'est pas une île NHC`);
  return ile.alerte.emprise;
}

const COUCHES: Record<string, unknown> = { AT1: at1, AT3: at3 };
const lireFixtures = vi.fn(async (emplacement: string) =>
  COUCHES[emplacement] ? lireWatchWarning(COUCHES[emplacement], emplacement) : [],
);

function segment(code: CodeAlerte, lignes: [number, number][][], numero = "14"): SegmentAlerte {
  return { code, avis: { numero, emisLe: "2026-09-10T15:00:00.000Z" }, lignes };
}

const ROSEAU: [number, number] = [-61.39, 15.3];

afterEach(() => {
  lireFixtures.mockClear();
  vi.restoreAllMocks();
});

describe("TYPES_ALERTE", () => {
  it("donne le libellé français et le terme d'origine des quatre types", () => {
    expect(TYPES_ALERTE).toEqual({
      HWR: { libelle: "Avertissement d'ouragan", origine: "Hurricane Warning", nature: "avertissement" },
      TWR: { libelle: "Avertissement de tempête tropicale", origine: "Tropical Storm Warning", nature: "avertissement" },
      HWA: { libelle: "Veille d'ouragan", origine: "Hurricane Watch", nature: "veille" },
      TWA: { libelle: "Veille de tempête tropicale", origine: "Tropical Storm Watch", nature: "veille" },
    });
  });
});

describe("segmentDansEmprise", () => {
  it("rattache un segment dont un point tombe dans l'emprise", () => {
    expect(segmentDansEmprise(segment("HWR", [[[-60, 15], ROSEAU]]), emprise("dominique"))).toBe(true);
  });

  it("cherche dans toutes les lignes d'un segment", () => {
    const lignes: [number, number][][] = [[[-60, 15], [-60, 16]], [[-61.5, 16.2], ROSEAU]];
    expect(segmentDansEmprise(segment("HWR", lignes), emprise("dominique"))).toBe(true);
  });

  it("inclut les bornes de l'emprise", () => {
    expect(segmentDansEmprise(segment("TWA", [[[-61.51, 15.67], [-60, 16]]]), emprise("dominique"))).toBe(true);
  });

  it("ne rattache pas un segment dont aucun point ne tombe dans l'emprise", () => {
    expect(segmentDansEmprise(segment("TWA", [[[-61.2, 16.5], [-61, 16.35]]]), emprise("dominique"))).toBe(false);
  });

  it("rattache un point de la frontière à Haïti et à la République dominicaine", () => {
    const frontiere = segment("TWR", [[[-71.75, 18.04], [-71.75, 18.1]]]);
    expect(segmentDansEmprise(frontiere, emprise("haiti"))).toBe(true);
    expect(segmentDansEmprise(frontiere, emprise("republique-dominicaine"))).toBe(true);
  });

  it("rattache un avertissement pour l'est de Cuba à Cuba, loin de La Havane", () => {
    const santiago = segment("HWR", [[[-75.83, 19.97], [-75.2, 19.95]]]);
    expect(segmentDansEmprise(santiago, emprise("cuba"))).toBe(true);
  });

  it("ne rattache la Martinique à aucune des îles NHC", () => {
    const martinique = lireWatchWarning(at1, "AT1")[2];
    for (const ile of ILES) {
      if (ile.alerte.source === "nhc") expect(segmentDansEmprise(martinique, ile.alerte.emprise), ile.nom).toBe(false);
    }
  });

  it("ne rattache la Guadeloupe à aucune des îles NHC", () => {
    const guadeloupe = lireWatchWarning(at1, "AT1")[1];
    for (const ile of ILES) {
      if (ile.alerte.source === "nhc") expect(segmentDansEmprise(guadeloupe, ile.alerte.emprise), ile.nom).toBe(false);
    }
  });
});

describe("chargerAlertesNhc", () => {
  const kyle = { id: "al112026", nom: "Kyle", description: "Ouragan de catégorie 4" };

  it("donne l'avertissement d'ouragan de Kyle pour la Dominique, avec son avis", async () => {
    const etat = await chargerAlertesNhc(FLUX, emprise("dominique"), lireFixtures);

    expect(etat).toEqual({
      etat: "ok",
      luLe: LU_LE,
      alertes: [{ code: "HWR", systeme: kyle, avis: { numero: "14", emisLe: "2026-09-10T15:00:00.000Z" } }],
    });
  });

  it("classe les alertes de Sainte-Lucie de la plus grave à la moins grave", async () => {
    const etat = await chargerAlertesNhc(FLUX, emprise("sainte-lucie"), lireFixtures);

    expect(etat.etat === "ok" && etat.alertes.map((a) => a.code)).toEqual(["TWR", "HWA"]);
  });

  it("donne la veille de tempête tropicale de Thirteen pour l'ouest de Cuba", async () => {
    const etat = await chargerAlertesNhc(FLUX, emprise("cuba"), lireFixtures);

    expect(etat).toMatchObject({
      etat: "ok",
      alertes: [
        {
          code: "TWA",
          systeme: { id: "al132026", nom: "Thirteen", description: "Dépression tropicale" },
          avis: { numero: "1", emisLe: "2026-09-10T12:00:00.000Z" },
        },
      ],
    });
  });

  it("n'indique aucune alerte pour la Barbade", async () => {
    expect(await chargerAlertesNhc(FLUX, emprise("barbade"), lireFixtures)).toEqual({
      etat: "ok",
      luLe: LU_LE,
      alertes: [],
    });
  });

  it("n'interroge que les emplacements de l'Atlantique", async () => {
    await chargerAlertesNhc(FLUX, emprise("barbade"), lireFixtures);

    expect(lireFixtures.mock.calls.map(([emplacement]) => emplacement).sort()).toEqual(["AT1", "AT2", "AT3"]);
  });

  it("n'indique aucune alerte sans système actif", async () => {
    const vide: EtatFlux = { etat: "ok", systemes: [], rejetes: 0, luLe: LU_LE };
    expect(await chargerAlertesNhc(vide, emprise("dominique"), lireFixtures)).toEqual({
      etat: "ok",
      luLe: LU_LE,
      alertes: [],
    });
  });

  it("ne garde qu'une alerte par type et par système", async () => {
    const lire = async () => [segment("HWR", [[ROSEAU, [-61.4, 15.5]]]), segment("HWR", [[[-61.3, 15.4], ROSEAU]])];
    const etat = await chargerAlertesNhc({ ...FLUX, systemes: FLUX.etat === "ok" ? FLUX.systemes.slice(0, 1) : [] }, emprise("dominique"), lire);

    expect(etat.etat === "ok" && etat.alertes).toHaveLength(1);
  });

  it("classe par gravité, puis par nom de système", async () => {
    const parEmplacement: Record<string, SegmentAlerte[]> = {
      AT1: [segment("TWA", [[ROSEAU, ROSEAU]])],
      AT2: [segment("HWA", [[ROSEAU, ROSEAU]]), segment("TWA", [[ROSEAU, ROSEAU]])],
      AT3: [segment("HWR", [[ROSEAU, ROSEAU]])],
    };
    const etat = await chargerAlertesNhc(FLUX, emprise("dominique"), async (e) => parEmplacement[e] ?? []);

    const resume = (a: AlerteNhc) => `${a.code} ${a.systeme.nom}`;
    expect(etat.etat === "ok" && etat.alertes.map(resume)).toEqual([
      "HWR Thirteen",
      "HWA Leah",
      "TWA Kyle",
      "TWA Leah",
    ]);
  });

  it("indique des données indisponibles quand le flux CurrentStorms l'est, sans rien interroger", async () => {
    const etat = await chargerAlertesNhc({ etat: "indisponible", luLe: LU_LE }, emprise("dominique"), lireFixtures);

    expect(etat).toEqual({ etat: "indisponible", luLe: LU_LE });
    expect(lireFixtures).not.toHaveBeenCalled();
  });

  it("indique des données indisponibles dès qu'une couche échoue, sans alerte partielle", async () => {
    const avertissement = vi.spyOn(console, "warn").mockImplementation(() => {});
    const lire = async (emplacement: string) => {
      if (emplacement === "AT2") throw new Error("HTTP 503");
      return lireFixtures(emplacement);
    };

    expect(await chargerAlertesNhc(FLUX, emprise("dominique"), lire)).toEqual({ etat: "indisponible", luLe: LU_LE });
    expect(avertissement).toHaveBeenCalledWith("[nhc] watches/warnings indisponibles", {
      emplacement: "AT2",
      raison: "Error: HTTP 503",
    });
  });

  it("indique des données indisponibles quand une couche est invalide", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const lire = async (emplacement: string) => lireWatchWarning({ type: "Feature" }, emplacement);

    expect(await chargerAlertesNhc(FLUX, emprise("dominique"), lire)).toEqual({ etat: "indisponible", luLe: LU_LE });
  });
});
