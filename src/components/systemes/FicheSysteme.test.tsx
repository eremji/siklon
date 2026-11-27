import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
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
    render(<FicheSysteme langue="fr" systeme={systeme()} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Kyle");
    expect(screen.getByText("Ouragan de catégorie 4")).toBeInTheDocument();
  });

  it("affiche vents, pression, déplacement et position en unités métriques", () => {
    render(<FicheSysteme langue="fr" systeme={systeme()} />);

    expect(valeur(mesures(), "Vents maximaux soutenus")).toBe("220 km/h");
    expect(valeur(mesures(), "Pression centrale")).toBe("948 hPa");
    expect(valeur(mesures(), "Déplacement")).toBe("Vers l'ouest-nord-ouest à 19 km/h");
    expect(valeur(mesures(), "Position")).toBe("16,8° N, 58,2° O");
  });

  it("garde consultables les valeurs d'origine du NHC (nœuds, mph, mb, degrés)", () => {
    render(<FicheSysteme langue="fr" systeme={systeme()} />);

    expect(valeur(origine(), "Vents maximaux soutenus")).toBe("120 nœuds (140 mph)");
    expect(valeur(origine(), "Pression centrale")).toBe("948 mb");
    expect(valeur(origine(), "Déplacement")).toBe("285° à 12 mph");
  });

  it("indique un système stationnaire", () => {
    render(<FicheSysteme langue="fr" systeme={systeme({ deplacement: { directionDeg: 0, vitesseMph: 0 } })} />);

    expect(valeur(mesures(), "Déplacement")).toBe("Stationnaire");
    expect(valeur(origine(), "Déplacement")).toBe("0 mph");
  });

  it("signale un déplacement non communiqué par le NHC", () => {
    render(<FicheSysteme langue="fr" systeme={systeme({ deplacement: undefined })} />);

    expect(valeur(mesures(), "Déplacement")).toBe("Non communiqué par le NHC");
    expect(valeur(origine(), "Déplacement")).toBe("Non communiqué");
  });

  it("n'affiche pas de catégorie Saffir-Simpson pour une tempête tropicale", () => {
    render(<FicheSysteme langue="fr" systeme={systeme({ nom: "Leah", classification: "TS", ventKt: 45 })} />);

    expect(screen.getByText("Tempête tropicale")).toBeInTheDocument();
    expect(valeur(mesures(), "Vents maximaux soutenus")).toBe("85 km/h");
  });

  it("cite le numéro et l'heure de l'avis NHC, avec un lien vers l'avis officiel", () => {
    render(<FicheSysteme langue="fr" systeme={systeme()} />);

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
    render(<FicheSysteme langue="fr" systeme={systeme({ avis: { numero: avis.numero, emisLe: avis.emisLe } })} />);

    expect(screen.getByRole("link", { name: /Lire les avis sur le site du NHC/ })).toHaveAttribute(
      "href",
      "https://www.nhc.noaa.gov/",
    );
  });

  it("partage le résumé officiel du système avec un lien sans langue (US-21)", async () => {
    const utilisateur = userEvent.setup();
    const share = vi.fn(async () => {});
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    vi.useFakeTimers({ now: new Date("2026-09-10T17:00:00.000Z"), toFake: ["Date"] });
    render(<FicheSysteme langue="fr" systeme={systeme()} />);

    await utilisateur.click(screen.getByRole("button", { name: "Partager cette alerte" }));

    expect(share).toHaveBeenCalledWith({
      title: "Ouragan Kyle · Siklon",
      text: expect.stringMatching(/^Partagé le 10 septembre à 13 h 00 [^.]+\. Ouragan Kyle \(cat\. 4\) : vents maximaux de 220 km\/h, .* avis n° 14 du 10 septembre à 11 h 00/),
      url: `${window.location.origin}/systemes/al112026`,
    });
    vi.useRealTimers();
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
  });
});

describe("FicheSysteme en anglais (US-10)", () => {
  const mesuresEn = () => screen.getByRole("region", { name: "Intensity and movement" });
  const origineEn = () => screen.getByText("Original NHC values").closest("details") as HTMLElement;

  it("présente le système et ses mesures en anglais", () => {
    render(<FicheSysteme langue="en" systeme={systeme()} />);
    expect(screen.getByText("Category 4 hurricane")).toBeInTheDocument();
    expect(valeur(mesuresEn(), "Maximum sustained winds")).toBe("220 km/h");
    expect(valeur(mesuresEn(), "Central pressure")).toBe("948 hPa");
    expect(valeur(mesuresEn(), "Position")).toBe("16.8° N, 58.2° W");
    expect(valeur(mesuresEn(), "Movement")).toBe("Toward the west-northwest at 19 km/h");
  });

  it("donne les valeurs d'origine du NHC en anglais", () => {
    render(<FicheSysteme langue="en" systeme={systeme()} />);
    expect(valeur(origineEn(), "Maximum sustained winds")).toBe("120 knots (140 mph)");
    expect(valeur(origineEn(), "Central pressure")).toBe("948 mb");
    expect(valeur(origineEn(), "Movement")).toBe("285° at 12 mph");
    expect(
      within(origineEn()).getByText(
        "Siklon converts these values to metric units; winds are rounded to the nearest 5 km/h, as in NHC advisories.",
      ),
    ).toBeInTheDocument();
  });

  it("dit quand le déplacement manque ou est nul", () => {
    const { unmount } = render(<FicheSysteme langue="en" systeme={systeme({ deplacement: undefined })} />);
    expect(valeur(mesuresEn(), "Movement")).toBe("Not provided by the NHC");
    expect(valeur(origineEn(), "Movement")).toBe("Not provided");
    unmount();
    render(<FicheSysteme langue="en" systeme={systeme({ deplacement: { directionDeg: 0, vitesseMph: 0 } })} />);
    expect(valeur(mesuresEn(), "Movement")).toBe("Stationary");
  });

  it("cite l'avis et mène à l'avis officiel du NHC", () => {
    render(<FicheSysteme langue="en" systeme={systeme()} />);
    expect(
      screen.getByText("Source: NHC, advisory 14 issued 10 September at 11:00 am (Atlantic Standard Time, UTC−4)."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Read advisory 14 on the NHC website" })).toHaveAttribute(
      "href",
      "https://www.nhc.noaa.gov/text/MIATCPAT1.shtml",
    );
  });

  it("sans adresse d'avis, mène au site du NHC", () => {
    render(<FicheSysteme langue="en" systeme={systeme({ avis: { numero: "14", emisLe: "2026-09-10T15:00:00.000Z" } })} />);
    expect(screen.getByRole("link", { name: "Read the advisories on the NHC website" })).toHaveAttribute(
      "href",
      "https://www.nhc.noaa.gov/",
    );
  });
});
