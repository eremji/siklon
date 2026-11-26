import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EtatCompte } from "./EtatCompte";
import { FournisseurLangue } from "@/components/langue/ContexteLangue";

const actions = {
  deconnecter: vi.fn(),
  supprimer: vi.fn(),
  enregistrerIles: vi.fn(),
  renvoyerConfirmation: vi.fn(),
  abonnerAppareil: vi.fn(),
  desabonnerAppareil: vi.fn(),
  enregistrerAlertesEmail: vi.fn(),
  clePubliqueVapid: null,
  langue: "fr" as const,
};

describe("EtatCompte", () => {
  it("adresse non confirmée : propose de renvoyer le lien de confirmation", () => {
    render(<EtatCompte utilisateur={{ id: "id-1", email: "a@b.fr", emailVerifie: false, motDePasse: true, langue: "fr" }} {...actions} />);
    expect(screen.getByRole("button", { name: "Renvoyer le lien de confirmation" })).toBeInTheDocument();
  });

  it("adresse non confirmée : ne propose pas encore les alertes sur l'appareil", () => {
    render(<EtatCompte utilisateur={{ id: "id-1", email: "a@b.fr", emailVerifie: false, motDePasse: true, langue: "fr" }} {...actions} />);
    expect(screen.queryByRole("heading", { name: "Alertes sur cet appareil" })).not.toBeInTheDocument();
  });

  it("adresse confirmée : propose les alertes sur l'appareil", () => {
    render(<EtatCompte utilisateur={{ id: "id-1", email: "a@b.fr", emailVerifie: true, motDePasse: true, langue: "fr" }} {...actions} />);
    expect(screen.getByRole("heading", { name: "Alertes sur cet appareil" })).toBeInTheDocument();
  });

  it("adresse non confirmée : ne propose pas encore les alertes par e-mail", () => {
    render(<EtatCompte utilisateur={{ id: "id-1", email: "a@b.fr", emailVerifie: false, motDePasse: true, langue: "fr" }} {...actions} />);
    expect(screen.queryByRole("heading", { name: "Alertes par e-mail" })).not.toBeInTheDocument();
  });

  it("adresse confirmée : propose les alertes par e-mail, selon l'accord enregistré", () => {
    render(
      <EtatCompte
        utilisateur={{ id: "id-1", email: "a@b.fr", emailVerifie: true, motDePasse: true, langue: "fr" }}
        accordEmail
        {...actions}
      />,
    );
    expect(screen.getByRole("heading", { name: "Alertes par e-mail" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Recevoir les alertes par e-mail" })).toBeChecked();
  });

  it("transmet la langue de la page à la déconnexion", () => {
    render(
      <FournisseurLangue langue="en">
        <EtatCompte utilisateur={{ id: "id-1", email: "a@b.fr", emailVerifie: true, motDePasse: true, langue: "fr" }} {...actions} />
      </FournisseurLangue>,
    );
    const formulaire = screen.getByRole("button", { name: "Se déconnecter" }).closest("form");
    expect(formulaire?.querySelector('input[name="langueInterface"]')).toHaveValue("en");
  });

  it("adresse confirmée : ne propose plus de lien", () => {
    render(<EtatCompte utilisateur={{ id: "id-1", email: "a@b.fr", emailVerifie: true, motDePasse: true, langue: "fr" }} {...actions} />);
    expect(screen.getByText("Confirmée")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Renvoyer le lien de confirmation" })).not.toBeInTheDocument();
  });

  it("sans session, propose de se connecter ou de créer un compte", () => {
    render(<EtatCompte utilisateur={null} {...actions} />);
    expect(screen.getByRole("link", { name: "Se connecter" })).toHaveAttribute("href", "/fr/compte/connexion");
    expect(screen.getByRole("link", { name: "Créer un compte" })).toHaveAttribute("href", "/fr/compte/inscription");
    expect(screen.getByText(/sans compte/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Se déconnecter" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Supprimer mon compte" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Mes îles" })).not.toBeInTheDocument();
  });

  it("connecté, affiche l'email, la langue, l'adresse non confirmée et la déconnexion", () => {
    render(
      <EtatCompte
        utilisateur={{ id: "id-1", email: "a@b.fr", emailVerifie: false, motDePasse: true, langue: "en" }}
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
    render(<EtatCompte utilisateur={{ id: "id-1", email: "a@b.fr", emailVerifie: true, motDePasse: true, langue: "fr" }} ilesSuivies={[]} {...actions} />);
    expect(screen.getByText("Français")).toBeInTheDocument();
    expect(screen.getByText("Confirmée")).toBeInTheDocument();
  });

  it("compte Google sans mot de passe : la suppression propose de se reconnecter avec Google", () => {
    render(
      <EtatCompte
        utilisateur={{ id: "id-1", email: "a@b.fr", emailVerifie: true, motDePasse: false, langue: "fr" }}
        google={vi.fn()}
        {...actions}
      />,
    );
    expect(screen.queryByLabelText("Mot de passe actuel")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Me reconnecter avec Google" })).toBeInTheDocument();
  });
});

describe("EtatCompte en anglais (US-10)", () => {
  const anglais = { ...actions, langue: "en" as const };
  const rendre = (element: ReactNode) => render(<FournisseurLangue langue="en">{element}</FournisseurLangue>);

  it("sans session, invite à se connecter en anglais", () => {
    rendre(<EtatCompte utilisateur={null} {...anglais} />);
    expect(
      screen.getByText("All cyclone information is available without an account. An account lets you follow your islands and receive alerts."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/en/compte/connexion");
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/en/compte/inscription");
  });

  it("connecté, résume le compte en anglais et dit que la langue suit le choix du pied de page", () => {
    rendre(
      <EtatCompte utilisateur={{ id: "id-1", email: "a@b.fr", emailVerifie: false, motDePasse: true, langue: "en" }} {...anglais} />,
    );
    expect(screen.getByText("Email address")).toBeInTheDocument();
    expect(screen.getByText("Not confirmed")).toBeInTheDocument();
    expect(screen.getByText("Message language")).toBeInTheDocument();
    expect(screen.getByText("Follows the language chosen at the bottom of the page.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Confirm my address" })).toBeInTheDocument();
    expect(screen.getByText("Open the link sent to your email address. Alerts are only sent to a confirmed address.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("adresse confirmée, en anglais", () => {
    rendre(<EtatCompte utilisateur={{ id: "id-1", email: "a@b.fr", emailVerifie: true, motDePasse: true, langue: "en" }} {...anglais} />);
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Alerts on this device" })).toBeInTheDocument();
  });
});

