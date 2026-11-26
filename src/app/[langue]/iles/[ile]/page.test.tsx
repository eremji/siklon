import { describe, expect, it, vi } from "vitest";

const racine = vi.hoisted(() => ({ langue: "fr" }));
vi.mock("next/root-params", () => ({ langue: async () => racine.langue }));
// Lecture du flux NHC (serveur seulement) : couverte par ses propres tests et par les e2e.
vi.mock("@/lib/nhc/lecture", () => ({ fluxNhc: vi.fn(), positionsNhc: vi.fn() }));
// Lecture de l'alerte de l'île pour le partage (US-21), serveur seulement : couverte par les e2e.
vi.mock("@/lib/partage/chargement", () => ({ chargerAlerteIle: vi.fn() }));

import { generateMetadata } from "./page";

const params = (ile: string) => ({ params: Promise.resolve({ langue: racine.langue, ile }) });

describe("page d'une île", () => {
  it.each([
    ["fr", "dominique", "Dominique : menaces en cours · Siklon"],
    ["en", "dominique", "Dominica: current threats · Siklon"],
    ["fr", "atlantide", "Île introuvable · Siklon"],
    ["en", "atlantide", "Island not found · Siklon"],
  ])("donne le titre de l'onglet en %s pour « %s »", async (langue, ile, titre) => {
    racine.langue = langue;
    expect(await generateMetadata(params(ile) as Parameters<typeof generateMetadata>[0])).toEqual({ title: titre });
  });
});
