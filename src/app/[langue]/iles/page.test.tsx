import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FournisseurLangue } from "@/components/langue/ContexteLangue";
import { RADIUS_WATCH_KM } from "@/lib/constantes";

const racine = vi.hoisted(() => ({ langue: "fr" }));
vi.mock("next/root-params", () => ({ langue: async () => racine.langue }));

import Page, { generateMetadata } from "./page";

describe("liste des îles", () => {
  afterEach(() => {
    racine.langue = "fr";
  });

  it("propose chaque île, avec un lien vers sa page", async () => {
    render(await Page());

    expect(screen.getByRole("heading", { level: 1, name: "Mon île" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dominique" })).toHaveAttribute("href", "/fr/iles/dominique");
  });

  it("en anglais, présente la liste et les noms des îles en anglais (US-10)", async () => {
    racine.langue = "en";
    render(<FournisseurLangue langue="en">{await Page()}</FournisseurLangue>);

    expect(screen.getByRole("heading", { level: 1, name: "My island" })).toBeInTheDocument();
    expect(
      screen.getByText(
        `Choose an island to find out whether an active system is forecast to pass within ${RADIUS_WATCH_KM} km of its main city, and how soon.`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dominica" })).toHaveAttribute("href", "/en/iles/dominique");
  });

  it.each([
    [
      "fr",
      "Mon île · Siklon",
      "Choisissez une île des Antilles pour savoir dans combien de temps un système actif pourrait l'atteindre.",
    ],
    ["en", "My island · Siklon", "Choose a Caribbean island to find out how soon an active system could reach it."],
  ])("donne le titre et la description de l'onglet en %s", async (langue, title, description) => {
    racine.langue = langue;
    expect(await generateMetadata()).toEqual({ title, description });
  });
});
