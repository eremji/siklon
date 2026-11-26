import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FournisseurLangue } from "@/components/langue/ContexteLangue";

const racine = vi.hoisted(() => ({ langue: "fr" }));
vi.mock("next/root-params", () => ({ langue: async () => racine.langue }));

import Page, { generateMetadata } from "./page";

describe("écran d'aide : ajouter Siklon à l'écran d'accueil (US-07c)", () => {
  it("porte un titre et sa métadonnée", async () => {
    render(await Page());
    expect(screen.getByRole("heading", { level: 1, name: "Ajouter Siklon à l'écran d'accueil" })).toBeInTheDocument();
    expect((await generateMetadata()).title).toBe("Ajouter Siklon à l'écran d'accueil · Siklon");
  });

  it("dit pourquoi : recevoir les alertes quand Siklon est fermé", async () => {
    render(await Page());
    expect(screen.getByText(/recevoir les alertes de votre île quand siklon est fermé/i)).toBeInTheDocument();
  });

  it("donne les 4 étapes dans l'ordre, avec les noms des menus d'iOS", async () => {
    render(await Page());
    const etapes = within(screen.getByRole("list", { name: "Étapes" })).getAllByRole("listitem");
    expect(etapes).toHaveLength(4);
    expect(etapes[0]).toHaveTextContent(/touchez le bouton partager/i);
    expect(etapes[1]).toHaveTextContent("Touchez « Sur l'écran d'accueil »");
    expect(etapes[1]).toHaveTextContent("Touchez d'abord « En voir plus » si vous ne le voyez pas.");
    expect(etapes[2]).toHaveTextContent("Touchez « Ajouter »");
    expect(etapes[3]).toHaveTextContent(/ouvrez siklon depuis son icône/i);
    expect(etapes[3]).toHaveTextContent("« Recevoir les alertes sur cet appareil »");
  });

  it("dit où trouver Partager : derrière ≡ ou « ⋯ » sur iPhone (iOS 26 et plus), en haut à droite sur iPad", async () => {
    render(await Page());
    const premiere = within(screen.getByRole("list", { name: "Étapes" })).getAllByRole("listitem")[0];
    expect(premiere).toHaveTextContent("Sur iPhone, touchez d'abord ≡ ou « ⋯ » à côté de l'adresse, puis Partager.");
    expect(premiere).toHaveTextContent(/sur ipad, partager est en haut à droite/i);
    expect(premiere).toHaveTextContent(/versions plus anciennes.*en bas de l'écran/i);
    // Les points ne sont écrits qu'une fois (pas de texte doublé d'une icône).
    expect(premiere.textContent?.match(/⋯/g)).toHaveLength(1);
    expect(premiere.textContent?.match(/≡/g)).toHaveLength(1);
  });

  it("les illustrations sont décoratives : le texte des étapes suffit", async () => {
    const { container } = render(await Page());
    const illustrations = container.querySelectorAll("svg");
    expect(illustrations.length).toBeGreaterThan(0);
    for (const svg of illustrations) expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("ramène à la page Compte et rappelle que Siklon ne remplace pas les consignes officielles", async () => {
    render(await Page());
    expect(screen.getByRole("link", { name: "Retour au compte" })).toHaveAttribute("href", "/fr/compte");
    expect(screen.getByRole("link", { name: "J'ai compris" })).toHaveAttribute("href", "/fr/compte");
    expect(screen.getByText(/ne remplace pas les consignes officielles/i)).toBeInTheDocument();
  });
});

describe("écran d'aide en anglais (US-10)", () => {
  afterEach(() => {
    racine.langue = "fr";
  });

  it("titre et description de l'onglet en anglais", async () => {
    racine.langue = "en";
    expect(await generateMetadata()).toEqual({
      title: "Add Siklon to the Home Screen · Siklon",
      description: "How to add Siklon to the Home Screen of an iPhone or iPad to receive alerts.",
    });
  });

  it("donne les 4 étapes avec les noms des menus d'iOS en anglais", async () => {
    racine.langue = "en";
    render(<FournisseurLangue langue="en">{await Page()}</FournisseurLangue>);
    expect(screen.getByRole("heading", { level: 1, name: "Add Siklon to the Home Screen" })).toBeInTheDocument();
    expect(
      screen.getByText("On iPhone and iPad, this is the only way to receive alerts for your island when Siklon is closed."),
    ).toBeInTheDocument();
    const etapes = within(screen.getByRole("list", { name: "Steps" })).getAllByRole("listitem");
    expect(etapes).toHaveLength(4);
    expect(etapes[0]).toHaveTextContent("Tap the Share button");
    expect(etapes[0]).toHaveTextContent("On iPhone, first tap ≡ or “⋯” next to the address, then Share.");
    expect(etapes[1]).toHaveTextContent("Tap “Add to Home Screen”");
    expect(etapes[1]).toHaveTextContent("First tap “View More” if you don't see it.");
    expect(etapes[2]).toHaveTextContent("Tap “Add”");
    expect(etapes[3]).toHaveTextContent("Then, in Account, tap “Receive alerts on this device” and allow notifications.");
    expect(screen.getByRole("link", { name: "Back to account" })).toHaveAttribute("href", "/en/compte");
    expect(screen.getByRole("link", { name: "Got it" })).toHaveAttribute("href", "/en/compte");
  });
});

