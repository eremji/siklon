import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EtatCompte } from "./EtatCompte";

describe("EtatCompte", () => {
  it("sans session, propose de se connecter ou de créer un compte", () => {
    render(<EtatCompte utilisateur={null} deconnecter={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Se connecter" })).toHaveAttribute("href", "/compte/connexion");
    expect(screen.getByRole("link", { name: "Créer un compte" })).toHaveAttribute("href", "/compte/inscription");
    expect(screen.getByText(/sans compte/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Se déconnecter" })).not.toBeInTheDocument();
  });

  it("connecté, affiche l'email, la langue, l'adresse non confirmée et la déconnexion", () => {
    render(
      <EtatCompte
        utilisateur={{ email: "a@b.fr", emailVerifie: false, langue: "en" }}
        deconnecter={vi.fn()}
      />,
    );
    expect(screen.getByText("a@b.fr")).toBeInTheDocument();
    expect(screen.getByText("English")).toBeInTheDocument();
    expect(screen.getByText("Non confirmée")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Se déconnecter" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Se connecter" })).not.toBeInTheDocument();
  });

  it("affiche une adresse confirmée et la langue française", () => {
    render(<EtatCompte utilisateur={{ email: "a@b.fr", emailVerifie: true, langue: "fr" }} deconnecter={vi.fn()} />);
    expect(screen.getByText("Français")).toBeInTheDocument();
    expect(screen.getByText("Confirmée")).toBeInTheDocument();
  });
});
