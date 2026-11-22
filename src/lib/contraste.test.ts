import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ratioContraste } from "./contraste";

describe("ratioContraste", () => {
  it("noir sur blanc : 21:1, quel que soit l'ordre", () => {
    expect(ratioContraste("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(ratioContraste("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
  });

  it("même couleur : 1:1", () => {
    expect(ratioContraste("#0E5E6F", "#0E5E6F")).toBeCloseTo(1, 5);
  });

  it("retrouve les contrastes annoncés par DESIGN.md", () => {
    // Blanc sur Lagon 7,4:1 ; --text sur --bg clair 14:1.
    expect(ratioContraste("#FFFFFF", "#0E5E6F")).toBeCloseTo(7.4, 1);
    expect(ratioContraste("#10292E", "#F2F7F6")).toBeCloseTo(14, 0);
  });

  it("refuse une couleur qui n'est pas en #RRGGBB", () => {
    expect(() => ratioContraste("rouge", "#FFFFFF")).toThrow();
  });
});

/** Jetons de globals.css : le premier bloc (:root, clair) et le bloc sombre forcé ([data-theme="dark"]). */
function jetons(): Record<"clair" | "sombre", Record<string, string>> {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  const lire = (bloc: string) =>
    Object.fromEntries([...bloc.matchAll(/--([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})/g)].map(([, nom, valeur]) => [nom, valeur]));
  const clair = lire(css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {"))));
  const debutSombre = css.indexOf(':root[data-theme="dark"]');
  const sombre = { ...clair, ...lire(css.slice(debutSombre, css.indexOf("}", debutSombre))) };
  return { clair, sombre };
}

// Paires de couleurs de la proposition d'écran d'accueil (US-07c) : texte 4,5:1, graphisme 3:1 (US-15).
const PAIRES_TEXTE: [texte: string, fond: string][] = [
  ["text", "bg"],
  ["text", "surface"],
  ["text-2", "surface"],
  ["text", "soft"],
  ["text-2", "soft"],
  ["accent", "surface"],
  ["on-accent", "accent"],
];
const PAIRES_GRAPHISME: [trait: string, fond: string][] = [
  ["accent", "soft"],
  ["field", "surface"],
];

describe.each(["clair", "sombre"] as const)("jetons du thème %s", (theme) => {
  const valeurs = jetons()[theme];

  it.each(PAIRES_TEXTE)("texte --%s sur --%s : AA (4,5:1)", (texte, fond) => {
    expect(ratioContraste(valeurs[texte], valeurs[fond])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(PAIRES_GRAPHISME)("trait --%s sur --%s : 3:1", (trait, fond) => {
    expect(ratioContraste(valeurs[trait], valeurs[fond])).toBeGreaterThanOrEqual(3);
  });
});
