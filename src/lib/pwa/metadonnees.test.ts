// @vitest-environment node
import { describe, expect, it } from "vitest";
import { IMAGES_DEMARRAGE_APPLE } from "./demarrage";
import { JETONS_CLAIR, JETONS_SOMBRE } from "./jetons";
import { APPLE_WEB_APP, COULEURS_THEME } from "./metadonnees";

describe("métadonnées de l'application installée (US-07b, #101)", () => {
  it("s'affiche en plein écran sur iOS, sous le nom Siklon", () => {
    expect(APPLE_WEB_APP).toMatchObject({ capable: true, title: "Siklon", statusBarStyle: "default" });
  });

  it("annonce à iOS une image de démarrage par taille d'écran et par thème (US-07c)", () => {
    expect(APPLE_WEB_APP.startupImage).toEqual(IMAGES_DEMARRAGE_APPLE);
  });

  it("colore la barre d'état (et celle du navigateur) avec le fond --bg du thème clair ou sombre (US-07c)", () => {
    expect(COULEURS_THEME).toEqual([
      { media: "(prefers-color-scheme: light)", color: JETONS_CLAIR.bg },
      { media: "(prefers-color-scheme: dark)", color: JETONS_SOMBRE.bg },
    ]);
  });

  it("garde la barre d'état opaque : le contenu ne passe jamais dessous (US-07c)", () => {
    expect(APPLE_WEB_APP.statusBarStyle).toBe("default");
  });
});
