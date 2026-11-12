import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Page, { metadata } from "./page";

describe("Page de confidentialité", () => {
  it("porte un titre explicite", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: "Confidentialité" })).toBeInTheDocument();
    expect(metadata.title).toBe("Confidentialité · Siklon");
  });

  it("dit que le compte est facultatif et liste les seules données qu'il contient", () => {
    render(<Page />);
    const section = screen.getByRole("region", { name: "Ce que Siklon collecte" });
    expect(section).toHaveTextContent(/sans compte/i);
    expect(section).toHaveTextContent(/adresse email/i);
    expect(section).toHaveTextContent(/langue/i);
    expect(section).toHaveTextContent(/jamais en clair/i);
    expect(section).toHaveTextContent(/aucune mesure d'audience/i);
  });

  it("annonce un seul cookie, de session, déposé seulement à la connexion", () => {
    render(<Page />);
    const section = screen.getByRole("region", { name: "Cookie" });
    expect(section).toHaveTextContent(/un seul cookie/i);
    expect(section).toHaveTextContent(/si vous vous connectez/i);
    expect(section).toHaveTextContent(/7 jours/);
  });

  it("dit où sont gardées les données du compte, et combien de temps", () => {
    render(<Page />);
    const section = screen.getByRole("region", { name: "Où et combien de temps" });
    expect(section).toHaveTextContent("Supabase");
    expect(section).toHaveTextContent(/Paris/);
    expect(section).toHaveTextContent(/10 minutes/);
    expect(within(section).getByRole("link", { name: /Supabase/ })).toHaveAttribute(
      "href",
      "https://supabase.com/privacy",
    );
  });

  it("nomme les tiers qui reçoivent l'adresse IP et ce qu'ils voient", () => {
    render(<Page />);
    const section = screen.getByRole("region", { name: "Qui voit votre adresse IP" });
    expect(section).toHaveTextContent("Vercel");
    expect(section).toHaveTextContent("OpenFreeMap");
    expect(section).toHaveTextContent(/zone de la carte/i);
    expect(within(section).getByRole("link", { name: /Vercel/ })).toHaveAttribute(
      "href",
      "https://vercel.com/legal/privacy-policy",
    );
  });

  it("explique comment supprimer son compte et toutes ses données", () => {
    render(<Page />);
    const section = screen.getByRole("region", { name: "Supprimer vos données" });
    expect(section).toHaveTextContent(/immédiatement/i);
    expect(section).toHaveTextContent(/toutes ses données/i);
    expect(within(section).getByRole("link", { name: "page Compte" })).toHaveAttribute("href", "/compte");
  });

  it("précise que les sources de données ne reçoivent rien du visiteur", () => {
    render(<Page />);
    const section = screen.getByRole("region", { name: "Sources de données" });
    for (const source of ["NHC", "NOAA", "Météo-France"]) expect(section).toHaveTextContent(source);
    expect(section).toHaveTextContent(/serveur de Siklon/);
  });

  it("indique sa date de mise à jour", () => {
    render(<Page />);
    expect(screen.getByText(/Mise à jour : 13 novembre 2026/)).toBeInTheDocument();
  });
});
