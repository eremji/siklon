// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ECRANS, IMAGES_DEMARRAGE, IMAGES_DEMARRAGE_APPLE, trouverImageDemarrage } from "./demarrage";

describe("images de démarrage de l'app installée sur iPhone et iPad (US-07c)", () => {
  it("couvrent les iPhone et les iPad actuels, en portrait", () => {
    const tailles = ECRANS.map(({ largeur, hauteur, ratio }) => `${largeur}x${hauteur}@${ratio}`);
    expect(tailles).toEqual(expect.arrayContaining(["375x667@2", "390x844@3", "393x852@3", "402x874@3", "440x956@3"]));
    expect(tailles).toEqual(expect.arrayContaining(["768x1024@2", "820x1180@2", "1024x1366@2", "1032x1376@2"]));
    expect(new Set(tailles).size).toBe(tailles.length);
    for (const { largeur, hauteur } of ECRANS) expect(hauteur).toBeGreaterThan(largeur);
  });

  it("ont une image claire et une image sombre par écran, en pixels réels", () => {
    expect(IMAGES_DEMARRAGE).toHaveLength(ECRANS.length * 2);
    const image = trouverImageDemarrage("390x844@3x-sombre.png");
    expect(image).toMatchObject({ theme: "sombre", largeurPx: 1170, hauteurPx: 2532 });
    expect(trouverImageDemarrage("inconnue.png")).toBeUndefined();
    expect(new Set(IMAGES_DEMARRAGE.map(({ nom }) => nom)).size).toBe(IMAGES_DEMARRAGE.length);
  });

  it("sont annoncées à iOS avec la taille d'écran, l'orientation et le thème", () => {
    expect(IMAGES_DEMARRAGE_APPLE).toContainEqual({
      url: "/demarrage/390x844@3x-clair.png",
      media:
        "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: light)",
    });
    expect(IMAGES_DEMARRAGE_APPLE.filter(({ media }) => media.endsWith("(prefers-color-scheme: dark)"))).toHaveLength(ECRANS.length);
  });
});
