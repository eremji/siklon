// @vitest-environment node
// Manifeste d'application (US-07b, #101) : sans lui, iOS refuse le web push (iOS 16.4+, site ajouté
// à l'écran d'accueil et affiché en « standalone »).
import { describe, expect, it } from "vitest";
import { JETONS_CLAIR } from "@/lib/pwa/jetons";
import { ICONES } from "@/lib/pwa/icones";
import manifest from "./manifest";

const m = manifest();

describe("manifeste d'application", () => {
  it("nomme l'application Siklon, en français", () => {
    expect(m.name).toBe("Siklon");
    expect(m.short_name).toBe("Siklon");
    expect(m.description).toMatch(/cyclones/i);
    expect(m.lang).toBe("fr");
  });

  it("s'ouvre en plein écran, sur l'accueil, dans la portée du service worker (/)", () => {
    expect(m.display).toBe("standalone");
    expect(m.id).toBe("/");
    expect(m.start_url).toBe("/");
    expect(m.scope).toBe("/");
  });

  it("prend ses couleurs dans les jetons de DESIGN.md", () => {
    expect(m.theme_color).toBe(JETONS_CLAIR.bg);
    expect(m.background_color).toBe(JETONS_CLAIR.bg);
  });

  it("annonce les icônes 192 et 512 px, et une icône maskable pour Android", () => {
    expect(m.icons).toEqual([
      { src: "/icones/192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icones/512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icones/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ]);
  });

  it("n'annonce que des icônes que le site sait dessiner", () => {
    const noms = ICONES.map(({ nom }) => `/icones/${nom}`);
    for (const { src } of m.icons ?? []) expect(noms).toContain(src);
  });
});
