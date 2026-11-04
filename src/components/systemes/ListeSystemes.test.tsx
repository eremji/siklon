import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { EtatFlux } from "@/lib/nhc/client";
import type { SystemeActif } from "@/lib/nhc/systemes";
import { ListeSystemes } from "./ListeSystemes";

const luLe = "2026-09-10T16:00:00.000Z";

function systeme(partiel: Partial<SystemeActif>): SystemeActif {
  return {
    id: "al112026",
    emplacement: "AT1",
    nom: "Kyle",
    classification: "HU",
    ventKt: 120,
    pressionHpa: 948,
    latitude: 16.8,
    longitude: -58.2,
    avis: { numero: "14", emisLe: "2026-09-10T15:00:00.000Z" },
    ...partiel,
  };
}

function ok(systemes: SystemeActif[], rejetes = 0): EtatFlux {
  return { etat: "ok", systemes, rejetes, luLe };
}

describe("ListeSystemes", () => {
  it("affiche le nom, le type et la catégorie de chaque système", () => {
    render(
      <ListeSystemes
        flux={ok([
          systeme({}),
          systeme({ id: "al122026", nom: "Leah", classification: "TS", ventKt: 45 }),
        ])}
      />,
    );

    const elements = within(screen.getByRole("list", { name: "Systèmes actifs" })).getAllByRole("listitem");
    expect(elements).toHaveLength(2);
    expect(elements[0]).toHaveTextContent("Kyle");
    expect(elements[0]).toHaveTextContent("Ouragan de catégorie 4");
    expect(elements[1]).toHaveTextContent("Leah");
    expect(elements[1]).toHaveTextContent("Tempête tropicale");
    expect(elements[1]).not.toHaveTextContent("catégorie");
  });

  it("indique clairement qu'aucun système n'est actif", () => {
    render(<ListeSystemes flux={ok([])} />);

    expect(screen.getByText("Aucun système actif dans l'Atlantique.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("distingue un flux indisponible de l'absence de système", () => {
    render(<ListeSystemes flux={{ etat: "indisponible", luLe }} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Les données du NHC sont momentanément indisponibles.");
    expect(screen.queryByText(/Aucun système actif/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /nhc\.noaa\.gov/ })).toHaveAttribute("href", "https://www.nhc.noaa.gov/");
  });

  it("signale les systèmes écartés et renvoie vers la source officielle", () => {
    render(<ListeSystemes flux={ok([systeme({})], 2)} />);

    expect(screen.getByRole("alert")).toHaveTextContent("2 systèmes n'ont pas pu être affichés.");
    expect(screen.getByRole("link", { name: /nhc\.noaa\.gov/ })).toBeInTheDocument();
  });

  it("signale un système écarté même quand aucun autre n'est affiché", () => {
    render(<ListeSystemes flux={ok([], 1)} />);

    expect(screen.getByRole("alert")).toHaveTextContent("1 système n'a pas pu être affiché.");
    expect(screen.queryByText(/Aucun système actif/)).not.toBeInTheDocument();
  });
});
