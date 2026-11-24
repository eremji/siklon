import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LETTRAGE, SPIRALE } from "@/lib/logo/traces";
import { LogoSiklon } from "./LogoSiklon";

describe("LogoSiklon (US-07c)", () => {
  it("est une image nommée « Siklon » pour le lecteur d'écran", () => {
    render(<LogoSiklon />);
    expect(screen.getByRole("img", { name: "Siklon" })).toBeInTheDocument();
  });

  it("dessine la spirale et le lettrage, les dessins eux-mêmes étant décoratifs", () => {
    const { container } = render(<LogoSiklon />);
    const dessins = container.querySelectorAll("svg");
    expect(dessins).toHaveLength(2);
    for (const svg of dessins) expect(svg).toHaveAttribute("aria-hidden", "true");
    const nbTraces = SPIRALE.texte.length + SPIRALE.accent.length + LETTRAGE.texte.length + LETTRAGE.accent.length;
    expect(container.querySelectorAll("path")).toHaveLength(nbTraces);
  });

  it("n'utilise que les jetons --text et --accent, jamais une couleur écrite en dur", () => {
    const { container } = render(<LogoSiklon />);
    for (const trace of container.querySelectorAll("path")) {
      expect(trace.getAttribute("class")).toMatch(/^fill-(foreground|accent)$/);
      expect(trace).not.toHaveAttribute("fill");
      expect(trace).not.toHaveAttribute("style");
    }
    expect(container.querySelectorAll("path.fill-accent")).toHaveLength(SPIRALE.accent.length + LETTRAGE.accent.length);
  });

  it("garde les proportions de la maquette : spirale de la hauteur demandée, lettrage plus petit", () => {
    const { container } = render(<LogoSiklon hauteur={44} />);
    const [spirale, lettrage] = container.querySelectorAll("svg");
    expect(spirale).toHaveAttribute("height", "44");
    expect(spirale).toHaveAttribute("width", String(Math.round((44 * 522) / 544)));
    expect(lettrage).toHaveAttribute("height", "30");
    expect(lettrage).toHaveAttribute("width", String(Math.round((30 * 906) / 267)));
  });
});
