// @vitest-environment node
import { describe, expect, it } from "vitest";
import { configurationAuth } from "./configuration";

const SECRET = "a".repeat(44);

describe("configurationAuth", () => {
  it("lit le secret et l'URL publique du site", () => {
    expect(configurationAuth({ BETTER_AUTH_SECRET: SECRET, BETTER_AUTH_URL: "https://siklon.example/" })).toEqual({
      secret: SECRET,
      baseURL: "https://siklon.example",
    });
  });

  it("refuse de démarrer sans secret, ou avec un secret trop court", () => {
    expect(() => configurationAuth({ BETTER_AUTH_URL: "https://siklon.example" })).toThrow(/BETTER_AUTH_SECRET/);
    expect(() => configurationAuth({ BETTER_AUTH_SECRET: "court", BETTER_AUTH_URL: "https://siklon.example" })).toThrow(
      /32 caractères/,
    );
  });

  it("en développement, prend l'adresse locale par défaut", () => {
    expect(configurationAuth({ BETTER_AUTH_SECRET: SECRET, NODE_ENV: "development" }).baseURL).toBe(
      "http://localhost:3000",
    );
  });

  it("en production, exige l'URL publique", () => {
    expect(() => configurationAuth({ BETTER_AUTH_SECRET: SECRET, NODE_ENV: "production" })).toThrow(/BETTER_AUTH_URL/);
  });

  it("le message d'erreur ne recopie jamais le secret", () => {
    expect(() => configurationAuth({ BETTER_AUTH_SECRET: "secret-trop-court", NODE_ENV: "production" })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining("secret-trop-court") }),
    );
  });

  describe("connexion avec Google", () => {
    const BASE = { BETTER_AUTH_SECRET: SECRET, BETTER_AUTH_URL: "https://siklon.example" };

    it("active Google quand l'identifiant et le secret du client sont fournis", () => {
      expect(configurationAuth({ ...BASE, GOOGLE_CLIENT_ID: "id-client", GOOGLE_CLIENT_SECRET: "secret-client" }).google).toEqual({
        clientId: "id-client",
        clientSecret: "secret-client",
      });
    });

    it("sans eux, laisse Google désactivé (développement, tests)", () => {
      expect(configurationAuth(BASE).google).toBeUndefined();
    });

    it("refuse une configuration à moitié faite, sans recopier la valeur fournie", () => {
      expect(() => configurationAuth({ ...BASE, GOOGLE_CLIENT_ID: "id-client" })).toThrow(/GOOGLE_CLIENT_SECRET/);
      expect(() => configurationAuth({ ...BASE, GOOGLE_CLIENT_SECRET: "secret-client" })).toThrow(
        expect.objectContaining({ message: expect.stringMatching(/GOOGLE_CLIENT_ID(?![\s\S]*secret-client)/) }),
      );
    });
  });
});
