import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { EtatFlux } from "@/lib/nhc/client";
import type { SystemeActif } from "@/lib/nhc/systemes";
import { FicheSystemeActif } from "./FicheSystemeActif";

const luLe = "2026-09-10T16:00:00.000Z";

const kyle: SystemeActif = {
  id: "al112026",
  emplacement: "AT1",
  nom: "Kyle",
  classification: "HU",
  ventKt: 120,
  pressionHpa: 948,
  latitude: 16.8,
  longitude: -58.2,
  avis: { numero: "14", emisLe: "2026-09-10T15:00:00.000Z" },
};

const ok: EtatFlux = { etat: "ok", systemes: [kyle], rejetes: 0, luLe };

describe("FicheSystemeActif", () => {
  it("affiche la fiche du système demandé", () => {
    render(<FicheSystemeActif flux={ok} id="al112026" />);

    expect(screen.getByRole("heading", { level: 1, name: "Kyle" })).toBeInTheDocument();
  });

  it("indique qu'un système absent du flux n'est plus suivi, et renvoie vers la carte", () => {
    render(<FicheSystemeActif flux={ok} id="al992026" />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Système introuvable");
    expect(screen.getByText(/n'est plus suivi par le NHC/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir les systèmes actifs" })).toHaveAttribute("href", "/");
    expect(screen.getByText(/Source : NHC, flux lu le 10 septembre à 12 h 00/)).toBeInTheDocument();
  });

  it("signale un flux NHC indisponible sans prétendre que le système n'existe plus", () => {
    render(<FicheSystemeActif flux={{ etat: "indisponible", luLe }} id="al112026" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Les données du NHC sont momentanément indisponibles.");
    expect(screen.getByRole("link", { name: "nhc.noaa.gov" })).toHaveAttribute("href", "https://www.nhc.noaa.gov/");
    expect(screen.queryByText(/n'est plus suivi/)).not.toBeInTheDocument();
  });
});
