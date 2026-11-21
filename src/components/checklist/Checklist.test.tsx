import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Checklist } from "./Checklist";

const guadeloupe = { nomIle: "Guadeloupe", source: "meteo-france" } as const;
const dominique = { nomIle: "Dominique", source: "nhc" } as const;

function listeEnCours() {
  return screen.getByRole("list", { name: /^Liste en cours/ });
}

describe("Checklist", () => {
  it("affiche la liste du niveau en cours, avec le délai donné par la préfecture", () => {
    render(<Checklist {...guadeloupe} niveau="orange" />);

    expect(screen.getByRole("heading", { level: 2, name: "Checklist de préparation" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Vigilance orange : préparez-vous" })).toBeInTheDocument();
    expect(screen.getByText("Menace qui se précise, dans 24 à 36 heures. (Préfecture de Guadeloupe)")).toBeInTheDocument();
    expect(within(listeEnCours()).getByText("Faire le plein de carburant.")).toBeInTheDocument();
    expect(within(listeEnCours()).getAllByRole("listitem")).toHaveLength(12);
  });

  it("cite la source de chaque élément, sans répéter un même auteur", () => {
    render(<Checklist {...guadeloupe} niveau="orange" />);

    const carburant = within(listeEnCours()).getByText("Faire le plein de carburant.").closest("li")!;
    expect(
      within(carburant).getByText(
        "Source : Préfecture de Saint-Barthélemy et Saint-Martin ; Préfecture de Guadeloupe ; Croix-Rouge française (PIRAC)",
      ),
    ).toBeInTheDocument();
    for (const element of within(listeEnCours()).getAllByRole("listitem")) {
      expect(within(element).getByText(/^Source : /)).toBeInTheDocument();
    }
  });

  it("liste les documents officiels cités, avec un lien vers chacun", () => {
    render(<Checklist {...guadeloupe} niveau="orange" />);

    const sources = screen.getByRole("list", { name: "Sources de la checklist" });
    expect(within(sources).getAllByRole("link")).toHaveLength(5);
    expect(within(sources).getByRole("link", { name: /Croix-Rouge française \(PIRAC\) : Kit d'urgence/ })).toHaveAttribute(
      "href",
      "https://pirac.croix-rouge.fr/pirac-itsyourmove-kit-de-secours-fr-2",
    );
  });

  it("rappelle, repliées, les listes des niveaux précédents", () => {
    render(<Checklist {...guadeloupe} niveau="orange" />);

    const rappels = screen.getAllByText(/^Si ce n'est pas encore fait : /);
    expect(rappels.map((rappel) => rappel.textContent)).toEqual([
      "Si ce n'est pas encore fait : Avant la saison cyclonique (juin à novembre)",
      "Si ce n'est pas encore fait : Vigilance jaune : soyez attentifs",
    ]);
    for (const rappel of rappels) expect(rappel.closest("details")).not.toHaveAttribute("open");
  });

  it("n'ajoute aucun rappel sous la liste d'avant la saison", () => {
    render(<Checklist {...guadeloupe} niveau="vert" />);

    expect(screen.getByRole("heading", { level: 3, name: "Avant la saison cyclonique (juin à novembre)" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "Kit d'urgence, pour tenir 72 heures" })).toBeInTheDocument();
    expect(screen.queryByText(/^Si ce n'est pas encore fait/)).not.toBeInTheDocument();
  });

  it("associe un avertissement NHC à la liste rouge et précise l'origine des consignes", () => {
    render(<Checklist {...dominique} niveau="HWR" />);

    expect(screen.getByRole("heading", { level: 3, name: "Vigilance rouge : protégez-vous" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Ces listes viennent des guides des préfectures françaises des Antilles et de la Croix-Rouge. Suivez d'abord les consignes des autorités de Dominique.",
      ),
    ).toBeInTheDocument();
  });

  it("ne précise pas l'origine des consignes pour une île française", () => {
    render(<Checklist {...guadeloupe} niveau="rouge" />);
    expect(screen.queryByText(/Suivez d'abord les consignes des autorités/)).not.toBeInTheDocument();
  });

  it("propose toutes les listes, repliées, quand le niveau d'alerte est indisponible", () => {
    render(<Checklist {...guadeloupe} niveau={null} />);

    expect(screen.getByText("Niveau d'alerte indisponible : choisissez la liste qui correspond aux consignes des autorités.")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /^Liste en cours/ })).not.toBeInTheDocument();
    const listes = screen.getAllByText(/^(Avant la saison|Vigilance )/, { selector: "summary > span" });
    expect(listes).toHaveLength(6);
  });
});
