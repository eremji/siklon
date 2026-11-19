import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EtatCompte } from "./EtatCompte";

const actions = { deconnecter: vi.fn(), supprimer: vi.fn(), enregistrerIles: vi.fn() };

describe("EtatCompte", () => {
  it("sans session, propose de se connecter ou de créer un compte", () => {
    render(<EtatCompte utilisateur={null} {...actions} />);
    expect(screen.getByRole("link", { name: "Se connecter" })).toHaveAttribute("href", "/compte/connexion");
    expect(screen.getByRole("link", { name: "Créer un compte" })).toHaveAttribute("href", "/compte/inscription");
    expect(screen.getByText(/sans compte/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Se déconnecter" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Supprimer mon compte" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Mes îles" })).not.toBeInTheDocument();
  });

  it("connecté, affiche l'email, la langue, l'adresse non confirmée et la déconnexion", () => {
    render(
      <EtatCompte
        utilisateur={{ id: "id-1", email: "a@b.fr", emailVerifie: false, langue: "en" }}
        ilesSuivies={["haiti"]}
        {...actions}
      />,
    );
    expect(screen.getByText("a@b.fr")).toBeInTheDocument();
    expect(screen.getByText("English")).toBeInTheDocument();
    expect(screen.getByText("Non confirmée")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Se déconnecter" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Supprimer mon compte" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Se connecter" })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Haïti" })).toBeChecked();
  });

  it("affiche une adresse confirmée et la langue française", () => {
    render(<EtatCompte utilisateur={{ id: "id-1", email: "a@b.fr", emailVerifie: true, langue: "fr" }} ilesSuivies={[]} {...actions} />);
    expect(screen.getByText("Français")).toBeInTheDocument();
    expect(screen.getByText("Confirmée")).toBeInTheDocument();
  });
});
