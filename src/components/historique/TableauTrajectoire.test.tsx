import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PointHurdat2 } from "@/lib/hurdat2/parseur";
import { TableauTrajectoire } from "./TableauTrajectoire";

const points: PointHurdat2[] = [
  { horodatage: new Date("1989-09-17T00:00:00Z"), identifiant: null, statut: "HU", lat: 16.2, lon: -61.5, ventKt: 120, pressionMb: 941 },
  { horodatage: new Date("1989-09-17T06:00:00Z"), identifiant: "L", statut: "HU", lat: 16.6, lon: -62.2, ventKt: null, pressionMb: null },
];

describe("TableauTrajectoire", () => {
  it("donne la trajectoire en texte, comme alternative à la carte", () => {
    render(<TableauTrajectoire points={points} />);
    const tableau = screen.getByRole("table", { name: "Points de la trajectoire (2), heures en UTC" });
    expect(within(tableau).getAllByRole("columnheader").map((th) => th.textContent)).toEqual([
      "Date et heure",
      "Stade",
      "Position",
      "Vent maximal",
      "Pression",
    ]);
  });

  it("affiche chaque point avec ses valeurs, et des tirets pour les valeurs manquantes", () => {
    render(<TableauTrajectoire points={points} />);
    const lignes = screen.getAllByRole("row").slice(1);
    expect(within(lignes[0]).getAllByRole("cell").map((td) => td.textContent)).toEqual([
      "17 septembre 1989 à 00 h 00 UTC",
      "Ouragan",
      "16,2° N 61,5° O",
      "222 km/h (120 nœuds)",
      "941 hPa",
    ]);
    expect(within(lignes[1]).getAllByRole("cell").map((td) => td.textContent)).toEqual([
      "17 septembre 1989 à 06 h 00 UTC",
      "Ouragan (atterrissage)",
      "16,6° N 62,2° O",
      "—",
      "—",
    ]);
  });
});
