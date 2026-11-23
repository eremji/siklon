import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FournisseurLangue } from "@/components/langue/ContexteLangue";

const racine = vi.hoisted(() => ({ langue: "fr" }));
vi.mock("next/root-params", () => ({ langue: async () => racine.langue }));

import Home from "./page";

// Composant serveur asynchrone (lecture du flux NHC) : couvert par les tests e2e.
vi.mock("@/components/systemes/SystemesActifs", () => ({
  SystemesActifs: () => <p>Systèmes simulés</p>,
}));

describe("Accueil", () => {
  it("affiche le nom de l'application", async () => {
    render(await Home());
    expect(screen.getByRole("heading", { level: 1, name: "Siklon" })).toBeInTheDocument();
  });

  it("présente les systèmes actifs de l'Atlantique", async () => {
    render(await Home());
    expect(
      screen.getByRole("region", { name: "Systèmes actifs dans l'Atlantique" }),
    ).toHaveTextContent("Systèmes simulés");
  });

  it("ne double pas l'entrée « Mon île » de la barre de navigation", async () => {
    render(await Home());
    expect(screen.queryByRole("link", { name: /Mon île/ })).not.toBeInTheDocument();
  });

  it("rappelle de suivre les consignes officielles", async () => {
    render(await Home());
    expect(
      screen.getByText("Siklon ne remplace pas les consignes officielles. Suivez les autorités locales."),
    ).toBeInTheDocument();
  });

  it("en anglais, présente les systèmes actifs en anglais (US-10)", async () => {
    racine.langue = "en";
    render(<FournisseurLangue langue="en">{await Home()}</FournisseurLangue>);
    racine.langue = "fr";
    expect(screen.getByRole("region", { name: "Active systems in the Atlantic" })).toBeInTheDocument();
    expect(screen.getByText("Siklon does not replace official instructions. Follow local authorities.")).toBeInTheDocument();
  });
});
