import { describe, expect, it } from "vitest";
import {
  formaterDate,
  formaterDateHeureUtc,
  formaterDistance,
  formaterPosition,
  formaterVent,
  libelleCategorie,
  libelleStatut,
  nomTempete,
} from "./formatage";

describe("nomTempete", () => {
  it("met le nom HURDAT2 en casse de titre", () => {
    expect(nomTempete("HUGO", "AL111989", "fr")).toBe("Hugo");
  });

  it("garde la majuscule après un tiret", () => {
    expect(nomTempete("ALPHA-BRAVO", "AL011990", "fr")).toBe("Alpha-Bravo");
  });

  it("nomme les tempêtes sans nom par leur identifiant", () => {
    expect(nomTempete("UNNAMED", "AL031899", "fr")).toBe("Sans nom (AL031899)");
  });
});

describe("libelleCategorie", () => {
  it.each([
    [-1, "Dépression"],
    [0, "Tempête"],
    [1, "Ouragan de catégorie 1"],
    [5, "Ouragan de catégorie 5"],
    [null, "Intensité inconnue"],
  ] as const)("libelle %s en « %s »", (categorie, libelle) => {
    expect(libelleCategorie(categorie, "fr")).toBe(libelle);
  });
});

describe("formaterVent", () => {
  it("affiche le vent en km/h avec la valeur d'origine en nœuds", () => {
    expect(formaterVent(140, "fr")).toBe("259 km/h (140 nœuds)");
  });

  it("signale un vent inconnu", () => {
    expect(formaterVent(null, "fr")).toBe("vent inconnu");
  });
});

describe("formaterDistance", () => {
  it("arrondit au kilomètre", () => {
    expect(formaterDistance(12.6, "fr")).toBe("13 km");
  });

  it("évite d'afficher 0 km", () => {
    expect(formaterDistance(0.3, "fr")).toBe("moins de 1 km");
  });
});

describe("formaterDate", () => {
  it("affiche la date à l'heure locale de l'île", () => {
    // 17 septembre 1989 à 02:00 UTC = 16 septembre à 22:00 en Guadeloupe (UTC−4).
    expect(formaterDate(new Date("1989-09-17T02:00:00Z"), "America/Guadeloupe", "fr")).toBe("16 septembre 1989");
  });
});

describe("formaterDateHeureUtc", () => {
  it("écrit la date en toutes lettres et l'heure en UTC, comme le reste de l'app", () => {
    expect(formaterDateHeureUtc(new Date("1979-08-25T12:00:00Z"), "fr")).toBe("25 août 1979 à 12 h 00 UTC");
  });

  it("garde l'heure UTC même quand le fuseau local changerait la date", () => {
    expect(formaterDateHeureUtc(new Date("1989-09-17T00:00:00Z"), "fr")).toBe("17 septembre 1989 à 00 h 00 UTC");
    expect(formaterDateHeureUtc(new Date("1989-09-17T23:45:00Z"), "fr")).toBe("17 septembre 1989 à 23 h 45 UTC");
  });
});

describe("libelleStatut", () => {
  it.each([
    ["TD", "Dépression tropicale"],
    ["TS", "Tempête tropicale"],
    ["HU", "Ouragan"],
    ["EX", "Extratropical"],
    ["SD", "Dépression subtropicale"],
    ["SS", "Tempête subtropicale"],
    ["LO", "Dépression non tropicale"],
    ["WV", "Onde tropicale"],
    ["DB", "Perturbation"],
  ] as const)("traduit %s en « %s »", (statut, libelle) => {
    expect(libelleStatut(statut, "fr")).toBe(libelle);
  });
});

describe("formaterPosition", () => {
  it("affiche les hémisphères en français, avec la virgule décimale", () => {
    expect(formaterPosition({ lat: 16.2, lon: -61.5 }, "fr")).toBe("16,2° N 61,5° O");
    expect(formaterPosition({ lat: -3, lon: 2.5 }, "fr")).toBe("3,0° S 2,5° E");
  });
});

describe("en anglais (US-10)", () => {
  it("nomme une tempête sans nom", () => {
    expect(nomTempete("UNNAMED", "AL031899", "en")).toBe("Unnamed (AL031899)");
    expect(nomTempete("HUGO", "AL111989", "en")).toBe("Hugo");
  });

  it.each([
    [-1, "Depression"],
    [0, "Storm"],
    [4, "Category 4 hurricane"],
    [null, "Unknown intensity"],
  ] as const)("libelle la catégorie %s en « %s »", (categorie, libelle) => {
    expect(libelleCategorie(categorie, "en")).toBe(libelle);
  });

  it("écrit le vent en km/h et en nœuds", () => {
    expect(formaterVent(140, "en")).toBe("259 km/h (140 knots)");
    expect(formaterVent(null, "en")).toBe("unknown wind");
  });

  it("écrit la distance", () => {
    expect(formaterDistance(1250.4, "en")).toBe("1,250 km");
    expect(formaterDistance(0.3, "en")).toBe("less than 1 km");
  });

  it("écrit les dates", () => {
    expect(formaterDate(new Date("1989-09-17T02:00:00Z"), "America/Guadeloupe", "en")).toBe("16 September 1989");
    expect(formaterDateHeureUtc(new Date("1979-08-25T12:00:00Z"), "en")).toBe("25 August 1979 at 12:00 UTC");
  });

  it.each([
    ["TD", "Tropical depression"],
    ["TS", "Tropical storm"],
    ["HU", "Hurricane"],
    ["EX", "Extratropical"],
    ["SD", "Subtropical depression"],
    ["SS", "Subtropical storm"],
    ["LO", "Non-tropical low"],
    ["WV", "Tropical wave"],
    ["DB", "Disturbance"],
  ] as const)("traduit le statut %s en « %s »", (statut, libelle) => {
    expect(libelleStatut(statut, "en")).toBe(libelle);
  });

  it("écrit la position avec un point décimal et W pour l'ouest", () => {
    expect(formaterPosition({ lat: 16.2, lon: -61.5 }, "en")).toBe("16.2° N 61.5° W");
  });
});
