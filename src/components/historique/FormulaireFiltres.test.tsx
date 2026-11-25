import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { trouverIle } from "@/lib/iles";
import { FournisseurLangue } from "@/components/langue/ContexteLangue";
import { FormulaireFiltres } from "./FormulaireFiltres";

const guadeloupe = trouverIle("guadeloupe")!;

describe("FormulaireFiltres", () => {
  it("envoie les filtres dans l'URL de la page de l'île, dans sa langue (formulaire GET, sans JavaScript)", () => {
    render(<FormulaireFiltres langue="fr" ile={guadeloupe} filtres={{}} />);
    const formulaire = screen.getByRole("search", { name: "Filtrer l'historique" });
    expect(formulaire).toHaveAttribute("method", "get");
    expect(formulaire).toHaveAttribute("action", "/fr/iles/guadeloupe/historique");
  });

  it("propose les catégories minimales, de toutes jusqu'à la catégorie 5", () => {
    render(<FormulaireFiltres langue="fr" ile={guadeloupe} filtres={{}} />);
    const select = screen.getByLabelText("Intensité minimale");
    expect(select).toHaveAttribute("name", "categorie");
    expect(screen.getAllByRole("option").map((o) => [o.getAttribute("value"), o.textContent])).toEqual([
      ["", "Toutes"],
      ["0", "Tempête et plus"],
      ["1", "Ouragan (catégorie 1 et plus)"],
      ["2", "Catégorie 2 et plus"],
      ["3", "Catégorie 3 et plus"],
      ["4", "Catégorie 4 et plus"],
      ["5", "Catégorie 5"],
    ]);
  });

  it("préremplit les filtres en cours", () => {
    render(<FormulaireFiltres langue="fr" ile={guadeloupe} filtres={{ categorieMin: 3, anneeMin: 1950, anneeMax: 2000 }} />);
    expect(screen.getByLabelText("Intensité minimale")).toHaveValue("3");
    expect(screen.getByLabelText("De (année)")).toHaveValue(1950);
    expect(screen.getByLabelText("À (année)")).toHaveValue(2000);
  });

  it("nomme les champs de période de et a", () => {
    render(<FormulaireFiltres langue="fr" ile={guadeloupe} filtres={{}} />);
    expect(screen.getByLabelText("De (année)")).toHaveAttribute("name", "de");
    expect(screen.getByLabelText("À (année)")).toHaveAttribute("name", "a");
  });

  it("permet d'appliquer et d'effacer les filtres", () => {
    render(<FormulaireFiltres langue="fr" ile={guadeloupe} filtres={{ categorieMin: 3 }} />);
    expect(screen.getByRole("button", { name: "Filtrer" })).toHaveAttribute("type", "submit");
    expect(screen.getByRole("link", { name: "Effacer les filtres" })).toHaveAttribute("href", "/fr/iles/guadeloupe/historique");
  });
});

describe("FormulaireFiltres en anglais (US-10)", () => {
  const rendre = () =>
    render(
      <FournisseurLangue langue="en">
        <FormulaireFiltres langue="en" ile={guadeloupe} filtres={{}} />
      </FournisseurLangue>,
    );

  it("envoie les filtres vers la page anglaise de l'île", () => {
    rendre();
    expect(screen.getByRole("search", { name: "Filter history" })).toHaveAttribute("action", "/en/iles/guadeloupe/historique");
  });

  it("donne les libellés, les catégories et les boutons en anglais", () => {
    rendre();
    expect(screen.getByLabelText("Minimum intensity")).toHaveAttribute("name", "categorie");
    expect(screen.getAllByRole("option").map((o) => [o.getAttribute("value"), o.textContent])).toEqual([
      ["", "All"],
      ["0", "Tropical storm and above"],
      ["1", "Hurricane (category 1 and above)"],
      ["2", "Category 2 and above"],
      ["3", "Category 3 and above"],
      ["4", "Category 4 and above"],
      ["5", "Category 5"],
    ]);
    expect(screen.getByLabelText("From (year)")).toHaveAttribute("name", "de");
    expect(screen.getByLabelText("To (year)")).toHaveAttribute("name", "a");
    expect(screen.getByRole("button", { name: "Filter" })).toHaveAttribute("type", "submit");
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute("href", "/en/iles/guadeloupe/historique");
  });
});
