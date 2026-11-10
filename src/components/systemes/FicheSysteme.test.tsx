import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SystemeActif } from "@/lib/nhc/systemes";
import { FicheSysteme } from "./FicheSysteme";

function systeme(partiel: Partial<SystemeActif> = {}): SystemeActif {
  return {
    id: "al112026",
    emplacement: "AT1",
    nom: "Kyle",
    classification: "HU",
    ventKt: 120,
    pressionHpa: 948,
    latitude: 16.8,
    longitude: -58.2,
    avis: {
      numero: "14",
      emisLe: "2026-09-10T15:00:00.000Z",
      url: "https://www.nhc.noaa.gov/text/MIATCPAT1.shtml",
    },
    deplacement: { directionDeg: 285, vitesseMph: 12 },
    ...partiel,
  };
}

// Valeur (dd) qui suit un libellé (dt) dans une zone donnée.
function valeur(zone: HTMLElement, libelle: string): string {
  return within(zone).getByText(libelle, { selector: "dt" }).nextElementSibling?.textContent ?? "";
}

const mesures = () => screen.getByRole("region", { name: "Intensité et déplacement" });
const origine = () => screen.getByText("Valeurs d'origine du NHC").closest("details") as HTMLElement;

describe("FicheSysteme", () => {
  it("présente le système par son nom, son type et sa catégorie", () => {
    render(<FicheSysteme systeme={systeme()} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Kyle");
    expect(screen.getByText("Ouragan de catégorie 4")).toBeInTheDocument();
  });

  it("affiche vents, pression, déplacement et position en unités métriques", () => {
    render(<FicheSysteme systeme={systeme()} />);

    expect(valeur(mesures(), "Vents maximaux soutenus")).toBe("220 km/h");
    expect(valeur(mesures(), "Pression centrale")).toBe("948 hPa");
    expect(valeur(mesures(), "Déplacement")).toBe("Vers l'ouest-nord-ouest à 19 km/h");
    expect(valeur(mesures(), "Position")).toBe("16,8° N, 58,2° O");
  });

  it("garde consultables les valeurs d'origine du NHC (nœuds, mph, mb, degrés)", () => {
    render(<FicheSysteme systeme={systeme()} />);

    expect(valeur(origine(), "Vents maximaux soutenus")).toBe("120 nœuds (140 mph)");
    expect(valeur(origine(), "Pression centrale")).toBe("948 mb");
    expect(valeur(origine(), "Déplacement")).toBe("285° à 12 mph");
  });

  it("indique un système stationnaire", () => {
    render(<FicheSysteme systeme={systeme({ deplacement: { directionDeg: 0, vitesseMph: 0 } })} />);

    expect(valeur(mesures(), "Déplacement")).toBe("Stationnaire");
    expect(valeur(origine(), "Déplacement")).toBe("0 mph");
  });

  it("signale un déplacement non communiqué par le NHC", () => {
    render(<FicheSysteme systeme={systeme({ deplacement: undefined })} />);

    expect(valeur(mesures(), "Déplacement")).toBe("Non communiqué par le NHC");
    expect(valeur(origine(), "Déplacement")).toBe("Non communiqué");
  });

  it("n'affiche pas de catégorie Saffir-Simpson pour une tempête tropicale", () => {
    render(<FicheSysteme systeme={systeme({ nom: "Leah", classification: "TS", ventKt: 45 })} />);

    expect(screen.getByText("Tempête tropicale")).toBeInTheDocument();
    expect(valeur(mesures(), "Vents maximaux soutenus")).toBe("85 km/h");
  });

  it("cite le numéro et l'heure de l'avis NHC, avec un lien vers l'avis officiel", () => {
    render(<FicheSysteme systeme={systeme()} />);

    expect(
      screen.getByText(/Source : NHC, avis n° 14 du 10 septembre à 11 h 00 \(heure des Antilles françaises\)/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Lire l'avis n° 14 sur le site du NHC/ })).toHaveAttribute(
      "href",
      "https://www.nhc.noaa.gov/text/MIATCPAT1.shtml",
    );
  });

  it("renvoie vers le site du NHC quand le flux ne donne pas l'adresse de l'avis", () => {
    const { avis } = systeme();
    render(<FicheSysteme systeme={systeme({ avis: { numero: avis.numero, emisLe: avis.emisLe } })} />);

    expect(screen.getByRole("link", { name: /Lire les avis sur le site du NHC/ })).toHaveAttribute(
      "href",
      "https://www.nhc.noaa.gov/",
    );
  });
});
