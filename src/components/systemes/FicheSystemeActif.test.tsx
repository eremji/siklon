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
    render(<FicheSystemeActif langue="fr" flux={ok} id="al112026" />);

    expect(screen.getByRole("heading", { level: 1, name: "Kyle" })).toBeInTheDocument();
  });

  it("indique qu'un système absent du flux n'est plus suivi, et renvoie vers la carte", () => {
    render(<FicheSystemeActif langue="fr" flux={ok} id="al992026" />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Système introuvable");
    expect(screen.getByText(/n'est plus suivi par le NHC/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir les systèmes actifs" })).toHaveAttribute("href", "/fr");
    expect(screen.getByText(/Source : NHC, flux lu le 10 septembre à 12 h 00/)).toBeInTheDocument();
  });

  it("signale un flux NHC indisponible sans prétendre que le système n'existe plus", () => {
    render(<FicheSystemeActif langue="fr" flux={{ etat: "indisponible", luLe }} id="al112026" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Les données du NHC sont momentanément indisponibles.");
    expect(screen.getByRole("link", { name: "nhc.noaa.gov" })).toHaveAttribute("href", "https://www.nhc.noaa.gov/");
    expect(screen.queryByText(/n'est plus suivi/)).not.toBeInTheDocument();
  });
});

describe("FicheSystemeActif en anglais (US-10)", () => {
  it("dit en anglais qu'un système n'est plus suivi", () => {
    render(<FicheSystemeActif langue="en" flux={ok} id="al992026" />);
    expect(screen.getByRole("heading", { level: 1, name: "System not found" })).toBeInTheDocument();
    expect(screen.getByText("This system is no longer tracked by the NHC, or does not exist.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See active systems" })).toBeInTheDocument();
    expect(screen.getByText(/^Source: NHC, data read .+ \(Atlantic Standard Time, UTC−4\)\.$/)).toBeInTheDocument();
  });

  it("dit en anglais que le flux est indisponible", () => {
    render(<FicheSystemeActif langue="en" flux={{ etat: "indisponible", luLe }} id="al112026" />);
    expect(screen.getByRole("heading", { level: 1, name: "System details" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("NHC data is temporarily unavailable. See nhc.noaa.gov.");
  });
});

describe("FicheSystemeActif quand le NHC ne répond plus (US-11)", () => {
  it("montre la fiche de la dernière donnée connue et avertit que la mise à jour a échoué (US-11)", () => {
    render(<FicheSystemeActif langue="fr" flux={{ ...ok, echecLe: "2026-09-10T17:00:00.000Z" }} id="al112026" />);

    expect(screen.getByRole("alert")).toHaveTextContent("La mise à jour des données du NHC a échoué.");
    expect(screen.getByRole("heading", { level: 1, name: "Kyle" })).toBeInTheDocument();
  });

  it("avertit aussi quand le système n'est plus dans la dernière donnée connue (US-11)", () => {
    render(<FicheSystemeActif langue="fr" flux={{ ...ok, echecLe: "2026-09-10T17:00:00.000Z" }} id="al992026" />);

    expect(screen.getByRole("alert")).toHaveTextContent("La mise à jour des données du NHC a échoué.");
  });
});
