import { describe, expect, it, vi } from "vitest";

const racine = vi.hoisted(() => ({ langue: "fr" }));
vi.mock("next/root-params", () => ({ langue: async () => racine.langue }));
// Lectures du NHC, de Météo-France et des comptes (serveur seulement) : couvertes par leurs propres tests et par les e2e.
vi.mock("@/lib/nhc/lecture", () => ({ alertesNhc: vi.fn() }));
vi.mock("@/lib/vigilance/vigilance", () => ({ chargerVigilance: vi.fn() }));
vi.mock("@/lib/vigilance/source", () => ({ SOURCES_METEO_FRANCE: {} }));
vi.mock("@/lib/auth/serveur", () => ({ utilisateurCourant: vi.fn() }));
vi.mock("@/lib/db/pool", () => ({ connexionComptes: vi.fn() }));

import { generateMetadata } from "./page";

const params = (ile: string) => ({ params: Promise.resolve({ langue: racine.langue, ile }) });

describe("page Checklist d'une île", () => {
  it.each([
    ["fr", "dominique", "Checklist de préparation : Dominique · Siklon"],
    ["en", "dominique", "Preparedness checklist: Dominica · Siklon"],
    ["fr", "atlantide", "Île introuvable · Siklon"],
    ["en", "atlantide", "Island not found · Siklon"],
  ])("donne le titre de l'onglet en %s pour « %s »", async (langue, ile, titre) => {
    racine.langue = langue;
    expect(await generateMetadata(params(ile) as Parameters<typeof generateMetadata>[0])).toEqual({ title: titre });
  });
});
