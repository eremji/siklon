import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AlerteNhc, EtatAlertesNhc } from "@/lib/nhc/alertes";
import { FournisseurLangue } from "@/components/langue/ContexteLangue";
import { AlertesNhc } from "./AlertesNhc";

const LU_LE = "2026-09-10T15:10:00.000Z";
const KYLE = { id: "al112026", nom: "Kyle", classification: "HU" as const, ventKt: 120 };
const AVIS_14 = { numero: "14", emisLe: "2026-09-10T15:00:00.000Z" };

function ok(...alertes: AlerteNhc[]): EtatAlertesNhc {
  return { etat: "ok", alertes, luLe: LU_LE };
}

function entete() {
  return screen.getByRole("banner");
}

describe("AlertesNhc", () => {
  it("écrit le type le plus grave en toutes lettres dans l'en-tête, avec son terme d'origine et sa définition", () => {
    render(<AlertesNhc langue="fr" nomIle="Dominique" etat={ok({ code: "HWR", systeme: KYLE, avis: AVIS_14 })} />);

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
    render(<AlertesNhc langue="fr" nomIle="Dominique" etat={ok({ code, systeme: KYLE, avis: AVIS_14 })} />);

    for (const classe of classes.split(" ")) expect(entete()).toHaveClass(classe);
  });

  it("liste chaque alerte avec son système et son avis, dans l'ordre reçu", () => {
    render(
      <AlertesNhc
        langue="fr"
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
    expect(within(elements[0]).getByRole("link", { name: "Kyle" })).toHaveAttribute("href", "/fr/systemes/al112026");
    expect(within(elements[0]).getByText(/Ouragan de catégorie 4/)).toBeInTheDocument();
    expect(within(elements[0]).getByText("Avis n° 14 du NHC, émis le 10 septembre à 11 h 00.")).toBeInTheDocument();
  });

  it("affiche la source et l'heure de mise à jour, avec un lien vers le NHC", () => {
    render(<AlertesNhc langue="fr" nomIle="Dominique" etat={ok({ code: "TWA", systeme: KYLE, avis: AVIS_14 })} />);

    expect(
      screen.getByText("Source : NHC, données lues le 10 septembre à 11 h 10 (heure des Antilles françaises)."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Consulter les alertes sur le site du NHC" })).toHaveAttribute(
      "href",
      "https://www.nhc.noaa.gov/",
    );
  });

  it("indique qu'aucune veille ni aucun avertissement n'est en cours", () => {
    render(<AlertesNhc langue="fr" nomIle="Barbade" etat={ok()} />);

    expect(entete()).toHaveClass("bg-header");
    expect(within(entete()).getByText("Aucune veille ni aucun avertissement")).toBeInTheDocument();
    expect(screen.getByText("Aucune veille ni aucun avertissement NHC en cours pour Barbade.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByText(/Source : NHC, données lues le 10 septembre/)).toBeInTheDocument();
  });

  it("signale des données indisponibles sans afficher d'alerte", () => {
    render(<AlertesNhc langue="fr" nomIle="Dominique" etat={{ etat: "indisponible", luLe: LU_LE }} />);

    expect(entete()).toHaveClass("bg-header");
    expect(within(entete()).getByText("Veilles et avertissements NHC indisponibles")).toBeInTheDocument();
    expect(screen.queryByText(/Avertissement d|Veille d/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Aucune veille/)).not.toBeInTheDocument();
    expect(screen.getByText("Source : NHC.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Consulter les alertes sur le site du NHC" })).toBeInTheDocument();
  });

  it("n'affiche aucun niveau de vigilance", () => {
    render(<AlertesNhc langue="fr" nomIle="Dominique" etat={ok({ code: "HWR", systeme: KYLE, avis: AVIS_14 })} />);
    expect(screen.queryByText(/Vigilance/)).not.toBeInTheDocument();
  });
});

describe("AlertesNhc en anglais (US-10)", () => {
  const rendre = (nomIle: string, etat: EtatAlertesNhc) =>
    render(
      <FournisseurLangue langue="en">
        <AlertesNhc langue="en" nomIle={nomIle} etat={etat} />
      </FournisseurLangue>,
    );

  it("affiche le terme d'origine du NHC seul, avec sa définition en anglais", () => {
    rendre("Dominica", ok({ code: "HWR", systeme: KYLE, avis: AVIS_14 }));

    expect(within(entete()).getByText("Hurricane Warning")).toBeInTheDocument();
    expect(within(entete()).queryByText("(Hurricane Warning)")).not.toBeInTheDocument();
    expect(within(entete()).getByText("Hurricane conditions expected, generally within 36 hours.")).toBeInTheDocument();
  });

  it.each([
    ["TWR", "Tropical Storm Warning", "Tropical storm conditions expected, generally within 36 hours."],
    ["HWA", "Hurricane Watch", "Hurricane conditions possible, generally within 48 hours."],
    ["TWA", "Tropical Storm Watch", "Tropical storm conditions possible, generally within 48 hours."],
  ] as const)("définit %s en anglais", (code, terme, definition) => {
    rendre("Dominica", ok({ code, systeme: KYLE, avis: AVIS_14 }));
    expect(within(entete()).getByText(terme)).toBeInTheDocument();
    expect(within(entete()).getByText(definition)).toBeInTheDocument();
  });

  it("liste chaque alerte avec son système décrit en anglais et son avis", () => {
    rendre("Saint Lucia", ok({ code: "TWR", systeme: KYLE, avis: AVIS_14 }));

    const [element] = within(screen.getByRole("list", { name: "NHC watches and warnings in effect" })).getAllByRole(
      "listitem",
    );
    expect(within(element).getByText("Tropical Storm Warning", { selector: "p" })).toBeInTheDocument();
    expect(within(element).getByRole("link", { name: "Kyle" })).toHaveAttribute("href", "/en/systemes/al112026");
    expect(element).toHaveTextContent("Kyle (Category 4 hurricane)");
    expect(within(element).getByText("NHC advisory 14, issued 10 September at 11:00 am.")).toBeInTheDocument();
    expect(
      screen.getByText("Source: NHC, data read 10 September at 11:10 am (Atlantic Standard Time, UTC−4)."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See the alerts on the NHC website" })).toHaveAttribute(
      "href",
      "https://www.nhc.noaa.gov/",
    );
  });

  it("indique en anglais qu'aucune veille ni aucun avertissement n'est en cours", () => {
    rendre("Barbados", ok());
    expect(within(entete()).getByText("No watches or warnings")).toBeInTheDocument();
    expect(screen.getByText("No NHC watches or warnings in effect for Barbados.")).toBeInTheDocument();
  });

  it("signale en anglais des données indisponibles", () => {
    rendre("Dominica", { etat: "indisponible", luLe: LU_LE });
    expect(within(entete()).getByText("NHC watches and warnings unavailable")).toBeInTheDocument();
    expect(screen.getByText("Source: NHC.")).toBeInTheDocument();
  });
});
