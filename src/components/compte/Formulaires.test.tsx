import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FormulaireConnexion, FormulaireInscription } from "./Formulaires";

describe("FormulaireInscription", () => {
  it("demande un email, un mot de passe d'au moins 12 caractères et une langue", () => {
    render(<FormulaireInscription action={vi.fn()} />);

    const email = screen.getByLabelText("Adresse email");
    expect(email).toHaveAttribute("type", "email");
    expect(email).toHaveAttribute("autocomplete", "email");
    expect(email).toBeRequired();

    const motDePasse = screen.getByLabelText("Mot de passe");
    expect(motDePasse).toHaveAttribute("type", "password");
    expect(motDePasse).toHaveAttribute("autocomplete", "new-password");
    expect(motDePasse).toHaveAttribute("minlength", "12");
    expect(motDePasse).toHaveAccessibleDescription("Au moins 12 caractères.");
    expect(motDePasse).toBeRequired();

    const langue = screen.getByRole("group", { name: "Langue des messages" });
    expect(langue).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Français" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "English" })).not.toBeChecked();
  });

  it("envoie le formulaire, puis affiche l'erreur et garde l'email saisi", async () => {
    const action = vi.fn<(etat: object, donnees: FormData) => Promise<{ message: string; email: string }>>(async () => ({
      message: "Un compte existe déjà avec cette adresse email.",
      email: "a@b.fr",
    }));
    render(<FormulaireInscription action={action} />);

    await userEvent.type(screen.getByLabelText("Adresse email"), "a@b.fr");
    await userEvent.type(screen.getByLabelText("Mot de passe"), "un mot de passe solide");
    await userEvent.click(screen.getByRole("radio", { name: "English" }));
    await userEvent.click(screen.getByRole("button", { name: "Créer mon compte" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Un compte existe déjà avec cette adresse email.");
    expect(screen.getByLabelText("Adresse email")).toHaveValue("a@b.fr");
    const donnees = action.mock.calls[0][1];
    expect(Object.fromEntries(donnees)).toEqual({ email: "a@b.fr", motDePasse: "un mot de passe solide", langue: "en" });
  });
});

it("les deux formulaires n'ont aucun identifiant en commun, même affichés ensemble", () => {
  const { container } = render(
    <>
      <FormulaireInscription action={vi.fn()} />
      <FormulaireConnexion action={vi.fn()} />
    </>,
  );
  const ids = [...container.querySelectorAll("[id]")].map((element) => element.id);
  expect(new Set(ids).size).toBe(ids.length);
});

describe("FormulaireConnexion", () => {
  it("demande un email et le mot de passe actuel", () => {
    render(<FormulaireConnexion action={vi.fn()} />);
    expect(screen.getByLabelText("Adresse email")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Mot de passe")).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByRole("button", { name: "Se connecter" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("affiche l'erreur renvoyée par le serveur", async () => {
    const action = vi.fn(async () => ({ message: "Email ou mot de passe incorrect.", email: "a@b.fr" }));
    render(<FormulaireConnexion action={action} />);

    await userEvent.type(screen.getByLabelText("Adresse email"), "a@b.fr");
    await userEvent.type(screen.getByLabelText("Mot de passe"), "mauvais mot de passe");
    await userEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email ou mot de passe incorrect.");
  });
});
