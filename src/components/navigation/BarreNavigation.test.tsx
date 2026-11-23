import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BarreNavigation } from "./BarreNavigation";

const chemin = vi.hoisted(() => ({ actuel: "/fr" }));
vi.mock("next/navigation", () => ({ usePathname: () => chemin.actuel }));

function liens() {
  const barre = screen.getByRole("navigation", { name: "Navigation principale" });
  return {
    carte: within(barre).getByRole("link", { name: "Carte" }),
    monIle: within(barre).getByRole("link", { name: "Mon île" }),
    compte: within(barre).getByRole("link", { name: "Compte" }),
  };
}

describe("BarreNavigation", () => {
  it("mène à la carte de l'accueil, à la liste des îles et au compte, dans la langue de la page", () => {
    chemin.actuel = "/fr";
    render(<BarreNavigation langue="fr" />);

    const { carte, monIle, compte } = liens();
    expect(carte).toHaveAttribute("href", "/fr");
    expect(monIle).toHaveAttribute("href", "/fr/iles");
    expect(compte).toHaveAttribute("href", "/fr/compte");
  });

  it.each(["/fr/compte", "/fr/compte/connexion", "/en/compte/inscription"])("marque Compte comme page en cours sur %s", (actuel) => {
    chemin.actuel = actuel;
    render(<BarreNavigation langue="fr" />);

    const { carte, monIle, compte } = liens();
    expect(compte).toHaveAttribute("aria-current", "page");
    expect(carte).not.toHaveAttribute("aria-current");
    expect(monIle).not.toHaveAttribute("aria-current");
  });

  it.each(["/fr", "/en", "/fr/systemes/al112026"])("marque Carte comme page en cours sur %s", (actuel) => {
    chemin.actuel = actuel;
    render(<BarreNavigation langue="fr" />);

    const { carte, monIle } = liens();
    expect(carte).toHaveAttribute("aria-current", "page");
    expect(monIle).not.toHaveAttribute("aria-current");
  });

  it.each(["/fr/iles", "/en/iles/guadeloupe", "/fr/iles/guadeloupe/alerte", "/fr/historique", "/en/historique/AL091979"])(
    "marque Mon île comme page en cours sur %s",
    (actuel) => {
      chemin.actuel = actuel;
      render(<BarreNavigation langue="fr" />);

      const { carte, monIle } = liens();
      expect(monIle).toHaveAttribute("aria-current", "page");
      expect(carte).not.toHaveAttribute("aria-current");
    },
  );
});

describe("BarreNavigation en anglais", () => {
  it("affiche ses libellés en anglais", () => {
    chemin.actuel = "/en/iles";
    render(<BarreNavigation langue="en" />);
    const barre = screen.getByRole("navigation", { name: "Main navigation" });
    expect(within(barre).getByRole("link", { name: "Map" })).toHaveAttribute("href", "/en");
    expect(within(barre).getByRole("link", { name: "My island" })).toHaveAttribute("aria-current", "page");
    expect(within(barre).getByRole("link", { name: "Account" })).toHaveAttribute("href", "/en/compte");
  });
});
