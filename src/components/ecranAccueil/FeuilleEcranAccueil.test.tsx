import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { FournisseurLangue } from "@/components/langue/ContexteLangue";
import { FeuilleEcranAccueil } from "./FeuilleEcranAccueil";

// jsdom n'ouvre pas les <dialog> modaux : showModal et close sont simulés (le vrai comportement,
// focus piégé et Échap, est vérifié dans e2e/ecran-accueil.spec.ts).
const origine = { showModal: HTMLDialogElement.prototype.showModal, close: HTMLDialogElement.prototype.close };
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});
afterAll(() => {
  Object.assign(HTMLDialogElement.prototype, origine);
});

const feuille = () => screen.getByRole("dialog", { name: "Recevez les alertes de votre île sur votre iPhone" });

describe("FeuilleEcranAccueil (US-07c)", () => {
  it("est une boîte de dialogue nommée, ouverte, dont le titre prend le focus", () => {
    render(<FeuilleEcranAccueil appareil="iphone" onFermer={() => {}} />);
    expect(feuille()).toHaveAttribute("open");
    expect(within(feuille()).getByRole("heading", { level: 2 })).toHaveFocus();
  });

  it("dit pourquoi en une phrase et donne les deux premiers gestes", () => {
    render(<FeuilleEcranAccueil appareil="iphone" onFermer={() => {}} />);
    expect(feuille()).toHaveTextContent(/recevoir les alertes de votre île, même quand l'app est fermée/i);
    const gestes = within(feuille()).getAllByRole("listitem");
    expect(gestes).toHaveLength(2);
    expect(gestes[0]).toHaveTextContent("Touchez ≡ ou « ⋯ », puis Partager");
    expect(gestes[1]).toHaveTextContent("Puis « En voir plus » et « Sur l'écran d'accueil »");
  });

  it("parle de l'iPad sur un iPad", () => {
    render(<FeuilleEcranAccueil appareil="ipad" onFermer={() => {}} />);
    const dialogue = screen.getByRole("dialog", { name: "Recevez les alertes de votre île sur votre iPad" });
    expect(within(dialogue).getAllByRole("listitem")[0]).toHaveTextContent("Touchez Partager, en haut à droite");
  });

  it("mène à l'aide en images, sans compter comme un refus", () => {
    const onFermer = vi.fn();
    render(<FeuilleEcranAccueil appareil="iphone" onFermer={onFermer} />);
    const lien = within(feuille()).getByRole("link", { name: "Voir en images" });
    expect(lien).toHaveAttribute("href", "/fr/compte/ecran-accueil");
    fireEvent.click(lien);
    expect(onFermer).toHaveBeenCalledWith({ refus: false });
  });

  it("se ferme avec « Plus tard », avec la croix et avec Échap : chaque fois un refus", () => {
    const onFermer = vi.fn();
    render(<FeuilleEcranAccueil appareil="iphone" onFermer={onFermer} />);
    fireEvent.click(within(feuille()).getByRole("button", { name: "Plus tard" }));
    fireEvent.click(within(feuille()).getByRole("button", { name: "Fermer" }));
    fireEvent(feuille(), new Event("cancel", { cancelable: true }));
    expect(onFermer).toHaveBeenCalledTimes(3);
    for (const appel of onFermer.mock.calls) expect(appel[0]).toEqual({ refus: true });
  });

  it("se ferme en la faisant glisser vers le bas, pas pour un petit geste", () => {
    const onFermer = vi.fn();
    render(<FeuilleEcranAccueil appareil="iphone" onFermer={onFermer} />);
    const poignee = screen.getByTestId("poignee-feuille");

    fireEvent.pointerDown(poignee, { clientY: 500, pointerId: 1 });
    fireEvent.pointerMove(poignee, { clientY: 530, pointerId: 1 });
    fireEvent.pointerUp(poignee, { clientY: 530, pointerId: 1 });
    expect(onFermer).not.toHaveBeenCalled();

    fireEvent.pointerDown(poignee, { clientY: 500, pointerId: 1 });
    fireEvent.pointerMove(poignee, { clientY: 620, pointerId: 1 });
    fireEvent.pointerUp(poignee, { clientY: 620, pointerId: 1 });
    expect(onFermer).toHaveBeenCalledWith({ refus: true });
  });

  it("rend le focus à l'élément qui l'avait avant l'ouverture", () => {
    const avant = document.createElement("button");
    document.body.append(avant);
    avant.focus();
    const { unmount } = render(<FeuilleEcranAccueil appareil="iphone" onFermer={() => {}} />);
    expect(avant).not.toHaveFocus();
    unmount();
    expect(avant).toHaveFocus();
    avant.remove();
  });

  it("garde le focus dans la feuille : Tab après le dernier bouton revient au premier", () => {
    render(<FeuilleEcranAccueil appareil="iphone" onFermer={() => {}} />);
    const fermer = within(feuille()).getByRole("button", { name: "Fermer" });
    const plusTard = within(feuille()).getByRole("button", { name: "Plus tard" });
    plusTard.focus();
    fireEvent.keyDown(feuille(), { key: "Tab" });
    expect(fermer).toHaveFocus();
    fireEvent.keyDown(feuille(), { key: "Tab", shiftKey: true });
    expect(plusTard).toHaveFocus();
  });

  it("n'utilise que des icônes décoratives et des zones tactiles d'au moins 44 px", () => {
    const { container } = render(<FeuilleEcranAccueil appareil="iphone" onFermer={() => {}} />);
    for (const svg of container.querySelectorAll("svg")) expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(within(feuille()).getByRole("button", { name: "Fermer" }).className).toMatch(/size-11/);
    expect(within(feuille()).getByRole("button", { name: "Plus tard" }).className).toMatch(/min-h-12/);
    expect(within(feuille()).getByRole("link", { name: "Voir en images" }).className).toMatch(/min-h-12/);
  });

  it("en anglais, nomme les menus d'iOS comme iOS en anglais et garde la langue dans le lien", () => {
    render(
      <FournisseurLangue langue="en">
        <FeuilleEcranAccueil appareil="iphone" onFermer={() => {}} />
      </FournisseurLangue>,
    );
    const dialogue = screen.getByRole("dialog", { name: "Get alerts for your island on your iPhone" });
    expect(dialogue).toHaveTextContent("Tap ≡ or “⋯”, then Share");
    expect(dialogue).toHaveTextContent("Then “View More” and “Add to Home Screen”");
    expect(within(dialogue).getByRole("button", { name: "Not now" })).toBeInTheDocument();
    expect(within(dialogue).getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(within(dialogue).getByRole("link", { name: "See in pictures" })).toHaveAttribute("href", "/en/compte/ecran-accueil");
  });
});
