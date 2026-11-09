import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BandeauVigilance } from "./BandeauVigilance";

const misAJour = "2026-11-09T09:42:00.000Z";
const guadeloupe = { nomIle: "Guadeloupe" };

describe("BandeauVigilance", () => {
  it.each([
    ["vert", "Vigilance verte", "Pas de vigilance", "bg-header text-header-foreground"],
    ["jaune", "Vigilance jaune", "Soyez attentifs", "bg-vig-jaune text-on-vig-clair"],
    ["orange", "Vigilance orange", "Préparez-vous", "bg-vig-orange text-on-vig-clair"],
    ["rouge", "Vigilance rouge", "Protégez-vous", "bg-vig-rouge text-on-vig-fonce"],
    ["violet", "Vigilance violette", "Confinez-vous", "bg-vig-violet text-on-vig-fonce"],
    ["gris", "Vigilance grise", "Restez prudents", "bg-vig-gris text-on-vig-fonce"],
  ] as const)("affiche le niveau %s en toutes lettres, avec sa consigne et sa couleur", (niveau, libelle, consigne, classes) => {
    render(<BandeauVigilance {...guadeloupe} etat={{ etat: "ok", niveau, misAJour }} />);

    const entete = screen.getByRole("heading", { level: 1, name: "Guadeloupe" }).closest("header")!;
    expect(within(entete).getByText(libelle)).toBeInTheDocument();
    expect(within(entete).getByText(consigne)).toBeInTheDocument();
    expect(entete).toHaveClass(...classes.split(" "));
  });

  it("indique qu'aucune alerte n'est en cours en vigilance verte", () => {
    render(<BandeauVigilance {...guadeloupe} etat={{ etat: "ok", niveau: "vert", misAJour }} />);
    expect(screen.getByText("Aucune alerte en cours pour Guadeloupe.")).toBeInTheDocument();
  });

  it("n'annonce pas l'absence d'alerte quand une vigilance est en cours", () => {
    render(<BandeauVigilance {...guadeloupe} etat={{ etat: "ok", niveau: "jaune", misAJour }} />);
    expect(screen.queryByText(/Aucune alerte en cours/)).not.toBeInTheDocument();
  });

  it("affiche la source et l'heure de mise à jour Météo-France, à l'heure des Antilles", () => {
    render(<BandeauVigilance {...guadeloupe} etat={{ etat: "ok", niveau: "jaune", misAJour }} />);

    expect(screen.getByText("Source : Météo-France, mise à jour du 9 novembre à 05 h 42 (heure des Antilles françaises).")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Consulter la vigilance sur le site de Météo-France" })).toHaveAttribute(
      "href",
      "https://vigilance.meteofrance.fr/fr",
    );
  });

  it("signale un flux indisponible sans afficher de niveau ni d'heure", () => {
    render(<BandeauVigilance {...guadeloupe} etat={{ etat: "indisponible" }} />);

    const entete = screen.getByRole("heading", { level: 1, name: "Guadeloupe" }).closest("header")!;
    expect(within(entete).getByText("Niveau de vigilance indisponible")).toBeInTheDocument();
    expect(entete).toHaveClass("bg-header", "text-header-foreground");
    expect(screen.queryByText(/^Vigilance /)).not.toBeInTheDocument();
    expect(screen.queryByText(/Aucune alerte en cours/)).not.toBeInTheDocument();
    expect(screen.queryByText(/mise à jour/)).not.toBeInTheDocument();
    expect(screen.getByText("Source : Météo-France.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Consulter la vigilance sur le site de Météo-France" })).toBeInTheDocument();
  });
});
