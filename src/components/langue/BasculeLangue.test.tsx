import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BasculeLangue, BasculeLangueSansPage } from "./BasculeLangue";

const chemin = vi.hoisted(() => ({ actuel: "/fr" }));
vi.mock("next/navigation", () => ({ usePathname: () => chemin.actuel }));

describe("BasculeLangue", () => {
  it("sur une page en français, propose la même page en anglais, libellé en anglais", () => {
    chemin.actuel = "/fr/iles/guadeloupe";
    render(<BasculeLangue langue="fr" />);
    const lien = screen.getByRole("link", { name: "English" });
    expect(lien).toHaveAttribute("href", "/api/langue?vers=en&page=%2Files%2Fguadeloupe");
    expect(lien).toHaveAttribute("lang", "en");
    expect(lien).toHaveAttribute("hreflang", "en");
  });

  it("sur une page en anglais, propose la même page en français", () => {
    chemin.actuel = "/en";
    render(<BasculeLangue langue="en" />);
    const lien = screen.getByRole("link", { name: "Français" });
    expect(lien).toHaveAttribute("href", "/api/langue?vers=fr&page=%2F");
    expect(lien).toHaveAttribute("lang", "fr");
    expect(lien).toHaveAttribute("hreflang", "fr");
  });

  it("offre une zone tactile d'au moins 44 px", () => {
    render(<BasculeLangue langue="fr" />);
    expect(screen.getByRole("link", { name: "English" })).toHaveClass("min-h-11");
  });

  it("avant de connaître la page (prérendu), mène à l'accueil de l'autre langue", () => {
    render(<BasculeLangueSansPage langue="fr" />);
    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute("href", "/api/langue?vers=en&page=%2F");
  });
});
