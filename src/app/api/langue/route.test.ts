import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Langue du compte (US-10) : la session est lue côté serveur, simulée ici.
const changerLangueCompte = vi.hoisted(() => vi.fn(async () => true));
vi.mock("@/lib/auth/serveur", () => ({ changerLangueCompte }));

import { GET } from "./route";

const SITE = "https://siklon.example";
const basculer = (parametres: string, entetes: Record<string, string> = {}) =>
  GET(new NextRequest(`${SITE}/api/langue?${parametres}`, { headers: entetes }));

beforeEach(() => changerLangueCompte.mockClear());

describe("GET /api/langue (bascule de langue)", () => {
  it("garde la langue choisie dans un cookie d'un an, puis ouvre la même page dans cette langue", async () => {
    const reponse = await basculer("vers=en&page=%2Files%2Fguadeloupe");
    expect(reponse.status).toBe(303);
    expect(reponse.headers.get("location")).toBe(`${SITE}/en/iles/guadeloupe`);
    const cookie = reponse.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/^siklon-langue=en;/);
    expect(cookie).toMatch(/Path=\//);
    expect(cookie).toMatch(/Max-Age=31536000/);
    expect(cookie).toMatch(/SameSite=lax/i);
  });

  it("retire la langue déjà présente dans la page de départ", async () => {
    const reponse = await basculer("vers=fr&page=%2Fen%2Files");
    expect(reponse.headers.get("location")).toBe(`${SITE}/fr/iles`);
  });

  it("mène à l'accueil de la langue pour la page d'accueil ou sans page", async () => {
    expect((await basculer("vers=en&page=%2F")).headers.get("location")).toBe(`${SITE}/en`);
    expect((await basculer("vers=en")).headers.get("location")).toBe(`${SITE}/en`);
  });

  it.each(["https://pirate.example/x", "//pirate.example/x", "/\\pirate.example", "iles", "/%2F%2Fpirate.example"])(
    "ne quitte jamais le site : %s mène à l'accueil",
    async (page) => {
      const reponse = await basculer(`vers=en&page=${encodeURIComponent(page)}`);
      expect(reponse.headers.get("location")).toBe(`${SITE}/en`);
    },
  );

  it("refuse une langue que l'app ne propose pas, sans écrire de cookie", async () => {
    const reponse = await basculer("vers=es&page=%2Files");
    expect(reponse.status).toBe(400);
    expect(reponse.headers.get("set-cookie")).toBeNull();
  });

  it("n'est jamais mise en cache", async () => {
    expect((await basculer("vers=en")).headers.get("cache-control")).toMatch(/no-store/);
  });
});

describe("GET /api/langue et langue du compte (US-10)", () => {
  it("clic depuis Siklon : la langue du compte connecté suit la bascule", async () => {
    const reponse = await basculer("vers=en&page=%2Fcompte", { "sec-fetch-site": "same-origin" });
    expect(reponse.status).toBe(303);
    expect(changerLangueCompte).toHaveBeenCalledWith("en");
  });

  it.each([["cross-site"], ["same-site"], ["none"]])(
    "demande venue d'ailleurs (Sec-Fetch-Site: %s) : la page change, jamais la langue du compte",
    async (provenance) => {
      const reponse = await basculer("vers=en&page=%2Fcompte", { "sec-fetch-site": provenance });
      expect(reponse.headers.get("location")).toBe(`${SITE}/en/compte`);
      expect(changerLangueCompte).not.toHaveBeenCalled();
    },
  );

  it("sans en-tête de provenance : ne touche pas au compte", async () => {
    await basculer("vers=en&page=%2Fcompte");
    expect(changerLangueCompte).not.toHaveBeenCalled();
  });

  it("langue inconnue : ne touche pas au compte", async () => {
    await basculer("vers=es", { "sec-fetch-site": "same-origin" });
    expect(changerLangueCompte).not.toHaveBeenCalled();
  });

  it("si la mise à jour du compte échoue, la bascule de la page aboutit quand même", async () => {
    changerLangueCompte.mockRejectedValueOnce(new Error("base indisponible"));
    const reponse = await basculer("vers=en&page=%2Fcompte", { "sec-fetch-site": "same-origin" });
    expect(reponse.status).toBe(303);
    expect(reponse.headers.get("set-cookie")).toMatch(/^siklon-langue=en;/);
  });
});

