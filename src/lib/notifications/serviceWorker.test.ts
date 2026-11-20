// @vitest-environment node
// Service worker public/sw.js (US-07), exécuté tel quel avec un faux `self` de navigateur.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { messagePush } from "./push";

const SOURCE = readFileSync(join(import.meta.dirname, "../../../public/sw.js"), "utf8");
const ORIGINE = "https://siklon.exemple";

type Gestionnaire = (evenement: unknown) => void;

function chargerServiceWorker({ fenetres = [] as { url: string; focus: () => Promise<unknown> }[] } = {}) {
  const gestionnaires = new Map<string, Gestionnaire>();
  const self = {
    location: { origin: ORIGINE },
    addEventListener: (type: string, gestionnaire: Gestionnaire) => gestionnaires.set(type, gestionnaire),
    skipWaiting: vi.fn(async () => {}),
    registration: { showNotification: vi.fn(async () => {}) },
    clients: {
      claim: vi.fn(async () => {}),
      matchAll: vi.fn(async () => fenetres),
      openWindow: vi.fn(async () => null),
    },
  };
  runInNewContext(SOURCE, { self, URL, JSON });

  /** Déclenche un événement et attend la fin du travail confié à waitUntil. */
  async function declencher(type: string, evenement: Record<string, unknown> = {}) {
    const attentes: Promise<unknown>[] = [];
    gestionnaires.get(type)?.({ ...evenement, waitUntil: (p: Promise<unknown>) => attentes.push(p) });
    await Promise.all(attentes);
  }
  return { self, declencher };
}

const MESSAGE = messagePush(
  {
    titre: "Martinique : Vigilance rouge",
    corps: "Protégez-vous.",
    lien: `${ORIGINE}/iles/martinique/alerte`,
    source: { nom: "Météo-France", url: "https://vigilance.meteofrance.fr/" },
  },
  "niveau:martinique:rouge:2026-09-10T16:00:00Z",
);

const push = (contenu: unknown) => ({ data: { json: () => contenu } });
const clic = (lien: unknown) => ({ notification: { data: { lien }, close: vi.fn() } });

describe("service worker : réception d'une alerte", () => {
  let sw: ReturnType<typeof chargerServiceWorker>;
  beforeEach(() => {
    sw = chargerServiceWorker();
  });

  it("affiche la notification avec le titre, le texte et le lien de la fiche", async () => {
    await sw.declencher("push", push(MESSAGE));

    expect(sw.self.registration.showNotification).toHaveBeenCalledWith("Martinique : Vigilance rouge", {
      body: "Protégez-vous.\nSource : Météo-France.",
      tag: "niveau:martinique:rouge:2026-09-10T16:00:00Z",
      lang: "fr",
      data: { lien: `${ORIGINE}/iles/martinique/alerte` },
    });
  });

  it.each([
    ["illisible", { data: { json: () => JSON.parse("{") } }],
    ["sans contenu", { data: null }],
    ["sans titre", push({ texte: "x", lien: "/" })],
  ])("affiche quand même une alerte générique pour un message %s", async (_cas, evenement) => {
    await sw.declencher("push", evenement);

    expect(sw.self.registration.showNotification).toHaveBeenCalledWith(
      "Siklon : nouvelle alerte",
      expect.objectContaining({ data: { lien: `${ORIGINE}/` } }),
    );
  });

  it("remplace un lien vers un autre site par l'accueil de Siklon", async () => {
    await sw.declencher("push", push({ ...MESSAGE, lien: "https://exemple.org/piege" }));

    expect(sw.self.registration.showNotification).toHaveBeenCalledWith(
      MESSAGE.titre,
      expect.objectContaining({ data: { lien: `${ORIGINE}/` } }),
    );
  });
});

describe("service worker : clic sur la notification", () => {
  it("ouvre la fiche dans une nouvelle fenêtre et ferme la notification", async () => {
    const sw = chargerServiceWorker();
    const evenement = clic(`${ORIGINE}/systemes/al052026`);

    await sw.declencher("notificationclick", evenement);

    expect(evenement.notification.close).toHaveBeenCalled();
    expect(sw.self.clients.openWindow).toHaveBeenCalledWith(`${ORIGINE}/systemes/al052026`);
  });

  it("met au premier plan la fiche si elle est déjà ouverte", async () => {
    const fenetre = { url: `${ORIGINE}/systemes/al052026`, focus: vi.fn(async () => fenetre) };
    const sw = chargerServiceWorker({ fenetres: [{ url: `${ORIGINE}/`, focus: vi.fn() }, fenetre] });

    await sw.declencher("notificationclick", clic(`${ORIGINE}/systemes/al052026`));

    expect(fenetre.focus).toHaveBeenCalled();
    expect(sw.self.clients.openWindow).not.toHaveBeenCalled();
  });

  it("n'ouvre jamais un autre site", async () => {
    const sw = chargerServiceWorker();

    await sw.declencher("notificationclick", clic("https://exemple.org/piege"));

    expect(sw.self.clients.openWindow).toHaveBeenCalledWith(`${ORIGINE}/`);
  });
});

describe("service worker : mise à jour", () => {
  it("prend la main dès son installation", async () => {
    const sw = chargerServiceWorker();

    await sw.declencher("install");
    await sw.declencher("activate");

    expect(sw.self.skipWaiting).toHaveBeenCalled();
    expect(sw.self.clients.claim).toHaveBeenCalled();
  });
});
