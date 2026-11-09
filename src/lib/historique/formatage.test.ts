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
    expect(nomTempete("HUGO", "AL111989")).toBe("Hugo");
  });

  it("garde la majuscule après un tiret", () => {
    expect(nomTempete("ALPHA-BRAVO", "AL011990")).toBe("Alpha-Bravo");
  });

  it("nomme les tempêtes sans nom par leur identifiant", () => {
    expect(nomTempete("UNNAMED", "AL031899")).toBe("Sans nom (AL031899)");
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
    expect(libelleCategorie(categorie)).toBe(libelle);
  });
});

describe("formaterVent", () => {
  it("affiche le vent en km/h avec la valeur d'origine en nœuds", () => {
    expect(formaterVent(140)).toBe("259 km/h (140 nœuds)");
  });

  it("signale un vent inconnu", () => {
    expect(formaterVent(null)).toBe("vent inconnu");
  });
});

describe("formaterDistance", () => {
  it("arrondit au kilomètre", () => {
    expect(formaterDistance(12.6)).toBe("13 km");
  });

  it("évite d'afficher 0 km", () => {
    expect(formaterDistance(0.3)).toBe("moins de 1 km");
  });
});

describe("formaterDate", () => {
  it("affiche la date à l'heure locale de l'île", () => {
    // 17 septembre 1989 à 02:00 UTC = 16 septembre à 22:00 en Guadeloupe (UTC−4).
    expect(formaterDate(new Date("1989-09-17T02:00:00Z"), "America/Guadeloupe")).toBe("16 septembre 1989");
  });
});

describe("formaterDateHeureUtc", () => {
  it("affiche la date et l'heure en UTC", () => {
    expect(formaterDateHeureUtc(new Date("1989-09-17T06:00:00Z"))).toBe("17/09/1989 06:00 UTC");
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
    expect(libelleStatut(statut)).toBe(libelle);
  });
});

describe("formaterPosition", () => {
  it("affiche les hémisphères en français, avec la virgule décimale", () => {
    expect(formaterPosition({ lat: 16.2, lon: -61.5 })).toBe("16,2° N 61,5° O");
    expect(formaterPosition({ lat: -3, lon: 2.5 })).toBe("3,0° S 2,5° E");
  });
});
