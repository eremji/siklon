// @vitest-environment node
// Icône Apple (apple-touch-icon) : celle qu'iOS affiche sur l'écran d'accueil (US-07b, #101).
import { describe, expect, it } from "vitest";
import AppleIcon, { contentType, size } from "./apple-icon";

describe("icône Apple", () => {
  it("annonce un PNG de 180 px, la taille attendue par iOS", () => {
    expect(size).toEqual({ width: 180, height: 180 });
    expect(contentType).toBe("image/png");
  });

  it("dessine un PNG de 180 px de côté", async () => {
    const octets = new Uint8Array(await AppleIcon().arrayBuffer());
    const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);

    expect(vue.getUint32(0)).toBe(0x89504e47);
    expect([vue.getUint32(16), vue.getUint32(20)]).toEqual([180, 180]);
  }, 30_000);
});
