import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FournisseurLangue } from "@/components/langue/ContexteLangue";
import { RADIUS_IMPACT_KM } from "@/lib/constantes";

const racine = vi.hoisted(() => ({ langue: "fr" }));
vi.mock("next/root-params", () => ({ langue: async () => racine.langue }));

import Page, { generateMetadata } from "./page";

describe("page historique", () => {
  afterEach(() => {
    racine.langue = "fr";
  });

  it("propose chaque île, avec un lien vers son historique", async () => {
    render(await Page());
    expect(screen.getByRole("heading", { level: 1, name: "Historique des cyclones" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dominique" })).toHaveAttribute("href", "/fr/iles/dominique/historique");
  });

  it("en anglais, présente la page et les noms des îles en anglais (US-10)", async () => {
    racine.langue = "en";
    render(<FournisseurLangue langue="en">{await Page()}</FournisseurLangue>);
    expect(screen.getByRole("heading", { level: 1, name: "Hurricane history" })).toBeInTheDocument();
    expect(
      screen.getByText(
        `Choose an island to see the storms that passed within ${RADIUS_IMPACT_KM} km of its main city since 1851.`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dominica" })).toHaveAttribute("href", "/en/iles/dominique/historique");
    expect(screen.getByText("Source: National Hurricane Center (NHC) HURDAT2 database.")).toBeInTheDocument();
  });

  it.each([
    [
      "fr",
      "Historique des cyclones · Siklon",
      "Les cyclones passés près des îles des Antilles depuis 1851 (base HURDAT2 du NHC).",
    ],
    [
      "en",
      "Hurricane history · Siklon",
      "Past hurricanes and tropical storms near the Caribbean islands since 1851 (NHC HURDAT2 database).",
    ],
  ])("donne le titre et la description de l'onglet en %s", async (langue, title, description) => {
    racine.langue = langue;
    expect(await generateMetadata()).toEqual({ title, description });
  });
});
