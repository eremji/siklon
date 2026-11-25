import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LETTRAGE, SPIRALE } from "@/lib/logo/traces";
import { DessinDemarrage } from "./DessinDemarrage";
import { JETONS_CLAIR, JETONS_SOMBRE } from "./jetons";

const rgb = (hex: string) =>
  `rgb(${[1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;

describe("dessin de l'écran de démarrage (US-07c)", () => {
  it.each([
    ["clair", JETONS_CLAIR],
    ["sombre", JETONS_SOMBRE],
  ] as const)("thème %s : fond --bg, logo en --text et --accent", (theme, jetons) => {
    const { container } = render(<DessinDemarrage theme={theme} largeur={1170} />);
    expect((container.firstElementChild as HTMLElement).style.background).toBe(rgb(jetons.bg));
    const couleurs = [...container.querySelectorAll("path")].map((trace) => trace.getAttribute("fill"));
    expect(couleurs.filter((c) => c === jetons.text)).toHaveLength(SPIRALE.texte.length + LETTRAGE.texte.length);
    expect(couleurs.filter((c) => c === jetons.accent)).toHaveLength(SPIRALE.accent.length + LETTRAGE.accent.length);
  });

  it("place la spirale au-dessus du mot Siklon, centrés", () => {
    const { container } = render(<DessinDemarrage theme="clair" largeur={1170} />);
    const fond = container.firstElementChild as HTMLElement;
    expect(fond.style.flexDirection).toBe("column");
    expect(fond.style.alignItems).toBe("center");
    const [spirale, lettrage] = container.querySelectorAll("svg");
    expect(spirale.getAttribute("viewBox")).toBe("246 81 522 544");
    expect(lettrage.getAttribute("viewBox")).toBe("38 632 906 267");
  });

  it("garde la même taille de logo à l'écran, quelle que soit la densité de pixels", () => {
    const { container, rerender } = render(<DessinDemarrage theme="clair" largeur={1170} />);
    const grand = Number(container.querySelector("svg")?.getAttribute("width"));
    rerender(<DessinDemarrage theme="clair" largeur={585} />);
    const petit = Number(container.querySelector("svg")?.getAttribute("width"));
    expect(grand).toBe(petit * 2);
  });
});
