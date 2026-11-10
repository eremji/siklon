import { describe, expect, it } from "vitest";
import points from "./__fixtures__/prevision-at1-points.json";
import { RADIUS_WATCH_KM, RAYON_TERRE_KM } from "../constantes";
import { distanceKm } from "../distance";
import { trouverIle } from "../iles";
import { evaluerMenaces, plusProchePassage } from "./menace";
import { type PositionPrevue, type PositionsPrevues, lirePositionsPrevues } from "./positions";

const KM_PAR_DEGRE = (RAYON_TERRE_KM * Math.PI) / 180;
const kyle = lirePositionsPrevues(points, "AT1")!;
const guadeloupe = trouverIle("guadeloupe")!;
const cuba = trouverIle("cuba")!;

function position(echeanceH: number, lat: number, lon: number): PositionPrevue {
  return { echeanceH, valideLe: new Date(Date.UTC(2026, 8, 10, 12 + echeanceH)).toISOString(), lat, lon };
}

function prevision(...positions: PositionPrevue[]): PositionsPrevues {
  return { avis: { numero: "7", emisLe: "2026-09-10T15:00:00.000Z" }, positions };
}

describe("plusProchePassage", () => {
  it("trouve le plus proche passage entre deux positions prévues, pas seulement aux positions publiées", () => {
    // Trajectoire d'ouest en est le long de l'équateur ; le point est 1° au nord de son milieu.
    const passage = plusProchePassage([position(0, 0, -2), position(24, 0, 2)], { lat: 1, lon: 0 });

    expect(passage?.distanceKm).toBeCloseTo(KM_PAR_DEGRE, 0);
    expect(passage?.heure).toBe("2026-09-11T00:00:00.000Z");
    expect(passage!.distanceKm).toBeLessThan(distanceKm({ lat: 0, lon: 2 }, { lat: 1, lon: 0 }));
  });

  it("retient la position prévue elle-même quand elle est la plus proche", () => {
    const passage = plusProchePassage([position(0, 10, -60), position(12, 12, -60)], { lat: 13, lon: -60 });

    expect(passage?.heure).toBe("2026-09-11T00:00:00.000Z");
    expect(passage?.distanceKm).toBeCloseTo(KM_PAR_DEGRE, 0);
  });

  it("accepte une seule position et ne donne rien sans position", () => {
    expect(plusProchePassage([position(0, 10, -60)], { lat: 10, lon: -60 })?.distanceKm).toBe(0);
    expect(plusProchePassage([], { lat: 10, lon: -60 })).toBeNull();
  });
});

describe("evaluerMenaces", () => {
  const systeme = (id: string) => ({ id });

  it("signale Kyle pour la Guadeloupe, avec l'heure et la distance du plus proche passage", () => {
    const { menaces } = evaluerMenaces(guadeloupe, [systeme("al112026")], { al112026: kyle });

    expect(menaces).toHaveLength(1);
    const [menace] = menaces;
    expect(menace.systeme.id).toBe("al112026");
    expect(menace.avis).toEqual({ numero: "14", emisLe: "2026-09-10T15:00:00.000Z" });
    expect(menace.passage.distanceKm).toBeLessThanOrEqual(RADIUS_WATCH_KM);
    expect(Date.parse(menace.passage.heure)).toBeGreaterThan(Date.parse("2026-09-11T00:00:00.000Z"));
    expect(Date.parse(menace.passage.heure)).toBeLessThan(Date.parse("2026-09-12T00:00:00.000Z"));
  });

  it("ne signale rien quand la trajectoire prévue reste hors du rayon de l'île", () => {
    expect(evaluerMenaces(cuba, [systeme("al112026")], { al112026: kyle })).toEqual({ menaces: [], sansPrevision: [] });
  });

  it("mesure le rayon RADIUS_WATCH_KM depuis le point de référence de l'île", () => {
    const { lat, lon } = guadeloupe.pointReference;
    const a = (km: number) => prevision(position(0, lat + km / KM_PAR_DEGRE, lon));

    const juste = evaluerMenaces(guadeloupe, [systeme("dedans")], { dedans: a(RADIUS_WATCH_KM - 1) });
    const hors = evaluerMenaces(guadeloupe, [systeme("dehors")], { dehors: a(RADIUS_WATCH_KM + 1) });

    expect(juste.menaces).toHaveLength(1);
    expect(hors.menaces).toHaveLength(0);
  });

  it("met à part les systèmes dont les positions prévues sont indisponibles", () => {
    const resultat = evaluerMenaces(guadeloupe, [systeme("al112026"), systeme("al122026")], { al112026: kyle });

    expect(resultat.menaces.map((m) => m.systeme.id)).toEqual(["al112026"]);
    expect(resultat.sansPrevision).toEqual([systeme("al122026")]);
  });

  it("range les menaces du passage le plus proche dans le temps au plus lointain", () => {
    const { lat, lon } = guadeloupe.pointReference;
    const tardif = prevision(position(0, lat + 5, lon), position(72, lat, lon));
    const proche = prevision(position(0, lat + 5, lon), position(12, lat, lon));

    const { menaces } = evaluerMenaces(guadeloupe, [systeme("tardif"), systeme("proche")], { tardif, proche });

    expect(menaces.map((m) => m.systeme.id)).toEqual(["proche", "tardif"]);
  });
});
