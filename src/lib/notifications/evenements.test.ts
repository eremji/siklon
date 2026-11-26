import { describe, expect, it } from "vitest";
import { trouverIle } from "@/lib/iles";
import type { AlerteNhc } from "@/lib/nhc/alertes";
import type { Menace } from "@/lib/nhc/menace";
import type { SystemeActif } from "@/lib/nhc/systemes";
import { changementNiveau, entreesRayon, niveauNhc, niveauSansAlerte, niveauVigilance } from "./evenements";

const guadeloupe = trouverIle("guadeloupe")!;
const portoRico = trouverIle("porto-rico")!;

const AVIS = { numero: "12", emisLe: "2026-09-10T15:00:00.000Z" };

function systeme(id: string, nom: string): SystemeActif {
  return {
    id,
    emplacement: "AT1",
    nom,
    classification: "HU",
    ventKt: 100,
    pressionHpa: 960,
    latitude: 15,
    longitude: -55,
    avis: { ...AVIS, url: `https://www.nhc.noaa.gov/text/${id}.shtml` },
  };
}

function menace(id: string, nom: string): Menace<SystemeActif> {
  return { systeme: systeme(id, nom), passage: { heure: "2026-09-12T06:00:00.000Z", distanceKm: 180 }, avis: AVIS };
}

function alerte(code: AlerteNhc["code"], emisLe = AVIS.emisLe): AlerteNhc {
  return { code, systeme: { id: "al052026", nom: "Kyle", classification: "HU", ventKt: 100 }, avis: { numero: "12", emisLe } };
}

describe("entreesRayon", () => {
  it("donne un événement par système dont la trajectoire passe dans le rayon de l'île, sans texte rédigé", () => {
    const evenements = entreesRayon(guadeloupe, [menace("al052026", "Kyle"), menace("al062026", "Lena")]);

    expect(evenements).toHaveLength(2);
    expect(evenements[0]).toMatchObject({
      type: "entree-rayon",
      ile: guadeloupe,
      systeme: { id: "al052026", nom: "Kyle", classification: "HU", ventKt: 100 },
      passage: { heure: "2026-09-12T06:00:00.000Z", distanceKm: 180 },
      avis: { numero: "12", emisLe: AVIS.emisLe, url: "https://www.nhc.noaa.gov/text/al052026.shtml" },
    });
  });

  it("garde la même clé pour un système et une île, quel que soit l'avis : on ne prévient qu'une fois", () => {
    const premier = entreesRayon(guadeloupe, [menace("al052026", "Kyle")])[0];
    const suivant = entreesRayon(guadeloupe, [
      { ...menace("al052026", "Kyle"), avis: { numero: "13", emisLe: "2026-09-10T21:00:00.000Z" } },
    ])[0];

    expect(suivant.cle).toBe(premier.cle);
    expect(premier.cle).toBe("rayon:guadeloupe:al052026");
  });

  it("ne donne rien sans menace", () => {
    expect(entreesRayon(guadeloupe, [])).toEqual([]);
  });
});

describe("niveau observé", () => {
  it("lit le niveau de vigilance Météo-France et son heure de mise à jour", () => {
    expect(niveauVigilance({ etat: "ok", niveau: "orange", misAJour: "2026-09-10T16:00:00Z" })).toEqual({
      niveau: "orange",
      misAJour: "2026-09-10T16:00:00Z",
    });
  });

  it("retient la veille ou l'avertissement NHC le plus grave, avec l'heure de son avis", () => {
    // chargerAlertesNhc trie déjà les alertes de la plus grave à la moins grave.
    const etat = { etat: "ok" as const, alertes: [alerte("HWR"), alerte("TWA")], luLe: "2026-09-10T15:10:00.000Z" };

    expect(niveauNhc(etat)).toEqual({ niveau: "HWR", misAJour: AVIS.emisLe });
  });

  it("note l'absence de veille et d'avertissement NHC à l'heure de lecture du flux", () => {
    expect(niveauNhc({ etat: "ok", alertes: [], luLe: "2026-09-10T15:10:00.000Z" })).toEqual({
      niveau: "aucune",
      misAJour: "2026-09-10T15:10:00.000Z",
    });
  });

  it("ne donne aucun niveau quand la source est indisponible", () => {
    expect(niveauVigilance({ etat: "indisponible" })).toBeNull();
    expect(niveauNhc({ etat: "indisponible", luLe: "2026-09-10T15:10:00.000Z" })).toBeNull();
  });

  it("sans alerte, le niveau vaut vert pour Météo-France et « aucune » pour le NHC", () => {
    expect(niveauSansAlerte(guadeloupe)).toBe("vert");
    expect(niveauSansAlerte(portoRico)).toBe("aucune");
  });
});

describe("changementNiveau", () => {
  const ORANGE = { niveau: "orange" as const, misAJour: "2026-09-10T16:00:00Z" };

  it("donne un événement quand le niveau change", () => {
    expect(changementNiveau(guadeloupe, "jaune", ORANGE)).toEqual({
      type: "changement-niveau",
      cle: "niveau:guadeloupe:orange:2026-09-10T16:00:00Z",
      ile: guadeloupe,
      precedent: "jaune",
      niveau: "orange",
      misAJour: "2026-09-10T16:00:00Z",
    });
  });

  it("ne donne rien quand le niveau ne change pas", () => {
    expect(changementNiveau(guadeloupe, "orange", ORANGE)).toBeNull();
  });

  it("prévient aussi de la fin de l'alerte", () => {
    expect(changementNiveau(guadeloupe, "orange", { niveau: "vert", misAJour: "2026-09-12T10:00:00Z" })).toMatchObject({
      precedent: "orange",
      niveau: "vert",
    });
  });

  it("ne donne rien quand la source est indisponible : on garde le dernier niveau connu", () => {
    expect(changementNiveau(guadeloupe, "orange", null)).toBeNull();
  });

  it("sans niveau connu, part du niveau sans alerte", () => {
    expect(changementNiveau(guadeloupe, undefined, { niveau: "vert", misAJour: "2026-09-10T16:00:00Z" })).toBeNull();
    expect(changementNiveau(guadeloupe, undefined, ORANGE)).toMatchObject({ precedent: "vert", niveau: "orange" });
    expect(changementNiveau(portoRico, undefined, { niveau: "aucune", misAJour: AVIS.emisLe })).toBeNull();
    expect(changementNiveau(portoRico, undefined, { niveau: "TWA", misAJour: AVIS.emisLe })).toMatchObject({
      precedent: "aucune",
      niveau: "TWA",
    });
  });

  it("donne une nouvelle clé quand un niveau revient plus tard : chaque retour est une nouvelle alerte", () => {
    const premier = changementNiveau(guadeloupe, "vert", ORANGE);
    const retour = changementNiveau(guadeloupe, "jaune", { niveau: "orange", misAJour: "2026-09-11T08:00:00Z" });

    expect(retour?.cle).not.toBe(premier?.cle);
  });
});
