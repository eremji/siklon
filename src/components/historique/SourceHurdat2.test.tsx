import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SourceHurdat2 } from "./SourceHurdat2";

const dernierImport = {
  fichier: "hurdat2-1851-2024-040425.txt",
  versionNhc: "2025-04-04",
  nbTempetes: 1991,
  importeLe: new Date("2026-11-04T20:00:00Z"),
};

describe("SourceHurdat2", () => {
  it("cite la source et la date de mise à jour du NHC", () => {
    render(<SourceHurdat2 dernierImport={dernierImport} />);
    expect(
      screen.getByText("Source : base HURDAT2 du National Hurricane Center (NHC), version du 4 avril 2025."),
    ).toBeInTheDocument();
  });

  it("renvoie vers la source officielle", () => {
    render(<SourceHurdat2 dernierImport={dernierImport} />);
    expect(screen.getByRole("link", { name: "Données HURDAT2 sur le site du NHC" })).toHaveAttribute(
      "href",
      "https://www.nhc.noaa.gov/data/#hurdat",
    );
  });

  it("ne prétend pas à une date quand aucun import n'est connu", () => {
    render(<SourceHurdat2 dernierImport={null} />);
    expect(screen.getByText("Source : base HURDAT2 du National Hurricane Center (NHC).")).toBeInTheDocument();
  });

  it("rappelle de suivre les consignes officielles", () => {
    render(<SourceHurdat2 dernierImport={null} />);
    expect(
      screen.getByText("Siklon ne remplace pas les consignes officielles. Suivez les autorités locales."),
    ).toBeInTheDocument();
  });
});
