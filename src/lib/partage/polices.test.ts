// @vitest-environment node
import { describe, expect, it } from "vitest";
import { POLICE_APERCU, POLICES_APERCU } from "./polices";

// next/og refuse un dessin de plus de 500 Ko, polices comprises.
const LIMITE_NEXT_OG = 500 * 1024;

describe("polices de l'image d'aperçu (US-21)", () => {
  it("fournit Atkinson Hyperlegible en 400 et 700, la police de DESIGN.md", () => {
    expect(POLICE_APERCU).toBe("Atkinson Hyperlegible");
    expect(POLICES_APERCU.map(({ name, weight, style }) => ({ name, weight, style }))).toEqual([
      { name: "Atkinson Hyperlegible", weight: 400, style: "normal" },
      { name: "Atkinson Hyperlegible", weight: 700, style: "normal" },
    ]);
  });

  it("lit des fichiers TrueType, sous la limite de taille de next/og", () => {
    for (const { data } of POLICES_APERCU) {
      expect(new DataView(data).getUint32(0)).toBe(0x00010000);
    }
    expect(POLICES_APERCU.reduce((total, { data }) => total + data.byteLength, 0)).toBeLessThan(LIMITE_NEXT_OG);
  });
});
