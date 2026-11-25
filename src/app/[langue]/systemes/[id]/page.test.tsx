import { describe, expect, it, vi } from "vitest";

const racine = vi.hoisted(() => ({ langue: "fr" }));
vi.mock("next/root-params", () => ({ langue: async () => racine.langue }));
// Lecture du flux NHC (serveur seulement) : couverte par ses propres tests et par les e2e.
vi.mock("@/lib/nhc/lecture", () => ({ fluxNhc: vi.fn() }));

import { generateMetadata } from "./page";

describe("page d'un système actif", () => {
  it.each([
    ["fr", "Fiche d'un système actif · Siklon"],
    ["en", "Active system · Siklon"],
  ])("donne le titre de l'onglet en %s", async (langue, titre) => {
    racine.langue = langue;
    expect(await generateMetadata()).toEqual({ title: titre });
  });
});
