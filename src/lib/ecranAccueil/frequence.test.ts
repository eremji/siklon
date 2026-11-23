import { describe, expect, it } from "vitest";
import {
  CLE_MEMO,
  doitProposer,
  ecrireMemo,
  estPageIle,
  JOURS_AVANT_RETOUR,
  jourLocal,
  lireMemo,
  MEMO_VIDE,
  noterFermeture,
  noterVisite,
  pageAvecAlertes,
  REFUS_MAX,
} from "./frequence";

const LUNDI = new Date(2026, 10, 23, 9, 0);
const LUNDI_SOIR = new Date(2026, 10, 23, 23, 30);
const MARDI = new Date(2026, 10, 24, 0, 15);
const plusJours = (date: Date, jours: number) => new Date(date.getTime() + jours * 24 * 3600 * 1000);

describe("jour calendaire de l'appareil", () => {
  it("s'écrit AAAA-MM-JJ, à l'heure locale", () => {
    expect(jourLocal(LUNDI)).toBe("2026-11-23");
    expect(jourLocal(LUNDI_SOIR)).toBe("2026-11-23");
    expect(jourLocal(MARDI)).toBe("2026-11-24");
  });
});

describe("page d'une île", () => {
  it("reconnaît la page d'une île et ses sous-pages, dans les deux langues", () => {
    expect(estPageIle("/fr/iles/guadeloupe")).toBe(true);
    expect(estPageIle("/en/iles/martinique/alerte")).toBe(true);
    expect(estPageIle("/fr/iles/guadeloupe/checklist")).toBe(true);
  });

  it("ne confond pas la liste des îles ni les autres pages", () => {
    expect(estPageIle("/fr/iles")).toBe(false);
    expect(estPageIle("/fr")).toBe(false);
    expect(estPageIle("/fr/compte")).toBe(false);
    expect(estPageIle("/iles/guadeloupe")).toBe(false);
  });
});

describe("pages qui affichent les alertes d'une île", () => {
  it("la page d'alerte et la checklist d'une île, qui gèrent elles-mêmes la proposition", () => {
    expect(pageAvecAlertes("/fr/iles/guadeloupe/alerte")).toBe(true);
    expect(pageAvecAlertes("/en/iles/martinique/checklist")).toBe(true);
  });

  it("pas la page principale d'une île ni les autres pages", () => {
    expect(pageAvecAlertes("/fr/iles/guadeloupe")).toBe(false);
    expect(pageAvecAlertes("/fr/iles/guadeloupe/historique")).toBe(false);
    expect(pageAvecAlertes("/fr")).toBe(false);
  });
});

describe("quand proposer d'ajouter Siklon à l'écran d'accueil", () => {
  it("jamais à la toute première page vue, même celle d'une île", () => {
    expect(doitProposer({ memo: MEMO_VIDE, maintenant: LUNDI, pageIle: false })).toBe(false);
    expect(doitProposer({ memo: MEMO_VIDE, maintenant: LUNDI, pageIle: true })).toBe(false);
  });

  it("le même jour que la première visite : seulement sur la page d'une île", () => {
    const memo = noterVisite(MEMO_VIDE, LUNDI);
    expect(doitProposer({ memo, maintenant: LUNDI_SOIR, pageIle: false })).toBe(false);
    expect(doitProposer({ memo, maintenant: LUNDI_SOIR, pageIle: true })).toBe(true);
  });

  it("à partir d'un autre jour calendaire que la première visite, sur toutes les pages", () => {
    const memo = noterVisite(MEMO_VIDE, LUNDI_SOIR);
    expect(doitProposer({ memo, maintenant: MARDI, pageIle: false })).toBe(true);
  });

  it("noter une visite garde le jour de la première", () => {
    const memo = noterVisite(noterVisite(MEMO_VIDE, LUNDI), MARDI);
    expect(memo.premiereVisite).toBe("2026-11-23");
  });

  it(`après une fermeture, pas avant ${JOURS_AVANT_RETOUR} jours`, () => {
    const memo = noterFermeture(noterVisite(MEMO_VIDE, LUNDI), MARDI, { refus: true });
    expect(doitProposer({ memo, maintenant: plusJours(MARDI, JOURS_AVANT_RETOUR - 1), pageIle: true })).toBe(false);
    expect(doitProposer({ memo, maintenant: plusJours(MARDI, JOURS_AVANT_RETOUR), pageIle: true })).toBe(true);
  });

  it(`après ${REFUS_MAX} refus, plus jamais d'elle-même`, () => {
    let memo = noterVisite(MEMO_VIDE, LUNDI);
    let date = MARDI;
    for (let i = 0; i < REFUS_MAX; i++) {
      expect(doitProposer({ memo, maintenant: date, pageIle: true })).toBe(true);
      memo = noterFermeture(memo, date, { refus: true });
      date = plusJours(date, JOURS_AVANT_RETOUR);
    }
    expect(memo.refus).toBe(REFUS_MAX);
    expect(doitProposer({ memo, maintenant: plusJours(date, 365), pageIle: true })).toBe(false);
  });

  it("ouvrir l'aide en images met la proposition en pause sans compter comme un refus", () => {
    const memo = noterFermeture(noterVisite(MEMO_VIDE, LUNDI), MARDI, { refus: false });
    expect(memo.refus).toBe(0);
    expect(doitProposer({ memo, maintenant: plusJours(MARDI, 1), pageIle: true })).toBe(false);
    expect(doitProposer({ memo, maintenant: plusJours(MARDI, JOURS_AVANT_RETOUR), pageIle: true })).toBe(true);
  });
});

describe("mémo gardé sur l'appareil", () => {
  it("relit ce qu'il a écrit", () => {
    const memo = noterFermeture(noterVisite(MEMO_VIDE, LUNDI), MARDI, { refus: true });
    expect(lireMemo(ecrireMemo(memo))).toEqual(memo);
  });

  it("ne garde que des dates et un compteur, aucune donnée personnelle", () => {
    const memo = noterFermeture(noterVisite(MEMO_VIDE, LUNDI), MARDI, { refus: true });
    expect(Object.keys(JSON.parse(ecrireMemo(memo))).sort()).toEqual(["derniereFermeture", "premiereVisite", "refus"]);
    expect(CLE_MEMO).toBe("siklon-ecran-accueil");
  });

  it("repart de zéro si le mémo est absent ou abîmé", () => {
    expect(lireMemo(null)).toEqual(MEMO_VIDE);
    expect(lireMemo("pas du json")).toEqual(MEMO_VIDE);
    expect(lireMemo('{"refus":"trois","premiereVisite":42}')).toEqual(MEMO_VIDE);
  });
});
