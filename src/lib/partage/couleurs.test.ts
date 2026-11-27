import { describe, expect, it } from "vitest";
import { ratioContraste } from "@/lib/contraste";
import { JETONS_CLAIR } from "@/lib/pwa/jetons";
import { COULEURS_APERCU, COULEURS_NHC, COULEURS_VIGILANCE } from "./couleurs";

const AA_TEXTE = 4.5;

describe("couleurs de l'image d'aperçu (US-21)", () => {
  it("n'a pas de couleur de vigilance pour le vert : aucune alerte en cours", () => {
    expect(COULEURS_VIGILANCE.vert).toBeNull();
  });

  it.each(Object.entries(COULEURS_VIGILANCE).filter(([, c]) => c !== null))(
    "vigilance %s : texte lisible sur son fond (AA)",
    (_, couleurs) => {
      expect(ratioContraste(couleurs!.fond, couleurs!.texte)).toBeGreaterThanOrEqual(AA_TEXTE);
    },
  );

  it.each(Object.entries(COULEURS_NHC))("%s NHC : texte lisible sur son fond (AA)", (_, { fond, texte }) => {
    expect(ratioContraste(fond, texte)).toBeGreaterThanOrEqual(AA_TEXTE);
  });

  it("garde les textes de l'image lisibles sur son fond (AA)", () => {
    const { fond, texte, secondaire, neutre } = COULEURS_APERCU;
    expect(ratioContraste(fond, texte)).toBeGreaterThanOrEqual(AA_TEXTE);
    expect(ratioContraste(fond, secondaire)).toBeGreaterThanOrEqual(AA_TEXTE);
    expect(ratioContraste(neutre, texte)).toBeGreaterThanOrEqual(AA_TEXTE);
  });

  it("écrit la mise à jour NHC en échec en --text sur --danger-soft, lisible (AA)", () => {
    expect(COULEURS_APERCU.echec).toEqual({ fond: JETONS_CLAIR["danger-soft"], texte: JETONS_CLAIR.text });
    expect(ratioContraste(COULEURS_APERCU.echec.fond, COULEURS_APERCU.echec.texte)).toBeGreaterThanOrEqual(AA_TEXTE);
  });

  it("ne prend que des jetons de DESIGN.md (thème clair)", () => {
    const jetons = new Set<string>(Object.values(JETONS_CLAIR));
    const toutes = [
      ...Object.values(COULEURS_APERCU).flatMap((c) => (typeof c === "string" ? [c] : [c.fond, c.texte])),
      ...Object.values(COULEURS_VIGILANCE).flatMap((c) => (c ? [c.fond, c.texte] : [])),
      ...Object.values(COULEURS_NHC).flatMap((c) => [c.fond, c.texte]),
    ];
    for (const couleur of toutes) expect(jetons).toContain(couleur);
  });
});
