import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FournisseurLangue } from "@/components/langue/ContexteLangue";

const racine = vi.hoisted(() => ({ langue: "fr" }));
vi.mock("next/root-params", () => ({ langue: async () => racine.langue }));

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
  it("la page Compte porte un titre et sa métadonnée", async () => {
    expect((await Compte.generateMetadata()).title).toBe("Compte · Siklon");
  });

  it("la page de connexion propose le formulaire et le lien vers l'inscription", async () => {
    render(await Connexion.default());
    expect(screen.getByRole("heading", { level: 1, name: "Se connecter" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Siklon" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Se connecter" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Créer un compte" })).toHaveAttribute("href", "/fr/compte/inscription");
    expect(screen.getByRole("link", { name: "Mot de passe oublié ?" })).toHaveAttribute("href", "/fr/compte/mot-de-passe-oublie");
    expect((await Connexion.generateMetadata()).title).toBe("Se connecter · Siklon");
  });

  it("la page d'inscription propose le formulaire, le lien vers la connexion et la confidentialité", async () => {
    render(await Inscription.default());
    expect(screen.getByRole("heading", { level: 1, name: "Créer un compte" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Siklon" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Créer mon compte" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Se connecter" })).toHaveAttribute("href", "/fr/compte/connexion");
    expect(screen.getByRole("link", { name: /données/i })).toHaveAttribute("href", "/fr/confidentialite");
    expect((await Inscription.generateMetadata()).title).toBe("Créer un compte · Siklon");
  });

  it("la page de confirmation dit que tout a été effacé et propose de revenir à la carte", async () => {
    render(await Supprime.default());
    expect(screen.getByRole("heading", { level: 1, name: "Compte supprimé" })).toBeInTheDocument();
    expect(screen.getByText(/toutes ses données ont été effacés/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Revenir à la carte" })).toHaveAttribute("href", "/fr");
    expect((await Supprime.generateMetadata()).title).toBe("Compte supprimé · Siklon");
  });

  it("la page Mot de passe oublié demande l'adresse email", async () => {
    render(await Oubli.default());
    expect(screen.getByRole("heading", { level: 1, name: "Mot de passe oublié" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recevoir un lien" })).toBeInTheDocument();
    expect((await Oubli.generateMetadata()).title).toBe("Mot de passe oublié · Siklon");
  });

  // Le jeton est dans l'adresse de ces pages : il ne doit pas partir vers un autre site.
  it.each([
    ["confirmation de l'adresse", Confirmer.generateMetadata, "Confirmer mon adresse · Siklon"],
    ["nouveau mot de passe", NouveauMotDePasse.generateMetadata, "Nouveau mot de passe · Siklon"],
  ])("la page %s ne transmet pas son adresse aux autres sites et n'est pas indexée", async (_nom, generer, titre) => {
    const metadata = await generer();
    expect(metadata.title).toBe(titre);
    expect(metadata.referrer).toBe("no-referrer");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  describe("connexion avec Google", () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("propose Google sur la connexion et l'inscription quand le client Google est configuré", async () => {
      vi.stubEnv("GOOGLE_CLIENT_ID", "id-client");
      vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret-client");
      const { unmount } = render(await Connexion.default());
      expect(screen.getByRole("button", { name: "Continuer avec Google" })).toBeInTheDocument();
      unmount();
      render(await Inscription.default());
      expect(screen.getByRole("button", { name: "S'inscrire avec Google" })).toBeInTheDocument();
    });

    it("ne propose pas Google sans client configuré", async () => {
      vi.stubEnv("GOOGLE_CLIENT_ID", "");
      vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
      const { unmount } = render(await Connexion.default());
      expect(screen.queryByRole("button", { name: /Google/ })).not.toBeInTheDocument();
      unmount();
      render(await Inscription.default());
      expect(screen.queryByRole("button", { name: /Google/ })).not.toBeInTheDocument();
    });
  });
});

describe("pages du compte en anglais (US-10)", () => {
  afterEach(() => {
    racine.langue = "fr";
  });

  it.each([
    ["Compte", () => Compte.generateMetadata(), "Account · Siklon", "Sign in or create a Siklon account to follow your islands."],
    ["Connexion", () => Connexion.generateMetadata(), "Sign in · Siklon", "Sign in to your Siklon account."],
    [
      "Inscription",
      () => Inscription.generateMetadata(),
      "Create an account · Siklon",
      "Create a Siklon account with your email address or your Google account.",
    ],
    ["Oubli", () => Oubli.generateMetadata(), "Forgotten password · Siklon", "Get a link to choose a new Siklon password."],
    [
      "NouveauMotDePasse",
      () => NouveauMotDePasse.generateMetadata(),
      "New password · Siklon",
      "Choose a new password for your Siklon account.",
    ],
    ["Confirmer", () => Confirmer.generateMetadata(), "Confirm my address · Siklon", "Confirm the email address of your Siklon account."],
    ["Supprime", () => Supprime.generateMetadata(), "Account deleted · Siklon", "Your Siklon account has been deleted."],
  ])("page %s : titre et description de l'onglet en anglais", async (_nom, generer, title, description) => {
    racine.langue = "en";
    expect(await generer()).toMatchObject({ title, description });
  });

  it("la page de connexion en anglais", async () => {
    racine.langue = "en";
    render(<FournisseurLangue langue="en">{await Connexion.default()}</FournisseurLangue>);
    expect(screen.getByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Forgotten password?" })).toHaveAttribute("href", "/en/compte/mot-de-passe-oublie");
    expect(screen.getByText(/^No account yet\?/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/en/compte/inscription");
  });

  it("la page d'inscription en anglais", async () => {
    racine.langue = "en";
    render(<FournisseurLangue langue="en">{await Inscription.default()}</FournisseurLangue>);
    expect(screen.getByRole("heading", { level: 1, name: "Create an account" })).toBeInTheDocument();
    expect(screen.getByText(/^Siklon only keeps your email address and your language\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Your data" })).toHaveAttribute("href", "/en/confidentialite");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/en/compte/connexion");
    expect(screen.getByRole("radio", { name: "English" })).toBeChecked();
  });

  it("les pages Mot de passe oublié et Compte supprimé en anglais", async () => {
    racine.langue = "en";
    const { unmount } = render(<FournisseurLangue langue="en">{await Oubli.default()}</FournisseurLangue>);
    expect(screen.getByRole("heading", { level: 1, name: "Forgotten password" })).toBeInTheDocument();
    expect(
      screen.getByText("Enter the address of your account: you will receive a link to choose a new password."),
    ).toBeInTheDocument();
    unmount();
    render(<FournisseurLangue langue="en">{await Supprime.default()}</FournisseurLangue>);
    expect(screen.getByRole("heading", { level: 1, name: "Account deleted" })).toBeInTheDocument();
    expect(
      screen.getByText("Your account and all its data have been erased. You can keep following cyclones without an account."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to the map" })).toHaveAttribute("href", "/en");
  });
});

