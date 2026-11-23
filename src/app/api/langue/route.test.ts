import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET } from "./route";

const SITE = "https://siklon.example";
const basculer = (parametres: string) => GET(new NextRequest(`${SITE}/api/langue?${parametres}`));

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
