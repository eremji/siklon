import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EtapesEcranAccueil } from "./EtapesEcranAccueil";

describe("EtapesEcranAccueil", () => {
  it("liste les 4 étapes dans l'ordre, avec les noms des menus d'iOS", () => {
    render(<EtapesEcranAccueil appareil="iphone" />);

    const etapes = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(etapes).toHaveLength(4);
    expect(etapes[0]).toHaveTextContent(/puis partager/i);
    expect(etapes[1]).toHaveTextContent("« En voir plus »");
    expect(etapes[1]).toHaveTextContent("« Sur l'écran d'accueil »");
    expect(etapes[2]).toHaveTextContent("« Ajouter »");
    expect(etapes[3]).toHaveTextContent(/ouvrez siklon depuis son icône/i);
  });

  it("sur iPhone, Partager est derrière ≡ ou « ⋯ » ; sur iPad, en haut à droite", () => {
    const { unmount } = render(<EtapesEcranAccueil appareil="iphone" />);
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("Touchez ≡ ou « ⋯ » à côté de l'adresse, puis Partager");
    unmount();

    render(<EtapesEcranAccueil appareil="ipad" />);
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent(/en haut à droite/i);
  });

  it("les icônes sont décoratives : le texte de l'étape suffit au lecteur d'écran", () => {
    const { container } = render(<EtapesEcranAccueil appareil="iphone" />);

    const icones = container.querySelectorAll("svg");
    expect(icones.length).toBeGreaterThanOrEqual(2);
    for (const icone of icones) expect(icone).toHaveAttribute("aria-hidden", "true");
  });
});
