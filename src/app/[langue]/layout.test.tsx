import { describe, expect, it, vi } from "vitest";

const racine = vi.hoisted(() => ({ langue: "fr" }));
vi.mock("next/root-params", () => ({ langue: async () => racine.langue }));
vi.mock("next/font/google", () => ({ Atkinson_Hyperlegible: () => ({ variable: "police" }) }));

import { generateMetadata } from "./layout";

describe("métadonnées de la mise en page racine", () => {
  it.each([
    ["fr", "Suivi des cyclones tropicaux pour les Antilles."],
    ["en", "Tropical cyclone tracking for the Caribbean."],
  ])("donnent le titre et la description du site en %s", async (langue, description) => {
    racine.langue = langue;
    expect(await generateMetadata()).toMatchObject({ title: "Siklon", description });
  });
});
