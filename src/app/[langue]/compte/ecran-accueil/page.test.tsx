import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Page, { metadata } from "./page";

describe("écran d'aide : ajouter Siklon à l'écran d'accueil (US-07c)", () => {
  it("porte un titre et sa métadonnée", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: "Ajouter Siklon à l'écran d'accueil" })).toBeInTheDocument();
    expect(metadata.title).toBe("Ajouter Siklon à l'écran d'accueil · Siklon");
  });

  it("dit pourquoi : recevoir les alertes quand Siklon est fermé", () => {
    render(<Page />);
    expect(screen.getByText(/recevoir les alertes de votre île quand siklon est fermé/i)).toBeInTheDocument();
  });

  it("donne les 4 étapes dans l'ordre, avec les noms des menus d'iOS", () => {
    render(<Page />);
    const etapes = within(screen.getByRole("list", { name: "Étapes" })).getAllByRole("listitem");
    expect(etapes).toHaveLength(4);
    expect(etapes[0]).toHaveTextContent(/touchez le bouton partager/i);
    expect(etapes[1]).toHaveTextContent("Touchez « Sur l'écran d'accueil »");
    expect(etapes[1]).toHaveTextContent("Touchez d'abord « En voir plus » si vous ne le voyez pas.");
    expect(etapes[2]).toHaveTextContent("Touchez « Ajouter »");
    expect(etapes[3]).toHaveTextContent(/ouvrez siklon depuis son icône/i);
    expect(etapes[3]).toHaveTextContent("« Recevoir les alertes sur cet appareil »");
  });

  it("dit où trouver Partager : derrière ≡ ou « ⋯ » sur iPhone (iOS 26 et plus), en haut à droite sur iPad", () => {
    render(<Page />);
    const premiere = within(screen.getByRole("list", { name: "Étapes" })).getAllByRole("listitem")[0];
    expect(premiere).toHaveTextContent("Sur iPhone, touchez d'abord ≡ ou « ⋯ » à côté de l'adresse, puis Partager.");
    expect(premiere).toHaveTextContent(/sur ipad, partager est en haut à droite/i);
    expect(premiere).toHaveTextContent(/versions plus anciennes.*en bas de l'écran/i);
    // Les points ne sont écrits qu'une fois (pas de texte doublé d'une icône).
    expect(premiere.textContent?.match(/⋯/g)).toHaveLength(1);
    expect(premiere.textContent?.match(/≡/g)).toHaveLength(1);
  });

  it("les illustrations sont décoratives : le texte des étapes suffit", () => {
    const { container } = render(<Page />);
    const illustrations = container.querySelectorAll("svg");
    expect(illustrations.length).toBeGreaterThan(0);
    for (const svg of illustrations) expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("ramène à la page Compte et rappelle que Siklon ne remplace pas les consignes officielles", () => {
    render(<Page />);
    expect(screen.getByRole("link", { name: "Retour au compte" })).toHaveAttribute("href", "/fr/compte");
    expect(screen.getByRole("link", { name: "J'ai compris" })).toHaveAttribute("href", "/fr/compte");
    expect(screen.getByText(/ne remplace pas les consignes officielles/i)).toBeInTheDocument();
  });
});
