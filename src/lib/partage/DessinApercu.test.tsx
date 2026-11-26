import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Apercu } from "./apercu";
import { COULEURS_APERCU, COULEURS_VIGILANCE } from "./couleurs";
import { DessinApercu } from "./DessinApercu";

const APERCU: Apercu = {
  titre: "Guadeloupe",
  niveau: { libelle: "Vigilance rouge · Protégez-vous", origine: null, couleurs: COULEURS_VIGILANCE.rouge },
  lignes: [{ fort: "Ouragan Kyle (cat. 4)", detail: "Passage estimé à environ 180 km de Pointe-à-Pitre dans environ 12 h" }],
  sources: "Sources : NHC, avis n° 14 du 10 septembre à 11 h 00 ; Météo-France, mise à jour du 9 novembre à 05 h 42 (heure locale).",
  avertissement: null,
  mention: "Siklon ne remplace pas les consignes officielles. Suivez les autorités locales.",
};

// Le dessin est rendu par next/og en PNG ; ici, dans le DOM de test, pour lire ses textes et ses couleurs.
const couleurDe = (element: HTMLElement) => element.style.backgroundColor;
const rgb = (hex: string) => {
  const [r, v, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r}, ${v}, ${b})`;
};

describe("DessinApercu (US-21)", () => {
  it("affiche le logo, l'île, le niveau, la menace, les sources avec leur heure et la mention", () => {
    render(<DessinApercu apercu={APERCU} />);
    expect(screen.getByTestId("logo-siklon")).toBeInTheDocument();
    for (const texte of [
      "Guadeloupe",
      "Vigilance rouge · Protégez-vous",
      "Ouragan Kyle (cat. 4)",
      "Passage estimé à environ 180 km de Pointe-à-Pitre dans environ 12 h",
      APERCU.sources!,
      APERCU.mention,
    ]) {
      expect(screen.getByText(texte)).toBeInTheDocument();
    }
  });

  it("met le niveau sur la couleur de la vigilance pour une alerte réelle", () => {
    render(<DessinApercu apercu={APERCU} />);
    const pastille = screen.getByText("Vigilance rouge · Protégez-vous");
    expect(couleurDe(pastille)).toBe(rgb(COULEURS_VIGILANCE.rouge!.fond));
    expect(pastille.style.color).toBe(rgb(COULEURS_VIGILANCE.rouge!.texte));
  });

  it("garde un niveau sans alerte sur une pastille neutre", () => {
    const vert: Apercu = {
      ...APERCU,
      niveau: { libelle: "Vigilance verte · Pas de vigilance", origine: null, couleurs: null },
    };
    render(<DessinApercu apercu={vert} />);
    expect(couleurDe(screen.getByText("Vigilance verte · Pas de vigilance"))).toBe(rgb(COULEURS_APERCU.neutre));
  });

  it("écrit le terme d'origine et l'avertissement d'un avis ancien", () => {
    render(
      <DessinApercu
        apercu={{
          ...APERCU,
          niveau: { ...APERCU.niveau!, origine: "Vigilance rouge · Protégez-vous" },
          avertissement: "Données possiblement obsolètes : aucun nouvel avis du NHC depuis plus de 6 h.",
        }}
      />,
    );
    expect(screen.getByText("(Vigilance rouge · Protégez-vous)")).toBeInTheDocument();
    expect(screen.getByText("Données possiblement obsolètes : aucun nouvel avis du NHC depuis plus de 6 h.")).toBeInTheDocument();
  });

  it("n'affiche pas plus de deux systèmes, pour rester lisible en petit", () => {
    const ligne = (n: number) => ({ fort: `Système ${n}`, detail: "" });
    render(<DessinApercu apercu={{ ...APERCU, lignes: [ligne(1), ligne(2), ligne(3)] }} />);
    expect(screen.getByText("Système 2")).toBeInTheDocument();
    expect(screen.queryByText("Système 3")).not.toBeInTheDocument();
  });
});
