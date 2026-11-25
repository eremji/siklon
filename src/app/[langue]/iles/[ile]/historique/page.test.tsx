import { describe, expect, it, vi } from "vitest";

const racine = vi.hoisted(() => ({ langue: "fr" }));
vi.mock("next/root-params", () => ({ langue: async () => racine.langue }));
// Lecture de la base (serveur seulement) : couverte par ses propres tests et par les e2e.
vi.mock("@/lib/historique/chargement", () => ({ chargerPassages: vi.fn(), chargerDernierImport: vi.fn() }));

import { generateMetadata } from "./page";

const params = (ile: string) => ({ params: Promise.resolve({ langue: racine.langue, ile }) });

describe("historique d'une île", () => {
  it.each([
    ["fr", "dominique", "Historique des cyclones : Dominique · Siklon"],
    ["en", "dominique", "Hurricane history: Dominica · Siklon"],
    ["fr", "atlantide", "Île inconnue · Siklon"],
    ["en", "atlantide", "Island not found · Siklon"],
  ])("donne le titre de l'onglet en %s pour « %s »", async (langue, ile, titre) => {
    racine.langue = langue;
    expect(await generateMetadata(params(ile) as Parameters<typeof generateMetadata>[0])).toEqual({ title: titre });
  });
});
