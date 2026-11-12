import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "./page";

// Composant serveur asynchrone (lecture du flux NHC) : couvert par les tests e2e.
vi.mock("@/components/systemes/SystemesActifs", () => ({
  SystemesActifs: () => <p>Systèmes simulés</p>,
}));

describe("Accueil", () => {
  it("affiche le nom de l'application", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1, name: "Siklon" })).toBeInTheDocument();
  });

  it("présente les systèmes actifs de l'Atlantique", () => {
    render(<Home />);
    expect(
      screen.getByRole("region", { name: "Systèmes actifs dans l'Atlantique" }),
    ).toHaveTextContent("Systèmes simulés");
  });

  it("ne double pas l'entrée « Mon île » de la barre de navigation", () => {
    render(<Home />);
    expect(screen.queryByRole("link", { name: /Mon île/ })).not.toBeInTheDocument();
  });

  it("rappelle de suivre les consignes officielles", () => {
    render(<Home />);
    expect(
      screen.getByText("Siklon ne remplace pas les consignes officielles. Suivez les autorités locales."),
    ).toBeInTheDocument();
  });
});
