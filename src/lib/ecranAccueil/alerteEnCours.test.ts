import { describe, expect, it } from "vitest";
import { NIVEAUX } from "@/lib/vigilance/niveaux";
import { alertesNhcEnCours, vigilanceEnCours } from "./alerteEnCours";

describe("alerte en cours sur la page : la feuille cède la place au bandeau (US-07c)", () => {
  it("vigilance Météo-France jaune ou plus", () => {
    const enCours = NIVEAUX.filter((niveau) => vigilanceEnCours({ etat: "ok", niveau, misAJour: "2026-11-23T12:00:00Z" }));
    expect(enCours).toEqual(["jaune", "orange", "rouge", "violet", "gris"]);
  });

  it("pas quand la vigilance est indisponible : rien n'est affiché à protéger", () => {
    expect(vigilanceEnCours({ etat: "indisponible" })).toBe(false);
  });

  it("au moins une veille ou un avertissement du NHC", () => {
    const luLe = "2026-11-23T12:00:00Z";
    expect(alertesNhcEnCours({ etat: "ok", alertes: [], luLe })).toBe(false);
    expect(alertesNhcEnCours({ etat: "indisponible", luLe })).toBe(false);
    expect(
      alertesNhcEnCours({
        etat: "ok",
        luLe,
        alertes: [{ code: "TWA", systeme: { id: "al05", nom: "Ernesto", classification: "TS", ventKt: 50 }, avis: { numero: "5", emisLe: luLe } }],
      }),
    ).toBe(true);
  });
});
