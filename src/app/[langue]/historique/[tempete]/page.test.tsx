import { describe, expect, it, vi } from "vitest";

const racine = vi.hoisted(() => ({ langue: "fr" }));
vi.mock("next/root-params", () => ({ langue: async () => racine.langue }));
// Lecture de la base (serveur seulement) : couverte par ses propres tests et par les e2e.
vi.mock("@/lib/historique/chargement", () => ({ chargerTempete: vi.fn(), chargerDernierImport: vi.fn() }));

import { generateMetadata } from "./page";

describe("fiche d'un cyclone historique", () => {
  it.each([
    ["fr", "Fiche d'un cyclone historique · Siklon"],
    ["en", "Past storm · Siklon"],
  ])("donne le titre de l'onglet en %s", async (langue, titre) => {
    racine.langue = langue;
    expect(await generateMetadata()).toEqual({ title: titre });
  });
});
