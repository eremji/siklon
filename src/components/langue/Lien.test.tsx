import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FournisseurLangue } from "./ContexteLangue";
import { Lien } from "./Lien";

describe("Lien", () => {
  it("mène à la page dans la langue de la page en cours", () => {
    render(
      <FournisseurLangue langue="en">
        <Lien href="/iles/guadeloupe?onglet=1">Guadeloupe</Lien>
      </FournisseurLangue>,
    );
    expect(screen.getByRole("link", { name: "Guadeloupe" })).toHaveAttribute("href", "/en/iles/guadeloupe?onglet=1");
  });

  it("mène à l'accueil de la langue pour la racine", () => {
    render(
      <FournisseurLangue langue="en">
        <Lien href="/">Carte</Lien>
      </FournisseurLangue>,
    );
    expect(screen.getByRole("link", { name: "Carte" })).toHaveAttribute("href", "/en");
  });

  it("garde les autres attributs du lien", () => {
    render(
      <Lien href="/compte" className="lien" aria-current="page">
        Compte
      </Lien>,
    );
    const lien = screen.getByRole("link", { name: "Compte" });
    expect(lien).toHaveAttribute("href", "/fr/compte");
    expect(lien).toHaveClass("lien");
    expect(lien).toHaveAttribute("aria-current", "page");
  });
});
