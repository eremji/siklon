import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AlertesNhcAVenir } from "./AlertesNhcAVenir";

describe("AlertesNhcAVenir", () => {
  it("annonce que les alertes NHC arrivent bientôt, avec un lien vers le NHC", () => {
    render(<AlertesNhcAVenir nomIle="Dominique" />);

    expect(screen.getByRole("heading", { level: 1, name: "Dominique" })).toBeInTheDocument();
    expect(screen.getByText("Alertes NHC bientôt disponibles")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Consulter les alertes sur le site du NHC" })).toHaveAttribute(
      "href",
      "https://www.nhc.noaa.gov/",
    );
  });

  it("n'affiche aucun niveau de vigilance", () => {
    render(<AlertesNhcAVenir nomIle="Dominique" />);
    expect(screen.queryByText(/Vigilance/)).not.toBeInTheDocument();
  });
});
