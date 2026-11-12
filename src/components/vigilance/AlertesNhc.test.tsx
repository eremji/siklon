import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AlerteNhc, EtatAlertesNhc } from "@/lib/nhc/alertes";
import { AlertesNhc } from "./AlertesNhc";

const LU_LE = "2026-09-10T15:10:00.000Z";
const KYLE = { id: "al112026", nom: "Kyle", description: "Ouragan de catégorie 4" };
const AVIS_14 = { numero: "14", emisLe: "2026-09-10T15:00:00.000Z" };

function ok(...alertes: AlerteNhc[]): EtatAlertesNhc {
  return { etat: "ok", alertes, luLe: LU_LE };
}

function entete() {
  return screen.getByRole("banner");
}

describe("AlertesNhc", () => {
  it("écrit le type le plus grave en toutes lettres dans l'en-tête, avec son terme d'origine et sa définition", () => {
    render(<AlertesNhc nomIle="Dominique" etat={ok({ code: "HWR", systeme: KYLE, avis: AVIS_14 })} />);

    expect(within(entete()).getByRole("heading", { level: 1, name: "Dominique" })).toBeInTheDocument();
    expect(within(entete()).getByText("Avertissement d'ouragan")).toBeInTheDocument();
    expect(within(entete()).getByText("(Hurricane Warning)")).toBeInTheDocument();
    expect(within(entete()).getByText("Conditions d'ouragan attendues, en général dans les 36 heures.")).toBeInTheDocument();
  });

  it.each([
    ["HWR", "bg-nhc-hwr text-on-vig-fonce"],
    ["TWR", "bg-nhc-twr text-on-vig-fonce"],
    ["HWA", "bg-nhc-hwa text-on-vig-clair"],
    ["TWA", "bg-nhc-twa text-on-vig-clair"],
  ] as const)("colore l'en-tête selon DESIGN.md pour %s", (code, classes) => {
    render(<AlertesNhc nomIle="Dominique" etat={ok({ code, systeme: KYLE, avis: AVIS_14 })} />);

    for (const classe of classes.split(" ")) expect(entete()).toHaveClass(classe);
  });

  it("liste chaque alerte avec son système et son avis, dans l'ordre reçu", () => {
    render(
      <AlertesNhc
        nomIle="Sainte-Lucie"
        etat={ok({ code: "TWR", systeme: KYLE, avis: AVIS_14 }, { code: "HWA", systeme: KYLE, avis: AVIS_14 })}
      />,
    );

    expect(entete()).toHaveClass("bg-nhc-twr");
    const elements = within(screen.getByRole("list", { name: "Veilles et avertissements NHC en cours" })).getAllByRole(
      "listitem",
    );
    expect(elements).toHaveLength(2);
    expect(within(elements[0]).getByText("Avertissement de tempête tropicale (Tropical Storm Warning)")).toBeInTheDocument();
    expect(within(elements[1]).getByText("Veille d'ouragan (Hurricane Watch)")).toBeInTheDocument();
    expect(within(elements[0]).getByRole("link", { name: "Kyle" })).toHaveAttribute("href", "/systemes/al112026");
    expect(within(elements[0]).getByText(/Ouragan de catégorie 4/)).toBeInTheDocument();
    expect(within(elements[0]).getByText("Avis n° 14 du NHC, émis le 10 septembre à 11 h 00.")).toBeInTheDocument();
  });

  it("affiche la source et l'heure de mise à jour, avec un lien vers le NHC", () => {
    render(<AlertesNhc nomIle="Dominique" etat={ok({ code: "TWA", systeme: KYLE, avis: AVIS_14 })} />);

    expect(
      screen.getByText("Source : NHC, données lues le 10 septembre à 11 h 10 (heure des Antilles françaises)."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Consulter les alertes sur le site du NHC" })).toHaveAttribute(
      "href",
      "https://www.nhc.noaa.gov/",
    );
  });

  it("indique qu'aucune veille ni aucun avertissement n'est en cours", () => {
    render(<AlertesNhc nomIle="Barbade" etat={ok()} />);

    expect(entete()).toHaveClass("bg-header");
    expect(within(entete()).getByText("Aucune veille ni aucun avertissement")).toBeInTheDocument();
    expect(screen.getByText("Aucune veille ni aucun avertissement NHC en cours pour Barbade.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByText(/Source : NHC, données lues le 10 septembre/)).toBeInTheDocument();
  });

  it("signale des données indisponibles sans afficher d'alerte", () => {
    render(<AlertesNhc nomIle="Dominique" etat={{ etat: "indisponible", luLe: LU_LE }} />);

    expect(entete()).toHaveClass("bg-header");
    expect(within(entete()).getByText("Veilles et avertissements NHC indisponibles")).toBeInTheDocument();
    expect(screen.queryByText(/Avertissement d|Veille d/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Aucune veille/)).not.toBeInTheDocument();
    expect(screen.getByText("Source : NHC.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Consulter les alertes sur le site du NHC" })).toBeInTheDocument();
  });

  it("n'affiche aucun niveau de vigilance", () => {
    render(<AlertesNhc nomIle="Dominique" etat={ok({ code: "HWR", systeme: KYLE, avis: AVIS_14 })} />);
    expect(screen.queryByText(/Vigilance/)).not.toBeInTheDocument();
  });
});
