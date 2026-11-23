import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BandeauEcranAccueil } from "./BandeauEcranAccueil";

describe("BandeauEcranAccueil (US-07c)", () => {
  it("est une région nommée qui ne prend pas le focus", () => {
    render(<BandeauEcranAccueil appareil="iphone" />);
    const region = screen.getByRole("region", { name: "Ajouter Siklon à l'écran d'accueil" });
    expect(region).not.toHaveAttribute("tabindex");
    expect(document.activeElement).toBe(document.body);
  });

  it("dit pourquoi et mène à l'aide en images", () => {
    render(<BandeauEcranAccueil appareil="ipad" />);
    const region = screen.getByRole("region", { name: "Ajouter Siklon à l'écran d'accueil" });
    expect(region).toHaveTextContent(/sur ipad/i);
    expect(region).toHaveTextContent(/recevoir les alertes de votre île, même quand l'app est fermée/i);
    const lien = within(region).getByRole("link", { name: "Voir comment faire" });
    expect(lien).toHaveAttribute("href", "/fr/compte/ecran-accueil");
    expect(lien.className).toMatch(/min-h-11/);
  });
});
