// @vitest-environment node
import { describe, expect, it } from "vitest";
import { JETONS_CLAIR, JETONS_SOMBRE } from "./jetons";
import { APPLE_WEB_APP, COULEURS_THEME } from "./metadonnees";

describe("métadonnées de l'application installée (US-07b, #101)", () => {
  it("s'affiche en plein écran sur iOS, sous le nom Siklon", () => {
    expect(APPLE_WEB_APP).toEqual({ capable: true, title: "Siklon", statusBarStyle: "default" });
  });

  it("colore la barre du navigateur avec l'en-tête du thème clair ou sombre", () => {
    expect(COULEURS_THEME).toEqual([
      { media: "(prefers-color-scheme: light)", color: JETONS_CLAIR.header },
      { media: "(prefers-color-scheme: dark)", color: JETONS_SOMBRE.header },
    ]);
  });
});
