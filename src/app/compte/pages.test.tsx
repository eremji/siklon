import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./actions", () => ({
  inscrire: vi.fn(),
  connecter: vi.fn(),
  connecterAvecGoogle: vi.fn(),
  deconnecter: vi.fn(),
  supprimerCompte: vi.fn(),
  enregistrerIles: vi.fn(),
  renvoyerConfirmation: vi.fn(),
  confirmerAdresse: vi.fn(),
  demanderReinitialisation: vi.fn(),
  reinitialiserMotDePasse: vi.fn(),
}));
vi.mock("@/lib/auth/serveur", () => ({ utilisateurCourant: vi.fn() }));
vi.mock("@/lib/db/pool", () => ({ connexionComptes: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));

const Compte = await import("./page");
const Connexion = await import("./connexion/page");
const Inscription = await import("./inscription/page");
const Supprime = await import("./supprime/page");
const Confirmer = await import("./confirmer/page");
const Oubli = await import("./mot-de-passe-oublie/page");
const NouveauMotDePasse = await import("./nouveau-mot-de-passe/page");

describe("pages du compte", () => {
  it("la page Compte porte un titre et sa métadonnée", () => {
    expect(Compte.metadata.title).toBe("Compte · Siklon");
  });

  it("la page de connexion propose le formulaire et le lien vers l'inscription", () => {
    render(<Connexion.default />);
    expect(screen.getByRole("heading", { level: 1, name: "Se connecter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Se connecter" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Créer un compte" })).toHaveAttribute("href", "/compte/inscription");
    expect(screen.getByRole("link", { name: "Mot de passe oublié ?" })).toHaveAttribute("href", "/compte/mot-de-passe-oublie");
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

  it("la page de confirmation dit que tout a été effacé et propose de revenir à la carte", () => {
    render(<Supprime.default />);
    expect(screen.getByRole("heading", { level: 1, name: "Compte supprimé" })).toBeInTheDocument();
    expect(screen.getByText(/toutes ses données ont été effacés/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Revenir à la carte" })).toHaveAttribute("href", "/");
    expect(Supprime.metadata.title).toBe("Compte supprimé · Siklon");
  });

  it("la page Mot de passe oublié demande l'adresse email", () => {
    render(<Oubli.default />);
    expect(screen.getByRole("heading", { level: 1, name: "Mot de passe oublié" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recevoir un lien" })).toBeInTheDocument();
    expect(Oubli.metadata.title).toBe("Mot de passe oublié · Siklon");
  });

  // Le jeton est dans l'adresse de ces pages : il ne doit pas partir vers un autre site.
  it.each([
    ["confirmation de l'adresse", Confirmer.metadata, "Confirmer mon adresse · Siklon"],
    ["nouveau mot de passe", NouveauMotDePasse.metadata, "Nouveau mot de passe · Siklon"],
  ])("la page %s ne transmet pas son adresse aux autres sites et n'est pas indexée", (_nom, metadata, titre) => {
    expect(metadata.title).toBe(titre);
    expect(metadata.referrer).toBe("no-referrer");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  describe("connexion avec Google", () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("propose Google sur la connexion et l'inscription quand le client Google est configuré", () => {
      vi.stubEnv("GOOGLE_CLIENT_ID", "id-client");
      vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret-client");
      const { unmount } = render(<Connexion.default />);
      expect(screen.getByRole("button", { name: "Continuer avec Google" })).toBeInTheDocument();
      unmount();
      render(<Inscription.default />);
      expect(screen.getByRole("button", { name: "S'inscrire avec Google" })).toBeInTheDocument();
    });

    it("ne propose pas Google sans client configuré", () => {
      vi.stubEnv("GOOGLE_CLIENT_ID", "");
      vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
      const { unmount } = render(<Connexion.default />);
      expect(screen.queryByRole("button", { name: /Google/ })).not.toBeInTheDocument();
      unmount();
      render(<Inscription.default />);
      expect(screen.queryByRole("button", { name: /Google/ })).not.toBeInTheDocument();
    });
  });
});
