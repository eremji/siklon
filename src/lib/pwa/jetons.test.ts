// @vitest-environment node
// Les icônes et le manifeste ne peuvent pas lire les variables CSS : leurs couleurs doivent rester
// celles des jetons de globals.css (DESIGN.md), sans aucune autre couleur.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { JETONS_CLAIR, JETONS_SOMBRE } from "./jetons";

const CSS = readFileSync(join(import.meta.dirname, "../../app/globals.css"), "utf8");

/** Valeur d'un jeton dans le premier bloc qui suit `debut` (`:root {` ou le bloc sombre). */
function jeton(debut: string, nom: string): string {
  const bloc = CSS.slice(CSS.indexOf(debut));
  const valeur = new RegExp(`--${nom}:\\s*(#[0-9A-Fa-f]{6});`).exec(bloc.slice(0, bloc.indexOf("}")))?.[1];
  if (!valeur) throw new Error(`jeton --${nom} introuvable après ${debut}`);
  return valeur.toUpperCase();
}

describe("jetons de couleur des icônes et du manifeste", () => {
  it.each(Object.entries(JETONS_CLAIR))("thème clair : %s suit globals.css", (nom, valeur) => {
    expect(valeur).toBe(jeton(":root {", nom));
  });

  it.each(Object.entries(JETONS_SOMBRE))("thème sombre : %s suit globals.css", (nom, valeur) => {
    expect(valeur).toBe(jeton(':root:not([data-theme="light"]) {', nom));
  });
});
