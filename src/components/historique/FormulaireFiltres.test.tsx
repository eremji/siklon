import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { trouverIle } from "@/lib/iles";
import { FormulaireFiltres } from "./FormulaireFiltres";

const guadeloupe = trouverIle("guadeloupe")!;

describe("FormulaireFiltres", () => {
  it("envoie les filtres dans l'URL de la page de l'île (formulaire GET, sans JavaScript)", () => {
    render(<FormulaireFiltres ile={guadeloupe} filtres={{}} />);
    const formulaire = screen.getByRole("search", { name: "Filtrer l'historique" });
    expect(formulaire).toHaveAttribute("method", "get");
    expect(formulaire).toHaveAttribute("action", "/iles/guadeloupe/historique");
  });

  it("propose les catégories minimales, de toutes jusqu'à la catégorie 5", () => {
    render(<FormulaireFiltres ile={guadeloupe} filtres={{}} />);
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
    render(<FormulaireFiltres ile={guadeloupe} filtres={{ categorieMin: 3, anneeMin: 1950, anneeMax: 2000 }} />);
    expect(screen.getByLabelText("Intensité minimale")).toHaveValue("3");
    expect(screen.getByLabelText("De (année)")).toHaveValue(1950);
    expect(screen.getByLabelText("À (année)")).toHaveValue(2000);
  });

  it("nomme les champs de période de et a", () => {
    render(<FormulaireFiltres ile={guadeloupe} filtres={{}} />);
    expect(screen.getByLabelText("De (année)")).toHaveAttribute("name", "de");
    expect(screen.getByLabelText("À (année)")).toHaveAttribute("name", "a");
  });

  it("permet d'appliquer et d'effacer les filtres", () => {
    render(<FormulaireFiltres ile={guadeloupe} filtres={{ categorieMin: 3 }} />);
    expect(screen.getByRole("button", { name: "Filtrer" })).toHaveAttribute("type", "submit");
    expect(screen.getByRole("link", { name: "Effacer les filtres" })).toHaveAttribute("href", "/iles/guadeloupe/historique");
  });
});
