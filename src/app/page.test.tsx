import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Accueil", () => {
  it("affiche le nom de l'application", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1, name: "Siklon" })).toBeInTheDocument();
  });

  it("rappelle de suivre les consignes officielles", () => {
    render(<Home />);
    expect(
      screen.getByText("Siklon ne remplace pas les consignes officielles. Suivez les autorités locales."),
    ).toBeInTheDocument();
  });
});
