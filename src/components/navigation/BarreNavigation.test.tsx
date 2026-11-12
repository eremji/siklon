import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BarreNavigation } from "./BarreNavigation";

const chemin = vi.hoisted(() => ({ actuel: "/" }));
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
  it("mène à la carte de l'accueil, à la liste des îles et au compte", () => {
    chemin.actuel = "/";
    render(<BarreNavigation />);

    const { carte, monIle, compte } = liens();
    expect(carte).toHaveAttribute("href", "/");
    expect(monIle).toHaveAttribute("href", "/iles");
    expect(compte).toHaveAttribute("href", "/compte");
  });

  it.each(["/compte", "/compte/connexion", "/compte/inscription"])("marque Compte comme page en cours sur %s", (actuel) => {
    chemin.actuel = actuel;
    render(<BarreNavigation />);

    const { carte, monIle, compte } = liens();
    expect(compte).toHaveAttribute("aria-current", "page");
    expect(carte).not.toHaveAttribute("aria-current");
    expect(monIle).not.toHaveAttribute("aria-current");
  });

  it.each(["/", "/systemes/al112026"])("marque Carte comme page en cours sur %s", (actuel) => {
    chemin.actuel = actuel;
    render(<BarreNavigation />);

    const { carte, monIle } = liens();
    expect(carte).toHaveAttribute("aria-current", "page");
    expect(monIle).not.toHaveAttribute("aria-current");
  });

  it.each(["/iles", "/iles/guadeloupe", "/iles/guadeloupe/alerte", "/historique", "/historique/AL091979"])(
    "marque Mon île comme page en cours sur %s",
    (actuel) => {
      chemin.actuel = actuel;
      render(<BarreNavigation />);

      const { carte, monIle } = liens();
      expect(monIle).toHaveAttribute("aria-current", "page");
      expect(carte).not.toHaveAttribute("aria-current");
    },
  );
});
