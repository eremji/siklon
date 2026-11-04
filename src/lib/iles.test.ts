import { describe, expect, it } from "vitest";
import { ILES, trouverIle } from "./iles";

// Table « Îles et points de référence » de SPEC.md.
const SPEC = [
  { nom: "Guadeloupe", ville: "Pointe-à-Pitre", lat: 16.24, lon: -61.53, source: "meteo-france" },
  { nom: "Martinique", ville: "Fort-de-France", lat: 14.6, lon: -61.07, source: "meteo-france" },
  { nom: "Saint-Martin", ville: "Marigot", lat: 18.07, lon: -63.08, source: "meteo-france" },
  { nom: "Saint-Barthélemy", ville: "Gustavia", lat: 17.9, lon: -62.85, source: "meteo-france" },
  { nom: "Dominique", ville: "Roseau", lat: 15.3, lon: -61.39, source: "nhc" },
  { nom: "Sainte-Lucie", ville: "Castries", lat: 14.01, lon: -60.99, source: "nhc" },
  { nom: "Barbade", ville: "Bridgetown", lat: 13.1, lon: -59.62, source: "nhc" },
  { nom: "Trinité", ville: "Port of Spain", lat: 10.66, lon: -61.51, source: "nhc" },
  { nom: "Porto Rico", ville: "San Juan", lat: 18.47, lon: -66.11, source: "nhc" },
  { nom: "Haïti", ville: "Port-au-Prince", lat: 18.54, lon: -72.34, source: "nhc" },
  { nom: "République dominicaine", ville: "Saint-Domingue", lat: 18.49, lon: -69.93, source: "nhc" },
  { nom: "Jamaïque", ville: "Kingston", lat: 17.97, lon: -76.79, source: "nhc" },
  { nom: "Cuba", ville: "La Havane", lat: 23.13, lon: -82.38, source: "nhc" },
] as const;

describe("référentiel des îles", () => {
  it("contient les 13 îles de SPEC.md, dans l'ordre", () => {
    expect(ILES.map((ile) => ile.nom)).toEqual(SPEC.map((ligne) => ligne.nom));
  });

  it.each(SPEC)("place le point de référence de $nom à $ville ($lat, $lon)", ({ nom, ville, lat, lon }) => {
    const ile = ILES.find((i) => i.nom === nom);
    expect(ile?.pointReference).toEqual({ nom: ville, lat, lon });
  });

  it.each(SPEC)("indique la source d'alerte de $nom : $source", ({ nom, source }) => {
    expect(ILES.find((i) => i.nom === nom)?.alerte.source).toBe(source);
  });

  it("associe chaque île Météo-France à son fichier de vigilance", () => {
    const fichiers = Object.fromEntries(
      ILES.flatMap((ile) => (ile.alerte.source === "meteo-france" ? [[ile.nom, ile.alerte.fichier]] : [])),
    );
    expect(fichiers).toEqual({
      Guadeloupe: "CDPV85TFFR",
      Martinique: "CDPV85TFFF",
      "Saint-Martin": "CDPV85TFFJ",
      "Saint-Barthélemy": "CDPV85TFFJ",
    });
  });

  it("donne à chaque île un slug d'URL unique, en minuscules ASCII", () => {
    const slugs = ILES.map((ile) => ile.slug);
    expect(new Set(slugs).size).toBe(ILES.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it("donne à chaque île un fuseau horaire IANA valide", () => {
    for (const ile of ILES) {
      expect(() => new Intl.DateTimeFormat("fr", { timeZone: ile.fuseau })).not.toThrow();
    }
  });
});

describe("trouverIle", () => {
  it("retrouve une île par son slug", () => {
    expect(trouverIle("saint-barthelemy")?.nom).toBe("Saint-Barthélemy");
  });

  it("renvoie undefined pour un slug inconnu", () => {
    expect(trouverIle("atlantide")).toBeUndefined();
  });

  it("ne confond pas un slug avec une propriété héritée", () => {
    expect(trouverIle("constructor")).toBeUndefined();
  });
});
