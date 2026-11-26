import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RADIUS_IMPACT_KM } from "@/lib/constantes";
import { calculerSaison } from "@/lib/historique/saison";
import { trouverIle } from "@/lib/iles";
import { SaisonRisque } from "./SaisonRisque";

const guadeloupe = trouverIle("guadeloupe")!;

const dernierImport = {
  fichier: "hurdat2-1851-2025-040426.txt",
  versionNhc: "2026-04-04",
  nbTempetes: 2000,
  importeLe: new Date("2026-11-20T15:00:00Z"),
  derniereAnnee: 2025,
};

/** Chiffres de la maquette : 68 passages de juin à novembre. */
const COMPTES = [0, 0, 0, 0, 0, 2, 6, 19, 27, 11, 3, 0];
const saison = calculerSaison(
  COMPTES.flatMap((n, mois) => Array.from({ length: n }, () => ({ annee: 2000, horodatage: new Date(Date.UTC(2000, mois, 15, 12)) }))),
  guadeloupe.fuseau,
);

describe("SaisonRisque", () => {
  it("titre le bloc et donne la phrase de synthèse calculée", () => {
    render(<SaisonRisque langue="fr" ile={guadeloupe} saison={saison} dernierImport={dernierImport} />);
    const bloc = screen.getByRole("region", { name: "Saison à risque" });
    expect(within(bloc).getByRole("heading", { level: 2, name: "Saison à risque" })).toBeInTheDocument();
    expect(
      within(bloc).getByText("8 passages sur 10 ont eu lieu entre août et octobre. Le mois le plus actif est septembre."),
    ).toBeInTheDocument();
  });

  it("décrit les 12 barres pour les lecteurs d'écran", () => {
    render(<SaisonRisque langue="fr" ile={guadeloupe} saison={saison} dernierImport={dernierImport} />);
    expect(
      screen.getByRole("img", {
        name:
          `Passages à moins de ${RADIUS_IMPACT_KM} km de Pointe-à-Pitre, par mois : janvier 0, février 0, mars 0, avril 0, ` +
          "mai 0, juin 2, juillet 6, août 19, septembre 27, octobre 11, novembre 3, décembre 0.",
      }),
    ).toBeInTheDocument();
  });

  it("repère la saison officielle et garde les mois à zéro", () => {
    const { container } = render(
      <SaisonRisque langue="fr" ile={guadeloupe} saison={saison} dernierImport={dernierImport} />,
    );
    expect(screen.getByText("Saison officielle : 1er juin au 30 novembre")).toBeInTheDocument();
    const mois = container.querySelectorAll("[data-mois]");
    expect(mois).toHaveLength(12);
    expect([...mois].map((m) => m.getAttribute("data-saison"))).toEqual([
      "non", "non", "non", "non", "non", "oui", "oui", "oui", "oui", "oui", "oui", "non",
    ]);
    expect([...mois].map((m) => m.textContent)).toEqual(COMPTES.map(String));
  });

  it("propose un tableau des 12 mois comme équivalent texte", () => {
    render(<SaisonRisque langue="fr" ile={guadeloupe} saison={saison} dernierImport={dernierImport} />);
    expect(screen.getByText("Afficher le tableau des 12 mois")).toBeInTheDocument();
    const tableau = screen.getByRole("table", {
      name: `Passages à moins de ${RADIUS_IMPACT_KM} km de Pointe-à-Pitre, par mois, de 1966 à 2025`,
      hidden: true,
    });
    const lignes = within(tableau).getAllByRole("row", { hidden: true });
    expect(lignes).toHaveLength(13);
    expect(lignes[0]).toHaveTextContent("MoisPassagesSaison officielle");
    expect(lignes[9]).toHaveTextContent("Septembre27oui");
    expect(lignes[12]).toHaveTextContent("Décembre0non");
  });

  it("cite la période, la source HURDAT2 et la date du dernier import", () => {
    render(<SaisonRisque langue="fr" ile={guadeloupe} saison={saison} dernierImport={dernierImport} />);
    expect(
      screen.getByText(
        `68 cyclones passés à moins de ${RADIUS_IMPACT_KM} km de Pointe-à-Pitre, de 1966 à 2025, ` +
          "comptés au mois de leur plus proche passage (heure locale).",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Source : HURDAT2, NHC. Import du 20 novembre 2026.")).toBeInTheDocument();
  });

  it("ne prétend ni à une date ni à une fin de période sans import connu", () => {
    render(<SaisonRisque langue="fr" ile={guadeloupe} saison={saison} dernierImport={null} />);
    expect(screen.getByText(/, depuis 1966, comptés au mois/)).toBeInTheDocument();
    expect(screen.getByText("Source : HURDAT2, NHC.")).toBeInTheDocument();
  });

  it("existe en anglais", () => {
    render(<SaisonRisque langue="en" ile={guadeloupe} saison={saison} dernierImport={dernierImport} />);
    expect(screen.getByRole("region", { name: "Risk season" })).toBeInTheDocument();
    expect(
      screen.getByText("8 in 10 passages took place between August and October. The most active month is September."),
    ).toBeInTheDocument();
    expect(screen.getByText("Official season: 1 June to 30 November")).toBeInTheDocument();
    expect(screen.getByText("Show the 12-month table")).toBeInTheDocument();
    expect(screen.getByText("Source: HURDAT2, NHC. Imported on 20 November 2026.")).toBeInTheDocument();
  });
});
