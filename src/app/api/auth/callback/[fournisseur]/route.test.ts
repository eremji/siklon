// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

const retourFournisseur = vi.hoisted(() => vi.fn(async () => new Response(null, { status: 302, headers: { location: "/compte" } })));
vi.mock("@/lib/auth/serveur", () => ({ retourFournisseur }));

const { GET } = await import("./route");

describe("route de retour d'un fournisseur de connexion (Google)", () => {
  it("transmet la requête de retour à Better Auth et renvoie sa réponse", async () => {
    const requete = new Request("https://siklon.example/api/auth/callback/google?code=c&state=s");
    const reponse = await GET(requete);
    expect(retourFournisseur).toHaveBeenCalledWith(requete);
    expect(reponse.status).toBe(302);
    expect(reponse.headers.get("location")).toBe("/compte");
  });
});
