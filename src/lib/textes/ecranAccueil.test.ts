import { describe, expect, it } from "vitest";
import { ECRAN_ACCUEIL } from "./ecranAccueil";

describe("textes de la proposition d'ajout à l'écran d'accueil (US-07c)", () => {
  it("nomment le menu d'iOS dans la langue du site", () => {
    expect(ECRAN_ACCUEIL.fr.feuille.ecranAccueil).toContain("« Sur l'écran d'accueil »");
    expect(ECRAN_ACCUEIL.fr.feuille.ecranAccueil).toContain("« En voir plus »");
    expect(ECRAN_ACCUEIL.en.feuille.ecranAccueil).toContain("“View More”");
    expect(ECRAN_ACCUEIL.en.feuille.ecranAccueil).toContain("“Add to Home Screen”");
  });

  it("nomment l'iPhone ou l'iPad dans le titre", () => {
    expect(ECRAN_ACCUEIL.fr.feuille.titre("ipad")).toBe("Recevez les alertes de votre île sur votre iPad");
    expect(ECRAN_ACCUEIL.en.feuille.titre("iphone")).toBe("Get alerts for your island on your iPhone");
  });
});
