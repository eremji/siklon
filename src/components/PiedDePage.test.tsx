import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PiedDePage } from "./PiedDePage";

describe("PiedDePage", () => {
  it("mène à la page de confidentialité depuis chaque page", () => {
    render(<PiedDePage />);
    expect(screen.getByRole("contentinfo")).toContainElement(screen.getByRole("link", { name: "Confidentialité" }));
    expect(screen.getByRole("link", { name: "Confidentialité" })).toHaveAttribute("href", "/confidentialite");
  });
});
