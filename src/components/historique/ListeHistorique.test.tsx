import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RADIUS_IMPACT_KM } from "@/lib/constantes";
import type { EntreeHistorique } from "@/lib/db/historique";
import { trouverIle } from "@/lib/iles";
import { ListeHistorique } from "./ListeHistorique";

const guadeloupe = trouverIle("guadeloupe")!;

const entrees: EntreeHistorique[] = [
  {
    tempeteId: "AL152017",
    nom: "MARIA",
    annee: 2017,
    distanceMinKm: 38.4,
    horodatage: new Date("2017-09-19T03:00:00Z"),
    ventMaxKt: 145,
    categorie: 5,
  },
  {
    tempeteId: "AL031899",
    nom: "UNNAMED",
    annee: 1899,
    distanceMinKm: 101.2,
    horodatage: new Date("1899-08-07T12:00:00Z"),
    ventMaxKt: null,
    categorie: null,
  },
];

describe("ListeHistorique", () => {
  it("affiche une entrée par cyclone, dans l'ordre reçu", () => {
    render(<ListeHistorique entrees={entrees} ile={guadeloupe} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByRole("heading", { name: "Maria 2017" })).toBeInTheDocument();
    expect(within(items[1]).getByRole("heading", { name: "Sans nom (AL031899) 1899" })).toBeInTheDocument();
  });

  it("affiche l'intensité près de l'île, la distance minimale et la date locale du passage", () => {
    render(<ListeHistorique entrees={entrees} ile={guadeloupe} />);
    const maria = screen.getAllByRole("listitem")[0];
    expect(within(maria).getByText("Ouragan de catégorie 5")).toBeInTheDocument();
    expect(within(maria).getByText("269 km/h (145 nœuds)")).toBeInTheDocument();
    expect(within(maria).getByText("38 km")).toBeInTheDocument();
    // 19 septembre 03:00 UTC = 18 septembre 23:00 en Guadeloupe.
    expect(within(maria).getByText("18 septembre 2017")).toBeInTheDocument();
  });

  it("indique une intensité inconnue sans inventer de valeur", () => {
    render(<ListeHistorique entrees={entrees} ile={guadeloupe} />);
    expect(within(screen.getAllByRole("listitem")[1]).getByText("Intensité inconnue")).toBeInTheDocument();
  });

  it("renvoie vers la fiche du cyclone, en gardant l'île", () => {
    render(<ListeHistorique entrees={entrees} ile={guadeloupe} />);
    expect(screen.getByRole("link", { name: /Maria 2017/ })).toHaveAttribute("href", "/historique/AL152017?ile=guadeloupe");
  });

  it("explique l'absence de résultat avec le rayon et le point de référence", () => {
    render(<ListeHistorique entrees={[]} ile={guadeloupe} />);
    expect(
      screen.getByText(`Aucun cyclone n'est passé à moins de ${RADIUS_IMPACT_KM} km de Pointe-à-Pitre avec ces filtres.`),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
