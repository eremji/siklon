import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ratioContraste } from "@/lib/contraste";
import { SPIRALE } from "@/lib/logo/traces";
import { DessinIcone, ZONE_SURE } from "./DessinIcone";
import { JETONS_CLAIR, JETONS_SOMBRE } from "./jetons";

const LAGON = "#0E5E6F";
const BLANC = "#FFFFFF";
const TURQUOISE = "#5EC4C9";

describe("dessin de l'icône d'app (US-07c)", () => {
  it("reprend la spirale du logo, en blanc et turquoise sur fond Lagon", () => {
    const { container } = render(<DessinIcone zoneSure={ZONE_SURE.normale} />);
    const fond = container.firstElementChild as HTMLElement;
    expect(fond.style.background.toUpperCase()).toBe(
      // jsdom rend la couleur en rgb()
      "RGB(14, 94, 111)",
    );
    const traces = [...container.querySelectorAll("path")];
    expect(traces).toHaveLength(SPIRALE.texte.length + SPIRALE.accent.length);
    const couleurs = traces.map((trace) => trace.getAttribute("fill"));
    expect(couleurs.filter((c) => c === BLANC)).toHaveLength(SPIRALE.texte.length);
    expect(couleurs.filter((c) => c === TURQUOISE)).toHaveLength(SPIRALE.accent.length);
  });

  it("tire ses couleurs des jetons : --header, --header-text et --accent du thème sombre", () => {
    expect(JETONS_CLAIR.header).toBe(LAGON);
    expect(JETONS_CLAIR["header-text"]).toBe(BLANC);
    expect(JETONS_SOMBRE.accent).toBe(TURQUOISE);
  });

  it("garde un contraste d'au moins 3:1 (graphisme) entre chaque teinte et le fond", () => {
    expect(ratioContraste(BLANC, LAGON)).toBeGreaterThanOrEqual(3);
    expect(ratioContraste(TURQUOISE, LAGON)).toBeGreaterThanOrEqual(3);
  });

  it("tient dans la zone sûre : plus petite pour l'icône découpée par Android", () => {
    const { container, rerender } = render(<DessinIcone zoneSure={ZONE_SURE.normale} />);
    const hauteurNormale = Number.parseFloat(container.querySelector("svg")?.getAttribute("height") ?? "0");
    rerender(<DessinIcone zoneSure={ZONE_SURE.maskable} />);
    const hauteurMaskable = Number.parseFloat(container.querySelector("svg")?.getAttribute("height") ?? "0");
    expect(hauteurMaskable).toBeLessThan(hauteurNormale);
  });
});
