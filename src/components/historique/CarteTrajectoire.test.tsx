import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PointHurdat2 } from "@/lib/hurdat2/parseur";
import { trouverIle } from "@/lib/iles";
import { CarteTrajectoire } from "./CarteTrajectoire";

const guadeloupe = trouverIle("guadeloupe")!;

const pt = (heures: number, lat: number, lon: number, statut: PointHurdat2["statut"]): PointHurdat2 => ({
  horodatage: new Date(Date.UTC(1989, 8, 17, heures)),
  identifiant: null,
  statut,
  lat,
  lon,
  ventKt: 100,
  pressionMb: null,
});

const points = [pt(0, 15, -58, "TS"), pt(6, 16, -60, "HU"), pt(12, 16.5, -62, "HU"), pt(18, 17.5, -64, "HU")];

describe("CarteTrajectoire", () => {
  it("est une image décrite pour les lecteurs d'écran", () => {
    render(<CarteTrajectoire titre="Hugo (1989)" points={points} ile={guadeloupe} />);
    expect(
      screen.getByRole("img", { name: "Carte de la trajectoire de Hugo (1989), 4 points, près de Guadeloupe" }),
    ).toBeInTheDocument();
  });

  it("trace toute la trajectoire, point par point", () => {
    const { container } = render(<CarteTrajectoire titre="Hugo (1989)" points={points} ile={guadeloupe} />);
    const trace = container.querySelector("polyline[data-trace]");
    expect(trace?.getAttribute("points")?.trim().split(/\s+/)).toHaveLength(4);
    expect(container.querySelectorAll("[data-point]")).toHaveLength(4);
  });

  it("distingue le stade d'ouragan par la forme du point, pas seulement la couleur", () => {
    const { container } = render(<CarteTrajectoire titre="Hugo (1989)" points={points} ile={guadeloupe} />);
    expect(container.querySelectorAll('[data-point="ouragan"]')).toHaveLength(3);
    expect(container.querySelectorAll('rect[data-point="ouragan"]')).toHaveLength(3);
    expect(container.querySelectorAll('circle[data-point="autre"]')).toHaveLength(1);
  });

  it("situe le point de référence de l'île et son rayon d'impact", () => {
    const { container } = render(<CarteTrajectoire titre="Hugo (1989)" points={points} ile={guadeloupe} />);
    expect(screen.getByText("Pointe-à-Pitre")).toBeInTheDocument();
    expect(container.querySelector("[data-rayon-impact]")).not.toBeNull();
  });

  it("dessine les terres (traits de côte Natural Earth) sous la trajectoire", () => {
    const { container } = render(<CarteTrajectoire titre="Hugo (1989)" points={points} ile={guadeloupe} />);
    const terres = container.querySelectorAll("path[data-cote]");
    expect(terres.length).toBeGreaterThan(0);
    const ordre = [...container.querySelectorAll("path[data-cote], polyline")].map((el) => el.tagName);
    expect(ordre.at(-1)).toBe("polyline");
  });

  it("borde la trajectoire d'un liseré pour qu'elle reste visible sur les terres", () => {
    const { container } = render(<CarteTrajectoire titre="Hugo (1989)" points={points} ile={guadeloupe} />);
    expect(container.querySelectorAll("polyline")).toHaveLength(2);
  });

  it("s'affiche sans île choisie", () => {
    const { container } = render(<CarteTrajectoire titre="Hugo (1989)" points={points} />);
    expect(screen.getByRole("img", { name: "Carte de la trajectoire de Hugo (1989), 4 points" })).toBeInTheDocument();
    expect(container.querySelector("[data-rayon-impact]")).toBeNull();
  });
});
