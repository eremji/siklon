import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { CLE_MEMO, ecrireMemo, jourLocal, lireMemo } from "@/lib/ecranAccueil/frequence";
import { PropositionEcranAccueil, PropositionHorsPagesAlertes } from "./PropositionEcranAccueil";

const chemin = vi.hoisted(() => ({ actuel: "/fr" }));
vi.mock("next/navigation", () => ({ usePathname: () => chemin.actuel }));

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";

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

let installe = false;
function appareil(agent: string) {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(agent);
}
beforeEach(() => {
  localStorage.clear();
  installe = false;
  chemin.actuel = "/fr";
  appareil(IPHONE);
  window.matchMedia = vi.fn(() => ({ matches: installe })) as unknown as typeof window.matchMedia;
});
afterEach(() => {
  vi.restoreAllMocks();
});

const hier = () => jourLocal(new Date(Date.now() - 24 * 3600 * 1000));
const dejaVenuHier = () => localStorage.setItem(CLE_MEMO, ecrireMemo({ refus: 0, premiereVisite: hier() }));
const feuille = () => screen.queryByRole("dialog");
const bandeau = () => screen.queryByRole("region", { name: "Ajouter Siklon à l'écran d'accueil" });

describe("PropositionEcranAccueil (US-07c)", () => {
  it("ne propose rien à la toute première page vue, mais en garde le jour", () => {
    render(<PropositionEcranAccueil />);
    expect(feuille()).toBeNull();
    expect(lireMemo(localStorage.getItem(CLE_MEMO)).premiereVisite).toBe(jourLocal(new Date()));
  });

  it("ouvre la feuille à la visite d'un autre jour", () => {
    dejaVenuHier();
    render(<PropositionEcranAccueil />);
    expect(feuille()).toHaveAttribute("open");
  });

  it("ouvre la feuille quand le visiteur arrive sur la page d'une île, après la première page", () => {
    const { rerender } = render(<PropositionEcranAccueil />);
    expect(feuille()).toBeNull();
    chemin.actuel = "/fr/iles/guadeloupe";
    rerender(<PropositionEcranAccueil />);
    expect(feuille()).toHaveAttribute("open");
  });

  it("montre le bandeau, jamais la feuille, quand une alerte est en cours sur la page", () => {
    dejaVenuHier();
    render(<PropositionEcranAccueil alerteEnCours />);
    expect(feuille()).toBeNull();
    expect(bandeau()).toBeInTheDocument();
  });

  it("ne propose rien sur Android, sur ordinateur, ni quand Siklon est ouvert depuis l'écran d'accueil", () => {
    dejaVenuHier();
    appareil(ANDROID);
    const { unmount } = render(<PropositionEcranAccueil />);
    expect(feuille()).toBeNull();
    unmount();

    appareil(IPHONE);
    installe = true;
    render(<PropositionEcranAccueil alerteEnCours />);
    expect(feuille()).toBeNull();
    expect(bandeau()).toBeNull();
  });

  it("« Plus tard » ferme la feuille et compte un refus sur l'appareil", () => {
    dejaVenuHier();
    render(<PropositionEcranAccueil />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Plus tard" }));
    });
    expect(feuille()).toBeNull();
    const memo = lireMemo(localStorage.getItem(CLE_MEMO));
    expect(memo.refus).toBe(1);
    expect(memo.derniereFermeture).toBeDefined();
  });

  it("ne revient pas après une fermeture, même sur la page d'une île", () => {
    dejaVenuHier();
    const { rerender } = render(<PropositionEcranAccueil />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    });
    chemin.actuel = "/fr/iles/martinique";
    rerender(<PropositionEcranAccueil />);
    expect(feuille()).toBeNull();
  });

  it("ne casse rien si le stockage local est bloqué", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqué");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqué");
    });
    expect(() => render(<PropositionEcranAccueil />)).not.toThrow();
    expect(feuille()).toBeNull();
  });
});

describe("PropositionHorsPagesAlertes", () => {
  it("laisse les pages d'alerte et de checklist choisir entre feuille et bandeau", () => {
    dejaVenuHier();
    chemin.actuel = "/fr/iles/guadeloupe/alerte";
    render(<PropositionHorsPagesAlertes />);
    expect(feuille()).toBeNull();
  });

  it("propose ailleurs", () => {
    dejaVenuHier();
    chemin.actuel = "/fr/iles/guadeloupe";
    render(<PropositionHorsPagesAlertes />);
    expect(feuille()).toHaveAttribute("open");
  });
});
