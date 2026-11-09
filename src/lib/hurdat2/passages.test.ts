// @vitest-environment node
import { describe, expect, it } from "vitest";
import { RADIUS_IMPACT_KM, RAYON_TERRE_KM } from "../constantes";
import { trouverIle } from "../iles";
import type { PointHurdat2, TempeteHurdat2 } from "./parseur";
import { calculerPassage, categorieVent } from "./passages";

const guadeloupe = trouverIle("guadeloupe")!;
const { lat: LAT, lon: LON } = guadeloupe.pointReference;
const KM_PAR_DEGRE = (Math.PI * RAYON_TERRE_KM) / 180;

const pt = (heures: number, lat: number, lon: number, ventKt: number | null = 50): PointHurdat2 => ({
  horodatage: new Date(Date.UTC(1990, 7, 15, heures)),
  identifiant: null,
  statut: "HU",
  lat,
  lon,
  ventKt,
  pressionMb: null,
});

const tempete = (...points: PointHurdat2[]): TempeteHurdat2 => ({
  id: "AL011990",
  bassin: "AL",
  numero: 1,
  annee: 1990,
  nom: "ALPHA",
  points,
});

describe("calculerPassage", () => {
  it("trouve un passage quand un point de trajectoire est sur le point de référence", () => {
    const passage = calculerPassage(tempete(pt(0, LAT - 3, LON), pt(6, LAT, LON, 90), pt(12, LAT + 3, LON)), guadeloupe);
    expect(passage).toMatchObject({ ileSlug: "guadeloupe", tempeteId: "AL011990" });
    expect(passage?.distanceMinKm).toBeCloseTo(0, 6);
    expect(passage?.horodatage).toEqual(new Date("1990-08-15T06:00:00Z"));
  });

  it("ne renvoie rien pour une trajectoire qui reste loin de l'île", () => {
    expect(calculerPassage(tempete(pt(0, LAT + 5, LON - 5), pt(6, LAT + 6, LON - 4)), guadeloupe)).toBeNull();
  });

  it("détecte un segment qui traverse le rayon sans qu'aucun point n'y tombe", () => {
    const passage = calculerPassage(tempete(pt(0, LAT, LON - 2), pt(12, LAT, LON + 2)), guadeloupe);
    expect(passage?.distanceMinKm).toBeCloseTo(0, 1);
    expect(passage?.horodatage).toEqual(new Date("1990-08-15T06:00:00Z"));
  });

  it("mesure la plus courte distance au segment, pas seulement aux points", () => {
    const passage = calculerPassage(tempete(pt(0, LAT + 1, LON - 3), pt(12, LAT + 1, LON + 3)), guadeloupe);
    expect(passage?.distanceMinKm).toBeCloseTo(KM_PAR_DEGRE, 0);
  });

  it(`exclut une trajectoire qui passe juste au-delà de RADIUS_IMPACT_KM (${RADIUS_IMPACT_KM} km)`, () => {
    const juste = (RADIUS_IMPACT_KM + 2) / KM_PAR_DEGRE;
    expect(calculerPassage(tempete(pt(0, LAT + juste, LON - 3), pt(12, LAT + juste, LON + 3)), guadeloupe)).toBeNull();
  });

  it("inclut une trajectoire qui passe juste en deçà de RADIUS_IMPACT_KM", () => {
    const juste = (RADIUS_IMPACT_KM - 2) / KM_PAR_DEGRE;
    expect(calculerPassage(tempete(pt(0, LAT + juste, LON - 3), pt(12, LAT + juste, LON + 3)), guadeloupe)).not.toBeNull();
  });

  it("ne retient que le vent de la portion de trajectoire située dans le rayon", () => {
    const passage = calculerPassage(
      tempete(pt(0, LAT - 3, LON, 50), pt(6, LAT, LON, 50), pt(12, LAT + 3, LON, 50), pt(18, LAT + 9, LON, 140)),
      guadeloupe,
    );
    expect(passage?.ventMaxKt).toBe(50);
    expect(passage?.categorie).toBe(0);
  });

  it("interpole le vent à l'entrée et à la sortie du rayon", () => {
    // Vent de 40 à 80 kt le long d'un segment symétrique : la sortie du rayon est à t ≈ 0,78.
    const passage = calculerPassage(tempete(pt(0, LAT, LON - 2, 40), pt(12, LAT, LON + 2, 80)), guadeloupe);
    expect(passage?.ventMaxKt).toBe(71);
    expect(passage?.categorie).toBe(1);
  });

  it("ignore un vent manquant à une extrémité du segment", () => {
    const passage = calculerPassage(tempete(pt(0, LAT, LON - 2, null), pt(12, LAT, LON + 2, 60)), guadeloupe);
    expect(passage?.ventMaxKt).toBe(60);
  });

  it("renvoie un vent et une catégorie null si aucun vent n'est connu", () => {
    const passage = calculerPassage(tempete(pt(0, LAT, LON, null)), guadeloupe);
    expect(passage).toMatchObject({ distanceMinKm: 0, ventMaxKt: null, categorie: null });
  });
});

describe("categorieVent (échelle de Saffir-Simpson, en nœuds)", () => {
  it.each([
    [0, -1],
    [33, -1],
    [34, 0],
    [63, 0],
    [64, 1],
    [82, 1],
    [83, 2],
    [95, 2],
    [96, 3],
    [112, 3],
    [113, 4],
    [136, 4],
    [137, 5],
    [185, 5],
  ])("classe %i kt en catégorie %i", (vent, categorie) => {
    expect(categorieVent(vent)).toBe(categorie);
  });

  it("renvoie null sans vent connu", () => {
    expect(categorieVent(null)).toBeNull();
  });
});
