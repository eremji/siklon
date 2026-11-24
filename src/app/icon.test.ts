// @vitest-environment node
// Icône SVG de Siklon (US-07c, #110), versée au dépôt : Next.js l'annonce comme icône d'onglet.
// Elle doit rester identique au dessin des icônes PNG (src/lib/pwa/DessinIcone.tsx).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SPIRALE } from "@/lib/logo/traces";
import { JETONS_CLAIR, JETONS_SOMBRE } from "@/lib/pwa/jetons";

const SVG = readFileSync(join(import.meta.dirname, "icon.svg"), "utf8");

describe("icône SVG", () => {
  it("est un carré sur fond Lagon", () => {
    expect(SVG).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 120 120">/);
    expect(SVG).toContain(`<rect width="120" height="120" fill="${JETONS_CLAIR.header}"/>`);
  });

  it("dessine les tracés de la spirale du logo, en blanc et en turquoise", () => {
    for (const d of SPIRALE.texte) expect(SVG).toContain(`fill="${JETONS_CLAIR["header-text"]}" d="${d}"`);
    for (const d of SPIRALE.accent) expect(SVG).toContain(`fill="${JETONS_SOMBRE.accent}" d="${d}"`);
  });

  it("n'emploie aucune autre couleur que celles de l'icône", () => {
    const couleurs = new Set(SVG.match(/#[0-9A-Fa-f]{6}/g));
    expect([...couleurs].sort()).toEqual([JETONS_SOMBRE.accent, JETONS_CLAIR.header, JETONS_CLAIR["header-text"]].sort());
  });
});
