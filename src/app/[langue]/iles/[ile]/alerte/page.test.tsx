import { describe, expect, it, vi } from "vitest";

const racine = vi.hoisted(() => ({ langue: "fr" }));
vi.mock("next/root-params", () => ({ langue: async () => racine.langue }));
// Lectures du NHC et de Météo-France (serveur seulement) : couvertes par leurs propres tests et par les e2e.
vi.mock("@/lib/nhc/lecture", () => ({ alertesNhc: vi.fn() }));
vi.mock("@/lib/vigilance/vigilance", () => ({ chargerVigilance: vi.fn() }));
vi.mock("@/lib/vigilance/source", () => ({ SOURCES_METEO_FRANCE: {} }));

import { generateMetadata } from "./page";

const params = (ile: string) => ({ params: Promise.resolve({ langue: racine.langue, ile }) });

describe("page Alerte d'une île", () => {
  it.each([
    ["fr", "dominique", "Alerte en cours : Dominique · Siklon"],
    ["en", "dominique", "Current alert: Dominica · Siklon"],
    ["fr", "atlantide", "Île introuvable · Siklon"],
    ["en", "atlantide", "Island not found · Siklon"],
  ])("donne le titre de l'onglet en %s pour « %s »", async (langue, ile, titre) => {
    racine.langue = langue;
    expect(await generateMetadata(params(ile) as Parameters<typeof generateMetadata>[0])).toEqual({ title: titre });
  });
});
