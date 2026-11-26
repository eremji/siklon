import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { EtatFlux } from "@/lib/nhc/client";
import { EchecMiseAJourNhc } from "./EchecMiseAJourNhc";

// Dernière lecture réussie à 12 h UTC (8 h aux Antilles), mise à jour échouée à 16 h UTC.
const ancien: EtatFlux = {
  etat: "ok",
  systemes: [],
  rejetes: 0,
  luLe: "2026-09-10T12:00:00.000Z",
  echecLe: "2026-09-10T16:00:00.000Z",
};

describe("EchecMiseAJourNhc (US-11)", () => {
  it("avertit que la mise à jour a échoué et donne l'heure de la dernière donnée connue", () => {
    render(<EchecMiseAJourNhc langue="fr" flux={ancien} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "La mise à jour des données du NHC a échoué. Dernière donnée connue, lue le 10 septembre à 08 h 00 " +
        "(heure des Antilles françaises). Consultez nhc.noaa.gov.",
    );
    expect(screen.getByRole("link", { name: "nhc.noaa.gov" })).toHaveAttribute("href", "https://www.nhc.noaa.gov/");
  });

  it("existe en anglais", () => {
    render(<EchecMiseAJourNhc langue="en" flux={ancien} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "The NHC data update failed. Last known data, read 10 September at 8:00 am (Atlantic Standard Time, UTC−4). " +
        "See nhc.noaa.gov.",
    );
  });

  it("n'affiche rien quand le flux est à jour", () => {
    const { container } = render(<EchecMiseAJourNhc langue="fr" flux={{ ...ancien, echecLe: undefined }} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("n'affiche rien quand le flux est indisponible (déjà signalé autrement)", () => {
    const { container } = render(<EchecMiseAJourNhc langue="fr" flux={{ etat: "indisponible", luLe: ancien.luLe }} />);

    expect(container).toBeEmptyDOMElement();
  });
});
