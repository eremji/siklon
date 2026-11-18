import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions", () => ({ inscrire: vi.fn(), connecter: vi.fn(), deconnecter: vi.fn() }));
vi.mock("@/lib/auth/serveur", () => ({ utilisateurCourant: vi.fn() }));

const Compte = await import("./page");
const Connexion = await import("./connexion/page");
const Inscription = await import("./inscription/page");

describe("pages du compte", () => {
  it("la page Compte porte un titre et sa métadonnée", () => {
    expect(Compte.metadata.title).toBe("Compte · Siklon");
  });

  it("la page de connexion propose le formulaire et le lien vers l'inscription", () => {
    render(<Connexion.default />);
    expect(screen.getByRole("heading", { level: 1, name: "Se connecter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Se connecter" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Créer un compte" })).toHaveAttribute("href", "/compte/inscription");
    expect(Connexion.metadata.title).toBe("Se connecter · Siklon");
  });

  it("la page d'inscription propose le formulaire, le lien vers la connexion et la confidentialité", () => {
    render(<Inscription.default />);
    expect(screen.getByRole("heading", { level: 1, name: "Créer un compte" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Créer mon compte" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Se connecter" })).toHaveAttribute("href", "/compte/connexion");
    expect(screen.getByRole("link", { name: /données/i })).toHaveAttribute("href", "/confidentialite");
    expect(Inscription.metadata.title).toBe("Créer un compte · Siklon");
  });
});
