import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PiedDePage } from "./PiedDePage";

vi.mock("next/navigation", () => ({ usePathname: () => "/en/iles" }));

describe("PiedDePage", () => {
  it("mène à la page de confidentialité depuis chaque page", () => {
    render(<PiedDePage langue="fr" />);
    expect(screen.getByRole("contentinfo")).toContainElement(screen.getByRole("link", { name: "Confidentialité" }));
    expect(screen.getByRole("link", { name: "Confidentialité" })).toHaveAttribute("href", "/fr/confidentialite");
  });

  it("en anglais, mène à la page de confidentialité anglaise", () => {
    render(<PiedDePage langue="en" />);
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/en/confidentialite");
  });

  it("propose de passer dans l'autre langue sur chaque page", async () => {
    render(<PiedDePage langue="en" />);
    expect(screen.getByRole("contentinfo")).toContainElement(await screen.findByRole("link", { name: "Français" }));
  });
});
