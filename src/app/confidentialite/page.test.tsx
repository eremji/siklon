import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Page, { metadata } from "./page";

describe("Page de confidentialité", () => {
  it("porte un titre explicite", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: "Confidentialité" })).toBeInTheDocument();
    expect(metadata.title).toBe("Confidentialité · Siklon");
  });

  it("dit que Siklon ne collecte rien : ni compte, ni cookie, ni mesure d'audience", () => {
    render(<Page />);
    const section = screen.getByRole("region", { name: "Ce que Siklon collecte" });
    expect(section).toHaveTextContent(/aucun compte/i);
    expect(section).toHaveTextContent(/aucun cookie/i);
    expect(section).toHaveTextContent(/aucune mesure d'audience/i);
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

  it("précise que les sources de données ne reçoivent rien du visiteur", () => {
    render(<Page />);
    const section = screen.getByRole("region", { name: "Sources de données" });
    for (const source of ["NHC", "NOAA", "Météo-France"]) expect(section).toHaveTextContent(source);
    expect(section).toHaveTextContent(/serveur de Siklon/);
  });

  it("indique sa date de mise à jour", () => {
    render(<Page />);
    expect(screen.getByText(/Mise à jour : 10 novembre 2026/)).toBeInTheDocument();
  });
});
