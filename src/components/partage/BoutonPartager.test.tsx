import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FournisseurLangue } from "@/components/langue/ContexteLangue";
import { BoutonPartager } from "./BoutonPartager";

const CONTENU = { titre: "Ouragan Kyle · Siklon", texte: "Ouragan Kyle (cat. 4) : vents maximaux de 220 km/h." };
const LIEN = `${window.location.origin}/systemes/al112026`;

function definir(nom: "share" | "clipboard", valeur: unknown) {
  Object.defineProperty(navigator, nom, { configurable: true, value: valeur });
}

// userEvent.setup() pose son propre presse-papiers : le navigateur simulé est défini après.
function afficher({ langue = "fr", share, clipboard }: { langue?: "fr" | "en"; share?: unknown; clipboard?: unknown } = {}) {
  const utilisateur = userEvent.setup();
  definir("share", share);
  definir("clipboard", clipboard);
  render(
    <FournisseurLangue langue={langue}>
      <BoutonPartager chemin="/systemes/al112026" contenu={() => CONTENU} />
    </FournisseurLangue>,
  );
  return utilisateur;
}

afterEach(() => {
  definir("share", undefined);
  definir("clipboard", undefined);
});

describe("BoutonPartager (US-21)", () => {
  it("ouvre le partage du téléphone avec le texte et un lien sans langue", async () => {
    const share = vi.fn(async () => {});
    const utilisateur = afficher({ share });

    await utilisateur.click(screen.getByRole("button", { name: "Partager cette alerte" }));

    expect(share).toHaveBeenCalledWith({ title: CONTENU.titre, text: CONTENU.texte, url: LIEN });
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("ne fait rien de plus quand le partage est annulé", async () => {
    const share = vi.fn(async () => Promise.reject(new DOMException("annulé", "AbortError")));
    const writeText = vi.fn(async () => {});
    const utilisateur = afficher({ share, clipboard: { writeText } });

    await utilisateur.click(screen.getByRole("button", { name: "Partager cette alerte" }));

    expect(writeText).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("sans partage natif, copie le lien et le confirme à l'écran", async () => {
    const writeText = vi.fn(async () => {});
    const utilisateur = afficher({ clipboard: { writeText } });

    await utilisateur.click(screen.getByRole("button", { name: "Partager cette alerte" }));

    expect(writeText).toHaveBeenCalledWith(LIEN);
    expect(screen.getByRole("status")).toHaveTextContent("Lien copié. Collez-le dans WhatsApp ou un SMS.");
  });

  it("copie le lien quand le partage natif échoue", async () => {
    const share = vi.fn(async () => Promise.reject(new DOMException("refusé", "NotAllowedError")));
    const writeText = vi.fn(async () => {});
    const utilisateur = afficher({ share, clipboard: { writeText } });

    await utilisateur.click(screen.getByRole("button", { name: "Partager cette alerte" }));

    expect(writeText).toHaveBeenCalledWith(LIEN);
  });

  it("affiche le lien à copier quand le presse-papiers est inaccessible", async () => {
    const writeText = vi.fn(async () => Promise.reject(new Error("refusé")));
    const utilisateur = afficher({ clipboard: { writeText } });

    await utilisateur.click(screen.getByRole("button", { name: "Partager cette alerte" }));

    expect(screen.getByRole("status")).toHaveTextContent(`Copiez ce lien pour le partager : ${LIEN}`);
  });

  it("existe en anglais", async () => {
    const utilisateur = afficher({ langue: "en", clipboard: { writeText: vi.fn(async () => {}) } });

    await utilisateur.click(screen.getByRole("button", { name: "Share this alert" }));

    expect(screen.getByRole("status")).toHaveTextContent("Link copied. Paste it into WhatsApp or a text message.");
  });
});
